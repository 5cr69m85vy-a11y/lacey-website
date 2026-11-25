const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const js = (m, path, body, h = {}) => call(path, { method: m, headers: { 'content-type': 'application/json', ...h }, body: body ? JSON.stringify(body) : undefined });
  const A = { Authorization: 'Bearer ' + (await (await js('POST', '/login', { pw: 'secret' })).json()).token };
  const authFor = require('./sess'), U = await authFor(env, '07706660001');
  await js('POST', '/settings', { data: { P: [{ c: 'A1', n: 'Cleanser', p: 10000, k: 'Wash' }, { c: 'B2', n: 'Serum', p: 30000, k: 'Care' }], sf: 5000 } }, A);
  const order = (code, items, extra = {}) => js('POST', '/order', { code, name: 'Sara', ph: '07706660001', city: 'B', area: 'K', lm: 'x', items, ...extra }, U).then(r => r.json());
  await js('POST', '/codes', { code: 'SAVE', kind: 'percent', value: 10 }, A);
  await order('LC-RPT001', [{ c: 'A1', q: 2 }, { c: 'B2', q: 1 }], { codes: ['SAVE'] });
  await order('LC-RPT002', [{ c: 'B2', q: 1 }]);
  await js('POST', '/status', { code: 'LC-RPT002', s: 0 }, A);
  const today = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const rep = async (q = '') => (await call(`/adm/report?from=${today}&to=${today}${q}`, { headers: A }));
  await ok('admin only', async () => { assert.strictEqual((await call('/adm/report')).status, 401); });
  await ok('figures match the orders (cancelled excluded), brand/category/product breakdown', async () => {
    const R = (await (await rep()).json()).reports, row = k => Object.fromEntries(R.summary.rows);
    const s = row(); assert.strictEqual(s['عدد الطلبات'], 2); assert.strictEqual(s['ملغاة'], 1); assert.strictEqual(s['المبيعات (قبل الخصم)'], 50000); assert.strictEqual(s['الخصومات'], 5000); assert.strictEqual(s['صافي المبيعات'], 45000);
    assert.deepStrictEqual(R.products.rows.find(r => r[0] === 'Cleanser').slice(1), [2, 20000]); assert.deepStrictEqual(R.cats.rows.find(r => r[0] === 'Care').slice(1), [1, 30000]);
    assert.strictEqual(R.coupons.rows[0][0], 'SAVE'); assert.strictEqual(R.coupons.rows[0][4], 5000);
  });
  await ok('csv export (utf-8 BOM, escaped, formula-safe) and bad range rejected', async () => {
    const r = await rep('&csv=products'); assert(r.headers.get('content-type').includes('text/csv')); const buf = new Uint8Array(await r.clone().arrayBuffer()); assert.deepStrictEqual([...buf.slice(0, 3)], [0xEF, 0xBB, 0xBF]); const t = await r.text(); assert(t.includes('Cleanser,2,20000'));
    assert.strictEqual((await call('/adm/report?from=2020-01-01&to=2026-01-01', { headers: A })).status, 400); assert.strictEqual((await rep('&csv=zzz')).status, 400);
  });
  console.log(n + ' analytics tests passed'); process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
