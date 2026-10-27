// Minimal D1 emulation on node:sqlite (for tests only)
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');
function makeDB() {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '../migrations/0001_init.sql'), 'utf8'));
  const stmt = sql => ({
    _sql: sql, _args: [],
    bind(...a) { this._args = a; return this; },
    async run() { const r = db.prepare(sql).run(...this._args); return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
    async first() { const r = db.prepare(sql).get(...this._args); return r ? { ...r } : null; },
    async all() { return { results: db.prepare(sql).all(...this._args).map(r => ({ ...r })) }; },
    _exec() { return db.prepare(sql).run(...this._args); },
  });
  return {
    raw: db,
    prepare: stmt,
    async batch(list) { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(s._exec()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
  };
}
module.exports = { makeDB };
