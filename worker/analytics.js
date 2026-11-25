/* analytics.js — تقارير الإدارة (مبيعات، منتجات، براند، فئات، خصومات، وفاء، دعم، روتين، موظفون) + تصدير CSV. للمدير فقط. */
import { J, now, jp } from './lib.js';
import { stats, maps, dayStart } from './reports.js';
const DAY = 864e5, TZ = 3 * 3600e3;
const d2t = (s, end) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - TZ + (end ? DAY : 0) : null; };
const ymd = t => new Date(t + TZ).toISOString().slice(0, 10);
const csvCell = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

export async function buildReports(env, a, b) {
  const pm = await maps(env), S = await stats(env, a, b, pm), R = {};
  const top = (o, n = 25) => Object.entries(o).map(([k, v]) => ({ k, ...v })).sort((x, y) => y.v - x.v).slice(0, n);
  R.summary = { title: 'الملخص', cols: ['المؤشر', 'القيمة'], rows: [['عدد الطلبات', S.orders], ['مكتملة', S.completed], ['قيد التنفيذ', S.pending], ['ملغاة', S.cancelled], ['المبيعات (قبل الخصم)', S.sales], ['الخصومات', S.discounts], ['صافي المبيعات', S.net], ['إيراد التوصيل', S.delivery], ['الإجمالي المحصّل', S.collected], ['متوسط الطلب', Math.round(S.avg)], ['عملاء اشتروا', S.buyers], ['عملاء جدد (طلبوا لأول مرة)', S.newC], ['عملاء عائدون', S.retC], ['معدل تكرار الشراء %', S.buyers ? Math.round(S.retC * 1000 / S.buyers) / 10 : 0], ['حسابات جديدة', S.registered]] };
  R.products = { title: 'أداء المنتجات', cols: ['المنتج', 'الكمية', 'المبيعات'], rows: top(S.prod, 50).map(x => [x.n, x.q, x.v]) };
  R.brands = { title: 'أداء البراندات', cols: ['البراند', 'الكمية', 'المبيعات'], rows: top(S.brand).map(x => [x.k, x.q, x.v]) };
  R.cats = { title: 'أداء الفئات', cols: ['الفئة', 'الكمية', 'المبيعات'], rows: top(S.cat).map(x => [x.k, x.q, x.v]) };
  const cp = (await env.DB.prepare(`SELECT u.code, COALESCE(MAX(d.name),'') name, COUNT(*) uses, COUNT(DISTINCT u.phone) custs, COALESCE(SUM(u.amount),0) amt FROM discount_uses u LEFT JOIN discount_codes d ON d.code=u.code WHERE u.at>=? AND u.at<? GROUP BY u.code ORDER BY amt DESC`).bind(a, b).all()).results;
  R.coupons = { title: 'أداء الخصومات والكوبونات', cols: ['الكود', 'الاسم', 'مرات الاستخدام', 'عملاء', 'قيمة الخصم'], rows: cp.map(r => [r.code, r.name, r.uses, r.custs, r.amt]) };
  const lo = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN kind IN('earn','adjust','restore') AND points>0 THEN points END),0) earned, COALESCE(-SUM(CASE WHEN kind='redeem' THEN points END),0) redeemed, COALESCE(-SUM(CASE WHEN kind='expire' THEN points END),0) expired, COUNT(DISTINCT customer_id) members FROM points_ledger WHERE at>=? AND at<?`).bind(a, b).first();
  const po = await env.DB.prepare('SELECT COUNT(*) n, COALESCE(SUM(pts_value),0) v FROM orders WHERE status<>0 AND pts_used>0 AND created_at>=? AND created_at<?').bind(a, b).first();
  R.loyalty = { title: 'أداء الوفاء', cols: ['المؤشر', 'القيمة'], rows: [['نقاط ممنوحة', lo.earned], ['نقاط مستبدلة', lo.redeemed], ['نقاط منتهية', lo.expired], ['أعضاء بحركات', lo.members], ['طلبات استخدمت نقاطاً', po.n], ['قيمة الخصم بالنقاط (د.ع)', po.v]] };
  const ch = (await env.DB.prepare('SELECT id,dept,wf,status,created_at,assigned_to FROM chats WHERE created_at>=? AND created_at<?').bind(a, b).all()).results;
  const fr = {}; if (ch.length) { const ids = ch.map(c => c.id); for (let i = 0; i < ids.length; i += 80) { const part = ids.slice(i, i + 80), rs = (await env.DB.prepare(`SELECT chat_id, sender, MIN(at) t FROM chat_messages WHERE chat_id IN (${part.map(() => '?')}) AND sender IN ('customer','admin') GROUP BY chat_id, sender`).bind(...part).all()).results; for (const r of rs) (fr[r.chat_id] ||= {})[r.sender] = r.t; } }
  const sup = d => { const L = ch.filter(c => (c.dept || 'service') === d), res = L.filter(c => ['resolved', 'closed'].includes(c.wf) || c.status === 'closed'), times = L.map(c => fr[c.id] && fr[c.id].customer && fr[c.id].admin ? fr[c.id].admin - fr[c.id].customer : null).filter(x => x !== null && x >= 0), avg = times.length ? Math.round(times.reduce((x, y) => x + y, 0) / times.length / 60000) : 0; return [L.length, res.length, L.length ? Math.round(res.length * 1000 / L.length) / 10 : 0, times.length ? avg : '—']; };
  R.support = { title: 'الدعم والروتين', cols: ['القسم', 'محادثات', 'محلولة/مغلقة', 'نسبة الحل %', 'متوسط أول رد (دقيقة)'], rows: [['خدمة الزبائن', ...sup('service')], ['استفسارات الروتين', ...sup('routine')]] };
  const st = (await env.DB.prepare(`SELECT COALESCE(NULLIF(m.author,''),'—') who, COUNT(*) msgs, COUNT(DISTINCT m.chat_id) chats FROM chat_messages m WHERE m.sender='admin' AND m.at>=? AND m.at<? GROUP BY who ORDER BY msgs DESC`).bind(a, b).all()).results;
  R.staff = { title: 'أداء الموظفين', cols: ['الموظف', 'ردود', 'محادثات'], rows: st.map(r => [r.who, r.msgs, r.chats]) };
  return R;
}

export async function analyticsRoutes({ env, request, p, M, authed }) {
  if (p !== '/adm/report' || M !== 'GET') return null;
  if (!authed) return J({ error: 'unauthorized' }, 401);
  const u = new URL(request.url), to = d2t(u.searchParams.get('to'), true) || dayStart(now()) + DAY, from = d2t(u.searchParams.get('from')) || to - 30 * DAY;
  if (from >= to || to - from > 400 * DAY) return J({ error: 'نطاق التاريخ غير صحيح (حتى 400 يوم)' }, 400);
  const R = await buildReports(env, from, to), csv = u.searchParams.get('csv');
  if (csv) {
    const s = R[csv]; if (!s) return J({ error: 'قسم غير معروف' }, 400);
    const body = '﻿' + [s.cols, ...s.rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lacey-${csv}-${ymd(from)}_${ymd(to - 1)}.csv"`, 'Cache-Control': 'no-store' } });
  }
  return J({ from: ymd(from), to: ymd(to - 1), reports: R });
}
