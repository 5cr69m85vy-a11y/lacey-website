/* Authorization sweep: every /adm/* route found in source must reject unauthenticated callers
   (any method), and admin tokens must be signed, expiring and non-forgeable. */
const assert = require('assert'), fs = require('fs');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  global.fetch = async () => ({ ok: true, json: async () => ({}) });
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('nf', { status: 404 }) } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } }), env);
  const src = fs.readdirSync(__dirname + '/../worker').filter(f => f.endsWith('.js')).map(f => fs.readFileSync(__dirname + '/../worker/' + f, 'utf8')).join('\n');
  const routes = new Set();
  for (const m of src.matchAll(/\bp\s*===\s*'(\/adm\/[^']*)'/g)) routes.add(m[1]);
  for (const m of src.matchAll(/\bp\.startsWith\('(\/adm\/[^']*)'\)/g)) routes.add(m[1] + 'x');
  let n = 0;
  for (const r of routes) for (const M of ['GET', 'POST', 'DELETE']) {
    const res = await call(r, { method: M, body: M === 'GET' ? undefined : '{}' });
    assert(![200, 201, 500].includes(res.status), `${M} ${r} answered ${res.status} without authentication`);
    n++;
  }
  console.log('✓ ' + routes.size + ' admin routes × 3 methods reject anonymous callers (' + n + ' checks)');
  const login = async pw => (await call('/login', { method: 'POST', body: JSON.stringify({ pw }) })).json();
  const { token } = await login('secret');
  const withTok = t => call('/settings', { headers: { Authorization: 'Bearer ' + t } });
  assert.strictEqual((await withTok(token)).status, 200, 'fresh token works');
  const [exp, sig] = token.split('.');
  assert(+exp > Date.now() + 13 * 864e5 && +exp < Date.now() + 15 * 864e5, 'token expires in ~14 days');
  assert.strictEqual((await withTok((Date.now() - 1000) + '.' + sig)).status, 401, 'expiry cannot be edited');
  assert.strictEqual((await withTok((+exp + 864e5) + '.' + sig)).status, 401, 'expiry extension breaks the signature');
  assert.strictEqual((await withTok(exp + '.' + '0'.repeat(64))).status, 401, 'forged signature rejected');
  assert.strictEqual((await withTok('')).status, 401);
  /* a token minted for an expired time with the right key must also be rejected */
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const old = Date.now() - 5000, s2 = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('lacey-admin:' + old)))].map(b => b.toString(16).padStart(2, '0')).join('');
  assert.strictEqual((await withTok(old + '.' + s2)).status, 401, 'expired but correctly signed token rejected');
  /* legacy non-expiring token format (HMAC of constant) is no longer accepted */
  const legacy = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('lacey-admin')))].map(b => b.toString(16).padStart(2, '0')).join('');
  assert.strictEqual((await withTok(legacy)).status, 401, 'legacy permanent token rejected');
  console.log('✓ admin token: signed, expiring, unforgeable, legacy format revoked');
})().catch(e => { console.error(e); process.exit(1); });
