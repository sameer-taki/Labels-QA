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
    async close() {} };
}

function makePostgres(url) {
  const { Pool } = require('pg'); // lazy: only loaded when Postgres is actually used
  const pool = new Pool({ connectionString: url, max: 4, application_name: 'golden-qa' });
  pool.on('error', (e) => console.error('PG pool error:', e && e.message));
  let ensured = false;
  async function ensure() {
    if (ensured) return;
    await pool.query('CREATE TABLE IF NOT EXISTS app_state (id int PRIMARY KEY, doc jsonb NOT NULL)');
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
    async load() { await waitForDb(); await ensure(); const r = await pool.query('SELECT doc FROM app_state WHERE id = 1'); return r.rows[0] ? r.rows[0].doc : null; },
    async save(o) { await ensure(); await pool.query('INSERT INTO app_state (id, doc) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc', [JSON.stringify(o)]); },
    async ready() { try { await pool.query('SELECT 1'); return true; } catch (e) { return false; } },
    async close() { try { await pool.end(); } catch (e) {} } };
}

module.exports = { makeStorage };
