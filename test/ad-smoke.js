'use strict';
/* Active Directory (LDAPS) auth smoke test. Spins up an in-process mock LDAP server that behaves
   like an AD domain controller (users with passwords + memberOf groups), starts the real server
   pointed at it, and drives the login flow over HTTP. Run via `npm test`. */
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
// Isolated data dir so this test never collides with the API smoke test's DB (or the dev data/).
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gqa-ad-'));
let ldap;
try { ldap = require('ldapjs'); } catch (e) { console.log('SKIP  AD smoke test — ldapjs not installed'); process.exit(0); }

const LDAP_PORT = 13991, APP_PORT = 4091;
const BASE = 'DC=golden,DC=local';
const SVC = { dn: 'CN=svc,OU=Users,DC=golden,DC=local', password: 'svcpass' };
// AD returns attribute names in various casings; attrMap normalises. Mock uses lowercase keys so the
// ldapjs test server (which case-sensitively filters requested attrs) returns them.
const USERS = {
  jmanager: { dn: 'CN=Jane Manager,OU=Users,DC=golden,DC=local', password: 'Pass123', attrs: { samaccountname: ['jmanager'], displayname: ['Jane Manager'], mail: ['jmanager@golden.com.fj'], memberof: ['CN=GoldenQA-Managers,OU=Groups,DC=golden,DC=local'] } },
  jofficer: { dn: 'CN=Joe Officer,OU=Users,DC=golden,DC=local', password: 'Pass123', attrs: { samaccountname: ['jofficer'], displayname: ['Joe Officer'], mail: ['jofficer@golden.com.fj'], memberof: ['CN=GoldenQA-Officers,OU=Groups,DC=golden,DC=local'] } },
  jadmin: { dn: 'CN=Amy Admin,OU=Users,DC=golden,DC=local', password: 'Pass123', attrs: { samaccountname: ['jadmin'], displayname: ['Amy Admin'], mail: ['jadmin@golden.com.fj'], memberof: ['CN=GoldenQA-Officers,OU=Groups,DC=golden,DC=local', 'CN=GoldenQA-Admins,OU=Groups,DC=golden,DC=local'] } },
  nogroup: { dn: 'CN=No Group,OU=Users,DC=golden,DC=local', password: 'Pass123', attrs: { samaccountname: ['nogroup'], displayname: ['No Group'], mail: ['nogroup@golden.com.fj'], memberof: [] } },
};

let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log('PASS  ' + n); } else { fail++; console.log('FAIL  ' + n + (extra ? '  -> ' + extra : '')); } };

const srv = ldap.createServer();
srv.bind(BASE, (req, res, next) => {
  const dn = req.dn.toString().toLowerCase();
  if (dn === SVC.dn.toLowerCase()) { if (req.credentials === SVC.password) { res.end(); return next(); } return next(new ldap.InvalidCredentialsError()); }
  const u = Object.values(USERS).find(x => x.dn.toLowerCase() === dn);
  if (u && req.credentials === u.password) { res.end(); return next(); }
  return next(new ldap.InvalidCredentialsError());
});
srv.search(BASE, (req, res, next) => {
  const f = req.filter.toString().toLowerCase();
  Object.values(USERS).forEach(u => { if (f.includes('samaccountname=' + u.attrs.samaccountname[0].toLowerCase())) res.send({ dn: u.dn, attributes: u.attrs }); });
  res.end(); return next();
});

function rq(method, p, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port: APP_PORT, path: p, method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'x-token': token } : {}, data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { let j = {}; try { j = JSON.parse(d); } catch (e) {} resolve({ status: res.statusCode, body: j }); });
    });
    r.on('error', () => resolve({ status: 0, body: {} }));
    if (data) r.write(data); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

srv.listen(LDAP_PORT, '127.0.0.1', async () => {
  const app = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: Object.assign({}, process.env, {
      PORT: String(APP_PORT), HOST: '127.0.0.1', ADMIN_PASSWORD: 'BreakGlass123', DATABASE_URL: '', NODE_ENV: '',
      GQA_DATA_DIR: DATA_DIR,
      LDAP_ENABLED: 'true', LDAP_URL: 'ldap://127.0.0.1:' + LDAP_PORT, LDAP_BASE_DN: BASE,
      LDAP_BIND_DN: SVC.dn, LDAP_BIND_PASSWORD: SVC.password,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  app.stdout.on('data', d => { if (/server on/.test(String(d))) booted = true; });
  app.stderr.on('data', d => console.log('APP-ERR: ' + String(d).trim()));
  for (let i = 0; i < 50 && !booted; i++) await sleep(150);
  await sleep(300);

  try {
    let r = await rq('POST', '/api/login', { username: 'jmanager', password: 'Pass123' });
    ok('AD manager login -> 200', r.status === 200, JSON.stringify(r.body));
    ok('AD manager mapped to Quality Manager (group)', r.body.user && r.body.user.role === 'Quality Manager', r.body.user && r.body.user.role);
    ok('AD user marked source=ad', r.body.user && r.body.user.source === 'ad', r.body.user && r.body.user.source);
    ok('AD user carries directory e-mail', r.body.user && r.body.user.email === 'jmanager@golden.com.fj', r.body.user && r.body.user.email);
    const mtok = r.body.token;
    r = await rq('GET', '/api/me', null, mtok);
    ok('AD token resolves on /api/me', r.status === 200 && r.body.user.role === 'Quality Manager', JSON.stringify(r.body));
    r = await rq('POST', '/api/login', { username: 'jmanager', password: 'WRONG' });
    ok('AD wrong password -> 401', r.status === 401, String(r.status));
    r = await rq('POST', '/api/login', { username: 'jofficer', password: 'Pass123' });
    ok('AD officer -> QA Officer', r.status === 200 && r.body.user.role === 'QA Officer', r.body.user && r.body.user.role);
    r = await rq('POST', '/api/login', { username: 'jadmin', password: 'Pass123' });
    ok('AD multi-group -> Administrator (highest wins)', r.status === 200 && r.body.user.role === 'Administrator', r.body.user && r.body.user.role);
    r = await rq('POST', '/api/login', { username: 'nogroup', password: 'Pass123' });
    ok('AD no access group -> 403', r.status === 403, r.status + ' ' + JSON.stringify(r.body));
    r = await rq('POST', '/api/login', { username: 'admin', password: 'BreakGlass123' });
    ok('local break-glass admin works with AD on', r.status === 200 && r.body.user.role === 'Administrator', JSON.stringify(r.body));
    r = await rq('POST', '/api/me/password', { current: 'Pass123', new: 'whatever123' }, mtok);
    ok('AD user password-change -> 400 (managed in directory)', r.status === 400, r.status + ' ' + JSON.stringify(r.body));
    r = await rq('POST', '/api/login', { username: 'ghost', password: 'x' });
    ok('unknown user -> 401', r.status === 401, String(r.status));
  } catch (e) { console.log('TEST ERROR:', e.message); fail++; }

  console.log('\nAD smoke summary: ' + pass + ' passed, ' + fail + ' failed');
  try { app.kill('SIGKILL'); } catch (e) {}
  srv.close();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
});
