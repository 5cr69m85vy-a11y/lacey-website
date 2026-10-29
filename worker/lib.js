/* lib.js — أدوات مشتركة بين وحدات الخادم */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
export const J = (d, s = 200, h = {}) => new Response(JSON.stringify(d), {
  status: s, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...h },
});
export const now = () => Date.now();
export const jp = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } };
export const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(36)).join('').slice(0, n).toUpperCase();
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
export const today = () => new Date().toISOString().slice(0, 10);
export const money = n => Number(n || 0).toLocaleString('en-US');
export const cfgOf = async env => jp(((await env.DB.prepare("SELECT value FROM settings WHERE key='config'").first()) || {}).value, {});

/* بناء الجداول تلقائياً عند أول تشغيل (يغني عن تشغيل migrations يدوياً) */
import { MIGRATIONS } from './schema.js';
let ready = null;
export function ensureSchema(env) {
  return ready ||= (async () => {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, at INTEGER)').run();
    const done = new Set((await env.DB.prepare('SELECT name FROM _migrations').all()).results.map(r => r.name));
    for (const [name, sql] of MIGRATIONS) {
      if (done.has(name)) continue;
      const stmts = sql.replace(/--[^\n]*/g, '').split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean);
      for (const s of stmts) {
        try { await env.DB.prepare(s).run(); }
        catch (e) { if (!/duplicate column|already exists|UNIQUE constraint/i.test(String(e.message))) throw e; }
      }
      await env.DB.prepare('INSERT OR IGNORE INTO _migrations(name,at) VALUES(?,?)').bind(name, Date.now()).run();
    }
  })().catch(e => { ready = null; throw e; });
}

/* مفاتيح الربط المحفوظة من لوحة التحكم (تتقدّم على أسرار Cloudflare) */
export const IG_KEYS = ['WA_TOKEN', 'WA_PHONE_ID', 'WA_LANG', 'WA_TPL_OTP', 'WA_TPL_WELCOME', 'WA_TPL_ORDER', 'WA_TPL_PROMO', 'STORE_URL', 'GOOGLE_CLIENT_ID', 'BOT_TOKEN', 'CHAT_ID', 'ANTHROPIC_API_KEY', 'AI_MODEL', 'AI_ON', 'AI_PROMPT'];
export const IG_SECRET = ['WA_TOKEN', 'BOT_TOKEN', 'ANTHROPIC_API_KEY'];
let igCache = null, igAt = 0, igDb = null;
export const resetIg = () => { igCache = null; };
export async function readIg(env) {
  if (!igCache || igDb !== env.DB || Date.now() - igAt > 15000) {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='integrations'").first();
    igCache = jp(row && row.value, {}) || {}; igAt = Date.now(); igDb = env.DB;
  }
  return igCache;
}
export async function withIntegrations(env) {
  const v = await readIg(env), o = { ...env };
  for (const k of IG_KEYS) if (v[k]) o[k] = v[k];
  return o;
}
