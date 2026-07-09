'use strict';
/* Golden QA App - zero-dependency smoke / integration test runner.
 * Spawns the real server on a throwaway port, exercises the HTTP API with only
 * the built-in `http` client, and ALWAYS restores data/db.json + kills the child.
 * Run: node test/smoke.js   (exit 0 = all pass, exit 1 = at least one failure)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');           // repo working dir
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const SNAP_FILE = path.join(ROOT, 'data', 'db.json.smokebak');
const PORT = 34567;
const HOST = '127.0.0.1';
const PID = process.pid;

/* ---------- tiny test harness ---------- */
let passed = 0, failed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log('PASS  ' + name); }
  else { failed++; console.log('FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}

/* ---------- tiny http client (built-in only) ---------- */
function request(method, p, body, token, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const headers = {};
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = data.length; }
    if (token) headers['x-token'] = token;
    if (apiKey) headers['x-api-key'] = apiKey;
    const req = http.request({ host: HOST, port: PORT, method, path: p, headers, timeout: 8000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let json = null;
        try { json = buf ? JSON.parse(buf) : null; } catch (e) { json = null; }
        resolve({ status: res.statusCode, body: json, raw: buf });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('request timeout ' + method + ' ' + p)); });
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* poll /api/health until ready or timeout (~10s) */
async function waitForReady() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const r = await request('GET', '/api/health');
      if (r.status === 200 && r.body && r.body.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

/* ---------- db snapshot / restore ---------- */
let hadDB = false;
function snapshotDB() {
  hadDB = fs.existsSync(DB_FILE);
  if (hadDB) fs.copyFileSync(DB_FILE, SNAP_FILE);
}
function restoreDB() {
  try {
    if (hadDB) {
      if (fs.existsSync(SNAP_FILE)) {
        fs.copyFileSync(SNAP_FILE, DB_FILE);
        fs.unlinkSync(SNAP_FILE);
      }
    } else {
      // DB was absent before the run; the server may have created it - remove it.
      if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
    }
  } catch (e) {
    console.error('WARN: could not restore data/db.json:', e && e.message);
  }
}

/* ---------- main ---------- */
async function main() {
  snapshotDB();

  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let childExited = false, childExitInfo = '';
  child.on('exit', (code, sig) => { childExited = true; childExitInfo = 'code=' + code + ' sig=' + sig; });
  // surface server crashes for debugging without polluting normal runs
  child.stderr.on('data', (d) => { process.stderr.write('[server] ' + d); });

  try {
    const ready = await waitForReady();
    if (!ready) {
      console.log('FAIL  server did not become ready within 10s' + (childExited ? ' (child exited ' + childExitInfo + ')' : ''));
      failed++;
      return; // finally still runs (kill + restore)
    }

    // 1. health
    let r = await request('GET', '/api/health');
    eq('health returns 200', r.status, 200);
    ok('health ok:true and org present', !!(r.body && r.body.ok && r.body.org), JSON.stringify(r.body));

    // 2. login admin / admin123
    r = await request('POST', '/api/login', { username: 'admin', password: 'admin123' });
    eq('login admin/admin123 returns 200', r.status, 200);
    let adminToken = r.body && r.body.token;
    ok('login admin returns token', !!adminToken, JSON.stringify(r.body));

    // 3. login wrong password -> 401
    r = await request('POST', '/api/login', { username: 'admin', password: 'wrongpass' });
    eq('login admin with wrong password -> 401', r.status, 401);

    // 4. admin user list (manager) includes admin
    r = await request('GET', '/api/admin/users', undefined, adminToken);
    eq('GET /api/admin/users returns 200', r.status, 200);
    ok("GET /api/admin/users includes 'admin'",
      Array.isArray(r.body) && r.body.some((u) => u && u.id === 'admin'),
      JSON.stringify(r.body));

    // 5. /api/me with token
    r = await request('GET', '/api/me', undefined, adminToken);
    eq('GET /api/me returns 200', r.status, 200);
    ok('GET /api/me returns the admin user',
      !!(r.body && r.body.user && r.body.user.id === 'admin'),
      JSON.stringify(r.body));

    // unauthenticated /api/me -> 401
    r = await request('GET', '/api/me');
    eq('GET /api/me without token -> 401', r.status, 401);

    // 6. create a uniquely named job
    const JOB = 'SMOKE-' + PID;
    r = await request('POST', '/api/jobs',
      { jobNo: JOB, machine: 'Flexo450', customer: 'StarKist', product: 'Smoke Test Label', description: 'smoke test job' },
      adminToken);
    eq('POST /api/jobs creates job (200)', r.status, 200);
    ok('created job has correct jobNo', !!(r.body && r.body.jobNo === JOB), JSON.stringify(r.body && r.body.jobNo));

    // 7. GET that job
    r = await request('GET', '/api/jobs/' + encodeURIComponent(JOB), undefined, adminToken);
    eq('GET /api/jobs/:jobNo returns 200', r.status, 200);
    ok('fetched job matches and machine is Flexo450',
      !!(r.body && r.body.jobNo === JOB && r.body.machine === 'Flexo450'),
      JSON.stringify(r.body && { jobNo: r.body.jobNo, machine: r.body.machine }));

    // 8. PUT stage 2 _done:true while stage 1 not done -> 409
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(JOB) + '/stage/2',
      { data: { _done: true, date: '2026-06-23', qaOfficer: 'A. Kumar' } },
      adminToken);
    eq('PUT stage 2 before stage 1 -> 409', r.status, 409);

    // 9. PUT stage 1 _done:true with EMPTY data -> 400 with missing[]
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(JOB) + '/stage/1',
      { data: { _done: true } },
      adminToken);
    eq('PUT stage 1 with empty data -> 400', r.status, 400);
    ok('400 body includes non-empty missing[]',
      !!(r.body && Array.isArray(r.body.missing) && r.body.missing.length > 0),
      JSON.stringify(r.body));

    // 10. PUT stage 1 with valid required fields -> 200
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(JOB) + '/stage/1',
      { data: { _done: true, date: '2026-06-23', qaOfficer: 'A. Kumar', proceed: 'Yes', materialType: 'BOPP White 60um' } },
      adminToken);
    eq('PUT stage 1 with valid fields -> 200', r.status, 200);
    ok('stage 1 now marked _done',
      !!(r.body && r.body.stage1 && r.body.stage1._done === true),
      JSON.stringify(r.body && r.body.stage1));

    // 10b. edit job metadata
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(JOB), { product: 'Edited Label', customer: 'StarKist' }, adminToken);
    eq('PUT /api/jobs/:jobNo edits metadata -> 200', r.status, 200);
    ok('job product updated', !!(r.body && r.body.product === 'Edited Label'), JSON.stringify(r.body && r.body.product));

    // 10c. clone job
    const CLONE = JOB + '-C';
    r = await request('POST', '/api/jobs/' + encodeURIComponent(JOB) + '/clone', { jobNo: CLONE }, adminToken);
    eq('POST /api/jobs/:jobNo/clone -> 200', r.status, 200);
    ok('clone has empty stage1', !!(r.body && r.body.stage1 && r.body.stage1._done === false), JSON.stringify(r.body && r.body.stage1));

    // 10d. delete the clone
    r = await request('DELETE', '/api/jobs/' + encodeURIComponent(CLONE), undefined, adminToken);
    eq('DELETE /api/jobs/:jobNo -> 200', r.status, 200);
    r = await request('GET', '/api/jobs/' + encodeURIComponent(CLONE), undefined, adminToken);
    eq('deleted clone now 404', r.status, 404);

    // 10e. backups status endpoint
    r = await request('GET', '/api/admin/backups', undefined, adminToken);
    eq('GET /api/admin/backups -> 200', r.status, 200);

    // 11. analytics returns kpis
    r = await request('GET', '/api/analytics', undefined, adminToken);
    eq('GET /api/analytics returns 200', r.status, 200);
    ok('analytics returns kpis object',
      !!(r.body && r.body.kpis && typeof r.body.kpis.total === 'number'),
      JSON.stringify(r.body && r.body.kpis));

    // 12. admin user lifecycle
    const NEWUSER = 'smoke' + PID;
    r = await request('POST', '/api/admin/users',
      { id: NEWUSER, name: 'Smoke Test User', role: 'QA Officer', password: 'secret123' },
      adminToken);
    eq('admin create user -> 200', r.status, 200);

    // duplicate create -> 409
    r = await request('POST', '/api/admin/users',
      { id: NEWUSER, name: 'Smoke Test User', role: 'QA Officer', password: 'secret123' },
      adminToken);
    eq('admin create duplicate user -> 409', r.status, 409);

    // PUT change role
    r = await request('PUT', '/api/admin/users/' + encodeURIComponent(NEWUSER),
      { role: 'Supervisor' },
      adminToken);
    eq('admin update user role -> 200', r.status, 200);
    ok('updated user has role Supervisor',
      !!(r.body && Array.isArray(r.body.users) && r.body.users.some((u) => u.id === NEWUSER && u.role === 'Supervisor')),
      JSON.stringify(r.body && r.body.users && r.body.users.find((u) => u.id === NEWUSER)));

    // DELETE it
    r = await request('DELETE', '/api/admin/users/' + encodeURIComponent(NEWUSER), undefined, adminToken);
    eq('admin delete user -> 200', r.status, 200);
    ok('deleted user no longer present',
      !!(r.body && Array.isArray(r.body.users) && !r.body.users.some((u) => u.id === NEWUSER)),
      'still present');

    // 13. non-manager cannot manage users -> 403
    r = await request('POST', '/api/login', { username: 'akumar', password: 'kumar123' });
    eq('login akumar (QA Officer) -> 200', r.status, 200);
    const officerToken = r.body && r.body.token;
    ok('akumar login returns token', !!officerToken, JSON.stringify(r.body));
    r = await request('POST', '/api/admin/users',
      { id: 'nope' + PID, name: 'Nope', role: 'QA Officer', password: 'secret123' },
      officerToken);
    eq('non-manager POST /api/admin/users -> 403', r.status, 403);

    // 14. self-service password change (My Account)
    r = await request('POST', '/api/me/password', { current: 'wrongpw', new: 'newpass123' }, adminToken);
    eq('change password with wrong current -> 401', r.status, 401);
    r = await request('POST', '/api/me/password', { current: 'admin123', new: 'x' }, adminToken);
    eq('change password too short -> 400', r.status, 400);
    r = await request('POST', '/api/me/password', { current: 'admin123', new: 'newpass123' }, adminToken);
    eq('change password -> 200', r.status, 200);
    ok('change password returns a fresh token', !!(r.body && r.body.token), JSON.stringify(r.body));
    adminToken = (r.body && r.body.token) || adminToken; // password change rotates the token (old ones are invalidated)
    r = await request('POST', '/api/login', { username: 'admin', password: 'newpass123' });
    eq('login with new password -> 200', r.status, 200);

    // 15. tamper-evident audit chain
    r = await request('GET', '/api/audit/verify', undefined, adminToken);
    eq('GET /api/audit/verify -> 200', r.status, 200);
    ok('audit chain intact (ok:true, checked>0)', !!(r.body && r.body.ok === true && r.body.checked > 0), JSON.stringify(r.body));

    // 16. CAPA lifecycle
    const CAPATITLE = 'Smoke CAPA ' + PID;
    r = await request('POST', '/api/capas', { title: CAPATITLE, jobNo: JOB, severity: 'High', source: 'smoke' }, adminToken);
    eq('POST /api/capas -> 200', r.status, 200);
    const capaId = r.body && r.body.id;
    ok('created CAPA has id and status Open', !!(capaId && r.body.status === 'Open'), JSON.stringify(r.body));

    r = await request('POST', '/api/capas', { jobNo: JOB }, adminToken);
    eq('POST /api/capas without title -> 400', r.status, 400);

    r = await request('GET', '/api/capas?status=Open', undefined, adminToken);
    ok('GET /api/capas?status=Open includes the new CAPA',
      Array.isArray(r.body) && r.body.some((c) => c.id === capaId), JSON.stringify(r.body && r.body.length));

    r = await request('PUT', '/api/capas/' + encodeURIComponent(capaId), { status: 'Closed', rootCause: 'identified' }, adminToken);
    eq('PUT /api/capas/:id close -> 200', r.status, 200);
    ok('closed CAPA has closedAt + closedBy',
      !!(r.body && r.body.status === 'Closed' && r.body.closedAt && r.body.closedBy === 'admin'),
      JSON.stringify(r.body && { s: r.body.status, by: r.body.closedBy }));

    r = await request('POST', '/api/capas', { title: 'nope' }, officerToken);
    eq('non-manager POST /api/capas -> 403', r.status, 403);

    // 17. analytics with filters returns trend + openCapas
    r = await request('GET', '/api/analytics?from=2000-01-01&to=2099-12-31', undefined, adminToken);
    eq('GET /api/analytics (filtered) -> 200', r.status, 200);
    ok('analytics has trend[] and kpis.openCapas',
      !!(r.body && Array.isArray(r.body.trend) && typeof r.body.kpis.openCapas === 'number'),
      JSON.stringify(r.body && r.body.kpis));

    // 18. restore guards (no actual restore — destructive)
    r = await request('POST', '/api/admin/restore', { name: '../../etc/passwd' }, adminToken);
    eq('restore with bad name -> 400', r.status, 400);
    r = await request('POST', '/api/admin/restore', { name: 'db-20260101-000000.json' }, officerToken);
    eq('non-admin restore -> 403', r.status, 403);

    // 19. login throttle: repeated failures lock the account out (unique user, isolated key)
    const LOCKUSER = 'lockme' + PID;
    let lastStatus = 0;
    for (let i = 0; i < 5; i++) { const rr = await request('POST', '/api/login', { username: LOCKUSER, password: 'bad' }); lastStatus = rr.status; }
    ok('5 bad logins all returned 401', lastStatus === 401, 'last=' + lastStatus);
    r = await request('POST', '/api/login', { username: LOCKUSER, password: 'bad' });
    eq('6th attempt locked out -> 429', r.status, 429);

    // 20. equipment & calibration register
    r = await request('GET', '/api/equipment', undefined, adminToken);
    eq('GET /api/equipment -> 200', r.status, 200);
    ok('equipment list computes calStatus', Array.isArray(r.body) && r.body.every((e) => typeof e.calStatus === 'string'), JSON.stringify(r.body && r.body.length));

    r = await request('POST', '/api/equipment', { name: 'Smoke Gauge ' + PID, type: 'Gauge', calibratedOn: '2020-01-01', calibrationIntervalDays: 30 }, adminToken);
    eq('POST /api/equipment -> 200', r.status, 200);
    const eqId = r.body && r.body.id;
    ok('new equipment with old cal date is Overdue', !!(eqId && r.body.calStatus === 'Overdue'), JSON.stringify(r.body && { s: r.body.calStatus, due: r.body.nextDue }));

    r = await request('POST', '/api/equipment', { type: 'Gauge' }, adminToken);
    eq('POST /api/equipment without name -> 400', r.status, 400);

    r = await request('POST', '/api/equipment/' + encodeURIComponent(eqId) + '/calibrate', { result: 'Pass', intervalDays: 365 }, adminToken);
    eq('POST /api/equipment/:id/calibrate -> 200', r.status, 200);
    ok('status is OK after a fresh calibration', !!(r.body && r.body.calStatus === 'OK'), JSON.stringify(r.body && r.body.calStatus));

    r = await request('POST', '/api/equipment', { name: 'nope' }, officerToken);
    eq('non-manager POST /api/equipment -> 403', r.status, 403);

    // 21. executive dashboard (RAG vs targets)
    r = await request('GET', '/api/exec', undefined, adminToken);
    eq('GET /api/exec -> 200', r.status, 200);
    ok('exec returns kpis[] scored R/A/G + lists',
      !!(r.body && Array.isArray(r.body.kpis) && r.body.kpis.length >= 4 && r.body.kpis.every((k) => ['green', 'amber', 'red'].includes(k.rag)) && r.body.lists),
      JSON.stringify(r.body && r.body.kpis && r.body.kpis.map((k) => k.key + ':' + k.rag)));
    r = await request('GET', '/api/exec', undefined, officerToken);
    eq('non-manager GET /api/exec -> 403', r.status, 403);

    // 22. API keys (read-only)
    r = await request('POST', '/api/admin/apikeys', { name: 'Smoke key ' + PID }, adminToken);
    eq('POST /api/admin/apikeys -> 200', r.status, 200);
    const apiKey = r.body && r.body.key, keyId = r.body && r.body.id;
    ok('API key returned once with gqa_ prefix', !!(apiKey && /^gqa_/.test(apiKey)), JSON.stringify(r.body && Object.keys(r.body)));

    r = await request('GET', '/api/jobs', undefined, undefined, apiKey);
    eq('API key GET /api/jobs -> 200', r.status, 200);
    r = await request('POST', '/api/capas', { title: 'viakey' }, undefined, apiKey);
    eq('API key write -> 403 (read-only)', r.status, 403);
    r = await request('GET', '/api/exec', undefined, undefined, apiKey);
    eq('API key on manager-only /exec -> 403', r.status, 403);
    r = await request('DELETE', '/api/admin/apikeys/' + encodeURIComponent(keyId), undefined, adminToken);
    eq('revoke API key -> 200', r.status, 200);
    r = await request('GET', '/api/jobs', undefined, undefined, apiKey);
    eq('revoked API key -> 401', r.status, 401);
    r = await request('POST', '/api/admin/apikeys', { name: 'x' }, officerToken);
    eq('non-admin POST /api/admin/apikeys -> 403', r.status, 403);

    // 23. webhooks
    // 192.0.2.x is TEST-NET-1 (RFC 5737): reserved/unroutable, so the fire-and-forget delivery goes
    // nowhere, while still passing the SSRF guard (which blocks loopback/link-local, not TEST-NET).
    r = await request('POST', '/api/admin/webhooks', { url: 'http://192.0.2.1/none', events: ['job.released'] }, adminToken);
    eq('POST /api/admin/webhooks -> 200', r.status, 200);
    const hookId = r.body && r.body.id;
    r = await request('POST', '/api/admin/webhooks', { url: 'not-a-url' }, adminToken);
    eq('webhook bad url -> 400', r.status, 400);
    r = await request('GET', '/api/admin/webhooks', undefined, adminToken);
    ok('webhook list returns events[] + hooks[]', !!(r.body && Array.isArray(r.body.events) && Array.isArray(r.body.hooks)), JSON.stringify(r.body && Object.keys(r.body)));
    r = await request('DELETE', '/api/admin/webhooks/' + encodeURIComponent(hookId), undefined, adminToken);
    eq('delete webhook -> 200', r.status, 200);

    // 24. Prometheus metrics
    r = await request('GET', '/metrics');
    eq('GET /metrics -> 200', r.status, 200);
    ok('/metrics exposes gqa_ gauges', typeof r.raw === 'string' && r.raw.indexOf('gqa_jobs_total') >= 0, (r.raw || '').slice(0, 40));

    // 25. SPC + supplier scorecards
    r = await request('GET', '/api/spc?param=cof', undefined, adminToken);
    eq('GET /api/spc -> 200', r.status, 200);
    ok('spc returns points[]/mean/cpk/violations',
      !!(r.body && Array.isArray(r.body.points) && 'mean' in r.body && 'cpk' in r.body && Array.isArray(r.body.violations)),
      JSON.stringify(r.body && { n: r.body.n, mean: r.body.mean }));
    r = await request('GET', '/api/spc?param=registration', undefined, adminToken);
    eq('GET /api/spc?param=registration -> 200', r.status, 200);
    r = await request('GET', '/api/suppliers', undefined, adminToken);
    eq('GET /api/suppliers -> 200', r.status, 200);
    ok('suppliers returns scorecards with fpy',
      Array.isArray(r.body) && (r.body.length === 0 || (typeof r.body[0].fpy === 'number' && typeof r.body[0].jobs === 'number')),
      JSON.stringify(r.body && r.body.length));

    // 26. NCR -> CAPA workflow
    r = await request('POST', '/api/ncrs', { jobNo: JOB, description: 'Smoke NCR ' + PID, disposition: 'Rework', severity: 'High' }, adminToken);
    eq('POST /api/ncrs -> 200', r.status, 200);
    const ncrId = r.body && r.body.id;
    ok('NCR created Open with no CAPA yet', !!(ncrId && r.body.status === 'Open' && !r.body.capaId), JSON.stringify(r.body && { s: r.body.status, capa: r.body.capaId }));
    r = await request('POST', '/api/ncrs', { jobNo: JOB }, adminToken);
    eq('NCR without description -> 400', r.status, 400);
    r = await request('POST', '/api/ncrs/' + encodeURIComponent(ncrId) + '/capa', undefined, adminToken);
    eq('promote NCR to CAPA -> 200', r.status, 200);
    ok('promote links a CAPA back to the NCR', !!(r.body && r.body.capa && r.body.capa.id && r.body.ncr.capaId === r.body.capa.id), JSON.stringify(r.body && r.body.ncr));
    r = await request('POST', '/api/ncrs/' + encodeURIComponent(ncrId) + '/capa', undefined, adminToken);
    eq('double promote -> 409', r.status, 409);
    r = await request('POST', '/api/ncrs', { description: 'x' }, officerToken);
    eq('non-manager POST /api/ncrs -> 403', r.status, 403);

    // 27. CAPA effectiveness verification
    r = await request('POST', '/api/capas', { title: 'Eff ' + PID }, adminToken);
    const effCapa = r.body && r.body.id;
    r = await request('PUT', '/api/capas/' + encodeURIComponent(effCapa), { status: 'Closed', effectiveness: 'Verified' }, adminToken);
    eq('CAPA effectiveness verify -> 200', r.status, 200);
    ok('effectiveness recorded with verifier', !!(r.body && r.body.effectiveness === 'Verified' && r.body.verifiedBy === 'admin' && r.body.verifiedAt), JSON.stringify(r.body && { e: r.body.effectiveness, by: r.body.verifiedBy }));

    // 28. competency gating (opt-in)
    r = await request('GET', '/api/admin/users', undefined, adminToken);
    ok('users expose qualifiedStages', Array.isArray(r.body) && r.body.every((u) => Array.isArray(u.qualifiedStages)), JSON.stringify(r.body && r.body[0]));
    await request('PUT', '/api/masterdata', { competencyEnforced: true }, adminToken);
    const compU = 'comp' + PID;
    await request('POST', '/api/admin/users', { id: compU, name: 'Comp Officer', role: 'QA Officer', password: 'secret123', qualifiedStages: [1] }, adminToken);
    let cr = await request('POST', '/api/login', { username: compU, password: 'secret123' });
    const compTok = cr.body && cr.body.token;
    const cjob = 'COMP-' + PID;
    await request('POST', '/api/jobs', { jobNo: cjob, machine: 'Flexo450' }, adminToken);
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(cjob) + '/stage/1', { data: { _done: true, date: '2026-06-23', qaOfficer: 'Comp', proceed: 'Yes', materialType: 'BOPP' } }, compTok);
    eq('qualified stage-1 complete -> 200', r.status, 200);
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(cjob) + '/stage/2', { data: { _done: true, date: '2026-06-23', qaOfficer: 'Comp', rows: [{ totalMeters: '100' }] } }, compTok);
    eq('unqualified stage-2 complete -> 403', r.status, 403);
    r = await request('PUT', '/api/jobs/' + encodeURIComponent(cjob) + '/stage/2', { data: { _done: true, date: '2026-06-23', qaOfficer: 'Admin', rows: [{ totalMeters: '100' }] } }, adminToken);
    eq('admin bypass stage-2 -> 200', r.status, 200);
    await request('PUT', '/api/masterdata', { competencyEnforced: false }, adminToken);
    await request('DELETE', '/api/admin/users/' + encodeURIComponent(compU), undefined, adminToken);

    // 29. Excel workbook export (SpreadsheetML)
    r = await request('GET', '/api/export/workbook.xls', undefined, adminToken);
    eq('GET /api/export/workbook.xls -> 200', r.status, 200);
    ok('workbook is SpreadsheetML with Jobs + CAPAs sheets',
      typeof r.raw === 'string' && r.raw.indexOf('<Workbook') >= 0 && r.raw.indexOf('ss:Name="Jobs"') >= 0 && r.raw.indexOf('ss:Name="CAPAs"') >= 0,
      (r.raw || '').slice(0, 60));

  } catch (e) {
    failed++;
    console.log('FAIL  unexpected error during run -> ' + (e && e.stack ? e.stack : e));
  } finally {
    // ALWAYS kill the child and restore the dev DB.
    try {
      if (!childExited) {
        child.kill('SIGTERM');
        // give it a moment, then force-kill if still alive
        const deadline = Date.now() + 3000;
        while (!childExited && Date.now() < deadline) await sleep(50);
        if (!childExited) child.kill('SIGKILL');
      }
    } catch (e) { /* ignore */ }
    restoreDB();
  }

  console.log('');
  console.log('Smoke summary: ' + passed + ' passed, ' + failed + ' failed.');
}

main()
  .then(() => { process.exit(failed > 0 ? 1 : 0); })
  .catch((e) => {
    console.error('Fatal:', e && e.stack ? e.stack : e);
    // best-effort restore even on fatal path
    try { restoreDB(); } catch (x) { /* ignore */ }
    process.exit(1);
  });
