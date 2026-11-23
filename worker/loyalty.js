/* loyalty.js — نقاط الوفاء: سجل حركات (ledger) لا يُعدَّل، منح مرة واحدة لكل طلب، استبدال ذرّي، انتهاء بعد N شهراً (FIFO) */
import { J, now, jp } from './lib.js';
import { audit } from './guard.js';
import { sessionCustomer } from './auth.js';

const DEF = { on: 0, unit: 10000, per: 0, first: 0, val: 0, min: 0, maxpct: 50, exp: 12 };
const MONTH = 30.4375 * 864e5;
const int = (x, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+x || 0)));

export async function loyCfg(env) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key='loyalty'").first();
  const c = { ...DEF, ...(r ? jp(r.value, {}) : {}) };
  c.live = !!(c.on && c.val > 0 && c.per > 0 && c.unit > 0);   // لا يعمل قبل إدخال أرقام معتمدة
  return c;
}
export const balanceOf = async (env, cid) => (await env.DB.prepare('SELECT COALESCE(SUM(points),0) b FROM points_ledger WHERE customer_id=?').bind(cid).first()).b;

/* يستهلك من الدفعات الأقدم انتهاءً أولاً */
async function consume(env, cid, n) {
  const lots = (await env.DB.prepare('SELECT id,remaining FROM points_ledger WHERE customer_id=? AND remaining>0 ORDER BY COALESCE(expires_at,9e15),id').bind(cid).all()).results || [];
  for (const l of lots) { if (n <= 0) break; const t = Math.min(n, l.remaining); await env.DB.prepare('UPDATE points_ledger SET remaining=remaining-? WHERE id=? AND remaining>=?').bind(t, l.id, t).run(); n -= t; }
}
const expAt = c => c.exp > 0 ? now() + Math.round(c.exp * MONTH) : null;
const addLot = (env, cid, kind, pts, order, note, actor, c) =>
  env.DB.prepare('INSERT OR IGNORE INTO points_ledger(customer_id,kind,points,order_code,note,actor,expires_at,remaining,at) VALUES(?,?,?,?,?,?,?,?,?)').bind(cid, kind, pts, order, note, actor, expAt(c), pts, now()).run();

/* استبدال: يُنفَّذ قبل إنشاء الطلب؛ شرط الرصيد داخل نفس الجملة فلا يمرّ طلبان متزامنان */
export async function redeem(env, cid, pts, orderCode) {
  const r = await env.DB.prepare(`INSERT INTO points_ledger(customer_id,kind,points,order_code,note,actor,at)
    SELECT ?,'redeem',?,?, 'استبدال في طلب','customer',? WHERE (SELECT COALESCE(SUM(points),0) FROM points_ledger WHERE customer_id=?) >= ?`)
    .bind(cid, -pts, orderCode, now(), cid, pts).run().catch(() => null);
  return !!(r && r.meta.changes);     // الاستهلاك من الدفعات بعد نجاح الطلب (settleRedeem)
}
export const settleRedeem = (env, cid, pts) => consume(env, cid, pts);
export const undoRedeem = (env, cid, orderCode) => env.DB.prepare("DELETE FROM points_ledger WHERE kind='redeem' AND order_code=? AND customer_id=?").bind(orderCode, cid).run();   // فقط لطلب لم يُنشأ

/* حساب الخصم بالنقاط داخل التسعير (لا يغيّر شيئاً) */
export async function pointsQuote(env, cid, want, payable) {
  const c = await loyCfg(env); if (!c.live || !cid || !(want > 0)) return { pts: 0, value: 0 };
  const bal = await balanceOf(env, cid), cap = Math.floor(Math.max(0, payable) * c.maxpct / 100 / c.val);
  let pts = Math.min(Math.floor(want), bal, cap);
  if (pts < c.min) return { pts: 0, value: 0, error: pts < 1 ? 'لا يوجد رصيد كافٍ' : `أقل استبدال ${c.min} نقطة` };
  return { pts, value: pts * c.val };
}

/* منح النقاط عند التسليم — مرة واحدة لكل طلب (فهرس فريد) */
export async function earnForOrder(env, code) {
  const c = await loyCfg(env); if (!c.live) return 0;
  const o = await env.DB.prepare('SELECT code,customer_id,subtotal,discount,pts_value FROM orders WHERE code=?').bind(code).first();
  if (!o || !o.customer_id) return 0;
  const base = Math.max(0, o.subtotal - o.discount - o.pts_value);
  let pts = Math.floor(base / c.unit) * c.per;
  if (c.first > 0) { const prev = await env.DB.prepare("SELECT 1 x FROM orders WHERE customer_id=? AND status=5 AND code<>? LIMIT 1").bind(o.customer_id, code).first(); if (!prev) pts += c.first; }
  if (pts <= 0) return 0;
  const r = await addLot(env, o.customer_id, 'earn', pts, code, 'نقاط طلب مكتمل', 'system', c);
  if (!r.meta.changes) return 0;
  await env.DB.prepare('UPDATE orders SET pts_earned=? WHERE code=?').bind(pts, code).run(); return pts;
}
/* إلغاء: يُعاد المستبدَل، وتُعكس النقاط الممنوحة (بحد أقصى الرصيد المتاح فلا يصير سالباً) */
export async function reverseForOrder(env, code) {
  const o = await env.DB.prepare('SELECT customer_id FROM orders WHERE code=?').bind(code).first(); if (!o || !o.customer_id) return;
  const c = await loyCfg(env), cid = o.customer_id;
  const rd = await env.DB.prepare("SELECT points FROM points_ledger WHERE kind='redeem' AND order_code=? AND customer_id=?").bind(code, cid).first();
  if (rd) await addLot(env, cid, 'restore', -rd.points, code, 'إرجاع نقاط طلب ملغى', 'system', c);
  const er = await env.DB.prepare("SELECT points FROM points_ledger WHERE kind='earn' AND order_code=? AND customer_id=?").bind(code, cid).first();
  if (er) { const n = Math.min(er.points, await balanceOf(env, cid)); if (n > 0) { const r = await env.DB.prepare("INSERT OR IGNORE INTO points_ledger(customer_id,kind,points,order_code,note,actor,at) VALUES(?,'reverse',?,?,'عكس نقاط طلب ملغى','system',?)").bind(cid, -n, code, now()).run(); if (r.meta.changes) await consume(env, cid, n); } }
}
/* انتهاء الصلاحية */
export async function expirePoints(env) {
  const due = (await env.DB.prepare('SELECT id,customer_id,remaining FROM points_ledger WHERE remaining>0 AND expires_at IS NOT NULL AND expires_at<=? LIMIT 200').bind(now()).all()).results || [];
  for (const l of due) {
    const z = await env.DB.prepare('UPDATE points_ledger SET remaining=0 WHERE id=? AND remaining=?').bind(l.id, l.remaining).run(); if (!z.meta.changes) continue;
    const n = Math.min(l.remaining, Math.max(0, await balanceOf(env, l.customer_id))); if (n > 0) await env.DB.prepare("INSERT INTO points_ledger(customer_id,kind,points,note,actor,at) VALUES(?,'expire',?,'انتهت الصلاحية','system',?)").bind(l.customer_id, -n, now()).run();
  }
  return due.length;
}

const hist = async (env, cid, n = 60) => ((await env.DB.prepare('SELECT kind,points,order_code,note,at FROM points_ledger WHERE customer_id=? ORDER BY id DESC LIMIT ?').bind(cid, n).all()).results || []);

export async function loyaltyRoutes({ env, request, p, M, body, authed }) {
  if (p === '/me/points' && M === 'GET') {
    const me = await sessionCustomer(env, request); if (!me) return J({ error: 'unauthorized' }, 401);
    const c = await loyCfg(env), soon = (await env.DB.prepare('SELECT COALESCE(SUM(remaining),0) s FROM points_ledger WHERE customer_id=? AND remaining>0 AND expires_at IS NOT NULL AND expires_at<=?').bind(me.id, now() + 60 * 864e5).first()).s;
    return J({ live: c.live, balance: await balanceOf(env, me.id), expiring: soon, val: c.val, min: c.min, maxpct: c.maxpct, unit: c.unit, per: c.per, exp: c.exp, history: c.live || true ? await hist(env, me.id) : [], id: 'LS-' + String(me.id).padStart(6, '0') });
  }
  if (!p.startsWith('/adm/loy')) return null;
  if (!authed) return J({ error: 'unauthorized' }, 401);
  if (p === '/adm/loy' && M === 'GET') {
    const s = await env.DB.prepare(`SELECT COUNT(DISTINCT customer_id) m, COALESCE(SUM(CASE WHEN kind IN('earn','adjust','restore') AND points>0 THEN points END),0) earned, COALESCE(-SUM(CASE WHEN kind='redeem' THEN points END),0) redeemed, COALESCE(-SUM(CASE WHEN kind='expire' THEN points END),0) expired, COALESCE(SUM(points),0) outstanding FROM points_ledger`).first();
    return J({ cfg: await loyCfg(env), stats: s });
  }
  if (p === '/adm/loy' && M === 'POST') {
    const b = await body(), old = await loyCfg(env);
    const c = { on: b.on ? 1 : 0, unit: int(b.unit, 1, 1e9), per: int(b.per, 0, 1e6), first: int(b.first, 0, 1e6), val: int(b.val, 0, 1e6), min: int(b.min, 0, 1e9), maxpct: int(b.maxpct, 1, 100), exp: int(b.exp, 0, 60) };
    if (c.on && !(c.val > 0 && c.per > 0)) return J({ error: 'لتشغيل البرنامج أدخل: قيمة النقطة، ونقاط كل وحدة مشتريات' }, 400);
    await audit(env, request, 'admin', 'loyalty_cfg', '', old, c);
    await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('loyalty',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(c), now()).run();
    return J({ ok: true });
  }
  if (p === '/adm/loy/c' && M === 'GET') {
    const q = String(new URL(request.url).searchParams.get('q') || '').trim(); if (q.length < 3) return J({ error: 'اكتب رقم الهاتف أو معرف العضو' }, 400);
    const m = /^LS-?0*(\d+)$/i.exec(q);
    const cu = m ? await env.DB.prepare('SELECT id,name,phone FROM customers WHERE id=?').bind(+m[1]).first() : await env.DB.prepare('SELECT id,name,phone FROM customers WHERE phone LIKE ? LIMIT 1').bind('%' + q.replace(/\D/g, '')).first();
    if (!cu) return J({ error: 'لا يوجد عميل' }, 404);
    return J({ customer: cu, balance: await balanceOf(env, cu.id), history: await hist(env, cu.id, 100) });
  }
  if (p === '/adm/loy/adjust' && M === 'POST') {
    const b = await body(), cid = +b.customer_id, pts = Math.round(+b.points), note = String(b.note || '').trim().slice(0, 200);
    if (!cid || !pts || Math.abs(pts) > 1e6) return J({ error: 'قيمة غير صحيحة' }, 400); if (note.length < 3) return J({ error: 'اكتب سبب التعديل' }, 400);
    const cu = await env.DB.prepare('SELECT id FROM customers WHERE id=?').bind(cid).first(); if (!cu) return J({ error: 'لا يوجد عميل' }, 404);
    const c = await loyCfg(env);
    if (pts > 0) await env.DB.prepare("INSERT INTO points_ledger(customer_id,kind,points,note,actor,expires_at,remaining,at) VALUES(?,'adjust',?,?,'admin',?,?,?)").bind(cid, pts, note, expAt(c), pts, now()).run();
    else { const r = await env.DB.prepare("INSERT INTO points_ledger(customer_id,kind,points,note,actor,at) SELECT ?,'adjust',?,?,'admin',? WHERE (SELECT COALESCE(SUM(points),0) FROM points_ledger WHERE customer_id=?) >= ?").bind(cid, pts, note, now(), cid, -pts).run(); if (!r.meta.changes) return J({ error: 'الرصيد لا يكفي (لا يمكن أن يصبح سالباً)' }, 409); await consume(env, cid, -pts); }
    await audit(env, request, 'admin', 'loyalty_adjust', String(cid), null, { pts, note });
    return J({ ok: true, balance: await balanceOf(env, cid) });
  }
  return null;
}
