/* ops.js — المخزون، رسوم التوصيل حسب المحافظة، ربط شركات التوصيل (الوسيط + ويب هوك عام)، وصفحات المنتج لمحركات البحث */
import { J, now, jp, randHex, cfgOf, readIg, resetIg } from './lib.js';
import { audit, limit } from './guard.js';
import { eq } from './auth.js';

/* ================= رسوم التوصيل حسب المحافظة ================= */
const nrm = s => String(s || '').replace(/محافظة|محافظه/g, '').replace(/[\u064B-\u0652ـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, '').toLowerCase();
export function feeFor(cfg, city) {
  const base = Math.max(0, Math.round(+cfg.sf || 0)), sg = cfg.sg && typeof cfg.sg === 'object' ? cfg.sg : null;
  if (!sg || !city) return base;
  const k = Object.keys(sg).find(x => nrm(x) === nrm(city));
  return k !== undefined && Number.isFinite(+sg[k]) && sg[k] !== '' ? Math.max(0, Math.round(+sg[k])) : base;
}

/* ================= المخزون ================= */
export function needMap(lines) {
  const need = {};
  for (const l of lines) {
    if (l.box) for (const p of l.parts || []) need[p.c] = (need[p.c] || 0) + (p.q || 1) * l.q;
    else need[l.c] = (need[l.c] || 0) + l.q;
  }
  return need;
}
async function rowsFor(env, codes) {
  if (!codes.length) return {};
  const r = (await env.DB.prepare(`SELECT code,qty,low FROM stock WHERE code IN (${codes.map(() => '?').join(',')})`).bind(...codes).all()).results || [];
  return Object.fromEntries(r.map(x => [x.code, x]));
}
export async function checkStock(env, lines) {
  const need = needMap(lines), rows = await rowsFor(env, Object.keys(need));
  for (const [c, n] of Object.entries(need)) {
    const r = rows[c]; if (!r) continue;
    const nm = (lines.find(l => l.c === c) || {}).n || c;
    if (r.qty <= 0) return `«${nm}» نفد من المخزون`;
    if (r.qty < n) return `الكمية المتاحة من «${nm}» هي ${r.qty} فقط`;
  }
  return null;
}
export async function takeStock(env, lines, tg) {
  const need = needMap(lines), rows = await rowsFor(env, Object.keys(need)), done = [], t = now();
  for (const [c, n] of Object.entries(need)) {
    if (!rows[c]) continue;
    const r = await env.DB.prepare('UPDATE stock SET qty=qty-?,updated_at=? WHERE code=? AND qty>=?').bind(n, t, c, n).run();
    if (!r.meta || !r.meta.changes) {
      for (const [dc, dn] of done) await env.DB.prepare('UPDATE stock SET qty=qty+? WHERE code=?').bind(dn, dc).run();
      return { error: `الكمية المتاحة من ${c} لم تعد كافية، حدّث السلة` };
    }
    done.push([c, n]);
  }
  if (tg) for (const [c, n] of done) {
    const left = rows[c].qty - n;
    if (left <= 0) await tg(`⛔ <b>نفد المخزون</b>\n${c}`);
    else if (left <= rows[c].low) await tg(`⚠️ <b>مخزون منخفض</b>\n${c} — المتبقي ${left}`);
  }
  return { taken: done.length > 0 };
}
export async function restock(env, code) {
  const o = await env.DB.prepare('SELECT items,stock_taken FROM orders WHERE code=?').bind(code).first();
  if (!o || !o.stock_taken) return;
  const need = needMap(jp(o.items, [])), rows = await rowsFor(env, Object.keys(need));
  for (const [c, n] of Object.entries(need)) if (rows[c]) await env.DB.prepare('UPDATE stock SET qty=qty+?,updated_at=? WHERE code=?').bind(n, now(), c).run();
  await env.DB.prepare('UPDATE orders SET stock_taken=0 WHERE code=?').bind(code).run();
}
export async function stockMap(env) {
  return Object.fromEntries(((await env.DB.prepare('SELECT code,qty,low FROM stock').all()).results || []).map(r => [r.code, r]));
}

/* ================= شركات التوصيل ================= */
const WASEET = 'https://api.alwaseet-iq.net/v1/merchant';
export const PROVIDERS = { waseet: 'الوسيط', custom: 'شركة أخرى (رابط API / Webhook)' };
let wTok = { k: '', t: '', at: 0 };
async function wLogin(env) {
  const k = (env.DLV_USER || '') + ':' + (env.DLV_PASS || '');
  if (wTok.t && wTok.k === k && Date.now() - wTok.at < 20 * 60e3) return wTok.t;
  if (!env.DLV_USER || !env.DLV_PASS) throw new Error('أدخل اسم المستخدم وكلمة السر الخاصة بحساب الوسيط');
  const fd = new FormData(); fd.append('username', env.DLV_USER); fd.append('password', env.DLV_PASS);
  const j = await (await fetch(WASEET + '/login', { method: 'POST', body: fd })).json().catch(() => ({}));
  if (!j.status || !j.data || !j.data.token) throw new Error(j.msg || 'فشل تسجيل الدخول إلى الوسيط');
  wTok = { k, t: j.data.token, at: Date.now() }; return wTok.t;
}
async function wReq(env, method, path, qs = {}, fields = null) {
  const token = await wLogin(env), u = new URL(WASEET + path); u.searchParams.set('token', token);
  for (const [k, v] of Object.entries(qs)) u.searchParams.set(k, v);
  let body; if (fields) { body = new FormData(); for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) body.append(k, String(v)); }
  const j = await (await fetch(u, { method, body })).json().catch(() => ({}));
  if (!j.status) { if (/token/i.test(String(j.msg))) wTok = { k: '', t: '', at: 0 }; throw new Error(j.msg || 'خطأ من الوسيط'); }
  return j.data;
}
const cached = {};
async function wList(env, path, qs) { const k = path + JSON.stringify(qs || {}); const c = cached[k]; if (c && Date.now() - c.at < 6 * 3600e3) return c.v; const v = (await wReq(env, 'GET', path, qs)) || []; cached[k] = { v, at: Date.now() }; return v; }
const wCity = async (env, city) => { const l = await wList(env, '/citys'); const n = nrm(city); return l.find(x => nrm(x.city_name) === n) || l.find(x => n && (nrm(x.city_name).includes(n) || n.includes(nrm(x.city_name)))) || null; };

export const mapStatus = txt => {
  const s = String(txt || '');
  if (/ارجاع|راجع|مرتجع|رفض|return|reject|cancel|ملغ/i.test(s)) return null;
  if (/تم التسليم|تسليم للزبون|تم التوصيل|سُلّم|سلم للزبون|delivered/i.test(s)) return 5;
  if (/مندوب|في الطريق|قيد التوصيل|جاري التوصيل|out for|delivering|on the way/i.test(s)) return 4;
  return null;
};
async function applyStatus(env, setStatus, o, text) {
  await env.DB.prepare('UPDATE orders SET delivery_status=? WHERE code=?').bind(String(text || '').slice(0, 120), o.code).run();
  const s = mapStatus(text);
  if (s && s > o.status && o.status >= 2) await setStatus(env, o, s, 'delivery', String(text).slice(0, 120));
}
export async function refreshDeliveries(env, setStatus) {
  if (env.DLV_PROVIDER !== 'waseet' || !env.DLV_USER) return 0;
  const rows = (await env.DB.prepare("SELECT code,status,phone,customer_id,delivery_ref FROM orders WHERE delivery_provider='waseet' AND status IN (3,4) AND delivery_ref<>'' ORDER BY delivery_at LIMIT 25").all()).results || [];
  if (!rows.length) return 0;
  const data = await wReq(env, 'POST', '/get-orders-by-ids-bulk', {}, { ids: rows.map(r => r.delivery_ref).join(',') });
  let n = 0;
  for (const d of Array.isArray(data) ? data : []) {
    const ref = String(d.qr_id ?? d.id ?? ''), o = rows.find(r => r.delivery_ref === ref); if (!o) continue;
    await applyStatus(env, setStatus, o, d.status || d.status_name || d.status_text || ''); n++;
  }
  return n;
}

export async function opsRoutes(c) {
  const { env, request, url, p, M, body, authed, setStatus, tg } = c;
  const adm = () => authed ? null : J({ error: 'unauthorized' }, 401);

  /* ---------- المخزون (أدمن) ---------- */
  if (p === '/adm/stock' && M === 'GET') {
    const a = adm(); if (a) return a;
    const rows = (await env.DB.prepare('SELECT p.code,p.name,p.price,s.qty,s.low FROM products p LEFT JOIN stock s ON s.code=p.code ORDER BY p.sort,p.code').all()).results || [];
    return J({ items: rows.map(r => ({ code: r.code, name: r.name, price: r.price, qty: r.qty === null || r.qty === undefined ? null : r.qty, low: r.low ?? 5 })) });
  }
  if (p === '/adm/stock' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body(), items = Array.isArray(b.items) ? b.items.slice(0, 500) : [], t = now(), st = [];
    for (const it of items) {
      const code = String(it.code || '').trim(); if (!code) continue;
      if (it.qty === null || it.qty === '' || it.qty === undefined) st.push(env.DB.prepare('DELETE FROM stock WHERE code=?').bind(code));
      else st.push(env.DB.prepare('INSERT INTO stock(code,qty,low,updated_at) VALUES(?,?,?,?) ON CONFLICT(code) DO UPDATE SET qty=excluded.qty,low=excluded.low,updated_at=excluded.updated_at')
        .bind(code, Math.max(0, Math.min(1e6, Math.floor(+it.qty || 0))), Math.max(0, Math.min(1e5, Math.floor(it.low === undefined ? 5 : +it.low || 0))), t));
    }
    if (st.length) await env.DB.batch(st);
    await audit(env, request, 'admin', 'stock_save', '', null, { n: st.length });
    return J({ ok: true, n: st.length });
  }

  /* ---------- شركة التوصيل ---------- */
  if (p === '/adm/delivery/test' && M === 'POST') {
    const a = adm(); if (a) return a;
    try {
      if (env.DLV_PROVIDER === 'waseet') { const [cs, sz] = await Promise.all([wList(env, '/citys'), wList(env, '/package-sizes')]); return J({ ok: true, msg: `تم الاتصال بالوسيط ✅ — ${cs.length} محافظة/مدينة و${sz.length} أحجام طرود` }); }
      if (env.DLV_PROVIDER === 'custom') {
        if (!/^https:\/\//.test(env.DLV_URL || '')) return J({ ok: false, msg: 'رابط API يجب أن يبدأ بـ https://' });
        const r = await fetch(env.DLV_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.DLV_TOKEN ? { Authorization: 'Bearer ' + env.DLV_TOKEN } : {}) }, body: JSON.stringify({ test: true }) });
        return J({ ok: r.status < 500, msg: `ردّ الخادم بالحالة ${r.status}` + (r.status < 300 ? ' ✅' : '') });
      }
      return J({ ok: false, msg: 'اختر شركة التوصيل أولاً واحفظ' });
    } catch (e) { return J({ ok: false, msg: String(e.message || e).slice(0, 200) }); }
  }
  if (p === '/adm/delivery/genkey' && M === 'POST') {
    const a = adm(); if (a) return a;
    const cur = { ...(await readIg(env)) }, key = randHex(20); cur.DLV_KEY = key;
    await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('integrations',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(cur), now()).run();
    resetIg(); await audit(env, request, 'admin', 'delivery_genkey', ''); return J({ ok: true, key });
  }
  if (p === '/adm/delivery/info' && M === 'GET') {
    const a = adm(); if (a) return a;
    const code = url.searchParams.get('code') || '', o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first();
    if (!o) return J({ error: 'not found' }, 404);
    const out = { provider: env.DLV_PROVIDER || '', name: PROVIDERS[env.DLV_PROVIDER] || '', sent: o.delivery_ref ? { provider: o.delivery_provider, ref: o.delivery_ref, link: o.delivery_link, status: o.delivery_status } : null };
    if (env.DLV_PROVIDER === 'waseet') {
      try {
        const city = await wCity(env, o.city); out.city = city ? city.city_name : ''; out.city_id = city ? city.id : '';
        out.regions = city ? (await wList(env, '/regions', { city_id: city.id })).map(r => ({ id: r.id, n: r.region_name })) : [];
        const an = nrm(o.area); const g = out.regions.find(r => nrm(r.n) === an) || out.regions.find(r => an && (an.includes(nrm(r.n)) || nrm(r.n).includes(an)));
        out.guess = g ? g.id : '';
        out.sizes = (await wList(env, '/package-sizes')).map(s => ({ id: s.id, n: s.size })); out.size = env.DLV_SIZE || (out.sizes[0] ? out.sizes[0].id : '');
      } catch (e) { out.error = String(e.message || e).slice(0, 200); }
    }
    return J(out);
  }
  if (p === '/adm/delivery/send' && M === 'POST') {
    const a = adm(); if (a) return a;
    const b = await body(), o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(String(b.code || '')).first();
    if (!o) return J({ error: 'not found' }, 404);
    if (![1, 2, 3].includes(o.status)) return J({ error: 'لا يمكن إرسال طلب ملغى أو مُسلَّم' }, 400);
    if (o.delivery_ref && !b.force) return J({ error: 'أُرسل هذا الطلب سابقاً لشركة التوصيل' }, 409);
    const items = jp(o.items, []), qty = items.reduce((s, i) => s + (i.q || 1), 0), cod = (o.pay_method || 'cod') === 'cod';
    const notes = String(b.notes || '').slice(0, 200) + ` | ${o.code}`;
    let ref = '', link = '';
    try {
      if (env.DLV_PROVIDER === 'waseet') {
        const city = await wCity(env, o.city); if (!city) return J({ error: `لم نجد محافظة «${o.city}» في الوسيط` }, 400);
        if (!b.region_id) return J({ error: 'اختر المنطقة' }, 400);
        const d = await wReq(env, 'POST', '/create-order', {}, {
          client_name: o.name, client_mobile: '+964' + String(o.phone).replace(/^0/, ''), city_id: city.id, region_id: b.region_id,
          location: [o.area, o.landmark].filter(Boolean).join(' - ').slice(0, 250), type_name: env.DLV_TYPE || 'مستحضرات تجميل', items_number: qty,
          price: cod ? o.total : 0, package_size: b.size || env.DLV_SIZE || 1, merchant_notes: notes, replacement: 0 });
        const r = Array.isArray(d) ? d[0] : d; ref = String((r && (r.qr_id ?? r.id)) || ''); link = String((r && r.qr_link) || '');
        if (!ref) return J({ error: 'لم يُرجع الوسيط رقم الطلب' }, 502);
      } else if (env.DLV_PROVIDER === 'custom') {
        if (!/^https:\/\//.test(env.DLV_URL || '')) return J({ error: 'رابط API غير مضبوط' }, 400);
        const r = await fetch(env.DLV_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.DLV_TOKEN ? { Authorization: 'Bearer ' + env.DLV_TOKEN } : {}) },
          body: JSON.stringify({ order: { code: o.code, id: o.id, name: o.name, phone: o.phone, city: o.city, area: o.area, landmark: o.landmark, items: items.map(i => ({ code: i.c, name: i.n, qty: i.q, price: i.p })), items_count: qty, total: o.total, cod, collect: cod ? o.total : 0, notes } }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return J({ error: `ردّت الشركة بالحالة ${r.status}: ${String(j.error || j.message || '').slice(0, 120)}` }, 502);
        ref = String(j.tracking ?? j.tracking_number ?? j.ref ?? j.id ?? j.data?.id ?? j.data?.tracking ?? o.code); link = String(j.link ?? j.url ?? j.label ?? '');
      } else return J({ error: 'لم تُضبط شركة توصيل في الإعدادات' }, 400);
    } catch (e) { return J({ error: String(e.message || e).slice(0, 200) }, 502); }
    await env.DB.prepare("UPDATE orders SET delivery_provider=?,delivery_ref=?,delivery_link=?,delivery_status='أُرسل إلى شركة التوصيل',delivery_at=? WHERE code=?").bind(env.DLV_PROVIDER, ref.slice(0, 80), link.slice(0, 300), now(), o.code).run();
    if (o.status < 3) await setStatus(env, o, 3, 'delivery', 'أُرسل إلى ' + (PROVIDERS[env.DLV_PROVIDER] || ''));
    await audit(env, request, 'admin', 'delivery_send', o.code, null, { provider: env.DLV_PROVIDER, ref });
    return J({ ok: true, ref, link });
  }
  if (p === '/adm/delivery/refresh' && M === 'POST') {
    const a = adm(); if (a) return a;
    try { return J({ ok: true, n: await refreshDeliveries(env, setStatus) }); } catch (e) { return J({ ok: false, error: String(e.message || e).slice(0, 200) }, 502); }
  }
  /* استقبال تحديثات الحالة من شركة التوصيل: POST /delivery/hook?key=…  {code|ref, status} */
  if (p === '/delivery/hook' && M === 'POST') {
    const lim = await limit(env, request, 'dlv-hook', 300, 10 * 60e3); if (lim) return lim;
    const key = url.searchParams.get('key') || request.headers.get('x-webhook-key') || '';
    if (!env.DLV_KEY || !eq(key, env.DLV_KEY)) return J({ error: 'unauthorized' }, 401);
    const b = await body(), o = await env.DB.prepare('SELECT code,status,phone,customer_id FROM orders WHERE code=? OR (delivery_ref<>\'\' AND delivery_ref=?)').bind(String(b.code || ''), String(b.ref || b.tracking || '')).first();
    if (!o) return J({ error: 'order not found' }, 404);
    await applyStatus(env, setStatus, o, b.status); return J({ ok: true });
  }
  return null;
}

/* ================= صفحات المنتج لمحركات البحث + sitemap + robots ================= */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const origin = (env, request) => String(env.STORE_URL || '').replace(/\/+$/, '') || new URL(request.url).origin;
const isUrl = u => /^https?:\/\//.test(u || '') || (u || '').startsWith('/');
export async function productPage(env, request, code) {
  const idx = await env.ASSETS.fetch(new Request(new URL('/', request.url), { headers: request.headers }));
  let html = await idx.text();
  const row = await env.DB.prepare('SELECT data,updated_at FROM products WHERE code=?').bind(code).first();
  const base = origin(env, request);
  if (!row) return new Response(html.replace('</head>', '<meta name="robots" content="noindex"></head>'), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const pd = jp(row.data, {}), st = (await env.DB.prepare('SELECT qty FROM stock WHERE code=?').bind(code).first()) || null;
  const cfg = await cfgOf(env), store = cfg.n || 'Lacey Skincare', cur = 'IQD';
  const desc = (plain(pd.d) || `${pd.n} — ${store}`).slice(0, 160), ing = String(pd.ing || '').split(/[,،;\n]/).map(x => x.trim()).filter(Boolean).slice(0, 12);
  const img = [pd.i, ...(pd.im || [])].find(isUrl) || '', canon = `${base}/p/${encodeURIComponent(code)}`, title = `${pd.n} | ${store}`;
  const inStock = !st || st.qty > 0;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: pd.n, sku: code, description: desc, ...(img ? { image: img.startsWith('/') ? base + img : img } : {}), ...(ing.length ? { additionalProperty: { '@type': 'PropertyValue', name: 'Active ingredients', value: ing.join(', ') } } : {}),
    brand: { '@type': 'Brand', name: store }, offers: { '@type': 'Offer', url: canon, priceCurrency: cur, price: pd.p, availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' } };
  const head = `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canon)}"><meta property="og:type" content="product"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}">${img ? `<meta property="og:image" content="${esc(img.startsWith('/') ? base + img : img)}">` : ''}<meta property="product:price:amount" content="${pd.p}"><meta property="product:price:currency" content="${cur}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`).replace('</head>', head + '</head>');
  const body = `<section id="prd" data-pg="product"><div class="w" data-ssr="1"><h1>${esc(pd.n)}</h1>${img ? `<img src="${esc(img)}" alt="${esc(pd.n)}" style="max-width:360px;width:100%">` : ''}<p>${esc(code)} — ${Number(pd.p).toLocaleString('en-US')} د.ع</p><p>${esc(desc)}</p>${ing.length ? `<ul>${ing.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}<p>${inStock ? 'متوفر' : 'نفد من المخزون'}</p></div></section>`;
  html = html.replace(/<section id="prd"[^>]*><\/section>/, body);
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
export async function sitemap(env, request) {
  const base = origin(env, request), rows = (await env.DB.prepare('SELECT code,updated_at FROM products WHERE active=1 ORDER BY sort,code').all()).results || [];
  const day = t => new Date(t || Date.now()).toISOString().slice(0, 10);
  const urls = ['/', '/categories', '/offers', '/routine', '/routine/products', '/routine/guide', '/help'].map(u => `<url><loc>${base}${u}</loc></url>`)
    .concat(rows.map(r => `<url><loc>${esc(base + '/p/' + encodeURIComponent(r.code))}</loc><lastmod>${day(r.updated_at)}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
export const robots = (env, request) => new Response(`User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /support\nDisallow: /preferences\nDisallow: /adm\nSitemap: ${origin(env, request)}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
