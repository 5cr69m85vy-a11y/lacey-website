const assert = require('assert');
const { makeDB } = require('./d1shim');
const authFor = require('./sess');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  let calls = [];
  global.fetch = async (u, init = {}) => {
    u = String(u); calls.push({ u, init });
    const J = d => ({ ok: true, status: 200, json: async () => d });
    if (u.includes('alwaseet-iq.net/v1/merchant/login')) return J({ status: true, data: { token: 'TKN' } });
    if (u.includes('/citys')) return J({ status: true, data: [{ id: 1, city_name: 'بغداد' }, { id: 2, city_name: 'البصرة' }] });
    if (u.includes('/regions')) return J({ status: true, data: [{ id: 11, region_name: 'الكرادة' }, { id: 12, region_name: 'المنصور' }] });
    if (u.includes('/package-sizes')) return J({ status: true, data: [{ id: 1, size: 'صغير' }] });
    if (u.includes('/create-order')) return J({ status: true, data: { qr_id: 'W123', qr_link: 'https://w/p.pdf' } });
    if (u.includes('/get-orders-by-ids-bulk')) return J({ status: true, data: [{ qr_id: 'W123', status: 'تم التسليم للزبون' }] });
    if (u.startsWith('https://courier.example')) return J({ tracking: 'C-77', link: 'https://courier.example/t/C-77' });
    return J({});
  };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('<html><head><title>Lacey Skincare</title></head><body><section id="prd" data-pg="product"></section></body></html>', { headers: { 'content-type': 'text/html' } }) } };
  const call = (path, init = {}, h = {}) => W.fetch(new Request('https://x.dev' + path, { ...init, headers: { 'content-type': 'application/json', ...h, ...(init.headers || {}) } }), env);
  const post = (path, body, h) => call(path, { method: 'POST', body: JSON.stringify(body) }, h);
  const get = async (path, h) => (await call(path, {}, h)).json();
  const adm = { Authorization: 'Bearer ' + (await (await post('/login', { pw: 'secret' })).json()).token };
  const order = (code, items, city = 'بغداد') => ({ code, name: 'Ali', ph: '07701110001', city, area: 'الكرادة', lm: 'x', items });
  await post('/settings', { data: { sf: 5000, sg: { 'بغداد': 3000, 'البصرة': 7000 }, P: [{ c: 'A1', n: 'Cleanser', p: 10000, k: 'C', i: '', d: '<p>غسول لطيف</p>', ing: 'Niacinamide, Zinc' }, { c: 'A2', n: 'Serum', p: 20000, k: 'S', i: '' }] } }, adm);
  const H = await authFor(env, '07701110001');

  await ok('shipping fee per governorate (falls back to the default fee)', async () => {
    const q = c => post('/quote', { items: [{ c: 'A1', q: 1 }], city: c }).then(r => r.json());
    assert.strictEqual((await q('بغداد')).shipping, 3000); assert.strictEqual((await q('محافظة البصرة')).shipping, 7000); assert.strictEqual((await q('دهوك')).shipping, 5000); assert.strictEqual((await q('')).shipping, 5000);
  });
  await ok('stock: admin sets quantities; public catalog shows them; sold-out and over-quantity are refused', async () => {
    assert.strictEqual((await post('/adm/stock', { items: [{ code: 'A1', qty: 3, low: 2 }] }, adm)).status, 200);
    assert.strictEqual((await post('/adm/stock', { items: [{ code: 'A1', qty: 3 }] })).status, 401);
    const cat = (await get('/catalog')).data; const a1 = cat.P.find(p => p.c === 'A1'); assert.strictEqual(a1.left, 3); assert.strictEqual(cat.P.find(p => p.c === 'A2').left, undefined);
    const r = await post('/quote', { items: [{ c: 'A1', q: 4 }] }); assert.strictEqual(r.status, 400); assert(/3/.test((await r.json()).error));
    assert.strictEqual((await post('/order', order('LC-STK001', [{ c: 'A1', q: 2 }]), H)).status, 200);
    assert.strictEqual(env.DB.raw.prepare("select qty from stock where code='A1'").get().qty, 1);
    const over = await post('/order', order('LC-STK002', [{ c: 'A1', q: 2 }]), H); assert.strictEqual(over.status, 400);
    assert.strictEqual((await post('/order', order('LC-STK003', [{ c: 'A1', q: 1 }]), H)).status, 200);
    const out = await post('/order', order('LC-STK004', [{ c: 'A1', q: 1 }]), H); assert.strictEqual(out.status, 400); assert(/نفد/.test((await out.json()).error));
    assert.strictEqual((await get('/catalog')).data.P.find(p => p.c === 'A1').left, 0);
  });
  await ok('stock: cancelling an order puts the quantity back (once); saving the catalog never overwrites quantities', async () => {
    assert.strictEqual((await post('/order/cancel', { code: 'LC-STK001', ph: '07701110001' }, H)).status, 200);
    assert.strictEqual(env.DB.raw.prepare("select qty from stock where code='A1'").get().qty, 2);
    await post('/order/cancel', { code: 'LC-STK001', ph: '07701110001' }, H);
    assert.strictEqual(env.DB.raw.prepare("select qty from stock where code='A1'").get().qty, 2, 'not restocked twice');
    const cat = (await get('/catalog')).data; await post('/settings', { data: { ...cat, P: cat.P.map(p => ({ ...p, left: 999 })) } }, adm);
    assert.strictEqual(env.DB.raw.prepare("select qty from stock where code='A1'").get().qty, 2);
    const list = await get('/adm/stock', adm); assert(list.items.find(i => i.code === 'A2').qty === null && list.items.find(i => i.code === 'A1').qty === 2);
    await post('/adm/stock', { items: [{ code: 'A1', qty: null }] }, adm); assert.strictEqual(env.DB.raw.prepare("select count(*) n from stock").get().n, 0);
  });
  await ok('delivery: Al-Waseet — connection test, regions guess, send creates the shipment, status refresh marks it delivered', async () => {
    await post('/adm/integrations', { DLV_PROVIDER: 'waseet', DLV_USER: 'shop', DLV_PASS: 'pw123' }, adm);
    const t = await (await post('/adm/delivery/test', {}, adm)).json(); assert.strictEqual(t.ok, true); assert(/2/.test(t.msg));
    assert.strictEqual((await post('/order', order('LC-DLV001', [{ c: 'A1', q: 1 }]), H)).status, 200);
    const info = await get('/adm/delivery/info?code=LC-DLV001', adm); assert.strictEqual(info.city_id, 1); assert.strictEqual(info.guess, 11); assert.strictEqual(info.regions.length, 2);
    assert.strictEqual((await post('/adm/delivery/send', { code: 'LC-DLV001' }, adm)).status, 400, 'region required');
    calls = []; const s = await (await post('/adm/delivery/send', { code: 'LC-DLV001', region_id: 11 }, adm)).json(); assert.strictEqual(s.ref, 'W123');
    const created = calls.find(c => c.u.includes('/create-order')); const fd = created.init.body; assert.strictEqual(fd.get('client_mobile'), '+9647701110001'); assert.strictEqual(fd.get('city_id'), '1'); assert.strictEqual(fd.get('price'), String(13000));
    const o = env.DB.raw.prepare("select status,delivery_ref,delivery_provider from orders where code='LC-DLV001'").get(); assert.deepStrictEqual({ ...o }, { status: 3, delivery_ref: 'W123', delivery_provider: 'waseet' });
    assert.strictEqual((await post('/adm/delivery/send', { code: 'LC-DLV001', region_id: 11 }, adm)).status, 409);
    assert.strictEqual((await post('/adm/delivery/send', { code: 'LC-DLV001' })).status, 401);
    const r = await (await post('/adm/delivery/refresh', {}, adm)).json(); assert.strictEqual(r.n, 1);
    assert.strictEqual(env.DB.raw.prepare("select status from orders where code='LC-DLV001'").get().status, 5);
  });
  await ok('delivery: custom company (HTTPS API) + inbound webhook protected by a secret key', async () => {
    await post('/adm/integrations', { DLV_PROVIDER: 'custom', DLV_URL: 'http://insecure.example/x' }, adm);
    assert.strictEqual((await post('/order', order('LC-DLV002', [{ c: 'A2', q: 1 }]), H)).status, 200);
    assert.strictEqual((await post('/adm/delivery/send', { code: 'LC-DLV002' }, adm)).status, 400, 'https only');
    await post('/adm/integrations', { DLV_URL: 'https://courier.example/api/orders', DLV_TOKEN: 'secret-token' }, adm);
    const s = await (await post('/adm/delivery/send', { code: 'LC-DLV002' }, adm)).json(); assert.strictEqual(s.ref, 'C-77');
    const sent = calls.filter(c => c.u.startsWith('https://courier.example')).pop(); assert.strictEqual(sent.init.headers.Authorization, 'Bearer secret-token'); assert.strictEqual(JSON.parse(sent.init.body).order.code, 'LC-DLV002');
    assert.strictEqual((await post('/delivery/hook?key=x', { code: 'LC-DLV002', status: 'delivered' })).status, 401, 'no key configured');
    const k = (await (await post('/adm/delivery/genkey', {}, adm)).json()).key; assert(k.length >= 32);
    assert.strictEqual((await post('/delivery/hook?key=wrong', { code: 'LC-DLV002', status: 'x' })).status, 401);
    assert.strictEqual((await post('/delivery/hook?key=' + k, { ref: 'C-77', status: 'مع المندوب في الطريق' })).status, 200);
    const o = env.DB.raw.prepare("select status,delivery_status from orders where code='LC-DLV002'").get(); assert.strictEqual(o.status, 4); assert(/المندوب/.test(o.delivery_status));
    const ig = await get('/adm/integrations', adm); assert.strictEqual(ig.DLV_PASS.value, undefined); assert.strictEqual(ig.DLV_KEY.set, true);
  });
  await ok('SEO: product page has title/description/canonical/JSON-LD + static content; sitemap and robots; unknown product is 404 noindex', async () => {
    const r = await call('/p/A1'); assert.strictEqual(r.status, 200); const h = await r.text();
    assert(/<title>Cleanser \|/.test(h) && /rel="canonical" href="https:\/\/x\.dev\/p\/A1"/.test(h) && /application\/ld\+json/.test(h) && /"@type":"Product"/.test(h) && /<h1>Cleanser<\/h1>/.test(h) && /Niacinamide/.test(h));
    assert(/InStock/.test(h)); await post('/adm/stock', { items: [{ code: 'A1', qty: 0 }] }, adm); assert(/OutOfStock/.test(await (await call('/p/A1')).text()));
    const nf = await call('/p/NOPE'); assert.strictEqual(nf.status, 404); assert(/noindex/.test(await nf.text()));
    const sm = await (await call('/sitemap.xml')).text(); assert(/<loc>https:\/\/x\.dev\/p\/A1<\/loc>/.test(sm) && /<loc>https:\/\/x\.dev\/p\/A2<\/loc>/.test(sm));
    const rb = await (await call('/robots.txt')).text(); assert(/Sitemap: https:\/\/x\.dev\/sitemap\.xml/.test(rb) && /Disallow: \/account/.test(rb));
  });
  console.log(n + ' ops tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
