'use strict';
/* Unified async persistence for the Golden QA DB document.
   Driver is chosen at startup:
     - postgres : when DATABASE_URL is set (container deploy; uses the 'pg' package)
     - sqlite   : when config.storage.driver==='sqlite' and node:sqlite is available (Node 22.5+)
     - json     : default — data/db.json (zero-dependency, local/on-prem)
   The whole DB object is stored as a single JSON document, so the app keeps its
   load-whole / save-whole semantics regardless of backend. Single-writer (one app
   container / worker), which the deployment playbook assumes. */
const fs = require('fs');

function makeStorage(opts) {
  opts = opts || {};
  if (opts.databaseUrl) return makePostgres(opts.databaseUrl);
  if (opts.driverPref === 'sqlite') {
    const S = require('./storageSqlite');
    if (S.available()) {
      const st = S.makeStore(opts.sqlitePath);
      return { driver: 'sqlite',
        async load() { return st.load(); },
        async save(o) { st.save(o); },
        async ready() { try { st.load(); return true; } catch (e) { return false; } },
        async close() { try { st.close(); } catch (e) {} } };
    }
    console.warn('STORAGE: sqlite requested but node:sqlite unavailable — falling back to JSON file.');
  }
  return makeJson(opts.dbFile);
}

function makeJson(dbFile) {
  return { driver: 'json',
    async load() { return fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : null; },
    async save(o) { fs.writeFileSync(dbFile, JSON.stringify(o, null, 2)); },
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
