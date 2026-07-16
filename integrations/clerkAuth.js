'use strict';
/* Clerk session-token verification — zero external deps, Node >=18.

   The browser signs the user in with Clerk (Clerk.js) and sends us the resulting session
   JWT. We verify it here exactly the way entraId.js verifies a Microsoft id_token: parse the
   JWT, fetch Clerk's JWKS (cached ~1h), verify the RS256 signature, and validate exp/nbf/iss.
   A Clerk session token only carries the user id (sub), so we then read the user's e-mail from
   Clerk's Backend API with the secret key. The app matches that e-mail to a local user record
   to decide the in-app role (identity = Clerk, roles = this app).

   Config (env):
     CLERK_SECRET_KEY           sk_live_… / sk_test_…  (backend, verifies + reads the user)
     CLERK_PUBLISHABLE_KEY      pk_live_… / pk_test_…  (used to derive the Frontend API host)
     CLERK_FRONTEND_API         optional explicit host, e.g. clerk.yourdomain.com
     CLERK_ALLOWED_DOMAIN       optional e-mail domain allow-list (e.g. golden.com.fj)
*/
const https = require('https');
const crypto = require('crypto');

const SKEW = 120;                 // clock-skew tolerance (s)
const JWKS_TTL = 60 * 60 * 1000;  // cache JWKS ~1h
let jwksCache = null;             // { ts, keys:{ kid -> jwk } }

function b64urlToBuf(s){ s=String(s).replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64'); }
function b64urlToJson(s){ return JSON.parse(b64urlToBuf(s).toString('utf8')); }

function secretKey(){ return process.env.CLERK_SECRET_KEY || ''; }
function publishableKey(){ return process.env.CLERK_PUBLISHABLE_KEY || ''; }
function isEnabled(){ return !!(secretKey() && frontendApi()); }

/* The Frontend API host is base64-encoded inside the publishable key (…$-terminated),
   e.g. pk_test_Y2xlcmsuZXhhbXBsZS5jb20k -> "clerk.example.com". Allow an explicit override. */
function frontendApi(){
  if (process.env.CLERK_FRONTEND_API) return String(process.env.CLERK_FRONTEND_API).replace(/^https?:\/\//,'').replace(/\/+$/,'');
  const m = /^pk_(test|live)_(.+)$/.exec(publishableKey());
  if (!m) return '';
  try { return Buffer.from(m[2], 'base64').toString('utf8').replace(/\$+$/, '').replace(/\/+$/,''); }
  catch (e) { return ''; }
}

function httpsGetJson(target, headers){
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(target);
      const req = https.get(u, { headers: Object.assign({ 'Accept': 'application/json' }, headers || {}) }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error('Clerk HTTP ' + res.statusCode + ' ' + d.slice(0,200)));
          try { resolve(JSON.parse(d)); } catch (e) { reject(new Error('Clerk parse error')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(8000, () => { req.destroy(new Error('Clerk request timeout')); });
    } catch (e) { reject(e); }
  });
}

async function getKeys(){
  if (jwksCache && (Date.now() - jwksCache.ts) < JWKS_TTL) return jwksCache.keys;
  const doc = await httpsGetJson('https://' + frontendApi() + '/.well-known/jwks.json');
  const keys = {}; (doc.keys || []).forEach(k => { if (k.kid) keys[k.kid] = k; });
  jwksCache = { ts: Date.now(), keys };
  return keys;
}

/* Verify the JWT signature + standard claims. Returns { ok, sub } or { ok:false, error }. */
async function verifySessionToken(token){
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { ok:false, error:'Malformed session token' };
  const [h, p, sig] = parts;
  let header, claims;
  try { header = b64urlToJson(h); claims = b64urlToJson(p); }
  catch (e) { return { ok:false, error:'Cannot decode session token' }; }
  if (header.alg !== 'RS256') return { ok:false, error:'Unsupported alg ' + header.alg };
  if (!header.kid) return { ok:false, error:'Token missing kid' };

  let keys = await getKeys();
  let jwk = keys[header.kid];
  if (!jwk) { jwksCache = null; keys = await getKeys(); jwk = keys[header.kid]; } // refetch once on rotation
  if (!jwk || jwk.kty !== 'RSA' || !jwk.n || !jwk.e) return { ok:false, error:'Signing key not found' };

  let pubKey;
  try { pubKey = crypto.createPublicKey({ key:{ kty:'RSA', n:jwk.n, e:jwk.e }, format:'jwk' }); }
  catch (e) { return { ok:false, error:'Cannot build public key' }; }
  if (!crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), pubKey, b64urlToBuf(sig))) return { ok:false, error:'Signature verification failed' };

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === 'number' && now > (claims.exp + SKEW)) return { ok:false, error:'Session expired' };
  if (typeof claims.nbf === 'number' && now < (claims.nbf - SKEW)) return { ok:false, error:'Session not yet valid' };
  const expectedIss = 'https://' + frontendApi();
  if (claims.iss && claims.iss !== expectedIss) return { ok:false, error:'Issuer mismatch' };
  if (!claims.sub) return { ok:false, error:'Token missing sub' };
  return { ok:true, sub: claims.sub, claims };
}

/* Read the user's primary e-mail + name from Clerk's Backend API (needs the secret key). */
async function getUser(userId){
  const u = await httpsGetJson('https://api.clerk.com/v1/users/' + encodeURIComponent(userId),
    { 'Authorization': 'Bearer ' + secretKey() });
  const emails = Array.isArray(u.email_addresses) ? u.email_addresses : [];
  const primary = emails.find(e => e.id === u.primary_email_address_id) || emails[0] || {};
  const email = String(primary.email_address || '').toLowerCase();
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || (u.username || email.split('@')[0]);
  return { email, name, clerkUserId: u.id };
}

/* Full flow: verify token -> resolve e-mail/name. Returns { ok, email, name, clerkUserId } or { ok:false, error }. */
async function authenticate(token){
  try {
    if (!isEnabled()) return { ok:false, error:'Clerk is not configured' };
    const v = await verifySessionToken(token);
    if (!v.ok) return v;
    const info = await getUser(v.sub);
    if (!info.email) return { ok:false, error:'No e-mail on the Clerk account' };
    const allowed = (process.env.CLERK_ALLOWED_DOMAIN || '').toLowerCase().trim();
    if (allowed && !info.email.endsWith('@' + allowed)) return { ok:false, error:'E-mail domain not allowed' };
    return { ok:true, email: info.email, name: info.name, clerkUserId: info.clerkUserId };
  } catch (e) {
    return { ok:false, error:'Clerk verification error: ' + (e && e.message || String(e)) };
  }
}

module.exports = { isEnabled, authenticate, verifySessionToken, getUser, frontendApi, publishableKey };
