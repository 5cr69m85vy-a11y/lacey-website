const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const authFor = require('./sess');
  const js = (m, path, body, h = {}) => call(path, { method: m, headers: { 'content-type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined });
  const A = { Authorization: 'Bearer ' + (await (await js('POST', '/login', { pw: 'secret' })).json()).token };
  await js('POST', '/settings', { data: { P: [{ c: 'A1', n: 'Cleanser', p: 50000 }], sf: 0 } }, A);
  const U = await authFor(env, '07705550001');
  const bal = async () => (await (await js('GET', '/me/points', null, U)).json());
  const order = (code, extra = {}) => js('POST', '/order', { code, name: 'Sara', ph: '07705550001', city: 'B', area: 'K', lm: 'x', items: [{ c: 'A1', q: 1 }], ...extra }, U).then(r => r.json());
  const status = (code, s) => js('POST', '/status', { code, s }, A);
  const cfg = o => js('POST', '/adm/loy', o, A);
  const cid = () => env.DB.raw.prepare('select id from customers where phone=?').get('07705550001').id;

  await ok('program is off and inert until admin sets approved numbers', async () => {
    assert.strictEqual((await bal()).live, false);
    let r = await order('LC-LOY001'); assert.strictEqual(r.total, 50000);
    await status('LC-LOY001', 5); assert.strictEqual((await bal()).balance, 0);
    assert.strictEqual((await cfg({ on: 1, val: 0, per: 0 })).status, 400);
  });
  await ok('admin only', async () => { assert.strictEqual((await js('GET', '/adm/loy')).status, 401); assert.strictEqual((await js('POST', '/adm/loy/adjust', { customer_id: 1, points: 5, note: 'xx' })).status, 401); });
  await ok('earn once on delivery (idempotent), floor per unit', async () => {
    assert.strictEqual((await cfg({ on: 1, unit: 10000, per: 100, val: 5, min: 100, maxpct: 50, exp: 12 })).status, 200);
    await order('LC-LOY002'); await status('LC-LOY002', 5); await status('LC-LOY002', 5);
    const b = await bal(); assert.strictEqual(b.balance, 500);
    assert.strictEqual(env.DB.raw.prepare("select count(*) n from points_ledger where kind='earn' and order_code='LC-LOY002'").get().n, 1);
  });
  await ok('redeem: capped by max %, min, balance; reduces total; no double redeem', async () => {
    let r = await js('POST', '/quote', { items: [{ c: 'A1', q: 1 }], redeem: 9999 }, U).then(x => x.json()); // cap 50% of 50000 = 25000 / 5 = 5000 pts but balance 500
    assert.deepStrictEqual([r.pts, r.ptsValue, r.total], [500, 2500, 47500]);
    r = await js('POST', '/quote', { items: [{ c: 'A1', q: 1 }], redeem: 50 }, U).then(x => x.json()); assert.strictEqual(r.pts, 0); assert(r.ptsError);
    const o = await order('LC-LOY003', { redeem: 300 }); assert.strictEqual(o.total, 48500);
    assert.strictEqual((await bal()).balance, 200);
    const dup = await order('LC-LOY003', { redeem: 300 }); assert.strictEqual(dup.duplicate, true); assert.strictEqual((await bal()).balance, 200);
  });
  await ok('concurrent redemptions cannot overspend', async () => {
    const rs = await Promise.all(['LC-LOY004', 'LC-LOY005', 'LC-LOY006'].map(c => order(c, { redeem: 150 })));
    assert(rs.filter(x => x.total < 50000).length <= 1, JSON.stringify(rs)); assert(await bal().then(b => b.balance) >= 0);
  });
  await ok('cancel restores redeemed points and reverses earned (never negative)', async () => {
    const before = (await bal()).balance;
    const okc = env.DB.raw.prepare("select code from orders where pts_used>0 and status=1 limit 1").get();
    await status(okc.code, 0); await status(okc.code, 0);
    const b = await bal(); assert(b.balance >= before); assert.strictEqual(env.DB.raw.prepare("select count(*) n from points_ledger where kind='restore' and order_code=?").get(okc.code).n, 1);
  });
  await ok('admin adjust needs reason, cannot go negative; ledger append-only via API', async () => {
    const id = cid(), cur = (await bal()).balance;
    assert.strictEqual((await js('POST', '/adm/loy/adjust', { customer_id: id, points: 10, note: '' }, A)).status, 400);
    assert.strictEqual((await js('POST', '/adm/loy/adjust', { customer_id: id, points: -(cur + 1), note: 'test neg' }, A)).status, 409);
    assert.strictEqual((await js('POST', '/adm/loy/adjust', { customer_id: id, points: 25, note: 'gift' }, A)).status, 200);
    assert.strictEqual((await bal()).balance, cur + 25);
    const s = await (await js('GET', '/adm/loy/c?q=07705550001', null, A)).json(); assert(s.history.length > 3);
  });
  await ok('points expire after the configured months, never below zero', async () => {
    const id = cid(); const cur = (await bal()).balance;
    env.DB.raw.prepare("update points_ledger set expires_at=1 where customer_id=? and remaining>0").run(id);
    await call('/health').catch(() => {}); await W.scheduled({}, env, { waitUntil: p => p });
    const b = await bal(); assert.strictEqual(b.balance, 0, 'all lots expired'); assert(cur > 0);
    assert(env.DB.raw.prepare("select count(*) n from points_ledger where kind='expire'").get().n >= 1);
  });
  console.log(n + ' loyalty tests passed'); process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
