const assert = require('assert');
const { makeDB } = require('./d1shim');
const authFor = require('./sess');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  global.fetch = async () => ({ ok: true, json: async () => ({}) });
  const env = { DB: makeDB(), ADMIN_PASS: 'secret', WA_DEV: '1', ASSETS: { fetch: async () => new Response('a') } };   // بلا RL_SCALE: الحدود الحقيقية
  const call = (path, init = {}, h = {}) => W.fetch(new Request('https://x.dev' + path, { ...init, headers: { 'content-type': 'application/json', ...h, ...(init.headers || {}) } }), env);
  const post = (path, body, h) => call(path, { method: 'POST', body: JSON.stringify(body) }, h);
  const order = (code, ph = '07701230001') => ({ code, name: 'Ali', ph, city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 1 }] });
  let adm = {};
  await ok('admin login is throttled after repeated wrong passwords, and logged', async () => {
    for (let i = 0; i < 8; i++) assert.strictEqual((await post('/login', { pw: 'bad' + i })).status, 401);
    assert.strictEqual((await post('/login', { pw: 'bad' })).status, 429);
    assert.strictEqual((await post('/login', { pw: 'secret' })).status, 429, 'correct password also blocked while throttled');
    env.DB.raw.prepare('delete from rate_limits').run();
    const r = await post('/login', { pw: 'secret' }); adm = { Authorization: 'Bearer ' + (await r.json()).token };
    const a = await (await call('/adm/audit', {}, adm)).json(); assert(a.items.some(i => i.action === 'login_failed') && a.items.some(i => i.action === 'login'));
    assert.strictEqual((await call('/adm/audit')).status, 401);
  });
  await ok('guest cannot place an order (API), signed-in customer can; account links the order', async () => {
    await post('/settings', { data: { P: [{ c: 'A1', n: 'Cleanser', p: 10000, o: 0, k: 'C', i: '' }] } }, adm);
    const g = await post('/order', order('LC-GST001')); assert.strictEqual(g.status, 401); assert.strictEqual((await g.json()).login, true);
    assert.strictEqual((await post('/order', order('LC-GST001'), { Authorization: 'Bearer c.' + 'a'.repeat(64) })).status, 401);
    const H = await authFor(env, '07701230001');
    const r = await post('/order', order('LC-OWN001'), H); assert.strictEqual(r.status, 200);
    const row = env.DB.raw.prepare('select customer_id from orders where code=?').get('LC-OWN001'); assert(row.customer_id);
    assert.strictEqual((await post('/order', order('LC-OWN001'), H).then(x => x.json())).duplicate, true);
  });
  await ok('phone of another account cannot be claimed; strangers cannot cancel', async () => {
    const H2 = await authFor(env, '07701230002');
    assert.strictEqual((await post('/order', order('LC-STL001', '07701230001'), H2)).status, 409);
    const H1 = await authFor(env, '07701230001');
    assert.strictEqual((await post('/order/cancel', { code: 'LC-OWN001', ph: '07709999999' }, H2)).status, 404);
    assert.strictEqual((await post('/order/cancel', { code: 'LC-OWN001', ph: '' }, H1)).status, 200);
  });
  await ok('orders are rate limited per account', async () => {
    const H = await authFor(env, '07701230003'); let last = 0;
    for (let i = 0; i < 10; i++) last = (await post('/order', order('LC-RL' + String(i).padStart(4, '0'), '07701230003'), H)).status;
    assert.strictEqual(last, 429);
  });
  await ok('customer login/register throttled; avatar validated and persisted; weak passwords refused', async () => {
    assert.strictEqual((await post('/auth/register', { email: 'a@b.co', pw: '11111111', name: 'Ann' })).status, 400);
    const r = await post('/auth/register', { email: 'a@b.co', pw: 'Str0ng-pass', name: 'Ann', avatar: 'av7' }); const j = await r.json();
    assert.strictEqual(j.customer.avatar, 'av7'); const H = { Authorization: 'Bearer ' + j.token };
    assert.strictEqual((await post('/me', { avatar: '<script>' }, H)).status, 400);
    assert.strictEqual((await post('/me', { avatar: 'av24' }, H)).status, 200);
    assert.strictEqual((await (await call('/me', {}, H)).json()).customer.avatar, 'av24');
    for (let i = 0; i < 8; i++) await post('/auth/login', { email: 'a@b.co', pw: 'wrong' + i });
    assert.strictEqual((await post('/auth/login', { email: 'a@b.co', pw: 'Str0ng-pass' })).status, 429);
    assert.strictEqual((await post('/auth/register', { email: 'x@y.co', pw: 'x'.repeat(500), name: 'Ann' })).status, 400);
  });
  await ok('OTP sends limited per IP; chat flood limited', async () => {
    let s = 0; for (let i = 0; i < 12; i++) s = (await post('/auth/otp/send', { ph: '0770123' + String(1000 + i) })).status;
    assert.strictEqual(s, 429);
    let c = 0; for (let i = 0; i < 45; i++) c = (await post('/chat/send', { text: 'hi ' + i, token: '' })).status;
    assert.strictEqual(c, 429);
  });
  await ok('CORS: foreign origins get no allow-origin, same origin does; nosniff set', async () => {
    const f = await call('/catalog', {}, { Origin: 'https://evil.example' });
    assert.strictEqual(f.headers.get('access-control-allow-origin'), null);
    const s = await call('/catalog', {}, { Origin: 'https://x.dev' });
    assert.strictEqual(s.headers.get('access-control-allow-origin'), 'https://x.dev');
    assert.strictEqual(s.headers.get('x-content-type-options'), 'nosniff');
  });
  await ok('dashboard counts + audit trail never hold secrets', async () => {
    await post('/adm/integrations', { WA_TOKEN: 'SUPERSECRET123', STORE_URL: 'https://s.t' }, adm);
    const d = await (await call('/adm/dashboard', {}, adm)).json(); assert('new_orders' in d && 'today_sales' in d && 'unread_support' in d);
    const a = JSON.stringify((await (await call('/adm/audit', {}, adm)).json())); assert(!a.includes('SUPERSECRET123')); assert(a.includes('integrations_save'));
  });
  console.log(n + ' security tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
