'use strict';
/* Microsoft Entra ID (Azure AD) id_token verification — zero external deps, Node >=18.
   Parses the JWT, fetches the tenant JWKS (cached ~1h), verifies the RS256 signature
   against the matching key, and validates the standard claims (exp/nbf/aud/iss/tid)
   plus the company e-mail domain. Replaces the old e-mail-only verifySso() stub. */
const https = require('https');
const crypto = require('crypto');

const SKEW = 120;                 // clock-skew tolerance in seconds
const JWKS_TTL = 60 * 60 * 1000;  // cache JWKS for ~1h
const jwksCache = {};             // tenantId -> { ts, keys:{ kid -> jwk } }

function b64urlToBuf(s){ s=String(s).replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; return Buffer.from(s,'base64'); }
function b64urlToJson(s){ return JSON.parse(b64urlToBuf(s).toString('utf8')); }

function httpsGetJson(target){ return new Promise((resolve,reject)=>{ try{ const u=new URL(target); const req=https.get(u,{headers:{'Accept':'application/json'}},res=>{ let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ if(res.statusCode>=400) return reject(new Error('JWKS HTTP '+res.statusCode)); try{ resolve(JSON.parse(d)); }catch(e){ reject(new Error('JWKS parse error')); } }); }); req.on('error',reject); req.setTimeout(8000,()=>{ req.destroy(new Error('JWKS timeout')); }); }catch(e){ reject(e); } }); }

async function getKeys(tenantId){
  const c = jwksCache[tenantId];
  if(c && (Date.now()-c.ts)<JWKS_TTL) return c.keys;
  const url='https://login.microsoftonline.com/'+encodeURIComponent(tenantId)+'/discovery/v2.0/keys';
  const doc=await httpsGetJson(url);
  const keys={}; (doc.keys||[]).forEach(k=>{ if(k.kid) keys[k.kid]=k; });
  jwksCache[tenantId]={ ts:Date.now(), keys };
  return keys;
}

async function verifyIdToken(CFG, idToken){
  try{
    const sso=(CFG&&CFG.sso)||{};
    const tenantId=sso.tenantId, clientId=sso.clientId, allowedDomain=sso.allowedDomain;
    if(!tenantId||!clientId) return { ok:false, error:'SSO not configured (tenantId/clientId missing)' };
    if(!idToken||typeof idToken!=='string') return { ok:false, error:'No id_token supplied' };

    const parts=idToken.split('.');
    if(parts.length!==3) return { ok:false, error:'Malformed JWT' };
    const [h,p,sig]=parts;

    let header, claims;
    try{ header=b64urlToJson(h); claims=b64urlToJson(p); }
    catch(e){ return { ok:false, error:'Cannot decode token' }; }

    if(header.alg!=='RS256') return { ok:false, error:'Unsupported alg '+header.alg };
    if(!header.kid) return { ok:false, error:'Token missing kid' };

    // Resolve signing key by kid; refetch once if it is a freshly-rotated key.
    let keys=await getKeys(tenantId);
    let jwk=keys[header.kid];
    if(!jwk){ delete jwksCache[tenantId]; keys=await getKeys(tenantId); jwk=keys[header.kid]; }
    if(!jwk) return { ok:false, error:'Signing key not found for kid' };
    if(jwk.kty!=='RSA'||!jwk.n||!jwk.e) return { ok:false, error:'Unexpected key type' };

    let pubKey;
    try{ pubKey=crypto.createPublicKey({ key:{ kty:'RSA', n:jwk.n, e:jwk.e }, format:'jwk' }); }
    catch(e){ return { ok:false, error:'Cannot build public key' }; }

    const okSig=crypto.verify('RSA-SHA256', Buffer.from(h+'.'+p), pubKey, b64urlToBuf(sig));
    if(!okSig) return { ok:false, error:'Signature verification failed' };

    // Standard claim validation.
    const now=Math.floor(Date.now()/1000);
    if(typeof claims.exp==='number' && now>(claims.exp+SKEW)) return { ok:false, error:'Token expired' };
    if(typeof claims.nbf==='number' && now<(claims.nbf-SKEW)) return { ok:false, error:'Token not yet valid' };
    if(claims.aud!==clientId) return { ok:false, error:'Audience mismatch' };

    const expectedIss='https://login.microsoftonline.com/'+tenantId+'/v2.0';
    if(claims.iss!==expectedIss) return { ok:false, error:'Issuer mismatch' };
    if(claims.tid && claims.tid!==tenantId) return { ok:false, error:'Tenant mismatch' };

    // Identify the user and enforce the company e-mail domain.
    const email=String(claims.preferred_username||claims.email||claims.upn||'').toLowerCase();
    if(!email) return { ok:false, error:'No e-mail / UPN in token' };
    if(allowedDomain && !email.endsWith('@'+String(allowedDomain).toLowerCase())) return { ok:false, error:'E-mail domain not allowed' };

    return { ok:true, claims:{ email, name:claims.name||email.split('@')[0], oid:claims.oid, tid:claims.tid, sub:claims.sub, raw:claims } };
  }catch(e){
    return { ok:false, error:'Verification error: '+(e&&e.message||String(e)) };
  }
}

module.exports = { verifyIdToken };
