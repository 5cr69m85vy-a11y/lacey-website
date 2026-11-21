const assert = require('assert');
const { makeDB } = require('./d1shim');
const authFor = require('./sess');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
  let calls = [];
  global.fetch = async (u, init = {}) => {
    u = String(u); const m = /api\.telegram\.org\/bot([^/]+)\/(\w+)/.exec(u);
    if (m) { const body = JSON.parse(init.body || '{}'); calls.push({ tok: m[1], method: m[2], body });
      const R = r => ({ ok: true, status: 200, json: async () => ({ ok: true, result: r }) });
      if (m[2] === 'getMe') return R({ username: m[1].startsWith('111') ? 'lacey_orders_bot' : 'other_bot' });
      if (m[2] === 'sendMessage') { if (body.chat_id === '66600') return { ok: false, status: 403, json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }) }; return R({ message_id: 100 + calls.length }); }
      return R(true); }
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const env = { DB: makeDB(), RL_SCALE: '1000', ADMIN_PASS: 'secret', ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) } };
  const call = (path, init = {}, h = {}) => W.fetch(new Request('https://x.dev' + path, { ...init, headers: { 'content-type': 'application/json', ...h, ...(init.headers || {}) } }), env);
  const post = (path, body, h) => call(path, { method: 'POST', body: JSON.stringify(body) }, h);
  const get = async (path, h) => (await call(path, {}, h)).json();
  const adm = { Authorization: 'Bearer ' + (await (await post('/login', { pw: 'secret' })).json()).token };
  await post('/settings', { data: { sf: 5000, sg: {}, P: [{ c: 'A1', n: 'Cleanser', p: 10000, k: 'C', i: '' }] } }, adm);
  const H = await authFor(env, '07701110001');
  const TOK_O = '111111111:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', TOK_S = '222222222:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', TOK_R = '333333333:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
  const DB = env.DB.raw; let upd = 1000;
  const hook = (bot, payload, secret) => call('/tg/hook/' + bot, { method: 'POST', body: JSON.stringify({ update_id: ++upd, ...payload }), headers: { 'X-Telegram-Bot-Api-Secret-Token': secret === undefined ? DB.prepare('select secret from tg_bots where bot=?').get(bot).secret : secret } });
  const cb = (bot, from, data, chat) => hook(bot, { callback_query: { id: 'cq' + upd, from: { id: +from }, message: { chat: { id: +(chat || from) }, message_id: 5 }, data } });
  const sent = (tok, method = 'sendMessage') => calls.filter(c => c.tok === tok.split(':')[0] + ':' + tok.split(':')[1] && c.method === method);
  const tokOf = t => t;

  await ok('three bots configured independently; token never returned; one token cannot serve two bots', async () => {
    for (const [b, t] of [['orders', TOK_O], ['support', TOK_S], ['reports', TOK_R]]) assert.strictEqual((await post('/adm/tg/bot', { bot: b, enabled: true, name: 'bot-' + b, token: t }, adm)).status, 200);
    assert.strictEqual((await post('/adm/tg/bot', { bot: 'reports', enabled: true, token: TOK_O }, adm)).status, 400, 'duplicate token refused');
    assert.strictEqual((await post('/adm/tg/bot', { bot: 'reports', token: 'bad' }, adm)).status, 400);
    const j = await get('/adm/tg', adm); assert.strictEqual(j.bots.length, 3); const txt = JSON.stringify(j); assert(!txt.includes('AAAAAAAA') && !txt.includes(TOK_S), 'no token in the response');
    assert.strictEqual(j.bots[0].tokenHint, '••••' + TOK_O.slice(-4)); assert.strictEqual((await call('/adm/tg', {})).status, 401);
    const c = await post('/adm/tg/connect', { bot: 'orders' }, adm); assert.strictEqual(c.status, 200); assert.strictEqual((await c.json()).username, 'lacey_orders_bot');
    assert(calls.some(x => x.method === 'setWebhook' && x.body.url === 'https://x.dev/tg/hook/orders' && x.body.secret_token && x.body.secret_token.length >= 20));
  });
  await ok('each bot has its own recipient list (multiple IDs); invalid / duplicate IDs refused; disabling a recipient', async () => {
    const add = (bot, chat_id, name, extra = {}) => post('/adm/tg/rec', { bot, chat_id, name, ...extra }, adm);
    for (const [id, nm] of [['10010', 'مدير'], ['10020', 'موظف1'], ['10030', 'موظف2'], ['10040', 'موظف3']]) assert.strictEqual((await add('orders', id, nm)).status, 200);
    assert.strictEqual((await add('orders', '10010', 'dup')).status, 409); assert.strictEqual((await add('orders', 'abc', 'x')).status, 400);
    await add('orders', '10050', 'معطّل', { active: false }); await add('orders', '10060', 'مشاهدة فقط', { perms: ['view'] });
    for (const id of ['20010', '20020', '20030']) await add('support', id, 'دعم' + id);
    for (const id of ['30010', '30020']) await add('reports', id, 'تقارير' + id);
    await add('support', '10010', 'نفس المدير في الدعم');                                   // نفس الشخص في بوتين: سجلان مستقلان
    const j = await get('/adm/tg', adm); assert.deepStrictEqual(j.bots.map(b => [b.bot, b.count, b.total]), [['orders', 5, 6], ['support', 4, 4], ['reports', 2, 2]]);
    assert.strictEqual((await post('/adm/tg/rec/test', { id: j.bots[0].recipients[0].id }, adm)).status, 200);
    await add('orders', '66600', 'محظور'); const bl = (await get('/adm/tg', adm)).bots[0].recipients.find(r => r.chat_id === '66600'); assert.strictEqual((await post('/adm/tg/rec/test', { id: bl.id }, adm)).status, 400);
    assert((await get('/adm/tg', adm)).bots[0].recipients.find(r => r.chat_id === '66600').last_err.includes('blocked'), 'delivery error is visible');
    await call('/adm/tg/rec?id=' + bl.id, { method: 'DELETE', headers: adm });
  });
  let code, msgIds;
  await ok('new order → full details to every active Orders recipient only, with the 6 buttons', async () => {
    calls = []; code = 'LC-TG0001';
    const r = await post('/order', { code, name: 'Ali', ph: '07701110001', city: 'بغداد', area: 'الكرادة', lm: 'قرب المسجد', items: [{ c: 'A1', q: 2 }] }, H); assert.strictEqual(r.status, 200);
    const m = calls.filter(c => c.method === 'sendMessage' && c.tok === TOK_O); assert.deepStrictEqual(m.map(c => c.body.chat_id).sort(), ['10010', '10020', '10030', '10040', '10060'], 'active orders recipients only');
    assert(!calls.some(c => c.tok === TOK_S || c.tok === TOK_R), 'support/reports bots are silent');
    const t = m[0].body.text; for (const w of ['LC-TG0001', 'Ali', '07701110001', 'Cleanser', 'المجموع الفرعي', 'التوصيل', 'الإجمالي', 'الدفع', 'قرب المسجد', 'الحالة']) assert(t.includes(w), w);
    assert.strictEqual(m[0].body.reply_markup.inline_keyboard.flat().length, 6);
    assert.strictEqual(DB.prepare('select count(*) n from tg_order_msgs where order_code=?').get(code).n, 5);
  });
  await ok('webhook security: wrong secret refused; unauthorized / disabled / view-only IDs cannot act; nothing changes', async () => {
    assert.strictEqual((await hook('orders', { callback_query: { id: 'x', from: { id: 10010 }, data: 'o:cf:' + code } }, 'wrong')).status, 403);
    const st = () => DB.prepare('select status from orders where code=?').get(code).status;
    for (const who of ['99990', '10050', '10060']) { calls = []; await cb('orders', who, 'o:cf:' + code); assert.strictEqual(st(), 1, who); const a = calls.find(c => c.method === 'answerCallbackQuery'); assert(a && /غير مصرّح/.test(a.body.text), who); }
    assert((await get('/adm/tg/log?bot=orders', adm)).log.some(l => l.kind === 'denied'));
  });
  await ok('confirm from Telegram: updates the real order once, records who/when, edits messages, notifies others; duplicate / concurrent presses do nothing', async () => {
    calls = []; const [a, b] = await Promise.all([cb('orders', '10020', 'o:cf:' + code), cb('orders', '10030', 'o:cf:' + code)]); assert.strictEqual(a.status, 200); assert.strictEqual(b.status, 200);
    const o = DB.prepare('select * from orders where code=?').get(code); assert.strictEqual(o.status, 2); assert(o.confirmed_at > 0);
    const ev = DB.prepare("select * from order_events where order_code=? and status=2").all(code); assert.strictEqual(ev.length, 1, 'exactly one confirmation'); assert(/^tg:موظف[12]$/.test(ev[0].actor), ev[0].actor);
    assert.strictEqual(DB.prepare("select count(*) n from receipts where order_code=?").get(code).n, 1, 'receipt issued once');
    assert(calls.some(c => c.method === 'editMessageText' && c.body.text.includes('✅ مؤكد')), 'message edited to the new status');
    assert(calls.filter(c => c.method === 'sendMessage' && c.tok === TOK_O && /تم التأكيد/.test(c.body.text)).length >= 3, 'other recipients notified');
    calls = []; await cb('orders', '10020', 'o:cf:' + code); assert(/مؤكد مسبقاً/.test(calls.find(c => c.method === 'answerCallbackQuery').body.text));
    assert.strictEqual(o.pay_method, 'cod', 'payment untouched');
    const u = ++upd; await call('/tg/hook/orders', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': DB.prepare('select secret from tg_bots where bot=?').get('orders').secret }, body: JSON.stringify({ update_id: u, callback_query: { id: 'd', from: { id: 10020 }, message: { chat: { id: 10020 } }, data: 'o:vw:' + code } }) }); calls = [];
    await call('/tg/hook/orders', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': DB.prepare('select secret from tg_bots where bot=?').get('orders').secret }, body: JSON.stringify({ update_id: u, callback_query: { id: 'd', from: { id: 10020 }, message: { chat: { id: 10020 } }, data: 'o:vw:' + code } }) }); assert.strictEqual(calls.length, 0, 'replayed update ignored');
  });
  await ok('processing / ship / deliver rules: no delivery before the order is on the way; reject needs confirmation; website sync both ways', async () => {
    const st = () => DB.prepare('select status from orders where code=?').get(code).status;
    calls = [];
    await cb('orders', '10020', 'o:pr:' + code);  assert.strictEqual(DB.prepare("select count(*) n from order_events where order_code=? and note='قيد التجهيز'").get(code).n, 1); if (0) {}
    calls = []; await cb('orders', '10020', 'o:pr:' + code); assert(/مسبقاً/.test(calls.find(c => c.method === 'answerCallbackQuery').body.text)); assert.strictEqual(st(), 2);
    await cb('orders', '10020', 'o:sh:' + code); assert.strictEqual(st(), 3);
    for (const a of ['o:dl:', 'o:dly:']) { calls = []; await cb('orders', '10020', a + code); assert.strictEqual(st(), 3, a); }
    assert.strictEqual((await post('/adm/tg/rec', { bot: 'orders', chat_id: '10020', id: DB.prepare("select id from tg_recipients where bot='orders' and chat_id='10020'").get().id, name: 'موظف1', perms: ['view', 'confirm', 'ship', 'deliver'] }, adm)).status, 200);
    calls = []; await post('/status', { code, s: 4 }, adm); assert.strictEqual(st(), 4);
    assert(calls.some(c => c.method === 'editMessageText' && c.body.text.includes('في الطريق')), 'admin change refreshes the Telegram message');
    await cb('orders', '10020', 'o:dl:' + code); assert.strictEqual(st(), 4, 'first press only asks for confirmation'); await cb('orders', '10020', 'o:dly:' + code); assert.strictEqual(st(), 5);
    assert(DB.prepare('select delivered_at d from orders where code=?').get(code).d > 0);
    assert.strictEqual(DB.prepare("select count(*) n from audit_log where action like 'tg_order_%'").get().n >= 4, true, 'actions audited');
  });
  await ok('reject (with confirmation) cancels the order and restores stock; support/reports have separate permissions', async () => {
    const c2 = 'LC-TG0002'; await post('/order', { code: c2, name: 'Sara', ph: '07701110001', city: 'بغداد', area: 'x', lm: 'y', items: [{ c: 'A1', q: 1 }] }, H);
    const st = () => DB.prepare('select status from orders where code=?').get(c2).status;
    await cb('orders', '10010', 'o:rj:' + c2); assert.strictEqual(st(), 1, 'asks first'); await cb('orders', '10010', 'o:rjy:' + c2); assert.strictEqual(st(), 0);
    assert(/^tg:/.test(DB.prepare('select actor from order_events where order_code=? and status=0').get(c2).actor));
    calls = []; await cb('orders', '30010', 'o:cf:' + c2); assert(/غير مصرّح/.test(calls.find(c => c.method === 'answerCallbackQuery').body.text), 'a reports recipient is not an orders recipient');
  });
  await ok('/start tells any user their Telegram ID; disabled bot ignores updates; removing a recipient stops notifications and actions', async () => {
    calls = []; await hook('orders', { message: { chat: { id: 77770 }, from: { id: 77770 }, text: '/start' } }); assert(/77770/.test(calls.find(c => c.method === 'sendMessage').body.text));
    const rid = DB.prepare("select id from tg_recipients where bot='orders' and chat_id='10040'").get().id; await call('/adm/tg/rec?id=' + rid, { method: 'DELETE', headers: adm });
    calls = []; const o3 = await post('/order', { code: 'LC-TG0003', name: 'Xyz', ph: '07701110001', city: 'بغداد', area: 'x', lm: 'y', items: [{ c: 'A1', q: 1 }] }, H);
    assert(!calls.some(c => c.method === 'sendMessage' && c.body.chat_id === '10040')); await cb('orders', '10040', 'o:cf:LC-TG0003'); assert.strictEqual(DB.prepare("select status from orders where code='LC-TG0003'").get().status, 1);
    await post('/adm/tg/bot', { bot: 'orders', enabled: false }, adm); calls = []; await post('/order', { code: 'LC-TG0004', name: 'Xyz', ph: '07701110001', city: 'بغداد', area: 'x', lm: 'y', items: [{ c: 'A1', q: 1 }] }, H);
    assert(!calls.some(c => c.tok === TOK_O && c.method === 'sendMessage'), 'disabled bot sends nothing');
  });
  await ok('support bot: new / reply / escalation / waiting notifications; per-department recipients; assign, progress, resolve act on the real conversation', async () => {
    assert.strictEqual((await post('/adm/tg/connect', { bot: 'support' }, adm)).status, 200);
    const mkS = async (u, team) => (await post('/adm/staff', { name: u, username: u, pw: 'pass12345', team, role: team === 'routine' ? 'Routine Specialist' : 'Support Agent' }, adm)).status;
    await mkS('tg_sup', 'support'); await mkS('tg_rou', 'routine'); const sid = u => DB.prepare('select id from staff where username=?').get(u).id;
    const rid = c => DB.prepare("select id from tg_recipients where bot='support' and chat_id=?").get(c).id;
    const edit = (c, extra) => post('/adm/tg/rec', { bot: 'support', id: rid(c), chat_id: c, name: 'دعم' + c, ...extra }, adm);
    await edit('20010', { perms: ['view', 'assign', 'status', 'resolve', 'dept_service'], staff_id: sid('tg_sup') });                // يستلم باسم موظف الدعم
    await edit('20020', { perms: ['view', 'assign', 'status', 'resolve', 'dept_routine'], staff_id: sid('tg_rou') }); // قسم الروتين فقط
    await edit('20030', { perms: ['view'] });                                                                          // عرض فقط
    calls = []; const c1 = await (await post('/chat/send', { text: 'أريد مساعدة بطلبي', dept: 'service', token: 'sp-1', name: 'زينب', intent: 'human' })).json();
    const toS = () => calls.filter(c => c.method === 'sendMessage' && c.tok === TOK_S);
    assert.deepStrictEqual(toS().map(c => c.body.chat_id).sort(), ['10010', '20010', '20030'], 'routine-only recipient is skipped for a service chat; orders/reports bots silent');
    const t = toS()[0].body.text; for (const w of ['طلب دعم جديد', 'زينب', 'محادثة #' + c1.chat, 'أريد مساعدة بطلبي', 'جديدة']) assert(t.includes(w), w);
    const kb = toS()[0].body.reply_markup.inline_keyboard.flat(); assert(kb.some(b => b.url === 'https://x.dev/support#chat=' + c1.chat) && kb.length === 4, 'open link + assign + progress + resolve');
    assert(!calls.some(c => c.tok === TOK_O || c.tok === TOK_R));
    calls = []; await post('/chat/send', { text: 'ردّيت عليكم؟', dept: 'service', token: 'sp-1', name: 'زينب' }); assert(toS().length === 3 && toS()[0].body.text.includes('رد جديد من الزبون'));
    const ans = () => (calls.filter(c => c.method === 'answerCallbackQuery').pop() || { body: {} }).body.text || '';
    const row = () => DB.prepare('select status,wf,assigned_to from chats where id=?').get(c1.chat);
    for (const who of ['99990', '20030']) { await cb('support', who, 's:rs:' + c1.chat); assert.strictEqual(row().status, 'open', who); }
    await cb('support', '20020', 's:pg:' + c1.chat); assert(/قسم غير مسموح/.test(ans()), 'routine-only recipient cannot touch a service chat'); assert.strictEqual(row().wf, 'new');
    await cb('support', '10010', 's:as:' + c1.chat); assert(/ربط معرّفك/.test(ans()), 'no linked staff account → no assign');
    await cb('support', '20010', 's:as:' + c1.chat); assert.strictEqual(row().assigned_to, sid('tg_sup')); assert.strictEqual(row().wf, 'progress');
    assert(DB.prepare("select count(*) n from chat_messages where chat_id=? and body like '%انضم%'").get(c1.chat).n === 1);
    await post('/adm/tg/rec', { bot: 'support', id: rid('10010'), chat_id: '10010', name: 'م', perms: ['assign'], staff_id: sid('tg_sup') }, adm); await cb('support', '10010', 's:as:' + c1.chat); assert.strictEqual(row().assigned_to, sid('tg_sup'), 'same staff may re-assign (idempotent)');
    await post('/adm/staff', { id: sid('tg_rou'), name: 'tg_rou', username: 'tg_rou', team: 'routine', role: 'Routine Specialist' }, adm);
    await post('/adm/tg/rec', { bot: 'support', id: rid('10010'), chat_id: '10010', name: 'م', perms: ['assign'], staff_id: sid('tg_rou') }, adm); await cb('support', '10010', 's:as:' + c1.chat); assert(/قسم|آخر/.test(ans())); assert.strictEqual(row().assigned_to, sid('tg_sup'));
    await cb('support', '20010', 's:rs:' + c1.chat); assert.strictEqual(row().status, 'closed'); assert.strictEqual(row().wf, 'resolved');
    await cb('support', '20010', 's:rs:' + c1.chat); assert(/مغلقة/.test(ans()));
    assert(DB.prepare("select count(*) n from audit_log where action in ('tg_chat_as','tg_chat_rs')").get().n >= 2);
    // تصعيد بين الأقسام + تذكير «ينتظر»
    const c2 = await (await post('/chat/send', { text: 'ما روتيني؟', dept: 'routine', token: 'sp-2', name: 'هدى', intent: 'human' })).json();
    assert.deepStrictEqual(toS().filter(c => c.body.text.includes('ما روتيني')).map(c => c.body.chat_id).sort(), ['10010', '20020', '20030'], 'routine chat skips the service-only recipient (unrestricted ones still receive it)');
    calls = []; await post('/adm/chat/transfer', { id: c2.chat, dept: 'service' }, adm); assert(toS().some(c => c.body.text.includes('تصعيد محادثة')), 'transfer is an escalation notice');
    const TG = await import('../worker/tg.js'); await post('/adm/tg/bot', { bot: 'support', enabled: true, cfg: { wait_min: 2 } }, adm);
    DB.prepare('update chat_messages set at=? where chat_id=?').run(Date.now() - 5 * 60e3, c2.chat); calls = [];
    assert.strictEqual(await TG.tgSupportWaiting(env), 1); assert(toS().some(c => c.body.text.includes('زبون ينتظر')));
    calls = []; assert.strictEqual(await TG.tgSupportWaiting(env), 0, 'no repeat until the customer writes again');
  });
  console.log(n + ' telegram tests passed');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
