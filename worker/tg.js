/* tg.js — بوتات تلغرام المستقلة: orders / support / reports
   لكل بوت: توكن خاص، webhook بسرّ خاص، وقائمة معرّفات (مستلمين) مستقلة بصلاحيات منفصلة.
   التوكن يُحفظ في D1 ولا يُرجَع للواجهة ولا يُكتب في أي رسالة أو سجل. */
import { J, now, jp, randHex } from './lib.js';
import { audit, hit } from './guard.js';
import { buildReport, summary, baghdad } from './reports.js';

export const BOTS = ['orders', 'support', 'reports'];
export const BOT_LABEL = { orders: 'بوت الطلبات', support: 'بوت الدعم', reports: 'بوت التقارير' };
export const PERMS = {
  orders: ['view', 'confirm', 'reject', 'processing', 'ship', 'deliver'],
  support: ['view', 'assign', 'status', 'resolve', 'dept_service', 'dept_routine'],
  reports: ['view'],
};
const DEFAULT_PERMS = { orders: ['view', 'confirm', 'reject', 'processing', 'ship'], support: ['view', 'assign', 'status', 'resolve', 'dept_service', 'dept_routine'], reports: ['view'] };
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-US');
const fmt = t => t ? new Date(t + 3 * 3600e3).toISOString().replace('T', ' ').slice(0, 16) : '—';
const ST = { 0: '❌ ملغي', 1: '🆕 مستلم — بانتظار التأكيد', 2: '✅ مؤكد', 3: '🚚 مشحون', 4: '🛵 في الطريق', 5: '📦 تم التوصيل' };

/* ---------- نداء Telegram مع إعادة محاولة واحدة عند 429/5xx ---------- */
export async function tgApi(token, method, payload) {
  for (let a = 0; a < 2; a++) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) return { ok: true, result: j.result };
      if ((r.status === 429 || r.status >= 500) && a === 0) { await new Promise(s => setTimeout(s, Math.min(1500, ((j.parameters && j.parameters.retry_after) || 1) * 1000))); continue; }
      return { ok: false, error: String(j.description || ('HTTP ' + r.status)).slice(0, 200), code: j.error_code || r.status };
    } catch (e) { if (a === 1) return { ok: false, error: 'تعذر الاتصال بتلغرام' }; }
  }
  return { ok: false, error: 'تعذر الاتصال بتلغرام' };
}

export const getBot = async (env, bot) => BOTS.includes(bot) ? ((await env.DB.prepare('SELECT * FROM tg_bots WHERE bot=?').bind(bot).first()) || { bot, enabled: 0, name: '', token: '', secret: '', cfg: '{}' }) : null;
const recipients = async (env, bot, onlyActive = true) => (await env.DB.prepare(`SELECT * FROM tg_recipients WHERE bot=? ${onlyActive ? 'AND active=1' : ''} ORDER BY id`).bind(bot).all()).results;
const log = (env, bot, chat, kind, ok, detail = '') => env.DB.prepare('INSERT INTO tg_log(at,bot,chat_id,kind,ok,detail) VALUES(?,?,?,?,?,?)').bind(now(), bot, String(chat || ''), kind, ok ? 1 : 0, String(detail).slice(0, 300)).run().catch(() => {});
const mark = async (env, b, rec, res, kind) => {
  const t = now();
  await log(env, b.bot, rec.chat_id, kind, res.ok, res.ok ? '' : res.error);
  if (res.ok) { await env.DB.batch([env.DB.prepare('UPDATE tg_recipients SET last_ok=?,last_err=\'\' WHERE id=?').bind(t, rec.id), env.DB.prepare('UPDATE tg_bots SET last_ok=? WHERE bot=?').bind(t, b.bot)]); }
  else await env.DB.batch([env.DB.prepare('UPDATE tg_recipients SET last_err=?,last_err_at=? WHERE id=?').bind(res.error, t, rec.id), env.DB.prepare('UPDATE tg_bots SET last_err=?,last_err_at=? WHERE bot=?').bind(res.error, t, b.bot)]);
};
export const botReady = async (env, bot) => { const b = await getBot(env, bot); return !!(b && b.enabled && b.token) && (await recipients(env, bot)).length > 0; };

/* إرسال لكل المستلمين الفعّالين في هذا البوت فقط (قوائم البوتات مستقلة) */
const deptOk = (r, dept) => { const p = jp(r.perms, []), has = p.includes('dept_service') || p.includes('dept_routine'); return !has || p.includes('dept_' + dept); };   // بلا تحديد = كل الأقسام
export async function tgSend(env, bot, text, { keyboard, kind = 'notify', only, perm, dept, preview } = {}) {
  const b = await getBot(env, bot); if (!b || !b.enabled || !b.token) return [];
  let rs = await recipients(env, bot); if (only) rs = rs.filter(r => only.includes(r.chat_id));
  if (perm) rs = rs.filter(r => jp(r.perms, []).includes(perm));
  if (dept) rs = rs.filter(r => deptOk(r, dept));
  return (await Promise.all(rs.map(async r => {
    const res = await tgApi(b.token, 'sendMessage', { chat_id: r.chat_id, text: text.slice(0, 4000), parse_mode: 'HTML', ...(preview ? { link_preview_options: { url: preview, show_above_text: true, prefer_small_media: true } } : { disable_web_page_preview: true }), ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) });
    await mark(env, b, r, res, kind);
    return res.ok ? { chat_id: r.chat_id, message_id: res.result.message_id } : null;
  }))).filter(Boolean);
}

/* ================= بوت الطلبات ================= */
const itemsOf = o => { try { return JSON.parse(o.items) || []; } catch (e) { return []; } };
const PAYL = { cod: 'الدفع عند الاستلام' };
export function orderText(o, last = '') {
  const its = itemsOf(o), shown = its.slice(0, 6).map(i => `<blockquote>🧴 <b>${esc(i.n)}</b>${i.cc ? ' 🎨 ' + esc(i.cc) : ''}\nالكمية: ${i.q} · السعر: ${money(i.p)} د.ع</blockquote>`).join('\n') + (its.length > 6 ? `\n… و${its.length - 6} منتجات أخرى` : '');
  return `🌸 <b>LACEY SKINCARE</b> · <code>#${o.id}</code>\n🛍 <b>${o.status === 1 ? 'طلب جديد وصل' : 'طلب'}</b>\n<i>${o.status === 1 ? 'تم تقديم طلب جديد على المتجر' : 'تفاصيل الطلب'}</i>\n\n${shown}\n\n` +
    `👤 <b>الزبون:</b> ${esc(o.name)}\n📞 <b>الهاتف:</b> ${esc(o.phone)}\n📍 <b>العنوان:</b> ${esc([o.city, o.area, o.landmark].filter(Boolean).join(' — '))}\n\n🧾 <b>رقم الطلب:</b> <code>${esc(o.code)}</code>\n🗓 <b>التاريخ:</b> ${fmt(o.created_at)}\n💳 <b>الدفع:</b> ${esc(PAYL[o.pay_method] || o.pay_method)}\n━━━━━━━━━━\n` +
    `المجموع الفرعي: ${money(o.subtotal)}\n` + (o.discount ? `🏷 الخصم: −${money(o.discount)}\n` : '') + `🚚 التوصيل: ${o.free_shipping ? 'مجاني' : money(o.shipping)}\n💰 <b>الإجمالي: ${money(o.total)} د.ع</b>\n\n📌 الحالة: <b>${ST[o.status] || o.status}</b>` + (last ? `\n\n📝 ${last}` : '');
}
const siteOrigin = async env => { for (const k of BOTS) { try { const b = await getBot(env, k); if (b && b.webhook) return new URL(b.webhook).origin; } catch (e) {} } return env.STORE_URL || ''; };
const photoOf = async (env, o) => { const it = itemsOf(o)[0], org = await siteOrigin(env); return it && org ? `${org}/pimg/${encodeURIComponent(it.c)}` : ''; };
export function orderKeyboard(o, ask) {
  const c = o.code;
  if (o.status === 0 || o.status === 5) return [[{ text: '📦 عرض الطلب', callback_data: 'o:vw:' + c }]];
  if (ask) return [[{ text: ask === 'rj' ? '✔️ نعم، ارفض الطلب' : '✔️ نعم، تم التوصيل فعلاً', callback_data: `o:${ask}y:${c}` }, { text: '↩️ رجوع', callback_data: 'o:bk:' + c }]];
  return [[{ text: '✅ تأكيد الطلب', callback_data: 'o:cf:' + c }, { text: '❌ رفض الطلب', callback_data: 'o:rj:' + c }],
    [{ text: '🔧 قيد التجهيز', callback_data: 'o:pr:' + c }, { text: '🚚 تم الشحن', callback_data: 'o:sh:' + c }],
    [{ text: '📦 تم التوصيل', callback_data: 'o:dl:' + c }, { text: '📦 عرض الطلب', callback_data: 'o:vw:' + c }]];
}
const lastNote = async (env, code) => { const e = await env.DB.prepare('SELECT at,actor,status,note FROM order_events WHERE order_code=? ORDER BY id DESC LIMIT 1').bind(code).first(); return e && /^tg:/.test(e.actor) ? `${esc(e.actor.slice(3))} — ${esc(e.note || ST[e.status])} (${fmt(e.at)})` : ''; };

export async function tgOrderNew(env, o) {
  if (!(await botReady(env, 'orders'))) return false;
  const sent = await tgSend(env, 'orders', orderText(o), { keyboard: orderKeyboard(o), kind: 'order_new', preview: await photoOf(env, o) });
  if (sent.length) await env.DB.batch(sent.map(s => env.DB.prepare('INSERT OR REPLACE INTO tg_order_msgs(order_code,chat_id,message_id) VALUES(?,?,?)').bind(o.code, s.chat_id, s.message_id)));
  return sent.length > 0;
}
/* تحديث رسائل الطلب عند أي تغيير (من تلغرام أو من لوحة المتجر) */
export async function tgOrderRefresh(env, code, ask) {
  try {
    const b = await getBot(env, 'orders'); if (!b || !b.token) return;
    const msgs = (await env.DB.prepare('SELECT * FROM tg_order_msgs WHERE order_code=?').bind(code).all()).results; if (!msgs.length) return;
    const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first(); if (!o) return;
    const text = orderText(o, await lastNote(env, code)), ph = await photoOf(env, o);
    await Promise.all(msgs.map(m => tgApi(b.token, 'editMessageText', { chat_id: m.chat_id, message_id: m.message_id, text, parse_mode: 'HTML', ...(ph ? { link_preview_options: { url: ph, show_above_text: true, prefer_small_media: true } } : {}), reply_markup: { inline_keyboard: orderKeyboard(o, ask) } })));
  } catch (e) { /* التحديث لا يكسر الطلب */ }
}

const NEED = { cf: 'confirm', rj: 'reject', rjy: 'reject', pr: 'processing', sh: 'ship', dl: 'deliver', dly: 'deliver', vw: 'view', bk: 'view' };
async function orderCallback(env, b, cq, deps) {
  const [, act, code] = String(cq.data || '').split(':'); const from = String((cq.from || {}).id || ''), chat = String(cq.message && cq.message.chat ? cq.message.chat.id : from);
  const ans = (text, alert = true) => tgApi(b.token, 'answerCallbackQuery', { callback_query_id: cq.id, text: text.slice(0, 190), show_alert: alert });
  const rec = await env.DB.prepare('SELECT * FROM tg_recipients WHERE bot=? AND chat_id=? AND active=1').bind('orders', from).first();
  if (!rec || !NEED[act] || !jp(rec.perms, []).includes(NEED[act])) { await log(env, 'orders', from, 'denied', false, `${act} ${code}`); await audit(env, null, 'tg:' + from, 'tg_denied', code, null, { act }); return ans('⛔ غير مصرّح لك بهذا الإجراء'); }
  if (!(await hit(env, 'tg:' + from, 40, 60e3))) return ans('⏳ محاولات كثيرة، انتظر قليلاً');
  const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first(); if (!o) return ans('الطلب غير موجود');
  const who = rec.name || ('ID ' + from), actor = 'tg:' + who;
  if (act === 'vw') {
    const ev = (await env.DB.prepare('SELECT at,actor,status,note FROM order_events WHERE order_code=? ORDER BY id').bind(code).all()).results;
    await tgApi(b.token, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: orderText(o) + '\n\n<b>سجل الطلب</b>\n' + ev.map(e => `${fmt(e.at)} — ${esc(ST[e.status] || e.status)} — ${esc(String(e.actor).replace(/^tg:/, '👤 '))}${e.note ? ' — ' + esc(e.note) : ''}`).join('\n') });
    return ans('تم', false);
  }
  if (act === 'bk') { await ans('', false); return tgOrderRefresh(env, code); }
  const bad = m => ans(m);
  if (o.status === 0) return bad('الطلب ملغي');
  if (act === 'rj') { if (![1, 2].includes(o.status)) return bad('لا يمكن رفض طلب تم شحنه'); await ans('', false); return tgOrderRefresh(env, code, 'rj'); }
  if (act === 'dl') { if (o.status === 5) return bad('تم تسجيل التوصيل مسبقاً'); if (o.status !== 4) return bad('لا يمكن تأكيد التسليم قبل أن يكون الطلب «في الطريق». حدّث حالة التوصيل أولاً.'); await ans('', false); return tgOrderRefresh(env, code, 'dl'); }
  let done = false, note = '';
  if (act === 'cf') { if (o.status === 2) return bad('الطلب مؤكد مسبقاً'); if (o.status !== 1) return bad('الطلب ليس بانتظار التأكيد'); done = await deps.setStatus(env, o, 2, actor, 'تأكيد من تلغرام', 1); note = 'تم التأكيد'; }
  else if (act === 'rjy') { if (![1, 2].includes(o.status)) return bad('لا يمكن رفض هذا الطلب'); done = await deps.setStatus(env, o, 0, actor, 'رفض من تلغرام', o.status); note = 'تم الرفض'; }
  else if (act === 'sh') { if (o.status === 3) return bad('الطلب مشحون مسبقاً'); if (o.status !== 2) return bad('يجب تأكيد الطلب قبل الشحن'); done = await deps.setStatus(env, o, 3, actor, 'شحن من تلغرام', 2); note = 'تم الشحن'; }
  else if (act === 'dly') { if (o.status !== 4) return bad('لا يمكن تأكيد التسليم قبل أن يكون الطلب «في الطريق»'); done = await deps.setStatus(env, o, 5, actor, 'تسليم من تلغرام', 4); note = 'تم التوصيل'; }
  else if (act === 'pr') {
    if (o.status !== 2) return bad('يجب تأكيد الطلب أولاً');
    const ex = await env.DB.prepare("SELECT 1 x FROM order_events WHERE order_code=? AND note='قيد التجهيز' LIMIT 1").bind(code).first(); if (ex) return bad('الطلب قيد التجهيز مسبقاً');
    await env.DB.prepare('INSERT INTO order_events(order_code,status,at,actor,note) VALUES(?,?,?,?,?)').bind(code, 2, now(), actor, 'قيد التجهيز').run(); done = true; note = 'قيد التجهيز';   // لا يغيّر حالة الدفع ولا مراحل التتبع
  }
  if (!done) return bad('تم تغيير حالة الطلب من جهة أخرى — حُدّثت الرسالة');
  await audit(env, null, actor, 'tg_order_' + act.replace(/y$/, ''), code, null, { status: (await env.DB.prepare('SELECT status FROM orders WHERE code=?').bind(code).first()).status });
  await log(env, 'orders', from, 'action', true, `${act} ${code}`);
  await ans('✔️ ' + note, false);
  await tgOrderRefresh(env, code);
  const others = (await recipients(env, 'orders')).map(r => r.chat_id).filter(c => c !== from);
  if (others.length) await tgSend(env, 'orders', `ℹ️ ${esc(who)}: ${esc(note)} — الطلب <code>${esc(code)}</code>`, { only: others, kind: 'order_action' });
}

/* ================= بوت الدعم ================= */
const WFL = { new: '🆕 جديدة', assigned: '👤 معيّنة', progress: '🔄 قيد المعالجة', waiting: '⏳ بانتظار الزبون', resolved: '✅ محلولة' };
const DN = { service: 'الدعم', routine: 'اكتشف روتينك' };
const wfOf = ch => ch.status === 'closed' ? 'resolved' : (ch.wf || (ch.assigned_to ? 'assigned' : 'new'));
const originOf = async env => { const b = await getBot(env, 'support'); try { return b.webhook ? new URL(b.webhook).origin : (env.STORE_URL || ''); } catch (e) { return env.STORE_URL || ''; } };
const staffRow = (env, id) => env.DB.prepare('SELECT id,name,active,team,perms FROM staff WHERE id=?').bind(id).first();
async function supportCard(env, ch, head, text) {
  const asg = ch.assigned_to ? ((await staffRow(env, ch.assigned_to)) || {}).name : '';
  const o = await originOf(env), id = ch.id;
  const wait = wfOf(ch) !== 'resolved' && ch.status === 'open';
  const t = `💙 <b>LACEY SUPPORT</b> · <code>#${id}</code>\n${head}\n${text ? '<i>' + esc(String(text).slice(0, 300)) + '</i>' : '<i>عميل يحتاج مساعدة</i>'}\n\n<blockquote>👤 <b>معلومات العميل</b>\nالاسم: ${esc(ch.name || 'زائر')}\nالهاتف: ${esc(ch.phone || '—')}\nرقم العميل: ${ch.customer_id ? '#' + ch.customer_id : 'زائر بلا حساب'}</blockquote>\n<blockquote>💬 <b>تفاصيل المحادثة</b>\nالمحادثة: #${id} — ${esc(DN[ch.dept] || DN.service)}\nالتاريخ: ${fmt(now())}\nالحالة: ${WFL[wfOf(ch)]}${asg ? '\nالموظف: ' + esc(asg) : ''}</blockquote>` + (wait ? '\n⏱ <b>العميل ينتظر الرد</b>' : '');
  const kb = [[...(o ? [{ text: '💬 عرض المحادثة', url: `${o}/support#chat=${id}` }] : [])], [{ text: '🙋 استلمها', callback_data: 's:as:' + id }, { text: '🔄 قيد المعالجة', callback_data: 's:pg:' + id }], [{ text: '✅ تم الحل', callback_data: 's:rs:' + id }]].filter(r => r.length);
  return { text: t, kb };
}
/* kind: new | reply | escalate | waiting */
export async function tgSupportEvent(env, chatId, kind, text) {
  try {
    if (!(await botReady(env, 'support'))) return false;
    const ch = await env.DB.prepare("SELECT * FROM chats WHERE id=? AND channel='support'").bind(chatId).first(); if (!ch) return false;
    const head = { new: '🆕 <b>طلب دعم جديد</b>', reply: '💬 <b>رد جديد من الزبون</b>', escalate: '🚨 <b>تصعيد محادثة</b>', waiting: '⏰ <b>زبون ينتظر الرد</b>' }[kind] || '💬 <b>دعم</b>';
    const c = await supportCard(env, ch, head, text);
    return (await tgSend(env, 'support', c.text, { keyboard: c.kb, kind: 'support_' + kind, dept: ch.dept || 'service' })).length > 0;
  } catch (e) { return false; }
}
/* تذكير: زبون ينتظر أكثر من N دقيقة بلا رد من الموظف (يعمل مع الـ cron كل دقيقة) */
export async function tgSupportWaiting(env) {
  const b = await getBot(env, 'support'); if (!b.enabled || !b.token) return 0;
  const lim = now() - Math.max(2, +jp(b.cfg, {}).wait_min || 10) * 60e3;
  const rows = (await env.DB.prepare(`SELECT c.id, c.tg_wait_at,
      (SELECT body FROM chat_messages m WHERE m.chat_id=c.id AND m.sender NOT IN ('bot','note') ORDER BY m.id DESC LIMIT 1) body, (SELECT sender FROM chat_messages m WHERE m.chat_id=c.id AND m.sender NOT IN ('bot','note') ORDER BY m.id DESC LIMIT 1) sender, (SELECT at FROM chat_messages m WHERE m.chat_id=c.id AND m.sender NOT IN ('bot','note') ORDER BY m.id DESC LIMIT 1) lastat
    FROM chats c WHERE c.channel='support' AND c.status='open' AND c.mode='human' AND c.tg_wait_at < ? LIMIT 20`).bind(lim).all()).results;
  let n = 0;
  for (const r of rows) { if (r.sender !== 'customer' || r.lastat > lim || r.tg_wait_at >= r.lastat) continue; await env.DB.prepare('UPDATE chats SET tg_wait_at=? WHERE id=?').bind(now(), r.id).run(); if (await tgSupportEvent(env, r.id, 'waiting', r.body)) n++; }
  return n;
}
async function supportCallback(env, b, cq) {
  const [, act, idS] = String(cq.data || '').split(':'), id = +idS, from = String((cq.from || {}).id || '');
  const ans = (t, alert = true) => tgApi(b.token, 'answerCallbackQuery', { callback_query_id: cq.id, text: t.slice(0, 190), show_alert: alert });
  const NEEDS = { as: 'assign', pg: 'status', rs: 'resolve', vw: 'view' };
  const rec = await env.DB.prepare('SELECT * FROM tg_recipients WHERE bot=? AND chat_id=? AND active=1').bind('support', from).first();
  if (!rec || !NEEDS[act] || !jp(rec.perms, []).includes(NEEDS[act])) { await log(env, 'support', from, 'denied', false, `${act} ${id}`); await audit(env, null, 'tg:' + from, 'tg_denied', String(id), null, { act }); return ans('⛔ غير مصرّح لك بهذا الإجراء'); }
  if (!(await hit(env, 'tg:' + from, 40, 60e3))) return ans('⏳ محاولات كثيرة، انتظر قليلاً');
  const ch = await env.DB.prepare("SELECT * FROM chats WHERE id=? AND channel='support'").bind(id).first(); if (!ch) return ans('المحادثة غير موجودة');
  if (!deptOk(rec, ch.dept || 'service')) return ans('⛔ هذه المحادثة تابعة لقسم غير مسموح لك به');
  if (act === 'vw') { const c = await supportCard(env, ch, '💬 <b>عرض محادثة</b>', ''); await ans('', false); return tgApi(b.token, 'sendMessage', { chat_id: String(cq.message && cq.message.chat ? cq.message.chat.id : from), parse_mode: 'HTML', text: c.text, reply_markup: { inline_keyboard: c.kb }, disable_web_page_preview: true }); }
  if (ch.status !== 'open') return ans('المحادثة مغلقة (محلولة) مسبقاً');
  const who = rec.name || ('ID ' + from), actor = 'tg:' + who; let note = '';
  if (act === 'as') {                                       // استلام: يتطلب ربط المعرّف بحساب موظف فعّال ضمن قسمه
    const sf = rec.staff_id ? await staffRow(env, rec.staff_id) : null;
    if (!sf || !sf.active) return ans('اطلب من المدير ربط معرّفك بحساب موظف فعّال لتستلم المحادثات');
    const dp = [...new Set([sf.team === 'routine' ? 'routine' : 'service', ...jp(sf.perms, []).filter(x => x.startsWith('dept:')).map(x => x.slice(5))])];
    if (!dp.includes(ch.dept || 'service')) return ans('⛔ حساب الموظف المربوط لا يتبع قسم هذه المحادثة');
    const r = await env.DB.prepare("UPDATE chats SET mode='human',wf='progress',assigned_to=? WHERE id=? AND status='open' AND (assigned_to IS NULL OR assigned_to=?)").bind(sf.id, id, sf.id).run();
    if (!r.meta.changes) return ans('المحادثة مع موظف آخر بالفعل');
    await env.DB.prepare('INSERT INTO chat_messages(chat_id,sender,body,at,author,meta) VALUES(?,?,?,?,?,?)').bind(id, 'bot', `انضم ${sf.name} إلى المحادثة وسيكمل معك 🌸`, now(), 'bot', '').run();
    note = 'استلم المحادثة: ' + sf.name;
  } else if (act === 'pg') {
    if (wfOf(ch) === 'progress') return ans('المحادثة قيد المعالجة مسبقاً');
    await env.DB.prepare("UPDATE chats SET wf='progress' WHERE id=? AND status='open'").bind(id).run(); note = 'قيد المعالجة';
  } else if (act === 'rs') {
    const r = await env.DB.prepare("UPDATE chats SET status='closed',wf='resolved',closed_at=? WHERE id=? AND status='open'").bind(now(), id).run();
    if (!r.meta.changes) return ans('المحادثة مغلقة مسبقاً'); note = 'تم الحل';
  }
  await audit(env, null, actor, 'tg_chat_' + act, String(id), null, { note });
  await log(env, 'support', from, 'action', true, `${act} ${id}`);
  await ans('✔️ ' + note, false);
  const fresh = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(id).first();
  const card = await supportCard(env, fresh, `📝 <b>${esc(note)}</b> — بواسطة ${esc(who)}`, 'تم تحديث المحادثة');
  if (cq.message) await tgApi(b.token, 'editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: fresh.status === 'closed' ? card.kb.filter(r => r[0].url) : card.kb } });
  const others = (await recipients(env, 'support')).filter(r => r.chat_id !== from && deptOk(r, fresh.dept || 'service')).map(r => r.chat_id);
  if (others.length) await tgSend(env, 'support', `ℹ️ ${esc(who)}: ${esc(note)} — محادثة #${id}`, { only: others, kind: 'support_action' });
}


/* ================= بوت التقارير ================= */
const RK = ['daily', 'weekly', 'monthly', 'yearly'], SUM = ['sales', 'orders', 'customers', 'invoices'];
const CMD = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly', sales: 'sales', orders: 'orders', customers: 'customers', invoices: 'invoices' };
export const cleanAuto = a => { const o = {}; for (const k of RK) { const c = (a && a[k]) || {}; o[k] = { on: !!c.on, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(c.time || '') ? c.time : ({ daily: '21:00' })[k] || '09:00', to: (Array.isArray(c.to) ? c.to : []).map(String).filter(x => /^-?\d{5,16}$/.test(x)).slice(0, 50), ...(k === 'weekly' ? { dow: Number.isInteger(+c.dow) && +c.dow >= 0 && +c.dow <= 6 ? +c.dow : 6 } : {}) }; } return o; };
async function reportCommand(env, b, m) {
  const txt = m.text.trim(), cmd = (/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/.exec(txt) || []), name = (cmd[1] || '').toLowerCase(), arg = cmd[2] || '';
  if (!CMD[name]) return;
  const cid = String(m.chat.id), uid = String((m.from || {}).id || cid), send = (text, kb = true) => tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: text.slice(0, 4000), disable_web_page_preview: true, ...(kb ? { reply_markup: { inline_keyboard: reportKb() } } : {}) });
  const rec = await env.DB.prepare('SELECT * FROM tg_recipients WHERE bot=? AND chat_id=? AND active=1').bind('reports', uid).first();
  if (!rec || !jp(rec.perms, []).includes('view')) { await log(env, 'reports', uid, 'denied', false, '/' + name); await audit(env, null, 'tg:' + uid, 'tg_denied', name); return send('⛔ غير مصرّح لك بعرض التقارير.', false); }
  if (!(await hit(env, 'tgr:' + uid, 20, 60e3))) return send('⏳ محاولات كثيرة، انتظر قليلاً.', false);
  const text = RK.includes(name) ? await buildReport(env, name, { arg }) : await summary(env, name);
  const r = await send(text); await log(env, 'reports', uid, 'command', r.ok, r.ok ? '/' + name : r.error);
}
export async function tgReportsTick(env, t = now()) {
  const b = await getBot(env, 'reports'); if (!b.enabled || !b.token) return 0;
  const auto = cleanAuto(jp(b.cfg, {}).auto), p = baghdad(t); let n = 0;
  for (const [i, k] of RK.entries()) {
    const c = auto[k]; if (!c.on) continue;
    const [hh, mm] = c.time.split(':').map(Number); if (p.hh * 60 + p.mm < hh * 60 + mm) continue;
    if (k === 'weekly' && p.dow !== c.dow) continue; if (k === 'monthly' && p.d !== 1) continue; if (k === 'yearly' && !(p.m === 0 && p.d === 1)) continue;
    const claim = await env.DB.prepare('INSERT OR IGNORE INTO tg_updates(bot,update_id,at) VALUES(?,?,?)').bind('reports', -((i + 1) * 1e8 + p.y * 1e4 + (p.m + 1) * 100 + p.d), now()).run();
    if (!claim.meta.changes) continue;                         // أُرسل اليوم مسبقاً
    n += (await tgSend(env, 'reports', await buildReport(env, k, { auto: true, t }), { only: c.to.length ? c.to : undefined, kind: 'report_' + k, perm: 'view' })).length;
  }
  return n;
}


/* ================= قوائم البوتات (أزرار مثل بطاقات الأوامر) ================= */
const MENU = {
  orders: { title: '🛒 <b>Order Bot</b> · إدارة الطلبات', sub: 'اختر ما تريد:', kb: () => [[{ text: '🆕 طلبات جديدة', callback_data: 'm:new' }, { text: '🚚 قيد التوصيل', callback_data: 'm:way' }], [{ text: '📋 كل الطلبات', callback_data: 'm:all' }, { text: '🔎 تتبع طلب', callback_data: 'm:trk' }]] },
  support: { title: '💙 <b>Support Bot</b> · الدعم', sub: 'اختر ما تريد:', kb: () => [[{ text: '🆕 محادثات جديدة', callback_data: 'm:new' }, { text: '⏳ بانتظار الرد', callback_data: 'm:wait' }], [{ text: '📋 كل المفتوحة', callback_data: 'm:all' }]] },
  reports: { title: '📊 <b>Report Bot</b> · التقارير', sub: 'احصل على تقريرك:', kb: () => reportKb() },
};
export const reportKb = () => [[{ text: '📊 تقرير اليوم', callback_data: 'r:daily' }, { text: '📅 أسبوعي', callback_data: 'r:weekly' }], [{ text: '🗓 شهري', callback_data: 'r:monthly' }, { text: '📆 سنوي', callback_data: 'r:yearly' }], [{ text: '💰 المبيعات', callback_data: 'r:sales' }, { text: '🧾 الفواتير', callback_data: 'r:invoices' }], [{ text: '📦 الطلبات', callback_data: 'r:orders' }, { text: '👥 العملاء', callback_data: 'r:customers' }]];
const adminBtn = async env => { const o = await siteOrigin(env); return o ? [[{ text: '⚙️ فتح لوحة الإدارة', url: o + '/admin' }]] : []; };
async function sendMenu(env, b, bot, cid) {
  const m = MENU[bot]; if (!m) return;
  const kb = [...m.kb(), ...(await adminBtn(env))];
  return tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: `🌸 <b>LACEY SKINCARE</b>\n${m.title}\n<i>${m.sub}</i>`, reply_markup: { inline_keyboard: kb } });
}
const recOf = (env, bot, uid) => env.DB.prepare('SELECT * FROM tg_recipients WHERE bot=? AND chat_id=? AND active=1').bind(bot, uid).first();
async function listOrders(env, b, cid, kind) {
  const q = { new: ['status=1', 'طلبات جديدة'], way: ['status IN (2,3,4)', 'طلبات قيد التجهيز والتوصيل'], all: ['1=1', 'آخر الطلبات'] }[kind];
  const rows = (await env.DB.prepare(`SELECT code,id,name,total,status FROM orders WHERE ${q[0]} ORDER BY created_at DESC LIMIT 8`).all()).results;
  if (!rows.length) return tgApi(b.token, 'sendMessage', { chat_id: cid, text: 'لا توجد طلبات في هذا القسم ✨' });
  return tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: `🌸 <b>${q[1]}</b>\nاضغط على طلب لعرضه وإدارته:`, reply_markup: { inline_keyboard: rows.map(o => [{ text: `${['❌', '🆕', '✅', '📮', '🚚', '📦'][o.status]} #${o.id} · ${o.name} · ${money(o.total)}`, callback_data: 'o:vw:' + o.code }]) } });
}
async function listChats(env, b, cid, kind, rec) {
  const rows = (await env.DB.prepare("SELECT id,name,dept,wf,tg_wait_at,created_at FROM chats WHERE channel='support' AND status='open' ORDER BY id DESC LIMIT 40").all()).results.filter(c => deptOk(rec, c.dept || 'service') && (kind === 'all' || (kind === 'new' ? !c.wf : wfOf(c) === 'waiting' || c.tg_wait_at))).slice(0, 8);
  if (!rows.length) return tgApi(b.token, 'sendMessage', { chat_id: cid, text: 'لا توجد محادثات في هذا القسم ✨' });
  return tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: `💙 <b>محادثات الدعم</b>\nاضغط على محادثة لعرضها:`, reply_markup: { inline_keyboard: rows.map(c => [{ text: `💬 #${c.id} · ${c.name || 'زائر'}${c.dept === 'routine' ? ' · روتين' : ''}`, callback_data: 's:vw:' + c.id }]) } });
}
/* m: قوائم · r: تقارير */
async function menuCallback(env, bot, b, cq) {
  const act = String(cq.data).split(':')[1], from = String((cq.from || {}).id || ''), cid = String(cq.message && cq.message.chat ? cq.message.chat.id : from);
  const ans = (t, alert = true) => tgApi(b.token, 'answerCallbackQuery', { callback_query_id: cq.id, text: (t || '').slice(0, 190), show_alert: alert });
  const rec = await recOf(env, bot, from);
  if (!rec || !jp(rec.perms, []).includes('view')) { await log(env, bot, from, 'denied', false, 'm:' + act); return ans('⛔ غير مصرّح لك'); }
  if (!(await hit(env, 'tgm:' + from, 40, 60e3))) return ans('⏳ محاولات كثيرة، انتظر قليلاً');
  await ans('', false);
  if (bot === 'orders') { if (act === 'trk') return tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: '🔎 أرسل رقم الطلب هنا (مثال: <code>LC-ABC123</code> أو <code>#1007</code>) وسأعرضه لك.' }); return listOrders(env, b, cid, act); }
  if (bot === 'support') return listChats(env, b, cid, act, rec);
}
async function reportCallback(env, b, cq) {
  const name = String(cq.data).split(':')[1], from = String((cq.from || {}).id || ''), cid = String(cq.message && cq.message.chat ? cq.message.chat.id : from);
  await tgApi(b.token, 'answerCallbackQuery', { callback_query_id: cq.id });
  return reportCommand(env, b, { text: '/' + name, chat: { id: cid }, from: { id: from } });
}
/* كتابة رقم الطلب مباشرة = تتبع */
async function trackByText(env, b, m) {
  const t = m.text.trim(), cid = String(m.chat.id), uid = String((m.from || {}).id || cid);
  const mm = /^(?:#\s*(\d{1,9})|(LC-[A-Za-z0-9]{4,12}))$/.exec(t); if (!mm) return false;
  const rec = await recOf(env, 'orders', uid); if (!rec || !jp(rec.perms, []).includes('view')) return false;
  const o = mm[1] ? await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(+mm[1]).first() : await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(mm[2].toUpperCase()).first();
  if (!o) { await tgApi(b.token, 'sendMessage', { chat_id: cid, text: 'لم أجد هذا الطلب 🔍' }); return true; }
  await tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: orderText(o), reply_markup: { inline_keyboard: orderKeyboard(o) }, disable_web_page_preview: true }); return true;
}
export const TG_COMMANDS = { orders: [['menu', 'قائمة الطلبات'], ['id', 'معرّفك']], support: [['menu', 'قائمة الدعم'], ['id', 'معرّفك']], reports: [['menu', 'قائمة التقارير'], ['daily', 'تقرير اليوم'], ['weekly', 'أسبوعي'], ['monthly', 'شهري'], ['yearly', 'سنوي'], ['sales', 'المبيعات'], ['orders', 'الطلبات'], ['customers', 'العملاء'], ['invoices', 'الفواتير']] };

/* ================= webhook ================= */
export async function tgHook(env, bot, request, deps) {
  const b = await getBot(env, bot); if (!b || !b.token || !b.enabled) return J({ ok: true });
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== b.secret || !b.secret) return J({ error: 'forbidden' }, 403);
  const u = await request.json().catch(() => null); if (!u || !u.update_id) return J({ ok: true });
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO tg_updates(bot,update_id,at) VALUES(?,?,?)').bind(bot, u.update_id, now()).run();
  if (!ins.meta.changes) return J({ ok: true, dup: true });                       // حماية من التكرار
  try {
    if (u.callback_query && String(u.callback_query.data || '').startsWith('m:')) await menuCallback(env, bot, b, u.callback_query);
    else if (u.callback_query && bot === 'reports' && String(u.callback_query.data || '').startsWith('r:')) await reportCallback(env, b, u.callback_query);
    else if (u.callback_query && bot === 'orders' && String(u.callback_query.data || '').startsWith('o:')) await orderCallback(env, b, u.callback_query, deps);
    else if (u.callback_query && bot === 'support' && String(u.callback_query.data || '').startsWith('s:')) await supportCallback(env, b, u.callback_query);
    else if (u.callback_query && deps.onCallback) await deps.onCallback(env, bot, b, u.callback_query);
    else if (u.message && u.message.text) {
      const m = u.message, txt = m.text.trim(), cid = String(m.chat.id), uid = String((m.from || {}).id || cid);
      if (/^\/start|^\/id\b/.test(txt)) { await tgApi(b.token, 'sendMessage', { chat_id: cid, parse_mode: 'HTML', text: `أهلاً 🌸 هذا ${esc(b.name || BOT_LABEL[bot])}.\nمعرّفك: <code>${esc(uid)}</code>${cid !== uid ? `\nمعرّف هذه المحادثة: <code>${esc(cid)}</code>` : ''}\nأعطِ هذا الرقم للمدير ليضيفك وتبدأ باستلام الإشعارات.` }); if (/^\/start/.test(txt)) { const rec = await recOf(env, bot, uid); if (rec && jp(rec.perms, []).includes('view')) await sendMenu(env, b, bot, cid); } }
      else if (/^\/menu\b/.test(txt)) { const rec = await recOf(env, bot, uid); if (rec && jp(rec.perms, []).includes('view')) await sendMenu(env, b, bot, cid); else await tgApi(b.token, 'sendMessage', { chat_id: cid, text: '⛔ غير مصرّح لك. أرسل /id وأعطِ الرقم للمدير.' }); }
      else if (bot === 'orders' && (await trackByText(env, b, m))) { /* تتبع */ }
      else if (bot === 'reports') await reportCommand(env, b, m);
      else if (deps.onCommand) await deps.onCommand(env, bot, b, m);
    }
  } catch (e) { await log(env, bot, '', 'error', false, String(e.message || e)); }
  return J({ ok: true });
}

/* ================= واجهة المدير ================= */
const pubBot = async (env, b) => {
  const rs = await recipients(env, b.bot, false), last = (await env.DB.prepare('SELECT at,detail FROM tg_log WHERE bot=? AND ok=0 ORDER BY id DESC LIMIT 1').bind(b.bot).first()) || null;
  return { bot: b.bot, label: BOT_LABEL[b.bot], enabled: !!b.enabled, name: b.name, hasToken: !!b.token, tokenHint: b.token ? '••••' + b.token.slice(-4) : '', username: b.username, connected: !!b.webhook, last_ok: b.last_ok, last_err: b.last_err, last_err_at: b.last_err_at, cfg: b.bot === 'reports' ? { ...jp(b.cfg, {}), auto: cleanAuto(jp(b.cfg, {}).auto) } : jp(b.cfg, {}), perms: PERMS[b.bot], count: rs.filter(r => r.active).length, total: rs.length,
    recipients: rs.map(r => ({ id: r.id, staff_id: r.staff_id || null, chat_id: r.chat_id, name: r.name, active: !!r.active, perms: jp(r.perms, []), last_ok: r.last_ok, last_err: r.last_err, last_err_at: r.last_err_at })), lastFail: last };
};
export async function tgRoutes(c) {
  const { env, request, url, p, M, body, authed, deps } = c;
  if (p.startsWith('/tg/hook/') && M === 'POST') return tgHook(env, p.slice(9), request, deps);
  if (!p.startsWith('/adm/tg')) return null;
  if (!authed) return J({ error: 'unauthorized' }, 401);
  if (p === '/adm/tg' && M === 'GET') return J({ bots: await Promise.all(BOTS.map(async k => pubBot(env, await getBot(env, k)))) });
  if (p === '/adm/tg/bot' && M === 'POST') {
    const b = await body(); const bot = b.bot; if (!BOTS.includes(bot)) return J({ error: 'بوت غير معروف' }, 400);
    const cur = await getBot(env, bot); let token = cur.token;
    if (b.token !== undefined && String(b.token).trim()) { token = String(b.token).trim(); if (!/^\d{6,12}:[\w-]{30,60}$/.test(token)) return J({ error: 'صيغة التوكن غير صحيحة' }, 400); }
    // لا يمكن استخدام نفس التوكن في بوتين (فصل كامل)
    if (token && (await env.DB.prepare('SELECT 1 x FROM tg_bots WHERE token=? AND bot<>?').bind(token, bot).first())) return J({ error: 'هذا التوكن مستخدم في بوت آخر — لكل بوت توكن مستقل' }, 400);
    const nc = { ...jp(cur.cfg, {}), ...(b.cfg && typeof b.cfg === 'object' ? b.cfg : {}) }; if (bot === 'reports') nc.auto = cleanAuto(nc.auto); else delete nc.auto;
    const secret = cur.secret || randHex(24), cfg = JSON.stringify(nc);
    await env.DB.prepare('INSERT INTO tg_bots(bot,enabled,name,token,secret,cfg,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(bot) DO UPDATE SET enabled=excluded.enabled,name=excluded.name,token=excluded.token,secret=excluded.secret,cfg=excluded.cfg,updated_at=excluded.updated_at')
      .bind(bot, b.enabled ? 1 : 0, String(b.name ?? cur.name ?? '').slice(0, 60), token, secret, cfg, now()).run();
    if (token !== cur.token) await env.DB.prepare("UPDATE tg_bots SET webhook='',username='' WHERE bot=?").bind(bot).run();
    await audit(env, request, 'admin', 'tg_bot_save', bot, null, { enabled: !!b.enabled, tokenChanged: token !== cur.token });
    return J({ ok: true });
  }
  if (p === '/adm/tg/connect' && M === 'POST') {          // اختبار الاتصال + تسجيل الـ webhook
    const b = await body(), cur = await getBot(env, b.bot); if (!cur || !cur.token) return J({ error: 'احفظ التوكن أولاً' }, 400);
    const me = await tgApi(cur.token, 'getMe'); if (!me.ok) { await env.DB.prepare('UPDATE tg_bots SET last_err=?,last_err_at=? WHERE bot=?').bind('اتصال: ' + me.error, now(), cur.bot).run(); return J({ error: 'فشل الاتصال: ' + me.error }, 400); }
    const hook = url.origin + '/tg/hook/' + cur.bot;
    const wh = await tgApi(cur.token, 'setWebhook', { url: hook, secret_token: cur.secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false });
    if (!wh.ok) return J({ error: 'فشل ربط الـ webhook: ' + wh.error }, 400);
    await tgApi(cur.token, 'setMyCommands', { commands: (TG_COMMANDS[cur.bot] || []).map(([command, description]) => ({ command, description })) });
    await env.DB.prepare('UPDATE tg_bots SET username=?,webhook=?,last_err=\'\' WHERE bot=?').bind(me.result.username || '', hook, cur.bot).run();
    await log(env, cur.bot, '', 'connect', true, '@' + me.result.username); await audit(env, request, 'admin', 'tg_connect', cur.bot);
    return J({ ok: true, username: me.result.username });
  }
  if (p === '/adm/tg/rec' && M === 'POST') {
    const b = await body(); if (!BOTS.includes(b.bot)) return J({ error: 'بوت غير معروف' }, 400);
    const chat = String(b.chat_id || '').trim(); if (!/^-?\d{5,16}$/.test(chat)) return J({ error: 'المعرّف رقم فقط (Telegram ID أو Chat ID)' }, 400);
    const perms = JSON.stringify((Array.isArray(b.perms) ? b.perms : DEFAULT_PERMS[b.bot]).filter(x => PERMS[b.bot].includes(x)));
    if (b.id) {
      const r = await env.DB.prepare('SELECT * FROM tg_recipients WHERE id=?').bind(+b.id).first(); if (!r) return J({ error: 'not found' }, 404);
      if (await env.DB.prepare('SELECT 1 x FROM tg_recipients WHERE bot=? AND chat_id=? AND id<>?').bind(r.bot, chat, r.id).first()) return J({ error: 'المعرّف موجود مسبقاً في هذا البوت' }, 409);
      await env.DB.prepare('UPDATE tg_recipients SET chat_id=?,name=?,active=?,perms=?,staff_id=? WHERE id=?').bind(chat, String(b.name || '').slice(0, 60), b.active === false ? 0 : 1, perms, b.staff_id ? +b.staff_id : null, r.id).run();
      await audit(env, request, 'admin', 'tg_rec_edit', r.bot + ':' + chat, null, { active: b.active !== false, perms });
    } else {
      if ((await env.DB.prepare('SELECT COUNT(*) n FROM tg_recipients WHERE bot=?').bind(b.bot).first()).n >= 50) return J({ error: 'الحد الأقصى 50 معرّفاً لكل بوت' }, 400);
      if (await env.DB.prepare('SELECT 1 x FROM tg_recipients WHERE bot=? AND chat_id=?').bind(b.bot, chat).first()) return J({ error: 'المعرّف موجود مسبقاً في هذا البوت' }, 409);
      await env.DB.prepare('INSERT INTO tg_recipients(bot,chat_id,name,active,perms,created_at,staff_id) VALUES(?,?,?,?,?,?,?)').bind(b.bot, chat, String(b.name || '').slice(0, 60), b.active === false ? 0 : 1, perms, now(), b.staff_id ? +b.staff_id : null).run();
      await audit(env, request, 'admin', 'tg_rec_add', b.bot + ':' + chat);
    }
    return J({ ok: true });
  }
  if (p === '/adm/tg/rec' && M === 'DELETE') {
    const r = await env.DB.prepare('SELECT * FROM tg_recipients WHERE id=?').bind(+url.searchParams.get('id')).first(); if (!r) return J({ error: 'not found' }, 404);
    await env.DB.prepare('DELETE FROM tg_recipients WHERE id=?').bind(r.id).run(); await audit(env, request, 'admin', 'tg_rec_del', r.bot + ':' + r.chat_id); return J({ ok: true });
  }
  if (p === '/adm/tg/rec/test' && M === 'POST') {
    const b = await body(), r = await env.DB.prepare('SELECT * FROM tg_recipients WHERE id=?').bind(+b.id).first(); if (!r) return J({ error: 'not found' }, 404);
    const bt = await getBot(env, r.bot); if (!bt.token) return J({ error: 'احفظ التوكن أولاً' }, 400);
    const res = await tgApi(bt.token, 'sendMessage', { chat_id: r.chat_id, parse_mode: 'HTML', text: `✅ رسالة اختبار من <b>${esc(bt.name || BOT_LABEL[r.bot])}</b> — Lacey Skincare` });
    await mark(env, bt, r, res, 'test');
    return res.ok ? J({ ok: true }) : J({ error: res.error.includes('chat not found') || res.error.includes('blocked') ? 'تعذر الإرسال: يجب أن يضغط المستلم Start على البوت أولاً (' + res.error + ')' : res.error }, 400);
  }
  if (p === '/adm/tg/report' && M === 'POST') {            // إرسال تقرير الآن (اختبار)
    const b = await body(); if (!RK.includes(b.kind)) return J({ error: 'نوع تقرير غير معروف' }, 400);
    const cur = await getBot(env, 'reports'); if (!cur.token || !cur.enabled) return J({ error: 'فعّل بوت التقارير واحفظ توكنه أولاً' }, 400);
    const to = cleanAuto(jp(cur.cfg, {}).auto)[b.kind].to, sent = await tgSend(env, 'reports', await buildReport(env, b.kind, { auto: false }), { only: to.length ? to : undefined, kind: 'report_' + b.kind, perm: 'view' });
    await audit(env, request, 'admin', 'tg_report_now', b.kind); return sent.length ? J({ ok: true, sent: sent.length }) : J({ error: 'لم يصل لأي معرّف — أضف معرّفاً فعّالاً بصلاحية العرض' }, 400);
  }
  if (p === '/adm/tg/log' && M === 'GET') {
    const bot = url.searchParams.get('bot'); const rows = (await env.DB.prepare(`SELECT at,bot,chat_id,kind,ok,detail FROM tg_log ${BOTS.includes(bot) ? 'WHERE bot=?' : ''} ORDER BY id DESC LIMIT 60`).bind(...(BOTS.includes(bot) ? [bot] : [])).all()).results;
    return J({ log: rows });
  }
  return null;
}
