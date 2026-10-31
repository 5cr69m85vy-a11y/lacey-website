const assert = require('assert');
const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  const wa = []; let aiText = 'مناسب للبشرة الحساسة'; const aiCalls = []; global.fetch = async (u, i) => { if (String(u).includes('graph.facebook')) wa.push(JSON.parse(i.body)); if (String(u).includes('anthropic')) { aiCalls.push(JSON.parse(i.body)); return { ok: true, json: async () => ({ content: [{ text: aiText }] }) }; } return { ok: true, json: async () => ({}) }; };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', WA_TOKEN: 't', WA_PHONE_ID: '1', STORE_URL: 'https://shop.test', ASSETS: { fetch: async () => new Response('a') } };
  const call = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env, { waitUntil: p => p });
  const authFor = require('./sess');
  const post = async (path, body, h = {}) => { if (path === '/order' && !h.Authorization && body && /^07\d{9}$/.test(body.ph || '')) h = { ...h, ...(await authFor(env, body.ph)) }; return call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) }); };
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
    const list = await get('/adm/chats'); assert.strictEqual(list.chats.length, 1); assert.strictEqual(list.chats[0].lastby, 'bot');
    await post('/adm/chat/reply', { id: list.chats[0].id, text: 'أهلاً بك' }, H);
    const poll = await get('/chat/poll?token=' + tk, {}); assert.deepStrictEqual(poll.messages.map(m => m.sender), ['customer', 'bot', 'customer', 'bot', 'admin']);
    assert.strictEqual((await call('/adm/chats')).status, 401);
    await post('/adm/inquiry', { product: 'A1', text: 'هل يناسب البشرة الحساسة؟' }, H);
    assert.strictEqual((await get('/adm/chats?channel=admin')).chats.length, 1);
    assert.strictEqual((await get('/chat/poll?token=' + tk, {})).messages.length, 5, 'private channel never reaches customers');
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
    env.DB.raw.prepare("INSERT INTO customers(phone,name,mkt,created_at,last_seen_at) VALUES('07705550010','New',1,?,?)").run(Date.now(), Date.now());
    env.DB.raw.prepare("INSERT INTO customers(phone,name,mkt,created_at,last_seen_at) VALUES('07705550011','Old',1,?,?)").run(Date.now() - 5 * 864e5, Date.now() - 5 * 864e5);
    env.DB.raw.prepare("INSERT INTO customers(phone,name,mkt,created_at,last_seen_at) VALUES('07705550012','NoConsent',0,?,?)").run(Date.now(), Date.now());
    const dry = await (await post('/adm/campaign', { body: 'x', audience: { type: 'today' }, dry: true }, H)).json();
    assert(dry.sample.includes('07705550010') && !dry.sample.includes('07705550011') && !dry.sample.includes('07705550012'), 'only consenting customers');
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
  await ok('integrations saved from the admin panel activate WhatsApp without Cloudflare secrets', async () => {
    const env2 = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: env.ASSETS };
    const c2 = (path, init = {}) => W.fetch(new Request('https://x.dev' + path, init), env2, { waitUntil: p => p });
    const H2 = { Authorization: 'Bearer ' + (await (await c2('/login', { method: 'POST', body: '{"pw":"secret"}' })).json()).token, 'content-type': 'application/json' };
    assert.strictEqual((await c2('/auth/otp/send', { method: 'POST', body: '{"ph":"07705550077"}' })).status, 503);
    assert.strictEqual((await c2('/adm/integrations')).status, 401);
    assert.strictEqual((await c2('/adm/integrations', { method: 'POST', headers: H2, body: JSON.stringify({ WA_TOKEN: 'tok123456', WA_PHONE_ID: '999', STORE_URL: 'https://s.test' }) })).status, 200);
    const g = await (await c2('/adm/integrations', { headers: H2 })).json();
    assert.deepStrictEqual([g.WA_TOKEN.hint, g.WA_PHONE_ID.value, g._active.wa], ['••••3456', '999', true]); assert(!JSON.stringify(g).includes('tok123456'), 'token never returned');
    wa.length = 0; assert.strictEqual((await c2('/auth/otp/send', { method: 'POST', body: '{"ph":"07705550077"}' })).status, 200); assert.strictEqual(wa.at(-1).to, '9647705550077');
    await c2('/adm/integrations', { method: 'POST', headers: H2, body: JSON.stringify({ WA_PHONE_ID: '' }) });          // فارغ = إبقاء
    assert.strictEqual((await (await c2('/adm/integrations', { headers: H2 })).json()).WA_PHONE_ID.value, '999');
    assert.strictEqual((await c2('/adm/integrations/test', { method: 'POST', headers: H2, body: '{"ph":"07705550077"}' })).status, 200);
    assert(!JSON.stringify(await (await c2('/catalog')).json()).includes('tok123456'), 'never in public catalog');
  });
  await ok('smart support: where/cancel (confirm by text)/modify/human + staff accounts continue the chat under their name', async () => {
    const send = async (token, b) => (await post('/chat/send', { token, name: 'نور', ph: '07701110001', ...b })).json();
    const poll = async token => (await get('/chat/poll?token=' + token, {}));
    let r = await send('', { text: 'أين طلبي؟', intent: 'track' }); const tk2 = r.token;
    let m = (await poll(tk2)).messages; assert.strictEqual(m.at(-1).sender, 'bot'); assert(/كود/.test(m.at(-1).body), 'asks for the order code');
    await send(tk2, { text: 'LC-BOX001 أين طلبي' }); m = (await poll(tk2)).messages; assert(/LC-BOX001: تم الاستلام/.test(m.at(-1).body));
    await send(tk2, { text: 'اريد الغاء LC-BOX001' }); m = (await poll(tk2)).messages; assert(/اكتب «نعم»/.test(m.at(-1).body));
    await send(tk2, { text: 'نعم' }); m = (await poll(tk2)).messages; assert(/تم إلغاء الطلب LC-BOX001/.test(m.at(-1).body));
    assert.strictEqual(env.DB.raw.prepare("select status from orders where code='LC-BOX001'").get().status, 0);
    await send(tk2, { text: 'عدل طلبي', intent: 'edit' });
    await send(tk2, { text: 'الاتصال بموظف', intent: 'human' }); let p2 = await poll(tk2); assert.strictEqual(p2.mode, 'human'); assert.strictEqual(p2.staff, '');
    const sl = await call('/adm/staff', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'سارة', username: 'sara', pw: 'sara1234' }) }); assert.strictEqual(sl.status, 200);
    await post('/adm/staff', { name: 'علي', username: 'ali', pw: 'ali12345' }, H);
    const login = async (u, pw) => post('/staff/login', { username: u, pw });
    assert.strictEqual((await login('sara', 'bad')).status, 401);
    const S1 = { Authorization: 'Bearer ' + (await (await login('sara', 'sara1234')).json()).token }, S2 = { Authorization: 'Bearer ' + (await (await login('ali', 'ali12345')).json()).token };
    const list = await get('/adm/chats', S1); const mine = list.chats.find(c => c.mode === 'human'); assert(mine); assert.strictEqual(mine.name, 'نور');
    assert.strictEqual((await call('/adm/chats?channel=admin', { headers: S1 })).status, 401, 'staff cannot open the admin-only channel');
    assert.strictEqual((await call('/settings', { headers: S1 })).status, 401, 'staff has no other admin rights');
    assert.strictEqual((await post('/adm/chat/reply', { id: mine.id, text: 'أهلاً نور أنا سارة' }, S1)).status, 200);
    p2 = await poll(tk2); assert.strictEqual(p2.staff, 'سارة'); const last = p2.messages.at(-1); assert.deepStrictEqual([last.sender, last.author], ['staff', 'سارة']);
    assert.strictEqual((await post('/adm/chat/reply', { id: mine.id, text: 'أنا علي' }, S2)).status, 409, 'other staff cannot hijack the chat');
    assert.strictEqual((await post('/adm/chat/claim', { id: mine.id }, S2)).status, 409);
    assert.strictEqual((await post('/adm/chat/claim', { id: mine.id, force: true }, S2)).status, 200);
    await post('/adm/chat/reply', { id: mine.id, text: 'سأكمل معك' }, S2); assert.strictEqual((await poll(tk2)).staff, 'علي');
    await post('/chat/send', { token: tk2, text: 'شكراً' });                                   // الزبون يكمل مع نفس الموظف (لا يعود للبوت)
    assert.strictEqual((await poll(tk2)).messages.at(-1).sender, 'customer');
    await post('/adm/chat/close', { id: mine.id }, S2); await post('/chat/rate', { token: tk2, rating: 5 });
        const sf = (await get('/adm/staff')).staff.find(s => s.username === 'ali'); assert.deepStrictEqual([sf.votes, sf.avg], [1, 5]);
    assert.strictEqual((await login('ali', 'ali12345')).status, 200);
    await post('/adm/staff', { id: sf.id, name: 'علي', username: 'ali', active: false }, H); assert.strictEqual((await login('ali', 'ali12345')).status, 401);
    assert.strictEqual((await call('/adm/chats', { headers: S2 })).status, 401, 'disabled staff session is revoked');
  });
  await ok('AI replies (Claude) when a key is saved; [[HUMAN]] hands off; works without a key', async () => {
    await post('/adm/integrations', { ANTHROPIC_API_KEY: 'sk-test', AI_PROMPT: 'كن لطيفاً' }, H);
    const r = await (await post('/chat/send', { token: '', text: 'هل المنتج مناسب للبشرة الحساسة؟', name: 'ريم' })).json();
    let p = await get('/chat/poll?token=' + r.token, {}); assert.strictEqual(p.messages.at(-1).body, 'مناسب للبشرة الحساسة'); assert.strictEqual(p.mode, 'bot');
    assert(aiCalls.at(-1).system.includes('كن لطيفاً') && aiCalls.at(-1).system.includes('المنتجات'), 'store context + custom prompt sent');
    aiText = 'هذا يحتاج مراجعة [[HUMAN]]'; await post('/chat/send', { token: r.token, text: 'أريد استرجاع' });
    p = await get('/chat/poll?token=' + r.token, {}); assert.strictEqual(p.mode, 'human'); assert(!p.messages.at(-1).body.includes('[[HUMAN]]'));
    await post('/adm/integrations', { ANTHROPIC_API_KEY: '__clear__' }, H);
    const r2 = await (await post('/chat/send', { token: '', text: 'سؤال غريب' })).json(); p = await get('/chat/poll?token=' + r2.token, {}); assert(/اختر من الخيارات/.test(p.messages.at(-1).body));
  });
  await ok('live dashboard + health checklist (admin only, no secrets)', async () => {
    assert.strictEqual((await call('/adm/live')).status, 401);
    const lv = await (await call('/adm/live', { headers: H })).json();
    assert.strictEqual(lv.days.length, 14); assert.strictEqual(lv.hours.length, 24); assert(lv.kpi && Array.isArray(lv.recent));
    const hl = await (await call('/adm/health', { headers: H })).json(); assert.strictEqual(typeof hl.wa, 'boolean'); assert(!JSON.stringify(hl).includes('TOKEN'));
  });
  await ok('support departments: service and routine are separate threads; routine bot has its own menu; closed chat → new chat (rating kept)', async () => {
    const send = (dept, text, extra = {}) => post('/chat/send', { text, dept, token: 'tok-' + dept, name: 'Dina', ...extra });
    const a = await (await send('service', 'مرحبا')).json(), b = await (await send('routine', 'مرحبا')).json();
    assert.notStrictEqual(a.chat, b.chat);
    const pr = await get('/chat/poll?dept=routine&token=tok-routine&after=0', {}); assert.strictEqual(pr.dept, 'routine');
    assert(pr.messages.some(m => m.sender === 'bot' && /روتين/.test(m.body) && m.meta && m.meta.chips.some(c => c.k === 'skin')), 'routine menu');
    const sk = await (await send('routine', 'اعرفي نوع بشرتي', { quick: 'skin' })).json();
    const pr2 = await get('/chat/poll?dept=routine&token=tok-routine&after=0', {}); assert(pr2.messages.some(m => m.meta && m.meta.chips && m.meta.chips.some(c => c.h === '/routine')), 'link chip to the quiz');
    /* staff: sees dept + unread, opening marks seen, typing, transfer, quick replies */
    const list = await get('/adm/chats?dept=routine'); assert(list.chats.every(c => c.dept === 'routine') && list.chats.length >= 1);
    assert((await get('/adm/chats')).chats.some(c => c.dept === 'service'));
    await post('/adm/chat/reply', { id: b.chat, text: 'أهلاً دينا' }, H);
    const view = await get('/adm/chat?id=' + b.chat); assert.strictEqual(view.chat.dept, 'routine');
    await post('/adm/chat/typing', { id: b.chat }, H);
    const live = await get('/chat/poll?dept=routine&token=tok-routine&after=0', {}); assert.strictEqual(live.typing, true); assert(live.seen > 0); assert(live.unread >= 1);
    await get('/chat/poll?dept=routine&token=tok-routine&after=0&mark=1', {}); assert.strictEqual((await get('/chat/poll?dept=routine&token=tok-routine&after=0', {})).unread, 0);
    assert.strictEqual((await post('/adm/chat/transfer', { id: b.chat, dept: 'nope' }, H)).status, 400);
    assert.strictEqual((await post('/adm/chat/transfer', { id: b.chat, dept: 'service' }, H)).status, 200);
    assert.strictEqual((await get('/chat/poll?dept=service&token=tok-routine&after=0', {})).chat, b.chat, 'moved to service');
    assert((await get('/adm/quick')).items.length >= 4);
    assert.strictEqual((await post('/adm/quick', { items: ['a', 'b'] }, H)).status, 200); assert.deepStrictEqual((await get('/adm/quick')).items, ['a', 'b']);
    /* close + rate, then a new message opens a NEW chat (old rating stays) */
    await post('/chat/close', { token: 'tok-service', dept: 'service' }); await post('/chat/rate', { token: 'tok-service', dept: 'service', rating: 5 });
    assert.strictEqual((await get('/chat/poll?dept=service&token=tok-service&after=0', {})).chat, null, 'rated chat disappears for the customer');
    const again = await (await send('service', 'سؤال جديد')).json(); assert.notStrictEqual(again.chat, a.chat);
    assert.strictEqual(env.DB.raw.prepare('select count(*) n from reviews where chat_id=?').get(a.chat).n, 1);
  });
  await ok('saved routine + marketing consent live on the account; product code in a routine chat attaches the product card', async () => {
    const r = await (await post('/auth/register', { email: 'rt@example.com', pw: 'Str0ng-pass5', name: 'Rt', birth: '2000-01-01', mkt: true })).json();
    const A = { Authorization: 'Bearer ' + r.token }; assert.strictEqual(r.customer.mkt, true);
    const save = await post('/me', { routine: { skin: 'oily', am: ['LC101', 'x y<script>'], pm: ['LC103'] }, skin: 'oily' }, A); assert.strictEqual(save.status, 200);
    const me = (await get('/me', A)).customer, rt = JSON.parse(me.routine); assert.deepStrictEqual([rt.skin, rt.am, rt.pm], ['oily', ['LC101', 'XYSCRIPT'], ['LC103']]);
    assert.strictEqual((await post('/me', { routine: '{bad' }, A)).status, 400);
    assert.strictEqual((await post('/me', { mkt: false }, A)).status, 200); assert.strictEqual((await get('/me', A)).customer.mkt, false);
  });
  console.log(n + ' extra tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
