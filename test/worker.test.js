const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const sent = []; global.fetch = async (u, i) => { sent.push({ u, body: JSON.parse(i.body) }); return { ok: true }; };
  const env = { DB: makeDB(), ADMIN_PASS: 'secret', BOT_TOKEN: 'T', CHAT_ID: '1', ASSETS: { fetch: async () => new Response('asset') } };
  const call = (path, init = {}, e = env) => W.fetch(new Request('https://x.dev' + path, init), e);
  const post = (path, body, h = {}) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
  let tok = '';
  const A = () => ({ Authorization: 'Bearer ' + tok });
  const P = [{ c: 'A1', n: 'Cleanser', p: 10000, o: 0, k: 'Cleansers', i: '' }, { c: 'B2', n: 'Serum', p: 25000, o: 30000, k: 'Serums', i: '' }];
  const order = (o = {}) => ({ code: 'LC-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X'), name: 'Ali', ph: '07701234567', city: 'Baghdad', area: 'Karrada', lm: 'near school', items: [{ c: 'A1', q: 2 }, { c: 'B2', q: 1 }], ...o });

  await ok('login: refused without ADMIN_PASS; wrong/right password', async () => {
    assert.strictEqual((await post('/login', { pw: 'x' }, {}, ) && (await W.fetch(new Request('https://x.dev/login', { method: 'POST', body: '{"pw":"1234"}' }), { DB: env.DB }))).status, 503);
    assert.strictEqual((await post('/login', { pw: 'bad' })).status, 401);
    const r = await post('/login', { pw: 'secret' }); tok = (await r.json()).token; assert(tok.length === 64);
  });
  await ok('catalog empty before first save; admin routes need auth', async () => {
    assert.deepStrictEqual(await (await call('/catalog')).json(), { srv: true, data: null });
    assert.strictEqual((await post('/settings', { data: {} })).status, 401);
    assert.strictEqual((await call('/orders')).status, 401);
  });
  await ok('settings save → public catalog hides secrets, keeps products in order', async () => {
    const r = await post('/settings', { data: { ann: 'hello', pw: 'pp', tk: 'tg', tid: '9', C: [{ c: 'WELCOME10', v: 10 }], P, O: [1], vis: { a: 1 } } }, A());
    assert.strictEqual((await r.json()).products, 2);
    const c = (await (await call('/catalog')).json()).data;
    assert.strictEqual(c.ann, 'hello'); assert.deepStrictEqual(c.P.map(x => x.c), ['A1', 'B2']);
    for (const k of ['pw', 'tk', 'tid', 'O', 'vis']) assert(!(k in c), k + ' leaked');
    const full = (await (await call('/settings', { headers: A() })).json()).data; assert.strictEqual(full.pw, 'pp');
  });
  await ok('deleting + reordering products persists', async () => {
    await post('/settings', { data: { ann: 'x', C: [{ c: 'WELCOME10', v: 10 }], P: [P[1]] } }, A());
    assert.deepStrictEqual((await (await call('/catalog')).json()).data.P.map(x => x.c), ['B2']);
    await post('/settings', { data: { ann: '', C: [{ c: 'WELCOME10', v: 10 }], P } }, A());
    const c = (await (await call('/catalog')).json()).data; assert.strictEqual(c.ann, ''); assert.strictEqual(c.P.length, 2);
  });
  await ok('oversized product image rejected with clear error', async () => {
    const r = await post('/settings', { data: { P: [{ c: 'Z', n: 'big', p: 1, i: 'x'.repeat(1_900_000) }] } }, A());
    assert.strictEqual(r.status, 413); assert((await r.json()).error.includes('Z'));
    assert.strictEqual((await (await call('/catalog')).json()).data.P.length, 2, 'nothing changed');
  });
  let o1;
  await ok('order: server recomputes prices, applies % code, creates customer + welcome code', async () => {
    o1 = order({ dc: 'welcome10', items: [{ c: 'A1', q: 2, p: 1 }, { c: 'B2', q: 1, p: 1 }] });
    const j = await (await post('/order', o1)).json();
    assert.strictEqual(j.subtotal, 45000); assert.strictEqual(j.discount, 4500); assert.strictEqual(j.total, 40500);
    assert(/^WEL/.test(j.welcome)); assert(j.id > 1000);
    assert(sent.some(s => s.body.text.includes('طلب جديد')), 'telegram notified');
    const q = await call('/track?code=' + o1.code); const t = await q.json();
    assert.strictEqual(t.s, 1); assert.strictEqual(t.cancelable, true); assert.strictEqual(t.total, 40500); assert(!('ph' in t));
  });
  await ok('order: bad phone / unknown product / bad code rejected; duplicate is idempotent', async () => {
    assert.strictEqual((await post('/order', order({ ph: '123' }))).status, 400);
    assert.strictEqual((await post('/order', order({ items: [{ c: 'NOPE', q: 1 }] }))).status, 400);
    assert.strictEqual((await post('/order', order({ code: 'bad' }))).status, 400);
    assert.strictEqual((await (await post('/order', o1)).json()).duplicate, true);
    assert.strictEqual(env.DB.raw.prepare('select count(*) n from orders').get().n, 1);
  });
  await ok('welcome code is phone-bound, usable by that phone only, and public /code works', async () => {
    const code = env.DB.raw.prepare("select code from discount_codes where auto=1").get().code;
    assert.strictEqual((await call('/code?c=' + code)).status, 200);
    const other = await (await post('/order', order({ ph: '07801112222', dc: code }))).json(); assert.strictEqual(other.discount, 0);
    const mine = await (await post('/order', order({ dc: code }))).json(); assert.strictEqual(mine.discount, 4500);
    assert.strictEqual((await call('/code?c=NOPE')).status, 404);
  });
  await ok('customer cancel inside 10-minute window; second cancel is a no-op; wrong phone refused', async () => {
    const c = order(); await post('/order', c);
    assert.strictEqual((await post('/order/cancel', { code: c.code, ph: '07999999999' })).status, 404);
    assert.strictEqual((await (await post('/order/cancel', { code: c.code, ph: c.ph })).json()).s, 0);
    assert.strictEqual((await (await post('/order/cancel', { code: c.code, ph: c.ph })).json()).s, 0);
    assert.strictEqual((await (await call('/track?code=' + c.code)).json()).s, 0);
  });
  await ok('after 10 minutes: cancel refused (409) and order auto-confirmed', async () => {
    const c = order(); await post('/order', c);
    env.DB.raw.prepare('update orders set created_at=? where code=?').run(Date.now() - 10 * 60 * 1000 - 1000, c.code);
    assert.strictEqual((await post('/order/cancel', { code: c.code, ph: c.ph })).status, 409);
    const t = await (await call('/track?code=' + c.code)).json(); assert.strictEqual(t.s, 2); assert.strictEqual(t.cancelable, false);
    assert.deepStrictEqual(t.events.map(e => e.s), [1, 2]);
  });
  await ok('cron sweep confirms due orders; younger ones untouched', async () => {
    const a = order(), b = order(); await post('/order', a); await post('/order', b);
    env.DB.raw.prepare('update orders set created_at=? where code=?').run(Date.now() - 11 * 60 * 1000, a.code);
    await W.scheduled({}, env);
    const st = c => env.DB.raw.prepare('select status from orders where code=?').get(c).status;
    assert.strictEqual(st(a.code), 2); assert.strictEqual(st(b.code), 1);
  });
  await ok('admin moves order through shipping steps; events + notifications recorded', async () => {
    const c = order(); await post('/order', c);
    for (const s of [2, 3, 4, 5]) assert.strictEqual((await post('/status', { code: c.code, s }, A())).status, 200);
    const t = await (await call('/track?code=' + c.code)).json(); assert.strictEqual(t.s, 5); assert.deepStrictEqual(t.events.map(e => e.s), [1, 2, 3, 4, 5]);
    const q = env.DB.raw.prepare("select count(*) n from notifications where template='order_status' and payload like ?").get('%' + c.code + '%').n;
    assert.strictEqual(q, 4);
    assert.strictEqual((await post('/status', { code: c.code, s: 9 }, A())).status, 400);
    assert.strictEqual((await post('/status', { code: c.code, s: 3 })).status, 401);
  });
  await ok('admin lists: orders (client shape), customers, customer detail, discounts, stats', async () => {
    const os = (await (await call('/orders', { headers: A() })).json()).orders; assert(os.length >= 5); assert(os[0].ph && os[0].items && 'st' in os[0] && 'd' in os[0]);
    const cs = await (await call('/customers', { headers: A() })).json(); assert(cs[0].orders >= 1 && cs[0].spent > 0);
    const d = await (await call('/customer?ph=07701234567', { headers: A() })).json(); assert(d.orders.length >= 3 && d.discounts.length >= 1);
    const g = await (await post('/discount', { ph: '07701234567', value: 15 }, A())).json(); assert(/^CUST/.test(g.code));
    assert((await (await call('/discounts', { headers: A() })).json()).some(x => x.code === g.code && x.value === 15));
    await post('/visit', {}); await post('/visit', {}); assert.strictEqual(Object.values((await (await call('/stats', { headers: A() })).json()).days)[0], 2);
  });
  await ok('unknown path falls through to static assets', async () => assert.strictEqual(await (await call('/index.html')).text(), 'asset'));
  console.log(`\n${n} tests passed`);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
