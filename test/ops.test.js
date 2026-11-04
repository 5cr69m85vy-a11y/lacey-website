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
    assert.strictEqual((await q('بغداد')).shipping, 3000); assert.strictEqual((await q('محافظة البصرة')).shipping, 7000); assert.strictEqual((await q('Baghdad')).shipping, 3000); assert.strictEqual((await q('Basra')).shipping, 7000); assert.strictEqual((await q('Nineveh (Mosul)')).shipping, 5000); assert.strictEqual((await q('Duhok')).shipping, 5000); assert.strictEqual((await q('دهوك')).shipping, 5000); assert.strictEqual((await q('')).shipping, 5000);
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
  await ok('stock ledger + turnover: sale/cancel/receive are logged; fast seller gets a reorder suggestion; no-sales stock is dead', async () => {
    await post('/adm/stock', { items: [{ code: 'A1', qty: 10, low: 2 }, { code: 'A2', qty: 8, low: 2 }] }, adm);
    const base = (await get('/adm/turnover', adm)).items.find(i => i.code === 'A1').sold, baseU = (await get('/adm/turnover', adm)).sold_units;
    assert.strictEqual((await post('/order', order('LC-TRN001', [{ c: 'A1', q: 4 }]), H)).status, 200);
    assert.strictEqual((await post('/adm/stock/receive', { code: 'A1', n: 5 }, adm)).status, 200);
    assert.strictEqual((await post('/adm/stock/receive', { code: 'A1', n: 5 })).status, 401);
    assert.strictEqual((await post('/adm/stock/receive', { code: 'A1', n: 0 }, adm)).status, 400);
    const lg = (await get('/adm/stock/log?code=A1', adm)).log, kinds = lg.map(x => x.k);
    assert(kinds.includes('sale') && kinds.includes('receive') && kinds.includes('adjust'), kinds.join());
    assert.strictEqual(lg.find(x => x.k === 'sale').d, -4);
    const tr = await get('/adm/turnover?days=30', adm), a1 = tr.items.find(i => i.code === 'A1'), a2 = tr.items.find(i => i.code === 'A2');
    assert.strictEqual(a1.sold, base + 4); assert.strictEqual(a1.qty, 11); assert(a1.v > 0 && a1.cover > 0); assert.strictEqual(a2.cls, 'dead'); assert.strictEqual(tr.sold_units, baseU + 4);
    assert.strictEqual((await call('/adm/turnover')).status, 401);
    await post('/order/cancel', { code: 'LC-TRN001', ph: '07701110001' }, H);
    assert((await get('/adm/stock/log', adm)).log.some(x => x.k === 'cancel'));
    assert.strictEqual((await get('/adm/turnover', adm)).sold_units, baseU);
    await post('/adm/stock', { items: [{ code: 'A1', qty: null }, { code: 'A2', qty: null }] }, adm);
  });
  await ok('notifications: order → link to tracking; staff reply → link to its department chat, no "undefined"; deleted after the chat is closed and rated', async () => {
    await post('/adm/stock', { items: [] }, adm);
    assert.strictEqual((await post('/order', order('LC-NTF001', [{ c: 'A1', q: 1 }]), H)).status, 200);
    const nts = async () => (await (await call('/me/notifications', { headers: H })).json()).items;
    const o = (await nts()).find(n => /LC-NTF001/.test(n.text)); assert(o && o.href === '/tracking?c=LC-NTF001', JSON.stringify(o));
    const s = await (await post('/chat/send', { text: 'سؤال', dept: 'routine', name: 'Ali' }, H)).json();
    const ch = (await get('/adm/chats?channel=support', adm)).chats.find(c => c.dept === 'routine');
    assert.strictEqual((await post('/adm/chat/reply', { id: ch.id, text: 'أهلاً' }, adm)).status, 200);
    const r = (await nts()).find(n => n.tpl === 'chat_reply'); assert(r && r.href === '/routine/support' && !/undefined/.test(r.text) && /أهلاً/.test(r.text), JSON.stringify(r));
    await post('/adm/chat/close', { id: ch.id }, adm); await post('/chat/rate', { token: s.token, dept: 'routine', rating: 5 }, H);
    assert(!(await nts()).some(n => n.tpl === 'chat_reply'), 'chat_reply notifications removed after rating');
    assert((await nts()).some(n => /LC-NTF001/.test(n.text)), 'order notification stays');
  });
  await ok('notifications: unread count, mark read (one / all), hide (one / all) — only for the owner; kinds and titles', async () => {
    const list = async () => (await call('/me/notifications', { headers: H })).json();
    assert.strictEqual((await post('/order', order('LC-NTF002', [{ c: 'A1', q: 1 }]), H)).status, 200);
    let j = await list(); assert(j.unread >= 1 && j.items[0].kind === 'order' && j.items[0].title === 'تم استلام طلبك' && j.items[0].unread === true);
    const id = j.items[0].id; assert.strictEqual((await post('/me/notifications/read', { id }, H)).status, 200);
    j = await list(); assert.strictEqual(j.items.find(x => x.id === id).unread, false);
    assert.strictEqual((await post('/me/notifications/read', { id })).status, 401);
    const other = await authFor(env, '07701110002'); await post('/me/notifications/hide', { id }, other); assert((await list()).items.some(x => x.id === id), 'other user cannot hide mine');
    await post('/me/notifications/hide', { id }, H); assert(!(await list()).items.some(x => x.id === id));
    await post('/me/notifications/read', { all: true }, H); assert.strictEqual((await list()).unread, 0);
    await post('/me/notifications/hide', { all: true }, H); assert.strictEqual((await list()).items.length, 0);
    assert(env.DB.raw.prepare("select count(*) n from notifications where template='order_received' and status='queued'").get().n >= 1, 'whatsapp queue untouched');
  });
  await ok('customer can remove cancelled orders from her list (active orders cannot be hidden; the order stays in the system)', async () => {
    const orders = async () => (await (await call('/me/orders', { headers: H })).json()).orders;
    assert.strictEqual((await post('/order', order('LC-HID001', [{ c: 'A1', q: 1 }]), H)).status, 200); assert.strictEqual((await post('/order', order('LC-HID002', [{ c: 'A1', q: 1 }]), H)).status, 200);
    await post('/order/cancel', { code: 'LC-HID001', ph: '07701110001' }, H);
    await post('/me/orders/hide', { code: 'LC-HID002' }, H); assert((await orders()).some(o => o.code === 'LC-HID002'), 'active order stays');
    assert.strictEqual((await post('/me/orders/hide', { code: 'LC-HID001' })).status, 401);
    await post('/me/orders/hide', { code: 'LC-HID001' }, H); const l = await orders(); assert(!l.some(o => o.code === 'LC-HID001') && l.some(o => o.code === 'LC-HID002'));
    assert.strictEqual(env.DB.raw.prepare("select count(*) n from orders where code='LC-HID001'").get().n, 1);
    await post('/me/orders/hide', { all: true }, H); assert(!(await orders()).some(o => o.s === 0));
  });
  await ok('reminders: back-in-stock (watch → restock notifies once), abandoned cart (after the delay, once, not after an order), reorder (after ~85% of usage time, once)', async () => {
    const nts = async () => (await (await call('/me/notifications', { headers: H })).json()).items;
    const run = async () => (await post('/adm/reminders/run', {}, adm)).json();
    /* back in stock */
    await post('/adm/stock', { items: [{ code: 'A1', qty: 0, low: 2 }] }, adm);
    assert.strictEqual((await post('/me/watch', { code: 'A1' }, H)).status, 200); assert.strictEqual((await post('/me/watch', { code: 'NOPE' }, H)).status, 404);
    assert.deepStrictEqual((await (await call('/me/watch', { headers: H })).json()).codes, ['A1']);
    await post('/adm/stock', { items: [{ code: 'A1', qty: 0, low: 2 }] }, adm); assert(!(await nts()).some(n => n.tpl === 'restock'), 'still sold out → no notice');
    assert.strictEqual((await post('/adm/stock/receive', { code: 'A1', n: 5 }, adm)).status, 200);
    let rs = (await nts()).filter(n => n.tpl === 'restock'); assert.strictEqual(rs.length, 1); assert(rs[0].href === '/p/A1' && rs[0].kind === 'remind' && /رجع/.test(rs[0].title));
    await post('/adm/stock/receive', { code: 'A1', n: 1 }, adm); assert.strictEqual((await nts()).filter(n => n.tpl === 'restock').length, 1, 'only once');
    assert.deepStrictEqual((await (await call('/me/watch', { headers: H })).json()).codes, []);
    /* abandoned cart */
    assert.strictEqual((await post('/me/cart', { items: { A1: 2 } }, H)).status, 200); assert.strictEqual((await post('/me/cart', { items: { A1: 2 } })).status, 401);
    await run(); assert(!(await nts()).some(n => n.tpl === 'cart_reminder'), 'too early');
    env.DB.raw.prepare('update carts set updated_at=?').run(Date.now() - 4 * 36e5); env.DB.raw.prepare('update orders set created_at=created_at-36000000').run();
    const r1 = await run(); assert(r1.cart >= 1); let cr = (await nts()).filter(n => n.tpl === 'cart_reminder'); assert.strictEqual(cr.length, 1); assert(cr[0].href === '/cart');
    await run(); assert.strictEqual((await nts()).filter(n => n.tpl === 'cart_reminder').length, 1, 'once per cart state');
    await post('/me/cart', { items: {} }, H); assert.strictEqual(env.DB.raw.prepare('select count(*) n from carts').get().n, 0);
    /* reorder */
    assert.strictEqual((await post('/order', order('LC-RRO001', [{ c: 'A1', q: 1 }]), H)).status, 200);
    env.DB.raw.prepare('update orders set created_at=?').run(Date.now() - 100 * 864e5); env.DB.raw.prepare("update orders set status=5,delivered_at=? where code='LC-RRO001'").run(Date.now() - 60 * 864e5);
    const r2 = await run(); assert(r2.reorder >= 1, JSON.stringify(r2)); const ro = (await nts()).filter(n => n.tpl === 'reorder'); assert.strictEqual(ro.length, 1); assert(ro[0].href === '/p/A1');
    await run(); assert.strictEqual((await nts()).filter(n => n.tpl === 'reorder').length, 1, 'once');
    assert.strictEqual((await post('/adm/reminders', { cart: 0, reorder: 0, stock: 0, cartHours: 5 }, adm)).status, 200); assert.strictEqual((await get('/adm/reminders', adm)).cfg.cartHours, 5);
    assert.strictEqual((await call('/adm/reminders')).status, 401);
    await post('/adm/reminders', { cart: 1, reorder: 1, stock: 1, cartHours: 3 }, adm);
    await post('/adm/stock', { items: [{ code: 'A1', qty: null }] }, adm);
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
