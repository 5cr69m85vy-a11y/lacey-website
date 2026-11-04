/* remind.js — تذكيرات ذكية: سلة متروكة، رجوع المنتج للمخزون، موعد إعادة الشراء.
   كلها إشعارات داخل الموقع؛ وواتساب فقط لمن وافقت على العروض (mkt=1) — عدا «رجع المنتج» فهي طلبتها صراحةً.
   الإعدادات في settings['reminders'] = { cart:1, reorder:1, stock:1, cartHours:3 } */
import { now, jp } from './lib.js';

const DEF = { cart: 1, reorder: 1, stock: 1, cartHours: 3 };
export async function remCfg(env) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key='reminders'").first();
  const c = { ...DEF, ...(r ? jp(r.value, {}) : {}) };
  c.cartHours = Math.max(1, Math.min(72, +c.cartHours || 3));
  return c;
}
export async function saveRemCfg(env, b) {
  const c = { cart: b.cart ? 1 : 0, reorder: b.reorder ? 1 : 0, stock: b.stock ? 1 : 0, cartHours: Math.max(1, Math.min(72, Math.round(+b.cartHours || 3))) };
  await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('reminders',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(c), now()).run();
  return c;
}

/* مدة استهلاك افتراضية (أيام) حسب نوع المنتج، ويمكن تحديدها لكل منتج بحقل du */
const DUR = { cleanse: 45, serum: 40, moist: 45, spf: 35, toner: 45, eye: 50, mask: 20 };
const stepOfProd = p => { if (p.st) return p.st; const t = (p.k || '') + ' ' + (p.n || ''); return /sun|spf|واقي/i.test(t) ? 'spf' : /clean|wash|foam|غسول|منظف/i.test(t) ? 'cleanse' : /serum|سيروم/i.test(t) ? 'serum' : /moistur|cream|lotion|مرطب|كريم/i.test(t) ? 'moist' : /toner|تونر/i.test(t) ? 'toner' : /mask|قناع|ماسك/i.test(t) ? 'mask' : ''; };
export const durOf = p => { const d = Math.round(+p.du); return d >= 7 && d <= 365 ? d : (DUR[stepOfProd(p)] || 45); };

const link = (env, path) => (env.STORE_URL ? String(env.STORE_URL).replace(/\/$/, '') : '') + path;
async function notify(env, cu, tpl, title, text, href, wa) {
  const t = now(), p = JSON.stringify({ title, text, href });
  await env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'inapp',?,?,'sent',?)").bind(cu.id, cu.phone || null, tpl, p, t).run();
  if (wa && cu.phone) await env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'whatsapp','promo',?,'queued',?)").bind(cu.id, cu.phone, JSON.stringify({ text: `${title}\n${text}\n🛍 ${link(env, href)}` }), t).run();
}
const prodMap = async env => Object.fromEntries(((await env.DB.prepare('SELECT code,name,price,data FROM products WHERE active=1').all()).results || []).map(r => [r.code, { ...jp(r.data, {}), c: r.code, n: r.name, p: r.price }]));

/* ---------- سلة الزبونة (تُزامَن من المتصفح) ---------- */
export async function saveCart(env, cid, items) {
  const clean = {}; let n = 0;
  for (const [c, q] of Object.entries(items && typeof items === 'object' ? items : {})) { const k = String(c).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20), v = Math.max(0, Math.min(50, Math.floor(+q) || 0)); if (k && v && !k.startsWith('BOX-') && n < 30) { clean[k] = v; n++; } }
  if (!n) { await env.DB.prepare('DELETE FROM carts WHERE customer_id=?').bind(cid).run(); return 0; }
  await env.DB.prepare('INSERT INTO carts(customer_id,items,updated_at,reminded_at) VALUES(?,?,?,0) ON CONFLICT(customer_id) DO UPDATE SET items=excluded.items,updated_at=CASE WHEN carts.items=excluded.items THEN carts.updated_at ELSE excluded.updated_at END,reminded_at=CASE WHEN carts.items=excluded.items THEN carts.reminded_at ELSE 0 END').bind(cid, JSON.stringify(clean), now()).run();
  return n;
}

/* ---------- رجع المنتج للمخزون ---------- */
export async function watchAdd(env, cid, code) {
  const c = String(code || '').slice(0, 20), p = await env.DB.prepare('SELECT 1 x FROM products WHERE code=?').bind(c).first(); if (!p) return false;
  await env.DB.prepare('INSERT INTO stock_watch(customer_id,code,created_at,notified_at) VALUES(?,?,?,0) ON CONFLICT(customer_id,code) DO UPDATE SET notified_at=0').bind(cid, c, now()).run(); return true;
}
export const watchDel = (env, cid, code) => env.DB.prepare('DELETE FROM stock_watch WHERE customer_id=? AND code=?').bind(cid, String(code || '')).run();
export async function watchList(env, cid) { return ((await env.DB.prepare('SELECT code FROM stock_watch WHERE customer_id=? AND notified_at=0').bind(cid).all()).results || []).map(r => r.code); }
export async function notifyRestock(env, code) {
  try {
    if (!(await remCfg(env)).stock) return 0;
    const q = await env.DB.prepare('SELECT qty FROM stock WHERE code=?').bind(code).first(); if (q && q.qty <= 0) return 0;
    const ws = (await env.DB.prepare('SELECT w.customer_id id, c.phone phone FROM stock_watch w JOIN customers c ON c.id=w.customer_id WHERE w.code=? AND w.notified_at=0 LIMIT 200').bind(code).all()).results || [];
    if (!ws.length) return 0;
    const pr = await env.DB.prepare('SELECT name FROM products WHERE code=?').bind(code).first(), nm = pr ? pr.name : code;
    for (const w of ws) { await notify(env, w, 'restock', 'رجع للمخزون 🎉', `«${nm}» متوفر الآن — الكمية محدودة`, '/p/' + code, true); await env.DB.prepare('UPDATE stock_watch SET notified_at=? WHERE customer_id=? AND code=?').bind(now(), w.id, code).run(); }
    return ws.length;
  } catch (e) { return 0; }
}

/* ---------- Cron (كل 30 دقيقة) ---------- */
export async function runReminders(env) {
  const cfg = await remCfg(env), t = now(), out = { cart: 0, reorder: 0 };
  const P = await prodMap(env);
  if (cfg.cart) {
    const rows = (await env.DB.prepare(`SELECT c.customer_id id, c.items, c.updated_at, cu.phone, cu.mkt FROM carts c JOIN customers cu ON cu.id=c.customer_id
      WHERE c.updated_at<? AND c.updated_at>? AND c.reminded_at=0 AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.customer_id AND o.created_at>=c.updated_at) LIMIT 50`).bind(t - cfg.cartHours * 36e5, t - 3 * 864e5).all()).results || [];
    for (const r of rows) {
      const last = await env.DB.prepare("SELECT 1 x FROM notifications WHERE customer_id=? AND template='cart_reminder' AND created_at>?").bind(r.id, t - 3 * 864e5).first();
      const lines = Object.keys(jp(r.items, {})).map(c => P[c]).filter(Boolean);
      const st = lines.length ? await env.DB.prepare(`SELECT code,qty FROM stock WHERE code IN (${lines.map(() => '?').join(',')})`).bind(...lines.map(p => p.c)).all() : { results: [] };
      const out0 = new Set((st.results || []).filter(x => x.qty <= 0).map(x => x.code)), buy = lines.filter(p => !out0.has(p.c));
      await env.DB.prepare('UPDATE carts SET reminded_at=? WHERE customer_id=?').bind(t, r.id).run();
      if (last || !buy.length) continue;
      const txt = buy.length === 1 ? `«${buy[0].n}» ما زال بانتظارك في السلة` : `«${buy[0].n}» و${buy.length - 1} منتجات أخرى بانتظارك في السلة`;
      await notify(env, { id: r.id, phone: r.phone }, 'cart_reminder', 'نسيتِ شيئاً في سلتك 🛍', txt, '/cart', !!r.mkt); out.cart++;
    }
  }
  if (cfg.reorder) {
    const os = (await env.DB.prepare("SELECT o.code,o.customer_id,o.items,o.delivered_at FROM orders o WHERE o.status=5 AND o.customer_id IS NOT NULL AND o.delivered_at>? AND o.delivered_at<? ORDER BY o.delivered_at DESC LIMIT 300").bind(t - 150 * 864e5, t - 7 * 864e5).all()).results || [];
    const per = {};
    for (const o of os) for (const l of jp(o.items, [])) {
      const p = P[l.c]; if (!p) continue;
      const due = o.delivered_at + durOf(p) * 0.85 * 864e5; if (t < due) continue;
      if (await env.DB.prepare('SELECT 1 x FROM reorder_log WHERE order_code=? AND code=?').bind(o.code, l.c).first()) continue;
      const again = await env.DB.prepare("SELECT 1 x FROM orders o2 WHERE o2.customer_id=? AND o2.status>0 AND o2.created_at>? AND o2.items LIKE ? LIMIT 1").bind(o.customer_id, o.delivered_at, '%"c":"' + l.c + '"%').first();
      (per[o.customer_id] = per[o.customer_id] || []).push({ o: o.code, p, skip: !!again });
    }
    for (const [cid, ls] of Object.entries(per)) {
      const cu = await env.DB.prepare('SELECT id,phone,mkt FROM customers WHERE id=?').bind(+cid).first(); if (!cu) continue;
      for (const x of ls.filter(z => z.skip)) await env.DB.prepare('INSERT OR IGNORE INTO reorder_log(order_code,code,at) VALUES(?,?,?)').bind(x.o, x.p.c, t).run();
      const live = ls.filter(z => !z.skip); if (!live.length) continue;
      if (await env.DB.prepare("SELECT 1 x FROM notifications WHERE customer_id=? AND template='reorder' AND created_at>?").bind(cu.id, t - 7 * 864e5).first()) continue;
      const uniq = [...new Map(live.map(z => [z.p.c, z.p])).values()];
      const txt = uniq.length === 1 ? `«${uniq[0].n}» يقارب على الانتهاء — جدّدي طلبك قبل أن يخلص` : `«${uniq[0].n}» و${uniq.length - 1} منتجات أخرى تقارب على الانتهاء`;
      await notify(env, cu, 'reorder', 'حان وقت إعادة الطلب 🌸', txt, uniq.length === 1 ? '/p/' + uniq[0].c : '/account/orders', !!cu.mkt);
      for (const x of live) await env.DB.prepare('INSERT OR IGNORE INTO reorder_log(order_code,code,at) VALUES(?,?,?)').bind(x.o, x.p.c, t).run();
      out.reorder++;
    }
  }
  return out;
}
export async function remStats(env) {
  const since = now() - 30 * 864e5, n = async tpl => (await env.DB.prepare("SELECT COUNT(*) n FROM notifications WHERE template=? AND channel='inapp' AND created_at>?").bind(tpl, since).first()).n;
  return { cart: await n('cart_reminder'), reorder: await n('reorder'), restock: await n('restock'), watching: (await env.DB.prepare('SELECT COUNT(*) n FROM stock_watch WHERE notified_at=0').first()).n, carts: (await env.DB.prepare('SELECT COUNT(*) n FROM carts').first()).n };
}
