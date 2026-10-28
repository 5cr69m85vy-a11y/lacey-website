const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const env = { DB: makeDB(), ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const post = (path, body, h = {}) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
  const H = { Authorization: 'Bearer ' + (await (await post('/login', { pw: 'secret' })).json()).token };
  const P = [{ c: 'A1', n: 'Cleanser', p: 10000 }, { c: 'B2', n: 'Serum', p: 30000 }];
  await post('/settings', { data: { P, sf: 5000, pm: [{ id: 'cod', n: 'COD', on: 1 }, { id: 'zain', n: 'Zain', on: 1 }, { id: 'off', n: 'Off', on: 0 }] } }, H);
  const code = (o) => post('/codes', o, H);
  const q = async (codes, items = [{ c: 'A1', q: 2 }, { c: 'B2', q: 1 }], extra = {}) => (await post('/quote', { items, codes, ...extra })).json();
  await code({ code: 'P10', kind: 'percent', value: 10 });
  await code({ code: 'MINUS5', kind: 'amount', value: 5000, stack: true });
  await code({ code: 'P5S', kind: 'percent', value: 5, stack: true });
  await code({ code: 'ONLYA', kind: 'percent', value: 50, prods: ['A1'] });
  await code({ code: 'BIG', kind: 'amount', value: 1000, min: 100000 });
  await code({ code: 'OLD', kind: 'percent', value: 10, exp: Date.now() - 1000 });
  await code({ code: 'SHIP', kind: 'free_shipping' });
  await code({ code: 'SHIPA', kind: 'free_shipping', prods: ['B2'] });

  await ok('no code: subtotal + shipping fee', async () => { const r = await q([]); assert.deepStrictEqual([r.subtotal, r.shipping, r.total], [50000, 5000, 55000]); });
  await ok('percent code; validation of bad input', async () => {
    assert.strictEqual((await q(['P10'])).discount, 5000);
    assert.strictEqual((await code({ code: 'x', kind: 'percent', value: 5 }, H)).status, 400);
    assert.strictEqual((await call('/codes')).status, 401);
  });
  await ok('product-restricted code only discounts its products', async () => {
    assert.strictEqual((await q(['ONLYA'])).discount, 10000);                       // 50% of 20000
    const r = await q(['ONLYA'], [{ c: 'B2', q: 1 }]); assert.strictEqual(r.rejected[0].reason, 'not_applicable');
  });
  await ok('stacking: non-stackable + stackable ok? no; two stackable ok; two non-stackable rejected', async () => {
    assert.strictEqual((await q(['P10', 'MINUS5'])).rejected[0].reason, 'not_stackable');
    const r = await q(['MINUS5', 'P5S']); assert.strictEqual(r.discount, 5000 + 2500); assert.strictEqual(r.rejected.length, 0);
    assert.strictEqual((await q(['P10', 'ONLYA'])).rejected[0].code, 'ONLYA');
  });
  await ok('min cart, expiry, unknown code', async () => {
    assert.strictEqual((await q(['BIG'])).rejected[0].reason, 'min_cart');
    assert.strictEqual((await q(['OLD'])).rejected[0].reason, 'expired');
    assert.strictEqual((await q(['NOPE'])).rejected[0].reason, 'invalid');
  });
  await ok('free shipping (all / specific products) combines with discounts', async () => {
    let r = await q(['SHIP', 'P10']); assert.deepStrictEqual([r.shipping, r.freeShip, r.total], [0, true, 45000]);
    r = await q(['SHIPA'], [{ c: 'A1', q: 1 }]); assert.strictEqual(r.shipping, 5000);
    r = await q(['SHIPA']); assert.strictEqual(r.shipping, 0);
  });
  await ok('order uses server totals, counts usage, stores shipping + pay method; client cannot tamper', async () => {
    const o = await (await post('/order', { code: 'LC-SHOP01', name: 'Ali', ph: '07701112222', city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 2, p: 1 }, { c: 'B2', q: 1 }], codes: ['SHIP', 'P10'], pay: 'zain' })).json();
    assert.strictEqual(o.total, 45000);
    const row = env.DB.raw.prepare("select shipping,pay_method,free_shipping f from orders where code='LC-SHOP01'").get();
    assert.deepStrictEqual([row.shipping, row.pay_method, row.f], [0, 'zain', 1]);
    assert.strictEqual(env.DB.raw.prepare("select used from discount_codes where code='P10'").get().used, 1);
    const o2 = await (await post('/order', { code: 'LC-SHOP02', name: 'Ali', ph: '07701112222', city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 1 }], pay: 'off' })).json();
    assert.strictEqual(env.DB.raw.prepare("select pay_method from orders where code='LC-SHOP02'").get().pay_method, 'cod'); assert.strictEqual(o2.total, 15000);
  });
  await ok('disable + delete codes; max uses', async () => {
    await code({ code: 'P10', kind: 'percent', value: 10, active: false }); assert.strictEqual((await q(['P10'])).rejected[0].reason, 'invalid');
    await code({ code: 'ONE', kind: 'percent', value: 10, max: 1 }); await post('/order', { code: 'LC-SHOP03', name: 'Ali', ph: '07701112223', city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 1 }], codes: ['ONE'] });
    assert.strictEqual((await q(['ONE'])).rejected[0].reason, 'used_up');
    await call('/codes?code=ONE', { method: 'DELETE', headers: H }); assert.strictEqual((await q(['ONE'])).rejected[0].reason, 'invalid');
    const l = await (await call('/codes', { headers: H })).json(); assert(l.codes.some(c => c.code === 'SHIP'));
  });
  console.log(n + ' shop tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
