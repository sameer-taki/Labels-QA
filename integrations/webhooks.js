'use strict';
/* Outbound webhooks (zero deps: node http/https/crypto only).
   Fire-and-forget POST of a JSON event to a subscriber URL, signed with an
   HMAC-SHA256 of the body in the X-GQA-Signature header (when a secret is set).
   Never throws; resolves a small status object so the caller can record it. */
const crypto = require('crypto');
const http = require('http');
const https = require('https');

function dispatch(hook, event, payload) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
      const sig = hook.secret ? crypto.createHmac('sha256', hook.secret).update(body).digest('hex') : '';
      const u = new URL(hook.url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(u, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'GoldenQA-Webhook/1',
          'X-GQA-Event': event,
          'X-GQA-Signature': sig
        },
        timeout: 5000
      }, (res) => { res.resume(); resolve({ ok: res.statusCode < 400, status: res.statusCode }); });
      req.on('error', (e) => resolve({ ok: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.write(body); req.end();
    } catch (e) { resolve({ ok: false, error: String(e && e.message || e) }); }
  });
}

module.exports = { dispatch };
