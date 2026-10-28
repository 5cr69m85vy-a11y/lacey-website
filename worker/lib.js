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
