/* shop.js — تسعير السلة على الخادم: منتجات + بوكسات + أكواد خصم متعددة + توصيل مجاني */
import { J, now, jp, cfgOf } from './lib.js';

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
    if (row) lines.push({ c: code, n: row.name, cc: String(jp(row.data, {}).cc || ''), q, p: row.price });
    else if (nProducts === 0 && +it.p >= 0) lines.push({ c: code, n: String(it.n || code).slice(0, 120), cc: '', q, p: Math.round(+it.p) });
    else return { error: `المنتج ${code} غير متاح` };
  }
  return { lines };
}

export async function quote(env, b) {
  const pr = await priceLines(env, b.items);
  if (pr.error) return { error: pr.error };
  const lines = pr.lines, subtotal = lines.reduce((a, l) => a + l.p * l.q, 0);
  const cfg = await cfgOf(env), fee = Math.max(0, Math.round(+cfg.sf || 0)), phone = String(b.ph || '');
  const applied = [], rejected = [], seen = new Set();
  let disc = 0, free = false;
  for (const raw of [].concat(b.codes || []).slice(0, 8)) {
    const code = String(raw || '').trim().toUpperCase();
    if (!code || seen.has(code)) continue; seen.add(code);
    let r = await env.DB.prepare('SELECT * FROM discount_codes WHERE code=? AND active=1').bind(code).first();
    if (!r) { const lg = (cfg.C || []).find(x => String(x.c).toUpperCase() === code); if (lg) r = { kind: 'percent', value: +lg.v || 0, min_cart: 0, stackable: 0, used: 0 }; }
    const rej = reason => rejected.push({ code, reason });
    if (!r) { rej('invalid'); continue; }
    if (r.expires_at && r.expires_at < now()) { rej('expired'); continue; }
    if (r.max_uses && r.used >= r.max_uses) { rej('used_up'); continue; }
    if (r.phone && phone && r.phone !== phone) { rej('not_yours'); continue; }
    if (subtotal < (r.min_cart || 0)) { rej('min_cart'); continue; }
    const allow = r.product_codes ? jp(r.product_codes, []) : null;
    const base = lines.filter(l => !allow || allow.includes(l.c)).reduce((a, l) => a + l.p * l.q, 0);
    if (allow && !base) { rej('not_applicable'); continue; }
    if (r.kind === 'free_shipping') { free = true; applied.push({ code, kind: r.kind, value: 0, amount: fee }); continue; }
    const money = applied.filter(a => a.kind !== 'free_shipping');
    if (money.length && !(r.stackable && money.every(a => a.stackable))) { rej('not_stackable'); continue; }
    let amt = r.kind === 'amount' ? Math.round(r.value) : Math.round(base * Math.min(100, r.value) / 100);
    amt = Math.max(0, Math.min(amt, base, subtotal - disc));
    disc += amt; applied.push({ code, kind: r.kind, value: r.value, amount: amt, stackable: !!r.stackable });
  }
  const shipping = free ? 0 : fee;
  const pays = (cfg.pm && cfg.pm.length ? cfg.pm : [{ id: 'cod', on: 1 }]).filter(x => x.on !== 0).map(x => x.id);
  const pay = pays.includes(b.pay) ? b.pay : 'cod';
  return { lines, subtotal, applied, rejected, discount: disc, shipping, freeShip: free, total: subtotal - disc + shipping, pay };
}

/* مسارات: /quote (عام) و /codes (أدمن) */
export async function shopRoutes(c, authed) {
  const { env, p, M, body, url } = c;
  if (p === '/quote' && M === 'POST') {
    const b = await body(); const q = await quote(env, b);
    if (q.error) return J({ error: q.error }, 400);
    return J({ subtotal: q.subtotal, applied: q.applied, rejected: q.rejected, discount: q.discount, shipping: q.shipping, freeShip: q.freeShip, total: q.total });
  }
  if (p === '/codes') {
    if (!authed) return J({ error: 'unauthorized' }, 401);
    if (M === 'GET') return J({ codes: (await env.DB.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC LIMIT 500').all()).results
      .map(d => ({ code: d.code, kind: d.kind, value: d.value, min: d.min_cart, prods: d.product_codes ? jp(d.product_codes, []) : [], exp: d.expires_at, max: d.max_uses, used: d.used, active: !!d.active, stack: !!d.stackable, ph: d.phone || '', t: d.created_at })) });
    if (M === 'POST') {
      const b = await body(); const code = String(b.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return J({ error: 'الكود: 3–24 حرفاً إنجليزياً/أرقاماً' }, 400);
      if (!['percent', 'amount', 'free_shipping'].includes(b.kind)) return J({ error: 'نوع غير صحيح' }, 400);
      const value = Math.max(0, Math.round(+b.value || 0));
      if (b.kind === 'percent' && (value < 1 || value > 100)) return J({ error: 'النسبة بين 1 و100' }, 400);
      const prods = Array.isArray(b.prods) && b.prods.length ? JSON.stringify(b.prods.map(String).slice(0, 200)) : null;
      await env.DB.prepare(`INSERT INTO discount_codes(code,kind,value,min_cart,product_codes,expires_at,max_uses,active,stackable,phone,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(code) DO UPDATE SET kind=excluded.kind,value=excluded.value,min_cart=excluded.min_cart,product_codes=excluded.product_codes,expires_at=excluded.expires_at,max_uses=excluded.max_uses,active=excluded.active,stackable=excluded.stackable,phone=excluded.phone`)
        .bind(code, b.kind, value, Math.max(0, Math.round(+b.min || 0)), prods, b.exp ? +b.exp : null, b.max ? +b.max : null, b.active === false ? 0 : 1, b.stack ? 1 : 0, b.ph || null, now()).run();
      return J({ ok: true, code });
    }
    if (M === 'DELETE') { await env.DB.prepare('DELETE FROM discount_codes WHERE code=?').bind((url.searchParams.get('code') || '').toUpperCase()).run(); return J({ ok: true }); }
  }
  return null;
}
