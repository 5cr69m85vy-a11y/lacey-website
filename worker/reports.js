/* reports.js — تقارير المبيعات والأعمال (يوم / أسبوع / شهر / سنة + ملخصات). توقيت بغداد UTC+3.
   تعريفات: المبيعات = مجموع قيمة المنتجات قبل الخصم (طلبات غير ملغاة)، صافي المبيعات = المبيعات − الخصومات (بدون التوصيل)،
   إيراد التوصيل = رسوم التوصيل المدفوعة، الإجمالي المحصَّل = المبيعات − الخصم + التوصيل. */
import { now, jp } from './lib.js';
const TZ = 3 * 3600e3, DAY = 864e5;
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const money = n => Math.round(Number(n || 0)).toLocaleString('en-US');
const pct = (a, b) => b ? (((a - b) / b) * 100).toFixed(1).replace(/\.0$/, '') + '%' : (a ? '＋جديد' : '—');
export const dayStart = t => Math.floor((t + TZ) / DAY) * DAY - TZ;
const ymd = t => new Date(t + TZ).toISOString().slice(0, 10);
const monthStart = (y, m) => Date.UTC(y, m, 1) - TZ;
const parts = t => { const d = new Date(t + TZ); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), hh: d.getUTCHours(), mm: d.getUTCMinutes() }; };
export const baghdad = parts;
const MN = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

/* الفترة: auto=true للإرسال التلقائي (فترة مكتملة)، وإلا حسب الأمر */
export function period(kind, t = now(), auto = false, arg = '') {
  const p = parts(t), t0 = dayStart(t);
  if (kind === 'daily') { const yest = auto ? p.hh < 12 : /yest|أمس|امس/i.test(arg), a = yest ? t0 - DAY : t0; return { a, b: a + DAY, label: (yest ? 'أمس ' : 'اليوم ') + ymd(a), prev: { a: a - DAY, b: a } }; }
  if (kind === 'weekly') { const sinceSat = (p.dow + 1) % 7, thisWk = t0 - sinceSat * DAY, a = thisWk - 7 * DAY; return { a, b: thisWk, label: `الأسبوع الماضي ${ymd(a)} → ${ymd(thisWk - DAY)}`, prev: { a: a - 7 * DAY, b: a } }; }
  if (kind === 'monthly') {
    const cur = auto ? (p.m === 0 ? [p.y - 1, 11] : [p.y, p.m - 1]) : [p.y, p.m], a = monthStart(cur[0], cur[1]), b = auto || true ? monthStart(cur[1] === 11 ? cur[0] + 1 : cur[0], (cur[1] + 1) % 12) : 0;
    const pm = cur[1] === 0 ? [cur[0] - 1, 11] : [cur[0], cur[1] - 1];
    return { a, b: Math.min(b, auto ? b : t + 1), label: `${MN[cur[1]]} ${cur[0]}${auto ? '' : ' (حتى الآن)'}`, prev: { a: monthStart(pm[0], pm[1]), b: a }, full: b };
  }
  const y = auto ? p.y - 1 : p.y, a = monthStart(y, 0), b = monthStart(y + 1, 0);
  return { a, b: auto ? b : Math.min(b, t + 1), label: `سنة ${y}${auto ? '' : ' (حتى الآن)'}`, prev: { a: monthStart(y - 1, 0), b: a } };
}

export async function maps(env) {
  const prods = (await env.DB.prepare('SELECT code,name,category,data FROM products').all()).results, cfg = await env.DB.prepare("SELECT value FROM settings WHERE key='config'").first();
  const brands = Object.fromEntries(((jp(cfg && cfg.value, {}).br) || []).map(b => [String(b.id), b.n || b.name || '']));
  const pm = {}; for (const r of prods) { const d = jp(r.data, {}); pm[r.code] = { n: r.name, k: r.category || d.k || '', br: brands[String(d.br)] || '' }; }
  return pm;
}
export async function stats(env, a, b, pm) {
  const rows = (await env.DB.prepare('SELECT code,phone,items,subtotal,discount,shipping,free_shipping,total,status,customer_id FROM orders WHERE created_at>=? AND created_at<?').bind(a, b).all()).results;
  const live = rows.filter(r => r.status !== 0), S = { orders: rows.length, cancelled: rows.length - live.length, completed: rows.filter(r => r.status === 5).length, pending: rows.filter(r => [1, 2, 3, 4].includes(r.status)).length,
    sales: 0, discounts: 0, delivery: 0, collected: 0, buyers: 0, newC: 0, retC: 0, receipts: 0, prod: {}, brand: {}, cat: {} };
  const phones = new Set();
  for (const r of live) {
    S.sales += r.subtotal; S.discounts += r.discount; S.collected += r.total; if (!r.free_shipping) S.delivery += r.shipping; phones.add(r.phone);
    for (const i of jp(r.items, [])) { const q = +i.q || 0, v = q * (+i.p || 0), m = pm[i.c] || {}; const x = S.prod[i.c] || (S.prod[i.c] = { n: i.n || m.n || i.c, q: 0, v: 0 }); x.q += q; x.v += v;
      for (const [map, key] of [[S.brand, m.br], [S.cat, m.k]]) if (key) { const y = map[key] || (map[key] = { q: 0, v: 0 }); y.q += q; y.v += v; } }
  }
  S.buyers = phones.size; S.net = S.sales - S.discounts; S.avg = live.length ? S.collected / live.length : 0;
  if (phones.size) { const ph = [...phones], seen = new Set(); for (let i = 0; i < ph.length; i += 80) { const ch = ph.slice(i, i + 80); (await env.DB.prepare(`SELECT DISTINCT phone FROM orders WHERE created_at<? AND status<>0 AND phone IN (${ch.map(() => '?').join(',')})`).bind(a, ...ch).all()).results.forEach(r => seen.add(r.phone)); } S.retC = seen.size; S.newC = phones.size - seen.size; }
  S.receipts = (await env.DB.prepare('SELECT COUNT(*) n FROM receipts WHERE issued_at>=? AND issued_at<?').bind(a, b).first()).n;
  S.registered = (await env.DB.prepare('SELECT COUNT(*) n FROM customers WHERE created_at>=? AND created_at<?').bind(a, b).first()).n;
  return S;
}
const top = (m, n = 5, by = 'q') => Object.entries(m).sort((x, y) => y[1][by] - x[1][by] || y[1].v - x[1].v).slice(0, n);
const list = (m, n = 5) => { const t = top(m, n); return t.length ? t.map(([k, v], i) => `${i + 1}. ${esc(v.n || k)} — ${v.q} قطعة (${money(v.v)})`).join('\n') : '—'; };
const ln = (l, v) => `${l}: <b>${v}</b>`;

export async function buildReport(env, kind, { auto = false, arg = '', t = now() } = {}) {
  const per = period(kind, t, auto, arg), pm = await maps(env), S = await stats(env, per.a, per.b, pm), P = await stats(env, per.prev.a, per.prev.b, pm);
  const head = { daily: '📅 التقرير اليومي', weekly: '🗓 التقرير الأسبوعي', monthly: '📆 التقرير الشهري', yearly: '🏆 التقرير السنوي' }[kind];
  const L = [`${head} — Lacey Skincare`, `📍 ${per.label}`, ''];
  L.push('💰 ' + ln('إجمالي المبيعات', money(S.sales)), '🧾 ' + ln('صافي المبيعات (بعد الخصم)', money(S.net)));
  if (kind === 'daily') L.push('🏷 ' + ln('إجمالي الخصومات', money(S.discounts)), '🚚 ' + ln('إيراد التوصيل', money(S.delivery)));
  L.push('', '🛍 ' + ln('عدد الطلبات', S.orders), '✅ ' + ln('المكتملة (تم التوصيل)', S.completed), '⏳ ' + ln('قيد التنفيذ', S.pending), '❌ ' + ln('الملغاة', S.cancelled), '👥 ' + ln('عدد الزبائن', S.buyers), '🧾 ' + ln('عدد الإيصالات/الفواتير', S.receipts));
  if (kind !== 'daily') L.push('📈 ' + ln('متوسط قيمة الطلب', money(S.avg)));
  if (kind === 'monthly' || kind === 'yearly') L.push('🆕 ' + ln('زبائن جدد', S.newC), '🔁 ' + ln('زبائن عائدون', S.retC));
  if (kind === 'weekly') L.push('', '🥇 <b>الأكثر مبيعاً</b>\n' + list(S.prod), '', '🏷 <b>أفضل البراندات</b>\n' + list(S.brand, 3));
  if (kind === 'monthly') L.push('', '🥇 <b>المنتجات الأكثر مبيعاً</b>\n' + list(S.prod), '', '🗂 <b>أفضل الفئات</b>\n' + list(S.cat, 3), '', `📊 المقارنة بالشهر السابق: المبيعات ${pct(S.sales, P.sales)} · الطلبات ${pct(S.orders, P.orders)}`);
  if (kind === 'yearly') {
    const y = parts(per.a).y, rows = []; for (let m = 0; m < 12; m++) { const a = monthStart(y, m); if (a >= per.b) break; const s = await stats(env, a, Math.min(monthStart(y, m + 1), per.b), pm); rows.push(`${MN[m]}: ${money(s.sales)} (${s.orders} طلب)`); }
    L.push('', '📊 <b>المبيعات الشهرية</b>\n' + rows.join('\n'), '', '🥇 <b>المنتجات الأكثر مبيعاً</b>\n' + list(S.prod), '', '🏷 <b>أفضل البراندات</b>\n' + list(S.brand, 5), '', `📈 النمو مقارنة بالسنة السابقة: المبيعات ${pct(S.sales, P.sales)} · الطلبات ${pct(S.orders, P.orders)}`);
  }
  if (kind === 'daily' || kind === 'weekly') L.push('', `↕️ مقارنة بالفترة السابقة: ${pct(S.sales, P.sales)}`);
  L.push('', '<i>المبيعات = قيمة المنتجات قبل الخصم، دون الطلبات الملغاة.</i>');
  return L.join('\n');
}
/* أوامر الملخصات */
export async function summary(env, kind, t = now()) {
  const pm = await maps(env), p = parts(t), t0 = dayStart(t), wk = t0 - ((p.dow + 1) % 7) * DAY, mo = monthStart(p.y, p.m), yr = monthStart(p.y, 0), end = t + 1;
  const [d, w, m, y] = await Promise.all([[t0, end], [wk, end], [mo, end], [yr, end]].map(([a, b]) => stats(env, a, b, pm)));
  const row = (l, f) => `${l}: اليوم <b>${f(d)}</b> · الأسبوع <b>${f(w)}</b> · الشهر <b>${f(m)}</b> · السنة <b>${f(y)}</b>`;
  if (kind === 'sales') return `💰 <b>ملخص المبيعات</b>\n\n${row('إجمالي المبيعات', s => money(s.sales))}\n\n${row('صافي المبيعات', s => money(s.net))}\n\n${row('الخصومات', s => money(s.discounts))}\n\n${row('إيراد التوصيل', s => money(s.delivery))}`;
  if (kind === 'orders') { const o = await env.DB.prepare('SELECT status,COUNT(*) n FROM orders GROUP BY status').all(), by = Object.fromEntries(o.results.map(r => [r.status, r.n])); return `🛍 <b>ملخص الطلبات</b>\n\n${row('الطلبات', s => s.orders)}\n\n${row('المكتملة', s => s.completed)}\n\n${row('الملغاة', s => s.cancelled)}\n\n<b>الحالة الحالية (كل الطلبات):</b>\n🆕 مستلمة ${by[1] || 0} · ✅ مؤكدة ${by[2] || 0} · 🚚 مشحونة ${by[3] || 0} · 🛵 في الطريق ${by[4] || 0} · 📦 مسلّمة ${by[5] || 0} · ❌ ملغاة ${by[0] || 0}`; }
  if (kind === 'customers') { const tot = (await env.DB.prepare('SELECT COUNT(*) n FROM customers').first()).n, buy = (await env.DB.prepare('SELECT COUNT(*) n FROM customers WHERE orders_count>0').first()).n; return `👥 <b>ملخص الزبائن</b>\n\nالحسابات المسجّلة: <b>${tot}</b> · اشترت مرة على الأقل: <b>${buy}</b>\n\n${row('مشترون', s => s.buyers)}\n\n${row('تسجيلات جديدة', s => s.registered)}\n\n${row('زبائن جدد (أول شراء)', s => s.newC)}\n\n${row('زبائن عائدون', s => s.retC)}`; }
  const last = (await env.DB.prepare('SELECT number,order_code,issued_at FROM receipts ORDER BY id DESC LIMIT 5').all()).results;
  return `🧾 <b>ملخص الإيصالات والفواتير</b>\n\n${row('الإيصالات الصادرة', s => s.receipts)}\n\n<b>آخر الإيصالات:</b>\n${last.length ? last.map(r => `• ${esc(r.number)} — ${esc(r.order_code)} — ${new Date(r.issued_at + TZ).toISOString().slice(0, 16).replace('T', ' ')}`).join('\n') : '—'}`;
}
