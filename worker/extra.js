/* extra.js — دردشة الدعم، التقييمات، الحملات التسويقية، الإحصائيات، رفع الوسائط، manifest */
import { J, CORS, now, jp, rnd, randHex, sha256, today, cfgOf, IG_KEYS, IG_SECRET, readIg, resetIg } from './lib.js';
import { waSend, waOn } from './wa.js';
import { botReply, BOT, MAIN } from './bot.js';
import { pbkdf2, eq } from './auth.js';
import { processQueue } from './wa.js';
import { limit, audit, ipOf } from './guard.js';

const TZ = 3 * 3600;                                    // بغداد UTC+3
const MEDIA_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
const MAX_MEDIA = 40 * 1024 * 1024, MAX_D1_MEDIA = 8 * 1024 * 1024, CHUNK = 700000;

async function guestChat(env, token, create, sess, extra = {}) {
  let ch = null;
  if (sess) ch = await env.DB.prepare("SELECT * FROM chats WHERE customer_id=? AND channel='support' ORDER BY id DESC LIMIT 1").bind(sess.id).first();
  if (!ch && token) ch = await env.DB.prepare("SELECT * FROM chats WHERE guest_token=? AND channel='support' ORDER BY id DESC LIMIT 1").bind(await sha256(token)).first();
  if (!ch && create) {
    const tk = token || randHex(16);
    const id = (await env.DB.prepare("INSERT INTO chats(customer_id,channel,status,created_at,guest_token,name,phone) VALUES(?,'support','open',?,?,?,?) RETURNING id")
      .bind(sess ? sess.id : null, now(), await sha256(tk), String(extra.name || (sess && sess.name) || '').slice(0, 60), String(extra.ph || (sess && sess.phone) || '').slice(0, 20)).first()).id;
    ch = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(id).first(); ch._tk = tk;
  }
  return ch;
}
const msgs = async (env, id, after) => (await env.DB.prepare('SELECT id,sender,body,at,author,meta FROM chat_messages WHERE chat_id=? AND id>? ORDER BY id LIMIT 200').bind(id, after || 0).all()).results;

export async function extraRoutes(c) {
  const { env, request, url, p, M, body, authed, sess, ctx, tg } = c;
  const adm = () => authed ? null : J({ error: 'unauthorized' }, 401);

  /* ---------- الربط والمفاتيح (تُحفظ في القاعدة بدل أسرار Cloudflare) ---------- */
  if (p === '/adm/audit' && M === 'GET') {
    const a = adm(); if (a) return a;
    const rows = (await env.DB.prepare('SELECT id,at,actor,action,entity,before,after,ip FROM audit_log ORDER BY id DESC LIMIT 200').all()).results;
    return J({ items: rows });
  }
  if (p === '/adm/dashboard' && M === 'GET') {
    const a = adm(); if (a) return a;
    const day = Math.floor((now() + TZ * 1000) / 864e5) * 864e5 - TZ * 1000;
    const q = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first()) || {};
    const [nw, od, sup, sales] = await Promise.all([
      q('SELECT COUNT(*) n FROM orders WHERE status=1'),
      q('SELECT COUNT(*) n FROM orders WHERE status IN (2,3) AND created_at<?', now() - 2 * 864e5),
      q("SELECT COUNT(*) n FROM chats WHERE status='open' AND mode='human' AND assigned_to IS NULL"),
      q('SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE status<>0 AND created_at>=?', day),
    ]);
    return J({ new_orders: nw.n || 0, overdue: od.n || 0, unread_support: sup.n || 0, today_orders: sales.n || 0, today_sales: sales.s || 0 });
  }
  if (p === '/adm/integrations' && M === 'GET') {
    const a = adm(); if (a) return a;
    const v = await readIg(env), out = {};
    for (const k of IG_KEYS) { const val = v[k] || ''; out[k] = IG_SECRET.includes(k) ? { set: !!val, hint: val ? '••••' + val.slice(-4) : '' } : { set: !!val, value: val }; }
    out._active = { wa: waOn(env), google: !!env.GOOGLE_CLIENT_ID, telegram: !!(env.BOT_TOKEN && env.CHAT_ID) };
    return J(out);
  }
  if (p === '/adm/integrations' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body(), cur = { ...(await readIg(env)) };
    await audit(env, request, 'admin', 'integrations_save', '', null, Object.keys(b).filter(k => IG_KEYS.includes(k) && String(b[k] ?? '').trim()));   // أسماء الحقول فقط، لا قيم
    for (const k of IG_KEYS) {
      if (!(k in b)) continue;
      const val = String(b[k] ?? "").trim().slice(0, k === "AI_PROMPT" ? 1500 : 600);
      if (val === '__clear__') delete cur[k]; else if (val) cur[k] = val;      // الفارغ = إبقاء القيمة الحالية
    }
    await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('integrations',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(cur), now()).run();
    resetIg(); return J({ ok: true });
  }
  if (p === '/adm/integrations/test' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body();
    if (b.kind === 'telegram') {
      if (!env.BOT_TOKEN || !env.CHAT_ID) return J({ error: 'أدخل BOT_TOKEN و CHAT_ID أولاً' }, 400);
      try { const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.CHAT_ID, text: '✅ اختبار الربط من لوحة تحكم لاسي' }) }); const j = await r.json().catch(() => ({})); return r.ok ? J({ ok: true }) : J({ error: j.description || 'فشل تلجرام' }, 502); }
      catch (e) { return J({ error: 'تعذر الاتصال بتلجرام' }, 502); }
    }
    if (!/^07\d{9}$/.test(String(b.ph || ''))) return J({ error: 'اكتب رقماً عراقياً صحيحاً 07XXXXXXXXX' }, 400);
    const r = await waSend(env, b.ph, 'promo', ['✅ اختبار الربط من لوحة تحكم لاسي'], '✅ اختبار الربط من لوحة تحكم لاسي');
    return r.ok ? J({ ok: true }) : J({ error: r.error === 'wa_not_configured' ? 'أدخل WA_TOKEN و WA_PHONE_ID أولاً' : r.error }, 502);
  }

  /* ---------- manifest ديناميكي ---------- */
  if (p === '/manifest.json') {
    const cfg = await cfgOf(env);
    return new Response(JSON.stringify({
      name: cfg.nm || 'Lacey Skincare', short_name: cfg.sn || 'Lacey', description: cfg.hs || 'Lacey skincare store',
      start_url: '/', scope: '/', display: 'standalone', lang: 'ar', dir: 'rtl',
      background_color: cfg.cp || '#f6fbfb', theme_color: cfg.ac || '#2f8f9d',
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    }), { headers: { ...CORS, 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  }

  /* ---------- وسائط (R2) ---------- */
  if (p === '/media' && M === 'POST') {
    const a = adm(); if (a) return a;
    const type = (request.headers.get('content-type') || '').split(';')[0];
    if (!MEDIA_TYPES[type]) return J({ error: 'نوع الملف غير مدعوم (png, jpg, webp, gif, mp4, webm)' }, 415);
    const buf = await request.arrayBuffer();
    const max = env.MEDIA ? MAX_MEDIA : MAX_D1_MEDIA;
    if (!buf.byteLength || buf.byteLength > max) return J({ error: `حجم الملف يجب أن يكون أقل من ${max >> 20}MB` + (env.MEDIA ? '' : ' (فعّل R2 لملفات أكبر)') }, 413);
    const key = rnd(10).toLowerCase() + now().toString(36) + '.' + MEDIA_TYPES[type];
    if (env.MEDIA) await env.MEDIA.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
    else {
      let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
      const b64 = btoa(bin), st = [];
      for (let i = 0; i * CHUNK < b64.length; i++) st.push(env.DB.prepare('INSERT INTO media_chunks(key,idx,data) VALUES(?,?,?)').bind(key, i, b64.slice(i * CHUNK, (i + 1) * CHUNK)));
      for (let i = 0; i < st.length; i += 10) await env.DB.batch(st.slice(i, i + 10));
    }
    await env.DB.prepare('INSERT INTO media(key,type,size,created_at) VALUES(?,?,?,?)').bind(key, type, buf.byteLength, now()).run();
    return J({ url: '/media/' + key, type, size: buf.byteLength });
  }
  if (p.startsWith('/media/') && M === 'GET') {
    const key = p.slice(7);
    if (!/^[a-z0-9]+\.[a-z0-9]+$/.test(key)) return J({ error: 'not found' }, 404);
    const base = { 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' };
    if (env.MEDIA) {
      const o = await env.MEDIA.get(key, { range: request.headers });
      if (o) { const h = new Headers(base); o.writeHttpMetadata && o.writeHttpMetadata(h); return new Response(o.body, { status: o.range ? 206 : 200, headers: h }); }
    }
    const m = await env.DB.prepare('SELECT type,size FROM media WHERE key=?').bind(key).first();
    if (!m) return J({ error: 'not found' }, 404);
    const rows = (await env.DB.prepare('SELECT data FROM media_chunks WHERE key=? ORDER BY idx').bind(key).all()).results;
    if (!rows.length) return J({ error: 'not found' }, 404);
    const bin = atob(rows.map(r => r.data).join('')), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const rg = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
    if (rg) {
      let s0 = rg[1] === '' ? u.length - +rg[2] : +rg[1], e0 = rg[1] !== '' && rg[2] !== '' ? Math.min(+rg[2], u.length - 1) : u.length - 1;
      if (s0 > e0 || s0 >= u.length) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${u.length}` } });
      return new Response(u.slice(s0, e0 + 1), { status: 206, headers: { ...base, 'Content-Type': m.type, 'Content-Range': `bytes ${s0}-${e0}/${u.length}` } });
    }
    return new Response(u, { headers: { ...base, 'Content-Type': m.type } });
  }
  if (p === '/media' && M === 'GET') { const a = adm(); if (a) return a; return J({ items: (await env.DB.prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT 200').all()).results }); }

  /* ---------- دردشة الزبائن (قناة الدعم) ---------- */
  const addMsg = (chatId, sender, text, author = '', meta = '') =>
    env.DB.prepare('INSERT INTO chat_messages(chat_id,sender,body,at,author,meta) VALUES(?,?,?,?,?,?)').bind(chatId, sender, text, now(), author, meta).run();
  const staffName = async ch => ch.assigned_to ? ((await env.DB.prepare('SELECT name FROM staff WHERE id=?').bind(ch.assigned_to).first()) || {}).name || '' : '';
  const MAINCH = MAIN;
  if (p === '/chat/send' && M === 'POST') {
    { const lim = await limit(env, request, 'chat-send', 40, 10 * 60e3); if (lim) return lim; }
    const b = await body(); const quick = ({ track: 'where', edit: 'modify', cancel: 'cancel', human: 'human' })[String(b.intent || '')] || String(b.quick || '').slice(0, 60);
    const label = quick ? ((MAINCH.find(x => x.k === quick) || {}).t || (quick.startsWith('cancel_yes') ? 'نعم، ألغِ الطلب' : quick === 'no' ? 'لا' : quick)) : '';
    const text = String(b.text || label || '').trim().slice(0, 1000);
    if (!text) return J({ error: 'empty' }, 400);
    const ch = await guestChat(env, b.token, true, sess, b);
    const recent = await env.DB.prepare("SELECT COUNT(*) n FROM chat_messages WHERE chat_id=? AND sender='customer' AND at>?").bind(ch.id, now() - 3600e3).first();
    if (recent.n >= 40) return J({ error: 'رسائل كثيرة، حاول لاحقاً' }, 429);
    if (ch.status !== 'open') { await env.DB.prepare("UPDATE chats SET status='open',closed_at=NULL,mode='bot',assigned_to=NULL WHERE id=?").bind(ch.id).run(); ch.mode = 'bot'; ch.assigned_to = null; }
    await addMsg(ch.id, 'customer', text);
    let mode = ch.mode;
    if (mode === 'bot') {
      const pend = /^pending_cancel:(LC-[A-Z0-9]{6})$/.exec(ch.topic || '');
      let q2 = quick;
      if (!q2 && pend) { if (/^(نعم|ايه|إيه|أجل|اجل|اي|تمام|yes|y|ok)(\s|$|[.!،])/i.test(text)) q2 = 'cancel_yes:' + pend[1]; else if (/^(لا|كلا|no|n)(\s|$|[.!،])/i.test(text)) q2 = 'no'; }
      const r = await botReply(env, ch, { text: b.intent || q2 ? '' : text, quick: q2 });
      await addMsg(ch.id, 'bot', r.body, BOT, r.chips && r.chips.length ? JSON.stringify({ chips: r.chips }) : '');
      const pc = (r.chips || []).find(x => x.k.startsWith('cancel_yes:'));
      await env.DB.prepare('UPDATE chats SET topic=? WHERE id=?').bind(pc ? 'pending_cancel:' + pc.k.slice(11) : (ch.topic || '').startsWith('pending_cancel') ? '' : ch.topic || '', ch.id).run();
      if (r.handoff) { mode = 'human'; await env.DB.prepare("UPDATE chats SET mode='human',topic=? WHERE id=?").bind(r.topic || '', ch.id).run(); }
    }
    if (mode === 'human' && tg && ctx && ctx.waitUntil) ctx.waitUntil(tg(`💬 <b>دعم #${ch.id}</b> ${ch.name || 'زائر'} ${ch.phone || ''}${ch.assigned_to ? ' (للموظف ' + (await staffName(ch)) + ')' : ' — بانتظار موظف'}\n${text.replace(/[<>&]/g, '')}`));
    return J({ ok: true, token: ch._tk || b.token || '', chat: ch.id });
  }
  if (p === '/chat/poll' && M === 'GET') {
    { const lim = await limit(env, request, 'chat-poll', 400, 10 * 60e3); if (lim) return lim; }
    const ch = await guestChat(env, url.searchParams.get('token') || '', false, sess);
    if (!ch) return J({ chat: null, messages: [] });
    const rated = await env.DB.prepare('SELECT 1 x FROM reviews WHERE chat_id=?').bind(ch.id).first();
    return J({ chat: ch.id, status: ch.status, mode: ch.mode, staff: await staffName(ch), rated: !!rated,
      messages: (await msgs(env, ch.id, +url.searchParams.get('after') || 0)).map(m => ({ ...m, meta: jp(m.meta, null) })) }, 200, { 'Cache-Control': 'no-store' });
  }
  if (p === '/chat/close' && M === 'POST') {
    const b = await body(); const ch = await guestChat(env, b.token, false, sess); if (!ch) return J({ error: 'no chat' }, 404);
    await env.DB.prepare("UPDATE chats SET status='closed',closed_at=? WHERE id=?").bind(now(), ch.id).run();
    return J({ ok: true });
  }
  if (p === '/chat/rate' && M === 'POST') {
    const b = await body(); const ch = await guestChat(env, b.token, false, sess); if (!ch) return J({ error: 'no chat' }, 404);
    const r = Math.round(+b.rating);
    if (!(r >= 1 && r <= 5)) return J({ error: 'التقييم من 1 إلى 5' }, 400);
    if (await env.DB.prepare('SELECT 1 x FROM reviews WHERE chat_id=?').bind(ch.id).first()) return J({ error: 'تم التقييم مسبقاً' }, 409);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO reviews(chat_id,customer_id,rating,comment,at,staff_id) VALUES(?,?,?,?,?,?)').bind(ch.id, ch.customer_id, r, String(b.comment || '').slice(0, 500), now(), ch.assigned_to || null),
      env.DB.prepare("UPDATE chats SET status='closed',closed_at=COALESCE(closed_at,?) WHERE id=?").bind(now(), ch.id),
    ]);
    return J({ ok: true });
  }

  /* ---------- الموظفون: دخول + إدارة ---------- */
  if (p === '/staff/login' && M === 'POST') {
    const b = await body();
    { const lim = (await limit(env, request, 'staff-login', 20, 15 * 60e3)) || (await limit(env, request, 'staff-login-u', 8, 15 * 60e3, String(b.username || b.u || '').toLowerCase().slice(0, 40))); if (lim) return lim; }
    const row = await env.DB.prepare('SELECT * FROM staff WHERE username=? AND active=1').bind(String(b.username || b.u || '').trim().toLowerCase()).first();
    const h = await pbkdf2(String(b.pw || ''), row ? row.pw_salt : '00'.repeat(16));
    if (!row || !eq(h, row.pw_hash)) return J({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, 401);
    const tok = 's.' + randHex(32);
    await env.DB.prepare('INSERT INTO staff_sessions(token_hash,staff_id,expires_at) VALUES(?,?,?)').bind(await sha256(tok), row.id, now() + 30 * 864e5).run();
    await audit(env, request, 'staff:' + row.username, 'staff_login');
    return J({ token: tok, name: row.name });
  }
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let op = null;
  if (authed) op = { admin: true, id: 0, name: (await cfgOf(env)).an || 'الإدارة' };
  else if (bearer.startsWith('s.')) {
    const r = await env.DB.prepare('SELECT s.id,s.name FROM staff_sessions t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=? AND t.expires_at>? AND s.active=1').bind(await sha256(bearer), now()).first();
    if (r) op = { admin: false, id: r.id, name: r.name };
  }
  if (p === '/staff/me' && M === 'GET') return op ? J({ name: op.name, admin: op.admin }) : J({ error: 'unauthorized' }, 401);
  const needOp = () => op ? null : J({ error: 'unauthorized' }, 401);

  if (p === '/adm/staff' && M === 'GET') {
    const a = adm(); if (a) return a;
    const rows = (await env.DB.prepare(`SELECT s.id,s.name,s.username,s.active,s.created_at,
      (SELECT COUNT(*) FROM chats c WHERE c.assigned_to=s.id) chats, (SELECT AVG(rating) FROM reviews r WHERE r.staff_id=s.id) avg, (SELECT COUNT(*) FROM reviews r WHERE r.staff_id=s.id) votes FROM staff s ORDER BY s.id`).all()).results;
    return J({ staff: rows.map(r => ({ ...r, avg: r.avg ? Math.round(r.avg * 100) / 100 : 0, active: !!r.active })) });
  }
  if (p === '/adm/staff' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body(), name = String(b.name || '').trim().slice(0, 40), un = String(b.username || '').trim().toLowerCase();
    if (name.length < 2 || !/^[a-z0-9_.-]{3,24}$/.test(un)) return J({ error: 'الاسم مطلوب واسم المستخدم 3–24 حرفاً إنجليزياً/أرقاماً' }, 400);
    const ex = b.id ? await env.DB.prepare('SELECT id FROM staff WHERE id=?').bind(+b.id).first() : null;
    b.password = b.password || b.pw; if (!ex && String(b.password || '').length < 6) return J({ error: 'كلمة السر 6 أحرف على الأقل' }, 400);
    if (await env.DB.prepare('SELECT id FROM staff WHERE username=? AND id!=?').bind(un, ex ? ex.id : 0).first()) return J({ error: 'اسم المستخدم مستخدم' }, 409);
    if (ex) {
      await env.DB.prepare('UPDATE staff SET name=?,username=?,active=? WHERE id=?').bind(name, un, b.active === false ? 0 : 1, ex.id).run();
      if (b.password) { if (String(b.password).length < 6) return J({ error: 'كلمة السر 6 أحرف على الأقل' }, 400); const salt = randHex(16); await env.DB.prepare('UPDATE staff SET pw_hash=?,pw_salt=? WHERE id=?').bind(await pbkdf2(String(b.password), salt), salt, ex.id).run(); }
      if (b.active === false) await env.DB.prepare('DELETE FROM staff_sessions WHERE staff_id=?').bind(ex.id).run();
    } else { const salt = randHex(16); await env.DB.prepare('INSERT INTO staff(name,username,pw_hash,pw_salt,created_at) VALUES(?,?,?,?,?)').bind(name, un, await pbkdf2(String(b.password), salt), salt, now()).run(); }
    return J({ ok: true });
  }
  if (p === '/adm/staff' && M === 'DELETE') {
    const a = adm(); if (a) return a;
    await audit(env, request, 'admin', 'staff_delete', String(url.searchParams.get('id')));
    const id = +url.searchParams.get('id'); await env.DB.batch([env.DB.prepare('DELETE FROM staff_sessions WHERE staff_id=?').bind(id), env.DB.prepare('UPDATE chats SET assigned_to=NULL WHERE assigned_to=?').bind(id), env.DB.prepare('DELETE FROM staff WHERE id=?').bind(id)]); return J({ ok: true });
  }

  /* ---------- محادثات الدعم للأدمن والموظفين ---------- */
  if (p === '/adm/chats' && M === 'GET') {
    const a = needOp(); if (a) return a;
    const ch = url.searchParams.get('channel') === 'admin' ? 'admin' : 'support';
    if (ch === 'admin' && !op.admin) return J({ error: 'unauthorized' }, 401);
    const rows = (await env.DB.prepare(`SELECT c.*, (SELECT body FROM chat_messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) last,
      (SELECT sender FROM chat_messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) lastby, (SELECT name FROM staff s WHERE s.id=c.assigned_to) sname,
      (SELECT rating FROM reviews r WHERE r.chat_id=c.id) rating FROM chats c WHERE c.channel=? ORDER BY (c.mode='human' AND c.status='open') DESC, c.id DESC LIMIT 200`).bind(ch).all()).results;
    return J({ chats: rows.map(r => ({ id: r.id, status: r.status, mode: r.mode, name: r.name, ph: r.phone, product: r.product_code, topic: r.topic, staff: r.sname || '', mine: r.assigned_to === op.id && !op.admin, last: r.last || '', lastby: r.lastby || '', rating: r.rating || 0, t: r.created_at })) });
  }
  if (p === '/adm/chat' && M === 'GET') {
    const a = needOp(); if (a) return a;
    const id = +url.searchParams.get('id');
    const ch = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(id).first(); if (!ch) return J({ error: 'not found' }, 404);
    if (ch.channel === 'admin' && !op.admin) return J({ error: 'unauthorized' }, 401);
    return J({ chat: { id: ch.id, name: ch.name, ph: ch.phone, status: ch.status, mode: ch.mode, staff: await staffName(ch), topic: ch.topic }, messages: await msgs(env, id, +url.searchParams.get('after') || 0) }, 200, { 'Cache-Control': 'no-store' });
  }
  if (p === '/adm/chat/reply' && M === 'POST') {
    const a = needOp(); if (a) return a;
    const b = await body(); const text = String(b.text || '').trim().slice(0, 1000); if (!text) return J({ error: 'empty' }, 400);
    const ch = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(+b.id).first(); if (!ch) return J({ error: 'not found' }, 404);
    if (ch.channel === 'admin' && !op.admin) return J({ error: 'unauthorized' }, 401);
    if (ch.channel === 'support' && !op.admin && ch.assigned_to && ch.assigned_to !== op.id) return J({ error: 'المحادثة مع موظف آخر: ' + (await staffName(ch)) }, 409);
    await addMsg(ch.id, op.admin ? 'admin' : 'staff', text, op.name);
    if (ch.channel === 'support') {
      await env.DB.prepare("UPDATE chats SET mode='human',status='open',assigned_to=COALESCE(assigned_to,?) WHERE id=?").bind(op.admin ? null : op.id, ch.id).run();
      await env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'inapp','chat_reply',?,'sent',?)").bind(ch.customer_id, ch.phone || null, JSON.stringify({ text: 'رد جديد من ' + op.name + ': ' + text.slice(0, 80) }), now()).run();
    }
    return J({ ok: true });
  }
  if (p === '/adm/chat/claim' && M === 'POST') {             // استلام المحادثة (الموظف يكمل مع الزبون)
    const a = needOp(); if (a) return a; const b = await body();
    const ch = await env.DB.prepare("SELECT * FROM chats WHERE id=? AND channel='support'").bind(+b.id).first(); if (!ch) return J({ error: 'not found' }, 404);
    if (op.admin) { await env.DB.prepare("UPDATE chats SET mode='human',assigned_to=NULL WHERE id=?").bind(ch.id).run(); return J({ ok: true }); }
    if (ch.assigned_to && ch.assigned_to !== op.id && !b.force) return J({ error: 'المحادثة مع ' + (await staffName(ch)) }, 409);
    await env.DB.prepare("UPDATE chats SET mode='human',assigned_to=? WHERE id=?").bind(op.id, ch.id).run();
    await addMsg(ch.id, 'bot', `انضم ${op.name} إلى المحادثة وسيكمل معك 🌸`, BOT);
    return J({ ok: true });
  }
  if (p === '/adm/chat/release' && M === 'POST') {            // إعادة المحادثة لقائمة الانتظار
    const a = needOp(); if (a) return a; const b = await body();
    const ch = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(+b.id).first(); if (!ch) return J({ error: 'not found' }, 404);
    if (!op.admin && ch.assigned_to !== op.id) return J({ error: 'unauthorized' }, 401);
    await env.DB.prepare('UPDATE chats SET assigned_to=NULL WHERE id=?').bind(ch.id).run(); return J({ ok: true });
  }
  if (p === '/adm/chat/close' && M === 'POST') {
    const a = needOp(); if (a) return a;
    const b = await body(); const ch = await env.DB.prepare('SELECT * FROM chats WHERE id=?').bind(+b.id).first(); if (!ch) return J({ error: 'not found' }, 404);
    if (!op.admin && ch.assigned_to && ch.assigned_to !== op.id) return J({ error: 'unauthorized' }, 401);
    await env.DB.prepare("UPDATE chats SET status='closed',closed_at=? WHERE id=?").bind(now(), ch.id).run(); return J({ ok: true });
  }
  if (p === '/adm/inquiry' && M === 'POST') {                // قناة الأدمن الخاصة: ملاحظات/استفسارات عن منتج (لا يراها الزبائن)
    const a = adm(); if (a) return a;
    const b = await body(); const code = String(b.product || '').slice(0, 40), text = String(b.text || '').trim().slice(0, 1000);
    if (!text) return J({ error: 'empty' }, 400);
    let ch = await env.DB.prepare("SELECT id FROM chats WHERE channel='admin' AND product_code=? LIMIT 1").bind(code).first();
    if (!ch) ch = await env.DB.prepare("INSERT INTO chats(channel,status,created_at,product_code,name) VALUES('admin','open',?,?,?) RETURNING id").bind(now(), code, String(b.name || code).slice(0, 80)).first();
    await addMsg(ch.id, 'admin', text, op ? op.name : 'الإدارة');
    return J({ ok: true, id: ch.id });
  }
  if (p === '/adm/ratings' && M === 'GET') {
    const a = adm(); if (a) return a;
    const s = await env.DB.prepare('SELECT COUNT(*) n, AVG(rating) avg FROM reviews').first();
    const dist = (await env.DB.prepare('SELECT rating r, COUNT(*) n FROM reviews GROUP BY rating').all()).results;
    const recent = (await env.DB.prepare('SELECT rating,comment,at FROM reviews ORDER BY id DESC LIMIT 20').all()).results;
    return J({ count: s.n, avg: s.avg ? Math.round(s.avg * 100) / 100 : 0, dist, recent });
  }

  /* ---------- الحملات التسويقية عبر واتساب ---------- */
  if (p === '/adm/campaign' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body(); if (!b.dry) await audit(env, request, 'admin', 'campaign_send', '', null, { aud: (b.audience || {}).type }); const text = String(b.body || '').trim().slice(0, 900);
    if (!text) return J({ error: 'اكتب نص الرسالة' }, 400);
    const au = b.audience || {}; let rows = [];
    if (au.type === 'phones') {
      const list = [...new Set((au.phones || []).map(x => String(x).trim()).filter(x => /^07\d{9}$/.test(x)))].slice(0, 200);
      if (list.length) rows = (await env.DB.prepare(`SELECT id,phone,name FROM customers WHERE phone IN (${list.map(() => '?').join(',')})`).bind(...list).all()).results;
      for (const ph of list) if (!rows.some(r => r.phone === ph)) rows.push({ id: null, phone: ph, name: '' });
    } else {
      let q = 'SELECT id,phone,name FROM customers WHERE phone IS NOT NULL';
      const args = [];
      if (au.type === 'today' || au.type === 'day') {
        const day = au.type === 'today' ? new Date(now() + TZ * 1000).toISOString().slice(0, 10) : String(au.day || '');
        const t0 = Date.parse(day + 'T00:00:00Z') - TZ * 1000;
        if (isNaN(t0)) return J({ error: 'تاريخ غير صحيح' }, 400);
        q += ' AND created_at>=? AND created_at<?'; args.push(t0, t0 + 864e5);
      } else if (au.type === 'ordered') q += ' AND orders_count>0';
      else if (au.type === 'noorders') q += ' AND orders_count=0';
      rows = (await env.DB.prepare(q + ' ORDER BY id DESC LIMIT 1000').bind(...args).all()).results;
    }
    const extraCodes = (b.codes || []).map(x => String(x).toUpperCase()).slice(0, 5);
    const per = b.perUser && b.perUser.kind ? b.perUser : null;
    const link = env.STORE_URL || url.origin;
    if (b.dry) return J({ total: rows.length, sample: rows.slice(0, 5).map(r => r.phone), link });
    const t = now(), stmts = [];
    const days = per && +per.days > 0 ? Math.min(365, +per.days) : 0;
    for (const r of rows) {
      let msg = text; const cl = [...extraCodes];
      if (per) {
        const code = 'PR' + rnd(6); cl.push(code);
        stmts.push(env.DB.prepare(`INSERT INTO discount_codes(code,kind,value,min_cart,expires_at,max_uses,phone,created_at,sent) VALUES(?,?,?,?,?,1,?,?,1)`)
          .bind(code, per.kind, per.kind === 'free_shipping' ? 0 : Math.round(+per.value || 0), Math.round(+per.min || 0), days ? t + days * 864e5 : null, r.phone, t));
      }
      for (const code of cl) msg += `\n🏷 ${code}`;
      msg += `\n\n🛍 ${link}`;
      stmts.push(env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'whatsapp','promo',?,'queued',?)").bind(r.id, r.phone, JSON.stringify({ text: msg }), t));
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    await env.DB.prepare('INSERT INTO campaigns(body,audience,codes,total,created_at) VALUES(?,?,?,?,?)').bind(text, JSON.stringify(au), JSON.stringify(extraCodes), rows.length, t).run();
    if (ctx && ctx.waitUntil) ctx.waitUntil(processQueue(env, 50));
    return J({ ok: true, total: rows.length });
  }
  if (p === '/adm/campaigns' && M === 'GET') {
    const a = adm(); if (a) return a;
    const rows = (await env.DB.prepare('SELECT * FROM campaigns ORDER BY id DESC LIMIT 50').all()).results;
    const st = (await env.DB.prepare("SELECT status, COUNT(*) n FROM notifications WHERE template='promo' GROUP BY status").all()).results;
    return J({ campaigns: rows.map(r => ({ id: r.id, body: r.body, total: r.total, t: r.created_at, aud: jp(r.audience, {}) })), delivery: Object.fromEntries(st.map(x => [x.status, x.n])) });
  }

  /* ---------- إحصائيات ---------- */
  if (p === '/adm/stats2' && M === 'GET') {
    const a = adm(); if (a) return a;
    const range = ['day', 'week', 'month'].includes(url.searchParams.get('range')) ? url.searchParams.get('range') : 'day';
    const fmt = { day: '%Y-%m-%d', week: '%Y-W%W', month: '%Y-%m' }[range], span = { day: 30, week: 12, month: 12 }[range];
    const since = now() - span * { day: 864e5, week: 7 * 864e5, month: 31 * 864e5 }[range];
    const grp = col => `strftime('${fmt}', ${col}/1000 + ${TZ}, 'unixepoch')`;
    const acc = (await env.DB.prepare(`SELECT ${grp('created_at')} k, COUNT(*) n FROM customers WHERE created_at>=? GROUP BY k ORDER BY k`).bind(since).all()).results;
    const ord = (await env.DB.prepare(`SELECT ${grp('created_at')} k, COUNT(*) n, SUM(total) rev FROM orders WHERE status!=0 AND created_at>=? GROUP BY k ORDER BY k`).bind(since).all()).results;
    const one = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first());
    const t = now();
    const active = { d1: (await one('SELECT COUNT(*) n FROM customers WHERE last_seen_at>=?', t - 864e5)).n, d7: (await one('SELECT COUNT(*) n FROM customers WHERE last_seen_at>=?', t - 7 * 864e5)).n, d30: (await one('SELECT COUNT(*) n FROM customers WHERE last_seen_at>=?', t - 30 * 864e5)).n };
    const sessions = (await one('SELECT COUNT(DISTINCT customer_id) n FROM sessions WHERE expires_at>?', t)).n;
    const tot = await one('SELECT COUNT(*) orders, COALESCE(SUM(total),0) revenue FROM orders WHERE status!=0');
    const cust = await one('SELECT COUNT(*) n FROM customers');
    const od = (await env.DB.prepare('SELECT items FROM orders WHERE status!=0 AND created_at>=? LIMIT 3000').bind(t - 180 * 864e5).all()).results;
    const top = {}; for (const o of od) for (const i of jp(o.items, [])) { const k = top[i.c] ||= { c: i.c, n: i.n, q: 0, rev: 0 }; k.q += i.q; k.rev += i.p * i.q; }
    const rt = await one('SELECT COUNT(*) n, AVG(rating) avg FROM reviews');
    const byStatus = (await env.DB.prepare('SELECT status s, COUNT(*) n FROM orders GROUP BY status').all()).results;
    return J({ range, accounts: acc, orders: ord, active, loggedIn: sessions, totals: { customers: cust.n, orders: tot.orders, revenue: tot.revenue, avg: tot.orders ? Math.round(tot.revenue / tot.orders) : 0 },
      top: Object.values(top).sort((x, y) => y.q - x.q).slice(0, 10), rating: { n: rt.n, avg: rt.avg ? Math.round(rt.avg * 100) / 100 : 0 }, byStatus });
  }
  return null;
}
