/* shop.js — تسعير السلة على الخادم: منتجات + بوكسات + أكواد خصم متعددة + توصيل مجاني */
import { audit, limit } from './guard.js';
import { J, now, jp, cfgOf } from './lib.js';
import { pointsQuote } from './loyalty.js';
import { sessionCustomer } from './auth.js';
import { feeFor, checkStock } from './ops.js';

export async function priceLines(env, raw) {
  raw = Array.isArray(raw) ? raw : [];
  if (!raw.length || raw.length > 60) return { error: 'السلة فارغة' };
  const nProducts = (await env.DB.prepare('SELECT COUNT(*) n FROM products').first()).n;
  const lines = [];
  for (const it of raw) {
    const q = Math.max(1, Math.min(50, Math.floor(+it.q || 0)));
    const code = String(it.c || '');
    if (code.startsWith('BOX-')) {
      const b = await env.DB.prepare('SELECT id,name,price,data FROM boxes WHERE id=? AND active=1').bind(code.slice(4)).first();
      if (!b) return { error: `البوكس ${code} غير متاح` };
      const d = jp(b.data, {});
      lines.push({ c: code, n: b.name, cc: '', q, p: b.price, box: 1, parts: (d.it || []).map(x => ({ c: x.c, q: x.q || 1 })) });
      continue;
    }
    const row = await env.DB.prepare('SELECT name,price,data FROM products WHERE code=?').bind(code).first();
    if (row) lines.push({ c: code, n: row.name, cc: String(jp(row.data, {}).cc || ''), br: String(jp(row.data, {}).br || ''), k: String(jp(row.data, {}).k || ''), q, p: row.price });
    else if (nProducts === 0 && +it.p >= 0) lines.push({ c: code, n: String(it.n || code).slice(0, 120), cc: '', q, p: Math.round(+it.p) });
    else return { error: `المنتج ${code} غير متاح` };
  }
  return { lines };
}

export async function quote(env, b) {
  const pr = await priceLines(env, b.items);
  if (pr.error) return { error: pr.error };
  const stErr = await checkStock(env, pr.lines); if (stErr) return { error: stErr };
  const lines = pr.lines, subtotal = lines.reduce((a, l) => a + l.p * l.q, 0);
  const cfg = await cfgOf(env), fee = feeFor(cfg, b.city), phone = String(b.ph || '');
  const applied = [], rejected = [], seen = new Set();
  let disc = 0, free = false;
  let prior = null;
  const hadOrders = async () => { if (prior === null) prior = phone ? !!(await env.DB.prepare('SELECT 1 x FROM orders WHERE phone=? AND status<>0 LIMIT 1').bind(phone).first()) : false; return prior; };
  /* يقيّم خصماً واحداً؛ يعيد null عند النجاح أو سبب الرفض */
  const apply = async (code, r, auto) => {
    if (r.starts_at && r.starts_at > now()) return 'not_started';
    if (r.expires_at && r.expires_at < now()) return 'expired';
    if (r.max_uses && r.used >= r.max_uses) return 'used_up';
    if (r.phone && phone && r.phone !== phone) return 'not_yours';
    if (subtotal < (r.min_cart || 0)) return 'min_cart';
    if (r.first_only && await hadOrders()) return 'first_only';
    if (r.per_cust && phone) { const u = await env.DB.prepare('SELECT COUNT(*) n FROM discount_uses WHERE code=? AND phone=?').bind(code, phone).first(); if (u.n >= r.per_cust) return 'per_customer'; }
    const allow = r.product_codes ? jp(r.product_codes, []) : null, br = r.brands ? jp(r.brands, []).map(String) : null, ct = r.cats ? jp(r.cats, []).map(String) : null;
    const scoped = !!(allow || br || ct);
    const el = lines.filter(l => !scoped || (allow && allow.includes(l.c)) || (br && l.br && br.includes(l.br)) || (ct && l.k && ct.includes(l.k)));
    const base = el.reduce((a, l) => a + l.p * l.q, 0);
    if (scoped && !base) return 'not_applicable';
    if (r.kind === 'free_shipping') { free = true; applied.push({ code, name: r.name || '', auto, kind: r.kind, value: 0, amount: fee }); return null; }
    const money = applied.filter(a => a.kind !== 'free_shipping');
    if (money.length && !(r.stackable && money.every(a => a.stackable))) return 'not_stackable';
    let amt;
    if (r.kind === 'amount') amt = Math.round(r.value);
    else if (r.kind === 'bogo') { const u = []; el.forEach(l => { for (let i = 0; i < l.q; i++) u.push(l.p); }); u.sort((a, b) => a - b); amt = u.slice(0, Math.floor(u.length / 2)).reduce((a, x) => a + x, 0); if (!amt) return 'not_applicable'; }
    else if (r.kind === 'bundle') { if (!allow || !allow.length || !allow.every(c => lines.some(l => l.c === c))) return 'not_applicable'; amt = Math.round(base * Math.min(100, r.value) / 100); }
    else amt = Math.round(base * Math.min(100, r.value) / 100);
    if (r.max_disc) amt = Math.min(amt, r.max_disc);
    amt = Math.max(0, Math.min(amt, base, subtotal - disc));
    disc += amt; applied.push({ code, name: r.name || '', auto, kind: r.kind, value: r.value, amount: amt, stackable: !!r.stackable }); return null;
  };
  for (const raw of [].concat(b.codes || []).slice(0, 8)) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code || seen.has(code)) continue; seen.add(code);
    let r = await env.DB.prepare('SELECT * FROM discount_codes WHERE code=? AND active=1').bind(code).first();
    if (!r) { const lg = (cfg.C || []).find(x => String(x.c).toUpperCase() === code); if (lg) r = { kind: 'percent', value: +lg.v || 0, min_cart: 0, stackable: 0, used: 0 }; }
    if (!r) { rejected.push({ code, reason: 'invalid' }); continue; }
    const why = await apply(code, r, false); if (why) rejected.push({ code, reason: why });
  }
  /* خصومات تلقائية: تُطبَّق بلا كود، وتخضع لنفس قاعدة الجمع، ولا تُعرض كمرفوضة */
  const autos = (await env.DB.prepare('SELECT * FROM discount_codes WHERE autoapply=1 AND active=1 ORDER BY created_at').all()).results || [];
  for (const r of autos) { if (seen.has(r.code)) continue; seen.add(r.code); await apply(r.code, r, true); }
  const ptsq = await pointsQuote(env, b.cid, +b.redeem || 0, subtotal - disc);
  const shipping = free ? 0 : fee;
  const pays = (cfg.pm && cfg.pm.length ? cfg.pm : [{ id: 'cod', on: 1 }]).filter(x => x.on !== 0).map(x => x.id);
  const pay = pays.includes(b.pay) ? b.pay : 'cod';
  return { lines, subtotal, applied, rejected, discount: disc, shipping, freeShip: free, total: subtotal - disc - ptsq.value + shipping, pay, pts: ptsq.pts, ptsValue: ptsq.value, ptsError: ptsq.error };
}

/* مسارات: /quote (عام) و /codes (أدمن) */
export async function shopRoutes(c, authed) {
  const request = c.request;
  const { env, p, M, body, url } = c;
  if (p === '/quote' && M === 'POST') {
    if (request) { const lim = await limit(c.env, request, 'quote', 120, 10 * 60e3); if (lim) return lim; }
    const b = await body(); const me = b.redeem ? await sessionCustomer(env, request) : null; const q = await quote(env, { ...b, cid: me ? me.id : 0 });
    if (q.error) return J({ error: q.error }, 400);
    return J({ subtotal: q.subtotal, applied: q.applied, rejected: q.rejected, discount: q.discount, shipping: q.shipping, freeShip: q.freeShip, total: q.total, pts: q.pts, ptsValue: q.ptsValue, ptsError: q.ptsError });
  }
  if (p === '/codes') {
    if (!authed) return J({ error: 'unauthorized' }, 401);
    if (M === 'GET') return J({ codes: (await env.DB.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC LIMIT 500').all()).results
      .map(d => ({ name: d.name || '', start: d.starts_at, maxd: d.max_disc, pc: d.per_cust, brands: d.brands ? jp(d.brands, []) : [], cats: d.cats ? jp(d.cats, []) : [], first: !!d.first_only, auto: !!d.autoapply, welcome: !!d.auto, code: d.code, kind: d.kind, value: d.value, min: d.min_cart, prods: d.product_codes ? jp(d.product_codes, []) : [], exp: d.expires_at, max: d.max_uses, used: d.used, active: !!d.active, stack: !!d.stackable, ph: d.phone || '', t: d.created_at })) });
    if (M === 'POST') {
      const b = await body(); const code = String(b.code || '').trim().toUpperCase();
      await audit(env, request, 'admin', 'code_save', code, null, { kind: b.kind, value: b.value });
      if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return J({ error: 'الكود: 3–24 حرفاً إنجليزياً/أرقاماً' }, 400);
      if (!['percent', 'amount', 'free_shipping', 'bogo', 'bundle'].includes(b.kind)) return J({ error: 'نوع غير صحيح' }, 400);
      const value = Math.max(0, Math.round(+b.value || 0));
      if ((b.kind === 'percent' || b.kind === 'bundle') && (value < 1 || value > 100)) return J({ error: 'النسبة بين 1 و100' }, 400);
      const arr = x => Array.isArray(x) && x.length ? JSON.stringify(x.map(String).slice(0, 200)) : null;
      const prods = arr(b.prods), brands = arr(b.brands), cats = arr(b.cats);
      if (b.kind === 'bundle' && !prods) return J({ error: 'خصم المجموعة يحتاج اختيار المنتجات المطلوبة' }, 400);
      if (b.kind === 'amount' && !value) return J({ error: 'أدخل قيمة الخصم' }, 400);
      if (b.start && b.exp && +b.start > +b.exp) return J({ error: 'تاريخ البداية بعد النهاية' }, 400);
      const n = (x, m = 1) => (+x >= m ? Math.round(+x) : null), nm = String(b.name || '').trim().slice(0, 80) || null;
      await env.DB.prepare(`INSERT INTO discount_codes(code,kind,value,min_cart,product_codes,expires_at,max_uses,active,stackable,phone,created_at,name,starts_at,max_disc,per_cust,brands,cats,first_only,autoapply) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(code) DO UPDATE SET kind=excluded.kind,value=excluded.value,min_cart=excluded.min_cart,product_codes=excluded.product_codes,expires_at=excluded.expires_at,max_uses=excluded.max_uses,active=excluded.active,stackable=excluded.stackable,phone=excluded.phone,name=excluded.name,starts_at=excluded.starts_at,max_disc=excluded.max_disc,per_cust=excluded.per_cust,brands=excluded.brands,cats=excluded.cats,first_only=excluded.first_only,autoapply=excluded.autoapply`)
        .bind(code, b.kind, value, Math.max(0, Math.round(+b.min || 0)), prods, b.exp ? +b.exp : null, b.max ? +b.max : null, b.active === false ? 0 : 1, b.stack ? 1 : 0, b.ph || null, now(), nm, b.start ? +b.start : null, n(b.maxd), n(b.pc), brands, cats, b.first ? 1 : 0, b.auto ? 1 : 0).run();
      return J({ ok: true, code });
    }
    if (M === 'DELETE') { await audit(env, request, 'admin', 'code_delete', url.searchParams.get('code') || ''); await env.DB.prepare('DELETE FROM discount_codes WHERE code=?').bind((url.searchParams.get('code') || '').toUpperCase()).run(); return J({ ok: true }); }
  }
  return null;
}
