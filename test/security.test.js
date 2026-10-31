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
    assert.strictEqual((await post('/auth/register', { email: 'a@b.co', pw: '11111111', name: 'Ann', birth: '2001-02-03' })).status, 400);
    const r = await post('/auth/register', { email: 'a@b.co', pw: 'Str0ng-pass', name: 'Ann', avatar: 'av7', birth: '2001-02-03' }); const j = await r.json();
    assert.strictEqual(j.customer.avatar, 'av7'); const H = { Authorization: 'Bearer ' + j.token };
    assert.strictEqual((await post('/me', { avatar: '<script>' }, H)).status, 400); assert.strictEqual((await post('/me', { avatar: 'av37' }, H)).status, 400);
    assert.strictEqual((await post('/me', { avatar: 'av36' }, H)).status, 200);
    assert.strictEqual((await (await call('/me', {}, H)).json()).customer.avatar, 'av36');
    for (let i = 0; i < 8; i++) await post('/auth/login', { email: 'a@b.co', pw: 'wrong' + i });
    assert.strictEqual((await post('/auth/login', { email: 'a@b.co', pw: 'Str0ng-pass' })).status, 429);
    assert.strictEqual((await post('/auth/register', { email: 'x@y.co', pw: 'x'.repeat(500), name: 'Ann', birth: '2001-02-03' })).status, 400);
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
  await ok('receipt image: owner only, PNG only, once, sent to Telegram as a photo', async () => {
    const photos = []; const prev = global.fetch;
    global.fetch = async (u, init) => { if (String(u).includes('sendPhoto')) photos.push(init.body.get('photo').size); return { ok: true, json: async () => ({}) }; };
    env.BOT_TOKEN = 'T'; env.CHAT_ID = '1';
    const A1 = await authFor(env, '07705550001'), A2 = await authFor(env, '07705550002');
    const rc = 'LC-RCPT01'; assert.strictEqual((await post('/order', order(rc, '07705550001'), A1)).status, 200);
    const png = new Uint8Array(900); png.set([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
    const up = (h, body = png) => call('/order/receipt', { method: 'POST', body, headers: { 'content-type': 'image/png', 'x-order': rc, ...h } });
    assert.strictEqual((await up({})).status, 401);
    assert.strictEqual((await up(A2)).status, 404);
    assert.strictEqual((await up(A1, new Uint8Array(900))).status, 400);
    assert.strictEqual((await up(A1)).status, 200); assert.deepStrictEqual(photos, [900]);
    assert.strictEqual((await (await up(A1)).json()).duplicate, true); assert.strictEqual(photos.length, 1);
    global.fetch = prev; delete env.BOT_TOKEN; delete env.CHAT_ID;
  });
  await ok('accounts need a birth date and age 15+; ordering requires it; birth cannot be changed later', async () => {
    const reg = (birth, email) => post('/auth/register', { email, pw: 'Str0ng-pass9', name: 'Lina', birth });
    const yr = new Date().getUTCFullYear();
    assert.strictEqual((await reg('', 'k1@x.co')).status, 400);
    assert.strictEqual((await reg('2999-01-01', 'k2@x.co')).status, 400);
    assert.strictEqual((await reg('2031-02-30', 'k3@x.co')).status, 400);
    assert.strictEqual((await reg(`${yr - 14}-01-01`, 'k4@x.co')).status, 400, '14 years old refused');
    const ok15 = await reg(`${yr - 16}-01-01`, 'k5@x.co'); assert.strictEqual(ok15.status, 200); const j = await ok15.json(); assert.strictEqual(j.customer.age, 16);
    const H = { Authorization: 'Bearer ' + j.token };
    assert.strictEqual((await post('/me', { birth: `${yr - 40}-01-01` }, H)).status, 200);
    assert.strictEqual((await (await call('/me', {}, H)).json()).customer.age, 16, 'birth is set once');
    const old = await env.DB.prepare("INSERT INTO customers(email,name,created_at,last_seen_at) VALUES('nb@x.co','NB',1,1) RETURNING id").first();
    const { newSession } = await import('../worker/auth.js'); const H2 = { Authorization: 'Bearer ' + await newSession(env, old.id) };
    const r = await post('/order', order('LC-NOBRTH', '07705551234'), H2); assert.strictEqual(r.status, 403); assert.strictEqual((await r.json()).need_profile, true);
    assert.strictEqual((await post('/me', { birth: `${yr - 20}-06-06`, skin: 'oily' }, H2)).status, 200);
    assert.strictEqual((await post('/me', { skin: 'bogus' }, H2)).status, 400);
    assert.strictEqual((await post('/order', order('LC-NOBRTH', '07705551234'), H2)).status, 200);
  });
  await ok('page routes serve the storefront; product inquiry attaches a product card and goes to staff', async () => {
    for (const p of ['/routine', '/categories', '/offers', '/cart', '/checkout', '/account', '/account/orders', '/support']) { const r = await call(p); assert.strictEqual(r.status, 200, p); }
    await post('/settings', { data: { P: [{ c: 'LC101', n: 'Foaming Cleanser', p: 12000, i: '' }] } }, adm);
    const IP = { 'CF-Connecting-IP': '9.9.9.9' };
    const s = await (await post('/chat/send', { text: 'هل LC101 مناسب للبشرة الدهنية؟', name: 'Sara' }, IP)).json();
    const pl = await (await call('/chat/poll?token=' + s.token, {}, IP)).json();
    assert.strictEqual(pl.mode, 'human'); const cm = pl.messages.find(m => m.sender === 'customer'); assert.strictEqual(cm.meta.product.c, 'LC101');
    const s2 = await (await post('/chat/send', { text: 'سؤال', product: 'lc101', token: s.token }, IP)).json(); assert.strictEqual(s2.chat, s.chat);
    const none = await (await post('/chat/send', { text: 'هل XX999 جيد؟', name: 'Z' }, IP)).json(); const p2 = await (await call('/chat/poll?token=' + none.token, {}, IP)).json(); assert(!p2.messages.some(m => m.meta && m.meta.product));
  });
  console.log(n + ' security tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
