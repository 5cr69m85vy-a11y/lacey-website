/* ============================================================
   worker.js — خادم المتجر (Cloudflare Worker + قاعدة بيانات D1)
   ------------------------------------------------------------
   يخدم الملفات الثابتة ويوفّر واجهة /api للمتجر:
     عام:   /catalog  /code  /order  /order/cancel  /track  /visit
     أدمن:  /login /settings /orders /status /customers /customer
            /discount /discounts /stats
   دورة الطلب (status):
     0 ملغى · 1 تم الاستلام · 2 تم التأكيد · 3 تم الشحن · 4 في الطريق · 5 تم التوصيل
   - يُلغى الطلب من الزبون خلال 10 دقائق من إنشائه فقط.
   - بعد 10 دقائق يُؤكَّد تلقائياً (sweep عند أي طلب + Cron كل دقيقة).
   الأسرار (Settings ← Variables and Secrets):
     ADMIN_PASS (إلزامي)  ADMIN_KEY (اختياري)  BOT_TOKEN / CHAT_ID (اختياري: إشعار تلجرام لك)
   ============================================================ */

import { authRoutes, sessionCustomer, ageOf, MIN_AGE } from './auth.js';
import { processQueue } from './wa.js';
import { quote, shopRoutes } from './shop.js';
import { extraRoutes } from './extra.js';
import { ensureSchema, withIntegrations } from './lib.js';
import { limit, hit, tooMany, audit, gc, ipOf } from './guard.js';

const CANCEL_WINDOW_MS = 10 * 60 * 1000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};
const J = (d, s = 200, h = {}) => new Response(JSON.stringify(d), {
  status: s, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...h },
});

/* حقول الإعدادات التي لا تظهر للزوار أبداً */
const PRIVATE = ['pw', 'tk', 'tid', 'tp', 'O', 'vis', 'sq', 'seq', 'ver'];
const MAX_PRODUCT_BYTES = 1_800_000;

const now = () => Date.now();
const jp = (s, d) => { try { return JSON.parse(s); } catch (e) { return d; } };
const escH = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const money = n => Number(n || 0).toLocaleString('en-US');
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(36)).join('').slice(0, n).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

async function adminToken(env) {
  if (!env.ADMIN_PASS) return '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ADMIN_PASS),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('lacey-admin'));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const safeEq = (a, b) => { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };

async function tgPhoto(env, buf, caption) {
  if (!env.BOT_TOKEN || !env.CHAT_ID) return false;
  try {
    const fd = new FormData(); fd.append('chat_id', String(env.CHAT_ID)); fd.append('caption', caption.slice(0, 200));
    fd.append('photo', new Blob([buf], { type: 'image/png' }), 'receipt.png');
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
    return r.ok;
  } catch (e) { return false; }
}
async function tgNotify(env, text) {
  if (!env.BOT_TOKEN || !env.CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {}
}

/* ---------- الإشعارات: تُسجَّل في الجدول وتُرسل لاحقاً (واتساب في المرحلة 2) ---------- */
const STATUS_TEXT = {
  0: 'تم إلغاء طلبك', 1: 'تم استلام طلبك', 2: 'تم تأكيد طلبك', 3: 'تم شحن طلبك',
  4: 'طلبك في طريقه إليك', 5: 'تم توصيل طلبك',
};
async function queueNote(env, phone, template, payload, customerId = null) {
  await env.DB.prepare('INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(customerId, phone, 'whatsapp', template, JSON.stringify(payload), 'queued', now()).run();
}

/* ---------- حالة الطلب ---------- */
const COL = { 2: 'confirmed_at', 3: 'shipped_at', 4: 'delivering_at', 5: 'delivered_at', 0: 'cancelled_at' };
async function setStatus(env, o, s, actor, note = '') {
  const t = now();
  const sets = ['status=?'], vals = [s];
  if (COL[s]) { sets.push(COL[s] + '=?'); vals.push(t); }
  if (s === 0) { sets.push('cancel_reason=?'); vals.push(note || actor); }
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET ${sets.join(',')} WHERE code=?`).bind(...vals, o.code),
    env.DB.prepare('INSERT INTO order_events(order_code,status,at,actor,note) VALUES(?,?,?,?,?)').bind(o.code, s, t, actor, note),
  ]);
  await queueNote(env, o.phone, 'order_status', { code: o.code, status: s, text: STATUS_TEXT[s] || '' }, o.customer_id);
  if (s === 2) await issueReceipt(env, o);
}

/* إيصال يُصدر عند تأكيد الطلب */
async function issueReceipt(env, o) {
  const full = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(o.code).first();
  if (!full) return;
  const data = { items: jp(full.items, []), subtotal: full.subtotal, discount: full.discount, total: full.total, pay: full.pay_method,
    name: full.name, ph: full.phone, addr: [full.city, full.area, full.landmark].filter(Boolean).join(' — '), codes: jp(full.discount_codes, []), id: full.id };
  await env.DB.prepare('INSERT OR IGNORE INTO receipts(order_code,number,issued_at,data) VALUES(?,?,?,?)')
    .bind(o.code, 'LR-' + String(full.id).padStart(6, '0'), now(), JSON.stringify(data)).run();
}

/* تأكيد تلقائي لكل طلب مضى على إنشائه 10 دقائق ولم يُلغَ */
async function sweep(env) {
  const due = await env.DB.prepare('SELECT code,phone,customer_id FROM orders WHERE status=1 AND created_at<=?')
    .bind(now() - CANCEL_WINDOW_MS).all();
  for (const o of due.results || []) await setStatus(env, o, 2, 'auto', 'تأكيد تلقائي بعد 10 دقائق');
  return (due.results || []).length;
}

/* ---------- المنتجات والإعدادات ---------- */
async function readCatalog(env, full) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='config'").first();
  const prods = await env.DB.prepare('SELECT data FROM products ORDER BY sort,code').all();
  const P = (prods.results || []).map(r => jp(r.data, null)).filter(Boolean);
  if (!row && !P.length) return null;
  const B = ((await env.DB.prepare(`SELECT data FROM boxes ${full ? '' : 'WHERE active=1'} ORDER BY sort,id`).all()).results || []).map(r => jp(r.data, null)).filter(Boolean);
  const data = { ...(row ? jp(row.value, {}) : {}), P, B };
  if (!full) for (const k of PRIVATE) delete data[k];
  return data;
}
async function saveCatalog(env, data) {
  const P = Array.isArray(data.P) ? data.P : [];
  if (P.length > 2000) throw Object.assign(new Error('too many products'), { status: 400 });
  const t = now(), seen = new Set(), stmts = [];
  P.forEach((p, i) => {
    const code = String((p && p.c) ?? '').trim();
    if (!code || seen.has(code)) return;
    seen.add(code);
    const json = JSON.stringify(p);
    if (json.length > MAX_PRODUCT_BYTES) throw Object.assign(new Error(`صور المنتج ${code} كبيرة جداً؛ صغّرها`), { status: 413 });
    stmts.push(env.DB.prepare(
      `INSERT INTO products(code,sort,name,price,old_price,category,grp,best,active,data,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)
       ON CONFLICT(code) DO UPDATE SET sort=excluded.sort,name=excluded.name,price=excluded.price,old_price=excluded.old_price,
       category=excluded.category,grp=excluded.grp,best=excluded.best,data=excluded.data,updated_at=excluded.updated_at`)
      .bind(code, i, String(p.n || ''), Math.round(+p.p || 0), Math.round(+p.o || 0), String(p.k || ''), String(p.g || 'skin'), p.b ? 1 : 0, json, t));
  });
  const have = (await env.DB.prepare('SELECT code FROM products').all()).results.map(r => r.code);
  have.filter(c => !seen.has(c)).forEach(c => stmts.push(env.DB.prepare('DELETE FROM products WHERE code=?').bind(c)));
  if (Array.isArray(data.B)) {
    const bs = data.B.slice(0, 100), bseen = new Set();
    bs.forEach((x, i) => { const id = String(x && x.id || '').trim(); if (!id || bseen.has(id)) return; bseen.add(id);
      stmts.push(env.DB.prepare(`INSERT INTO boxes(id,sort,name,price,active,data,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sort=excluded.sort,name=excluded.name,price=excluded.price,active=excluded.active,data=excluded.data,updated_at=excluded.updated_at`)
        .bind(id, i, String(x.n || ''), Math.round(+x.p || 0), x.on === 0 ? 0 : 1, JSON.stringify(x), t)); });
    (await env.DB.prepare('SELECT id FROM boxes').all()).results.filter(r => !bseen.has(r.id)).forEach(r => stmts.push(env.DB.prepare('DELETE FROM boxes WHERE id=?').bind(r.id)));
  }
  const cfg = { ...data }; delete cfg.B; delete cfg.P; delete cfg.O; delete cfg.vis; delete cfg.sq; delete cfg.seq;
  stmts.push(env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('config',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
    .bind(JSON.stringify(cfg), t));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return { products: seen.size };
}

/* ---------- الطلبات ---------- */
const orderView = r => ({
  id: r.id, code: r.code, name: r.name, ph: r.phone, city: r.city, area: r.area, lm: r.landmark,
  ad: [r.city, r.area, r.landmark].filter(Boolean).join(' - '),
  items: jp(r.items, []), s: r.subtotal, dsc: r.discount, t: r.total, dc: (jp(r.discount_codes, [])[0]) || '',
  pay: r.pay_method, d: r.created_at, st: r.status,
});
async function createOrder(env, b, sess) {
  { const g = ageOf(sess.birth); if (g === null) return J({ error: 'أكمل ملفك الشخصي: أضف تاريخ ميلادك أولاً', need_profile: true }, 403); if (g < MIN_AGE) return J({ error: `الطلب متاح لمن عمره ${MIN_AGE} سنة فأكثر`, need_profile: true }, 403); }
  const phone = String(b.ph || '').trim();
  if (!/^07\d{9}$/.test(phone)) return J({ error: 'رقم الهاتف غير صحيح' }, 400);
  const name = String(b.name || '').trim().slice(0, 80);
  if (name.length < 2) return J({ error: 'الاسم مطلوب' }, 400);
  const city = String(b.city || '').slice(0, 80), area = String(b.area || '').trim().slice(0, 120), lm = String(b.lm || '').trim().slice(0, 160);
  if (!city || !area || !lm) return J({ error: 'أكمل حقول العنوان' }, 400);
  if (!/^LC-[A-Z0-9]{6}$/.test(b.code || '')) return J({ error: 'bad order code' }, 400);
  const raw = Array.isArray(b.items) ? b.items : [];
  if (!raw.length || raw.length > 60) return J({ error: 'السلة فارغة' }, 400);

  const existing = await env.DB.prepare('SELECT code FROM orders WHERE code=?').bind(b.code).first();
  if (existing) return J({ ok: true, code: b.code, duplicate: true });

  /* الأسعار والخصومات والتوصيل تُحسب على الخادم لا من المتصفح */
  const qt = await quote(env, { items: raw, codes: [].concat(b.codes || [], b.dc || []), ph: phone, pay: b.pay });
  if (qt.error) return J({ error: qt.error }, 400);
  const items = qt.lines, subtotal = qt.subtotal, discount = qt.discount, shipping = qt.shipping, total = qt.total;
  const usedCodes = qt.applied.map(a => a.code), payM = qt.pay;

  const seq = await env.DB.prepare("UPDATE counters SET value=value+1 WHERE name='order_seq' RETURNING value").first();
  const id = seq.value, t = now();

  /* العميل = صاحب الجلسة دائماً (لا طلب بلا حساب). الهاتف يُربط بالحساب إن كان حراً */
  const other = await env.DB.prepare('SELECT * FROM customers WHERE phone=? AND id<>?').bind(phone, sess.id).first();
  if (other) return J({ error: 'هذا الرقم مرتبط بحساب آخر. سجّل الدخول عبر الهاتف (واتساب) بهذا الرقم' }, 409);
  const firstOrder = !sess.orders_count;
  const customerId = sess.id; let welcome = '';
  await env.DB.prepare('UPDATE customers SET phone=COALESCE(NULLIF(phone,\'\'),?),name=?,city=?,area=?,landmark=?,orders_count=orders_count+1,spent=spent+?,last_order_at=?,last_seen_at=?,first_order_at=COALESCE(first_order_at,?) WHERE id=?')
    .bind(phone, name, city, area, lm, total, t, t, t, sess.id).run();
  if (firstOrder) { welcome = 'WEL' + rnd(5); await env.DB.prepare("INSERT INTO discount_codes(code,kind,value,phone,auto,created_at) VALUES(?,'percent',10,?,1,?)").bind(welcome, phone, t).run(); }

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders(code,id,customer_id,name,phone,city,area,landmark,items,subtotal,discount,total,discount_codes,pay_method,status,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`)
      .bind(b.code, id, customerId, name, phone, city, area, lm, JSON.stringify(items), subtotal, discount, total, JSON.stringify(usedCodes), payM, t),
    env.DB.prepare('INSERT INTO order_events(order_code,status,at,actor,note) VALUES(?,?,?,?,?)').bind(b.code, 1, t, 'customer', ''),
    ...usedCodes.map(c => env.DB.prepare('UPDATE discount_codes SET used=used+1 WHERE code=?').bind(c)),
    env.DB.prepare('UPDATE orders SET shipping=?,free_shipping=? WHERE code=?').bind(shipping, qt.freeShip ? 1 : 0, b.code),
  ]);
  await queueNote(env, phone, 'order_received', { code: b.code, total }, customerId);

  const lines = items.map(i => `• ${i.q}× ${escH(i.n)} (${escH(i.c)})${i.cc ? ' 🎨 ' + escH(i.cc) : ''} — ${money(i.p * i.q)}`).join('\n');
  await tgNotify(env, `🛍 <b>طلب جديد #${id}</b>\nكود الطلب: <code>${escH(b.code)}</code>\n\n👤 ${escH(name)}\n📞 ${escH(phone)}\n📍 ${escH(city)} — ${escH(area)}\n🧭 ${escH(lm)}\n\n${lines}\n\n` +
    (usedCodes.length ? `🏷 أكواد: ${escH(usedCodes.join(', '))} −${money(discount)}\n` : '') + (qt.freeShip ? '🚚 توصيل مجاني\n' : shipping ? `🚚 التوصيل: ${money(shipping)}\n` : '') + `💳 ${escH(payM)}\n` + `💰 <b>المجموع: ${money(total)}</b>`);
  return J({ ok: true, id, code: b.code, subtotal, discount, shipping, total, applied: qt.applied, rejected: qt.rejected, welcome: welcome || undefined, cancelUntil: t + CANCEL_WINDOW_MS });
}

/* ================================================================ */
/* CORS مقيّد: يُسمح فقط لنفس الأصل أو STORE_URL */
function corsFilter(request, env, res) {
  const o = request.headers.get('Origin');
  if (!o) return res;
  let ok = false;
  try { ok = o === new URL(request.url).origin || (env.STORE_URL && o === new URL(env.STORE_URL).origin); } catch (e) {}
  const h = new Headers(res.headers);
  if (ok) { h.set('Access-Control-Allow-Origin', o); h.append('Vary', 'Origin'); } else h.delete('Access-Control-Allow-Origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export const PAGE_ROUTES = /^\/(categories|offers|routine|cart|checkout|account|support|help|tracking|preferences)(\/[\w-]*)?\/?$/;

export default {
  async fetch(request, rawEnv, ctx) {
    const res = await handle(request, rawEnv, ctx);
    let env = rawEnv; try { env = request.method === 'OPTIONS' ? rawEnv : await withIntegrations(rawEnv); } catch (e) {}
    return corsFilter(request, env, res);
  },
  async scheduled(event, rawEnv) { await ensureSchema(rawEnv); const env = await withIntegrations(rawEnv); await sweep(env); await processQueue(env, 50); if (new Date().getMinutes() % 30 === 0) await gc(env); },
};

async function handle(request, rawEnv, ctx) {
  {
    if (!rawEnv.DB) return J({ error: 'D1 binding DB missing' }, 500);
    if (request.method !== 'OPTIONS') await ensureSchema(rawEnv);
    const env = request.method === 'OPTIONS' ? rawEnv : await withIntegrations(rawEnv);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url), p = url.pathname, M = request.method;
    const token = await adminToken(env);
    const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const authed = (!!env.ADMIN_KEY && request.headers.get('x-admin') === env.ADMIN_KEY) || (token !== '' && safeEq(bearer, token));
    const needAuth = () => authed ? null : J({ error: 'unauthorized' }, 401);
    const audited = (action, entity, before, after) => audit(env, request, 'admin', action, entity, before, after);
    const body = async () => { try { return await request.json(); } catch (e) { return {}; } };

    try {
      { const er = await extraRoutes({ env, request, url, p, M, body, authed, ctx, tg: t => tgNotify(env, t), sess: (p.startsWith('/chat/') ? await sessionCustomer(env, request) : null) }); if (er) return er; }
      { const sr = await shopRoutes({ env, request, p, M, body, url }, authed); if (sr) return sr; }
      { const ar = await authRoutes({ env, request, url, p, M, body, ctx }); if (ar) return ar; }

      /* ---------- دخول الأدمن ---------- */
      if (p === '/login' && M === 'POST') {
        if (!env.ADMIN_PASS) return J({ error: 'ADMIN_PASS is not set' }, 503);
        const lim = await limit(env, request, 'adm-login', 8, 15 * 60e3); if (lim) return lim;
        const { pw } = await body();
        if (pw && safeEq(String(pw).trim(), String(env.ADMIN_PASS).trim())) { await audit(env, request, 'admin', 'login'); return J({ token }); }
        await audit(env, request, 'unknown', 'login_failed');
        return J({ error: 'wrong password' }, 401);
      }

      /* ---------- الكتالوج العام ---------- */
      if (p === '/catalog' && M === 'GET') {
        return J({ srv: true, data: await readCatalog(env, false) }, 200, { 'Cache-Control': 'no-cache' });
      }
      if (p === '/settings' && M === 'GET') { const a = needAuth(); if (a) return a; return J({ data: await readCatalog(env, true) }); }
      if (p === '/settings' && M === 'POST') {
        const a = needAuth(); if (a) return a;
        const { data } = await body();
        if (!data || typeof data !== 'object') return J({ error: 'no data' }, 400);
        try { const r = await saveCatalog(env, data); await audited('settings_save', 'catalog', null, { products: (data.P || []).length }); return J({ ok: true, ...r }); }
        catch (e) { return J({ error: e.message }, e.status || 500); }
      }

      /* ---------- كود خصم (تحقق عام) ---------- */
      if (p === '/code' && M === 'GET') {
        const lim = await limit(env, request, 'code', 30, 10 * 60e3); if (lim) return lim;
        const c = (url.searchParams.get('c') || '').trim().toUpperCase().slice(0, 40);
        const r = await env.DB.prepare("SELECT code,value,phone,expires_at,max_uses,used FROM discount_codes WHERE code=? AND active=1 AND kind='percent'").bind(c).first();
        if (!r || (r.expires_at && r.expires_at < now()) || (r.max_uses && r.used >= r.max_uses)) return J({ error: 'invalid' }, 404);
        return J({ c: r.code, v: r.value });
      }

      /* ---------- زيارات ---------- */
      if (p === '/visit' && M === 'POST') {
        await env.DB.prepare('INSERT INTO visits(day,count) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1').bind(today()).run();
        return J({ ok: true });
      }
      if (p === '/stats' && M === 'GET') {
        const a = needAuth(); if (a) return a;
        const days = {}; for (const r of (await env.DB.prepare('SELECT day,count FROM visits').all()).results) days[r.day] = r.count;
        return J({ days });
      }

      /* ---------- الطلبات ---------- */
      if (p === '/order' && M === 'POST') {
        const sess = await sessionCustomer(env, request);
        if (!sess) return J({ error: 'سجّل الدخول أو أنشئ حساباً لإتمام الطلب', login: true }, 401);
        if (!(await hit(env, 'order:' + sess.id, Number(env.ORDER_RL) || 8, 3600e3))) return tooMany('طلبات كثيرة خلال وقت قصير');
        const r = await createOrder(env, await body(), sess);
        if (ctx && ctx.waitUntil) ctx.waitUntil(processQueue(env)); else await processQueue(env);
        return r;
      }

      /* صورة الوصل: يرسمها متصفح الزبون ويرفعها؛ تُرسل إلى تلجرام كصورة (مرة واحدة لكل طلب، لصاحب الطلب فقط) */
      if (p === '/order/receipt' && M === 'POST') {
        const sess = await sessionCustomer(env, request);
        if (!sess) return J({ error: 'unauthorized' }, 401);
        const code = String(request.headers.get('x-order') || '').toUpperCase().slice(0, 12);
        const o = await env.DB.prepare('SELECT code,id,name,total,customer_id,created_at FROM orders WHERE code=?').bind(code).first();
        if (!o || o.customer_id !== sess.id || now() - o.created_at > 30 * 60e3) return J({ error: 'not found' }, 404);
        const buf = await request.arrayBuffer();
        const u8 = new Uint8Array(buf.slice(0, 8));
        if (buf.byteLength < 500 || buf.byteLength > 2e6 || u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) return J({ error: 'bad image' }, 400);
        if (!(await hit(env, 'rcpt:' + code, 1, 24 * 3600e3))) return J({ ok: true, duplicate: true });
        const sent = await tgPhoto(env, buf, `🛍 طلب جديد #${o.id} — ${o.code}`);
        return J({ ok: true, sent });
      }

      if (p === '/order/cancel' && M === 'POST') {
        const lim = await limit(env, request, 'cancel', 20, 10 * 60e3); if (lim) return lim;
        const { code, ph } = await body();
        const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(String(code || '').toUpperCase().slice(0, 12)).first();
        const sc = await sessionCustomer(env, request);
        const mine = o && sc && o.customer_id === sc.id;
        if (!o || !(mine || (o.phone && o.phone === String(ph || '')))) return J({ error: 'not found' }, 404);
        if (o.status === 0) return J({ ok: true, s: 0 });
        if (o.status !== 1 || now() - o.created_at >= CANCEL_WINDOW_MS) return J({ error: 'انتهت مهلة الإلغاء (10 دقائق)' }, 409);
        await setStatus(env, o, 0, 'customer', 'ألغاه الزبون');
        await tgNotify(env, `❌ <b>ألغى الزبون الطلب</b> <code>${escH(o.code)}</code>\n${escH(o.name)} — ${escH(o.phone)}`);
        return J({ ok: true, s: 0 });
      }

      if (p === '/track' && M === 'GET') {
        const lim = await limit(env, request, 'track', 300, 10 * 60e3); if (lim) return lim;
        await sweep(env);
        const code = (url.searchParams.get('code') || '').toUpperCase();
        const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first();
        if (!o) return J({ s: null });
        const ev = (await env.DB.prepare('SELECT status,at FROM order_events WHERE order_code=? ORDER BY at,id').bind(code).all()).results;
        const cancelUntil = o.created_at + CANCEL_WINDOW_MS;
        return J({
          s: o.status, code: o.code, id: o.id, created: o.created_at, now: now(), cancelUntil,
          cancelable: o.status === 1 && now() < cancelUntil,
          events: ev.map(e => ({ s: e.status, at: e.at })), items: jp(o.items, []), total: o.total, discount: o.discount, pay: o.pay_method,
        }, 200, { 'Cache-Control': 'no-store' });
      }

      if (p === '/orders' && M === 'GET') {
        const a = needAuth(); if (a) return a;
        await sweep(env);
        const rows = (await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all()).results;
        return J({ orders: rows.map(orderView).reverse() });
      }
      if (p === '/status' && M === 'POST') {
        const a = needAuth(); if (a) return a;
        const { code, s } = await body();
        const n = +s;
        if (![0, 1, 2, 3, 4, 5].includes(n)) return J({ error: 'bad status' }, 400);
        const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(String(code || '').toUpperCase()).first();
        if (!o) return J({ error: 'not found' }, 404);
        await setStatus(env, o, n, 'admin');
        await audited('order_status', o.code, o.status, n);
        if (ctx && ctx.waitUntil) ctx.waitUntil(processQueue(env)); else await processQueue(env);
        return J({ ok: true });
      }

      /* ---------- العملاء ---------- */
      const custView = r => ({ name: r.name, ph: r.phone, city: r.city, area: r.area, lm: r.landmark, orders: r.orders_count, spent: r.spent, first: r.first_order_at || r.created_at, last: r.last_order_at || r.created_at });
      if (p === '/customers' && M === 'GET') {
        const a = needAuth(); if (a) return a;
        return J((await env.DB.prepare('SELECT * FROM customers ORDER BY spent DESC LIMIT 1000').all()).results.map(custView));
      }
      if (p === '/customer' && M === 'GET') {
        const a = needAuth(); if (a) return a;
        const ph = url.searchParams.get('ph') || '';
        const c = await env.DB.prepare('SELECT * FROM customers WHERE phone=?').bind(ph).first();
        if (!c) return J({ error: 'not found' }, 404);
        const orders = (await env.DB.prepare('SELECT * FROM orders WHERE phone=? ORDER BY created_at DESC').bind(ph).all()).results.map(orderView);
        const discounts = (await env.DB.prepare('SELECT * FROM discount_codes WHERE phone=? ORDER BY created_at DESC').bind(ph).all()).results
          .map(d => ({ code: d.code, phone: d.phone, value: d.value, used: d.used, sent: d.sent, auto: d.auto, t: d.created_at }));
        return J({ customer: custView(c), orders, discounts });
      }
      if (p === '/customer' && M === 'DELETE') {
        const a = needAuth(); if (a) return a;
        await env.DB.prepare('DELETE FROM customers WHERE phone=?').bind(url.searchParams.get('ph') || '').run();
        await audited('customer_delete', url.searchParams.get('ph') || '');
        return J({ ok: true });
      }

      /* ---------- الخصومات (إدارة الأدمن) ---------- */
      if (p === '/discount' && M === 'POST') {
        const a = needAuth(); if (a) return a;
        const { ph, value } = await body();
        const code = 'CUST' + rnd(5);
        await env.DB.prepare("INSERT INTO discount_codes(code,kind,value,phone,created_at) VALUES(?,'percent',?,?,?)").bind(code, +value || 10, ph || null, now()).run();
        return J({ code });
      }
      if (p === '/discounts' && M === 'GET') {
        const a = needAuth(); if (a) return a;
        return J((await env.DB.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC LIMIT 500').all()).results
          .map(d => ({ code: d.code, phone: d.phone || '', value: d.value, used: d.used, sent: d.sent, auto: d.auto, t: d.created_at })));
      }
    } catch (e) {
      console.error(e);
      return J({ error: 'server error' }, 500);
    }

    /* صفحات المتجر الفرعية: كلها تخدم نفس index.html والمتصفح يعرض الصفحة المطلوبة */
    if (env.ASSETS && M === 'GET' && PAGE_ROUTES.test(p)) return env.ASSETS.fetch(new Request(new URL('/', request.url), { headers: request.headers }));
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return J({ error: 'not found' }, 404);
  }
}
