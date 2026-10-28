const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const wa = []; global.fetch = async (u, i) => { if (String(u).includes('graph.facebook')) wa.push(JSON.parse(i.body)); return { ok: true, json: async () => ({}) }; };
  const env = { DB: makeDB(), ADMIN_PASS: 'secret', WA_TOKEN: 't', WA_PHONE_ID: '1', STORE_URL: 'https://shop.test', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const post = (path, body, h = {}) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
  const H = { Authorization: 'Bearer ' + (await (await post('/login', { pw: 'secret' })).json()).token };
  const get = async (p, h = H) => (await call(p, { headers: h })).json();

  await ok('boxes: saved with settings, public sees active only, priced on the server', async () => {
    await post('/settings', { data: { P: [{ c: 'A1', n: 'Cleanser', p: 10000 }, { c: 'B2', n: 'Serum', p: 30000 }], B: [{ id: 'gift', n: 'Gift box', p: 32000, it: [{ c: 'A1', q: 1 }, { c: 'B2', q: 1 }] }, { id: 'hid', n: 'Hidden', p: 1, on: 0, it: [] }] } }, H);
    const pub = (await get('/catalog', {})).data; assert.deepStrictEqual(pub.B.map(b => b.id), ['gift']);
    assert.strictEqual((await get('/settings')).data.B.length, 2);
    const o = await (await post('/order', { code: 'LC-BOX001', name: 'Ali', ph: '07701110001', city: 'B', area: 'K', lm: 'x', items: [{ c: 'BOX-gift', q: 2, p: 1 }] })).json();
    assert.strictEqual(o.total, 64000);
    assert.strictEqual((await post('/order', { code: 'LC-BOX002', name: 'Ali', ph: '07701110001', city: 'B', area: 'K', lm: 'x', items: [{ c: 'BOX-hid', q: 1 }] })).status, 400);
  });
  let tk = '';
  await ok('support chat: guest sends, admin replies, customer polls; admin-only channel stays hidden', async () => {
    const s = await (await post('/chat/send', { text: 'مرحبا هل المنتج مناسب؟', name: 'Zainab' })).json(); tk = s.token; assert(tk);
    await post('/chat/send', { text: 'ثانية', token: tk });
    const list = await get('/adm/chats'); assert.strictEqual(list.chats.length, 1); assert.strictEqual(list.chats[0].lastby, 'customer');
    await post('/adm/chat/reply', { id: list.chats[0].id, text: 'أهلاً بك' }, H);
    const poll = await get('/chat/poll?token=' + tk, {}); assert.deepStrictEqual(poll.messages.map(m => m.sender), ['customer', 'customer', 'admin']);
    assert.strictEqual((await call('/adm/chats')).status, 401);
    await post('/adm/inquiry', { product: 'A1', text: 'هل يناسب البشرة الحساسة؟' }, H);
    assert.strictEqual((await get('/adm/chats?channel=admin')).chats.length, 1);
    assert.strictEqual((await get('/chat/poll?token=' + tk, {})).messages.length, 3, 'private channel never reaches customers');
    assert.strictEqual((await get('/chat/poll?token=nope', {})).chat, null);
  });
  await ok('end chat → rating 1–5 once → average in admin', async () => {
    await post('/chat/close', { token: tk });
    assert.strictEqual((await post('/chat/rate', { token: tk, rating: 9 })).status, 400);
    assert.strictEqual((await post('/chat/rate', { token: tk, rating: 4, comment: 'جيد' })).status, 200);
    assert.strictEqual((await post('/chat/rate', { token: tk, rating: 5 })).status, 409);
    const s = await (await post('/chat/send', { text: 'new', name: 'B' })).json(); await post('/chat/close', { token: s.token }); await post('/chat/rate', { token: s.token, rating: 5 });
    const r = await get('/adm/ratings'); assert.deepStrictEqual([r.count, r.avg], [2, 4.5]);
  });
  await ok('campaign: audience "registered today" gets personal one-use codes + store link; dry run; counts', async () => {
    await post('/auth/otp/send', { ph: '07705550009' }); // creates nothing yet
    env.DB.raw.prepare("INSERT INTO customers(phone,name,created_at,last_seen_at) VALUES('07705550010','New',?,?)").run(Date.now(), Date.now());
    env.DB.raw.prepare("INSERT INTO customers(phone,name,created_at,last_seen_at) VALUES('07705550011','Old',?,?)").run(Date.now() - 5 * 864e5, Date.now() - 5 * 864e5);
    const dry = await (await post('/adm/campaign', { body: 'x', audience: { type: 'today' }, dry: true }, H)).json();
    assert(dry.sample.includes('07705550010') && !dry.sample.includes('07705550011'));
    wa.length = 0;
    const r = await (await post('/adm/campaign', { body: 'عرض خاص 🌸', audience: { type: 'today' }, perUser: { kind: 'percent', value: 15, days: 7 }, codes: ['SHIP'] }, H)).json();
    assert(r.total >= 1);
    const m = wa.find(x => x.to === '9647705550010'); assert(m, 'sent'); assert(m.text.body.includes('https://shop.test') && m.text.body.includes('SHIP') && /PR[A-Z0-9]{6}/.test(m.text.body));
    const code = /PR[A-Z0-9]{6}/.exec(m.text.body)[0]; const row = env.DB.raw.prepare('select * from discount_codes where code=?').get(code);
    assert.deepStrictEqual([row.phone, row.max_uses, row.value], ['07705550010', 1, 15]);
    assert(!wa.some(x => x.to === '9647705550011'));
    assert.strictEqual((await post('/adm/campaign', { body: 'x', audience: { type: 'phones', phones: ['07705550011'] } }, H)).status, 200);
    assert((await get('/adm/campaigns')).campaigns.length === 2);
  });
  await ok('stats: accounts per day, orders, revenue, top sellers, active users', async () => {
    const s = await get('/adm/stats2?range=day');
    assert(s.accounts.length >= 1 && s.totals.orders >= 1 && s.totals.revenue >= 64000); assert.strictEqual(s.top[0].c, 'BOX-gift');
    assert(s.active.d1 >= 1); assert.strictEqual(s.rating.n, 2);
    for (const r of ['week', 'month']) assert((await get('/adm/stats2?range=' + r)).accounts.length >= 1);
  });
  await ok('media upload stored in D1 (no R2): range requests work, bad types/anonymous rejected', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    assert.strictEqual((await call('/media', { method: 'POST', headers: { 'content-type': 'image/png' }, body: png })).status, 401);
    assert.strictEqual((await call('/media', { method: 'POST', headers: { ...H, 'content-type': 'text/html' }, body: '<x>' })).status, 415);
    const up = await (await call('/media', { method: 'POST', headers: { ...H, 'content-type': 'image/png' }, body: png })).json();
    const got = Buffer.from(await (await call(up.url)).arrayBuffer()); assert(got.equals(png));
    const part = await call(up.url, { headers: { Range: 'bytes=0-3' } }); assert.strictEqual(part.status, 206); assert.strictEqual((await part.arrayBuffer()).byteLength, 4);
    assert.strictEqual((await call('/media/zzzz.png')).status, 404);
  });
  await ok('manifest.json reflects store name/colors', async () => {
    await post('/settings', { data: { P: [], nm: 'Lacey Skincare', ac: '#123456' } }, H);
    const m = await get('/manifest.json', {}); assert.strictEqual(m.theme_color, '#123456'); assert(m.icons.length >= 3);
  });
  console.log(n + ' extra tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
