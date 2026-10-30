const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const wa = []; global.fetch = async (u, i) => { const b = JSON.parse(i.body); if (String(u).includes('graph.facebook.com')) wa.push(b); return { ok: true, json: async () => ({}) }; };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', WA_TOKEN: 't', WA_PHONE_ID: '123', STORE_URL: 'https://shop.test', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const authFor = require('./sess');
  const post = async (path, body, h = {}) => { if (path === '/order' && !h.Authorization && body && /^07\d{9}$/.test(body.ph || '')) h = { ...h, ...(await authFor(env, body.ph)) }; return call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }); };
  const adm = async () => ({ Authorization: 'Bearer ' + (await (await post('/login', { pw: 'secret' })).json()).token });
  await post('/settings', { data: { P: [{ c: 'A1', n: 'Cleanser', p: 10000 }] } }, await adm());
  let tok = '', ph = '07705550001';
  const code = () => /(\d{6})/.exec(wa.filter(m => m.type === 'text' && /رمز/.test(m.text.body)).pop().text.body)[1];

  await ok('OTP: invalid phone rejected; code goes to WhatsApp only (never in response)', async () => {
    assert.strictEqual((await post('/auth/otp/send', { ph: '123' })).status, 400);
    const r = await post('/auth/otp/send', { ph }); const j = await r.json();
    assert.deepStrictEqual(j, { ok: true });
    assert.strictEqual(wa.at(-1).to, '9647705550001');
  });
  await ok('OTP: wrong code counted, right code logs in, welcome WhatsApp with store link', async () => {
    assert.strictEqual((await post('/auth/otp/verify', { ph, code: '000000' })).status, 401);
    const r = await post('/auth/otp/verify', { ph, code: code(), name: 'Sara' }); const j = await r.json();
    assert(j.token.startsWith('c.')); tok = j.token; assert.strictEqual(j.customer.name, 'Sara'); assert(j.customer.wa);
    assert(wa.some(m => m.type === 'text' && m.text.body.includes('https://shop.test')), 'welcome w/ link');
    assert.strictEqual((await post('/auth/otp/verify', { ph, code: code() })).status, 410, 'code single-use');
  });
  await ok('OTP: rate limited after 3 sends; verify locks after 5 bad tries', async () => {
    const p2 = '07705550002';
    for (let i = 0; i < 3; i++) assert.strictEqual((await post('/auth/otp/send', { ph: p2 })).status, 200);
    assert.strictEqual((await post('/auth/otp/send', { ph: p2 })).status, 429);
    for (let i = 0; i < 5; i++) await post('/auth/otp/verify', { ph: p2, code: '111111' });
    assert.strictEqual((await post('/auth/otp/verify', { ph: p2, code: code() })).status, 410);
  });
  await ok('/me requires session; profile update persists', async () => {
    assert.strictEqual((await call('/me')).status, 401);
    const H = { Authorization: 'Bearer ' + tok, 'content-type': 'application/json' };
    await call('/me', { method: 'POST', headers: H, body: JSON.stringify({ city: 'Baghdad', area: 'Karrada', lm: 'school' }) });
    const m = await (await call('/me', { headers: H })).json(); assert.strictEqual(m.customer.city, 'Baghdad');
  });
  await ok('order by logged-in customer links to account; receipt issued on confirm; shows in /me/*', async () => {
    const H = { Authorization: 'Bearer ' + tok };
    const o = await (await post('/order', { code: 'LC-ABC123', name: 'Sara', ph, city: 'Baghdad', area: 'K', lm: 'x', items: [{ c: 'A1', q: 2 }] }, H)).json();
    assert.strictEqual(o.total, 20000);
    let mo = await (await call('/me/orders', { headers: H })).json(); assert.strictEqual(mo.orders.length, 1);
    await post('/status', { code: 'LC-ABC123', s: 2 }, await adm());
    mo = await (await call('/me/orders', { headers: H })).json(); assert.strictEqual(mo.orders[0].receipt, 'LR-001001');
    const rc = await (await call('/me/receipts', { headers: H })).json(); assert.strictEqual(rc.receipts[0].total, 20000);
    const nt = await (await call('/me/notifications', { headers: H })).json(); assert(nt.items.some(x => /LC-ABC123/.test(x.text)));
    assert(wa.some(m => m.text && m.text.body.includes('LC-ABC123')), 'status sent on WhatsApp');
  });
  await ok('email: register, duplicate, weak password, login wrong/right', async () => {
    const r = await post('/auth/register', { email: 'A@B.com', pw: 'password1', name: 'Noor' }); assert.strictEqual(r.status, 200);
    assert.strictEqual((await post('/auth/register', { email: 'a@b.com', pw: 'password1', name: 'Nn' })).status, 409);
    assert.strictEqual((await post('/auth/register', { email: 'c@d.com', pw: 'short', name: 'Noor' })).status, 400);
    assert.strictEqual((await post('/auth/login', { email: 'a@b.com', pw: 'nope' })).status, 401);
    const l = await (await post('/auth/login', { email: 'a@b.com', pw: 'password1' })).json(); assert.strictEqual(l.customer.name, 'Noor');
  });
  await ok('email account verifies phone by OTP → merges into existing phone customer', async () => {
    const l = await (await post('/auth/login', { email: 'a@b.com', pw: 'password1' })).json();
    const H = { Authorization: 'Bearer ' + l.token };
    const p3 = '07705550003';
    await post('/order', { code: 'LC-ZZZ111', name: 'Noor', ph: p3, city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 1 }] });
    await post('/auth/otp/send', { ph: p3 });
    const v = await (await post('/auth/otp/verify', { ph: p3, code: code() }, H)).json();
    assert.strictEqual(v.customer.email, 'a@b.com'); assert.strictEqual(v.customer.ph, p3); assert.strictEqual(v.customer.orders, 1);
    assert.strictEqual((await post('/auth/login', { email: 'a@b.com', pw: 'password1' })).status, 200);
  });
  await ok('google: disabled without client id; logout kills session', async () => {
    assert.strictEqual((await post('/auth/google', { credential: 'x' })).status, 503);
    await post('/auth/logout', {}, { Authorization: 'Bearer ' + tok });
    assert.strictEqual((await call('/me', { headers: { Authorization: 'Bearer ' + tok } })).status, 401);
  });
  console.log(n + ' auth tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
