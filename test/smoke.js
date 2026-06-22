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
function request(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const headers = {};
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = data.length; }
    if (token) headers['x-token'] = token;
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

    // 2. users list (unauth) includes admin
    r = await request('GET', '/api/users');
    eq('GET /api/users returns 200', r.status, 200);
    ok('GET /api/users returns array', Array.isArray(r.body), typeof r.body);
    ok("GET /api/users includes 'admin'",
      Array.isArray(r.body) && r.body.some((u) => u && u.id === 'admin'),
      JSON.stringify(r.body));

    // 3. login admin / 0000
    r = await request('POST', '/api/login', { userId: 'admin', pin: '0000' });
    eq('login admin/0000 returns 200', r.status, 200);
    const adminToken = r.body && r.body.token;
    ok('login admin/0000 returns token', !!adminToken, JSON.stringify(r.body));

    // 4. login wrong pin -> 401
    r = await request('POST', '/api/login', { userId: 'admin', pin: '9999' });
    eq('login admin with wrong pin -> 401', r.status, 401);

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

    // 11. analytics returns kpis
    r = await request('GET', '/api/analytics', undefined, adminToken);
    eq('GET /api/analytics returns 200', r.status, 200);
    ok('analytics returns kpis object',
      !!(r.body && r.body.kpis && typeof r.body.kpis.total === 'number'),
      JSON.stringify(r.body && r.body.kpis));

    // 12. admin user lifecycle
    const NEWUSER = 'smoke' + PID;
    r = await request('POST', '/api/admin/users',
      { id: NEWUSER, name: 'Smoke Test User', role: 'QA Officer', pin: '4321' },
      adminToken);
    eq('admin create user -> 200', r.status, 200);

    // duplicate create -> 409
    r = await request('POST', '/api/admin/users',
      { id: NEWUSER, name: 'Smoke Test User', role: 'QA Officer', pin: '4321' },
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
    r = await request('POST', '/api/login', { userId: 'akumar', pin: '1234' });
    eq('login akumar/1234 (QA Officer) -> 200', r.status, 200);
    const officerToken = r.body && r.body.token;
    ok('akumar login returns token', !!officerToken, JSON.stringify(r.body));
    r = await request('POST', '/api/admin/users',
      { id: 'nope' + PID, name: 'Nope', role: 'QA Officer', pin: '0000' },
      officerToken);
    eq('non-manager POST /api/admin/users -> 403', r.status, 403);

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
