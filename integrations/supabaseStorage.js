'use strict';
/* Upload photos / signatures to Supabase Storage instead of the local disk.

   Serverless (Vercel) filesystems are read-only apart from /tmp and are wiped between
   invocations, so the old fs.writeFileSync-into-data/uploads approach cannot persist a file.
   We PUT the bytes into a public Storage bucket via the Storage REST API (raw https, no extra
   dependency) using the service-role key, and hand back the file's public URL.

   Config (env):
     SUPABASE_URL                 e.g. https://<ref>.supabase.co
     SUPABASE_SERVICE_ROLE_KEY    server-only secret (bypasses RLS for the upload)
     SUPABASE_STORAGE_BUCKET      bucket name (default 'qa-uploads')
   When SUPABASE_URL / key are absent (local dev) isEnabled() is false and the caller falls
   back to writing the file to disk. */
const https = require('https');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'qa-uploads';
function baseUrl() { return String(process.env.SUPABASE_URL || '').replace(/\/+$/, ''); }
function serviceKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY || ''; }

function isEnabled() { return !!(baseUrl() && serviceKey()); }

/* Public URL for an object already stored in the bucket (bucket must be public-read). */
function publicUrl(objectName) {
  return baseUrl() + '/storage/v1/object/public/' + BUCKET + '/' + objectName;
}

/* Upload raw bytes. Resolves { ok, url } or { ok:false, error }. Never throws. */
function upload(objectName, buffer, contentType) {
  return new Promise((resolve) => {
    if (!isEnabled()) return resolve({ ok: false, error: 'storage not configured' });
    let u; try { u = new URL(baseUrl() + '/storage/v1/object/' + BUCKET + '/' + objectName); }
    catch (e) { return resolve({ ok: false, error: 'bad SUPABASE_URL' }); }
    const opts = { method: 'POST', hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      headers: {
        'Authorization': 'Bearer ' + serviceKey(),
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': buffer.length,
        'x-upsert': 'true',
        'cache-control': '31536000'
      } };
    const req = https.request(opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ ok: true, url: publicUrl(objectName) });
        resolve({ ok: false, error: 'Storage HTTP ' + res.statusCode + ' ' + d.slice(0, 200) });
      });
    });
    req.on('error', e => resolve({ ok: false, error: String(e && e.message || e) }));
    req.setTimeout(20000, () => { req.destroy(new Error('storage upload timeout')); });
    req.end(buffer);
  });
}

module.exports = { isEnabled, upload, publicUrl, BUCKET };
