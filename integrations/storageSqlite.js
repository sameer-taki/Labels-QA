'use strict';
/* OPTIONAL SQLite-backed storage adapter (zero external deps, uses built-in node:sqlite).
   Requires Node >= 22.5 where node:sqlite first shipped (experimental). On older Node,
   require() throws and available() returns false, so the server transparently keeps the
   default JSON-file persistence. Mirrors loadDB/saveDB semantics exactly: the WHOLE DB
   object is stored as a single JSON row, so nothing else in server.js needs to change.
   Default storage stays JSON; this only activates when config.json sets storage.driver==='sqlite'. */

// Probe for node:sqlite once. Wrapped so importing this file never crashes on older Node.
let DatabaseSync = null;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (e) { DatabaseSync = null; }

// True only when the built-in module loaded (i.e. Node >= 22.5 with sqlite available).
function available() { return !!DatabaseSync; }

// Open (or create) the DB file at dbPath and return a small store with the same
// shape the server expects: load() -> object|null, save(obj) -> void, close() -> void.
function makeStore(dbPath) {
  if (!DatabaseSync) throw new Error('node:sqlite unavailable (requires Node >= 22.5)');
  const db = new DatabaseSync(dbPath);
  // Single-row table: id is pinned to 1 so the whole DB object lives in one JSON cell.
  db.exec('CREATE TABLE IF NOT EXISTS doc (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)');
  const selStmt = db.prepare('SELECT json FROM doc WHERE id = 1');
  // Upsert: insert the row, or overwrite its json on conflict with the pinned id.
  const upStmt = db.prepare('INSERT INTO doc (id, json) VALUES (1, $json) ON CONFLICT(id) DO UPDATE SET json = excluded.json');

  // Returns the parsed DB object, or null when the table is empty (first run -> seed).
  function load() {
    const row = selStmt.get();
    if (!row || row.json == null) return null;
    return JSON.parse(row.json);
  }
  // Persist the whole DB object as one JSON row (matches saveDB's JSON.stringify(...,2)).
  function save(obj) {
    upStmt.run({ $json: JSON.stringify(obj, null, 2) });
  }
  // Release the file handle (used on shutdown; safe to call once).
  function close() { try { db.close(); } catch (e) {} }

  return { load, save, close };
}

module.exports = { available, makeStore };
