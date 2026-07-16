'use strict';
/* Unified async persistence for the Golden QA DB document.
   Driver is chosen at startup:
     - postgres : when DATABASE_URL is set (the standard deploy; uses the 'pg' package).
                  This is the system of record for every containerised install.
     - json     : local/dev fallback only — data/db.json (zero-dependency).
   The whole DB object is stored as a single JSON document, so the app keeps its
   load-whole / save-whole semantics regardless of backend. Single-writer (one app
   container / worker), which the deployment playbook assumes. */
const fs = require('fs');

function makeStorage(opts) {
  opts = opts || {};
  if (opts.databaseUrl) return makePostgres(opts.databaseUrl);
  // Postgres is the production store (DATABASE_URL). With no DATABASE_URL we use the local
  // JSON file. SQLite is intentionally not supported — a misconfigured driver name must not
  // silently switch persistence to a different, empty file, so we warn loudly and use JSON.
  if (opts.driverPref && opts.driverPref !== 'json') {
    console.warn("STORAGE: driver '" + opts.driverPref + "' is not supported. Using the local JSON file store; set DATABASE_URL to use PostgreSQL.");
  }
  return makeJson(opts.dbFile);
}

/* JSON file store with a crash-safe write: serialise -> write to a temp file -> fsync ->
   copy the current file to <db>.bak -> atomic rename over the real file. A crash mid-write
   therefore leaves either the previous complete file or the new complete file, never a
   truncated one; load() falls back to the .bak if the primary is ever unreadable. */
function makeJson(dbFile) {
  const tmpFile = dbFile + '.tmp';
  const bakFile = dbFile + '.bak';
  return { driver: 'json',
    async load() {
      for (const f of [dbFile, bakFile]) {
        try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); }
        catch (e) { console.error('STORAGE: ' + f + ' is unreadable (' + (e && e.message) + ')' + (f === dbFile ? ' — trying ' + bakFile : '')); }
      }
      return null;
    },
    async save(o) {
      const data = JSON.stringify(o, null, 2);
      const fd = fs.openSync(tmpFile, 'w');
      try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      try { if (fs.existsSync(dbFile)) fs.copyFileSync(dbFile, bakFile); } catch (e) { /* best-effort backup */ }
      fs.renameSync(tmpFile, dbFile); // atomic on the same filesystem
    },
    async ready() { return true; },
    // Single OS process owns the JSON file, so no cross-writer lock is needed. The request
    // handler still calls acquireLock/releaseLock, so give it harmless no-ops.
    async acquireLock() { return null; },
    async releaseLock() {},
    async close() {} };
}

function makePostgres(url) {
  const { Pool } = require('pg'); // lazy: only loaded when Postgres is actually used
  // On serverless (Vercel) many stateless invocations hit the DB, so allow a few more clients
  // than the classic single-container deploy. Point DATABASE_URL at Supabase's SESSION-mode
  // pooler (port 5432): session pooling keeps a client pinned to one backend for its lifetime,
  // which is what pg_advisory_lock (below) needs to serialise writes across all invocations.
  const max = Number(process.env.PG_POOL_MAX) || 8;
  const ssl = /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, max, application_name: 'golden-qa', ssl,
    idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000 });
  pool.on('error', (e) => console.error('PG pool error:', e && e.message));
  // 63-bit key for the global write lock (stable across processes): any constant works.
  const LOCK_KEY = Number(process.env.PG_LOCK_KEY) || 774411;
  // Table name is configurable so this app can share a Supabase project with another app
  // without an app_state collision. Validated as a bare SQL identifier (no injection surface).
  const TBL = (/^[A-Za-z_][A-Za-z0-9_]*$/.test(process.env.PG_STATE_TABLE || '') ? process.env.PG_STATE_TABLE : 'app_state');
  let ensured = false;
  async function ensure() {
    if (ensured) return;
    await pool.query('CREATE TABLE IF NOT EXISTS ' + TBL + ' (id int PRIMARY KEY, doc jsonb NOT NULL)');
    ensured = true;
  }
  async function waitForDb() {
    let last;
    for (let i = 0; i < 30; i++) {
      try { await pool.query('SELECT 1'); return; }
      catch (e) { last = e; if (i === 0) console.log('STORAGE: waiting for PostgreSQL…'); await new Promise(r => setTimeout(r, 1000)); }
    }
    throw last;
  }
  return { driver: 'postgres',
    async load() { await waitForDb(); await ensure(); const r = await pool.query('SELECT doc FROM ' + TBL + ' WHERE id = 1'); return r.rows[0] ? r.rows[0].doc : null; },
    async save(o) { await ensure(); await pool.query('INSERT INTO ' + TBL + ' (id, doc) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc', [JSON.stringify(o)]); },
    async ready() { try { await pool.query('SELECT 1'); return true; } catch (e) { return false; } },
    /* Cross-instance write serialisation. A mutating request checks out a dedicated client,
       takes a session-level advisory lock, and holds the client until releaseLock(). Because
       every writer blocks on the same key, only one request runs its load→mutate→save cycle at
       a time, so the whole-document store never suffers a lost update — the reason this app
       assumed a single writer on-prem. Reads skip the lock (a single SELECT is a consistent
       snapshot). Returns the held client as an opaque handle. */
    async acquireLock() {
      await waitForDb(); await ensure();
      const client = await pool.connect();
      try { await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]); }
      catch (e) { client.release(); throw e; }
      return client;
    },
    async releaseLock(handle) {
      if (!handle) return;
      try { await handle.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]); }
      catch (e) { /* best-effort: releasing the client below also drops session locks */ }
      finally { try { handle.release(); } catch (e) {} }
    },
    async close() { try { await pool.end(); } catch (e) {} } };
}

module.exports = { makeStorage };
