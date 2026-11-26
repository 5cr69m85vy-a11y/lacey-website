/* account2.js — مركز حساب العميل: صورة، مفضلة، عناوين، تقييمات المنتجات (مع إدارة التقييمات). */
import { J, now, jp, randHex } from './lib.js';
import { hit, audit, ipOf } from './guard.js';
import { sessionCustomer } from './auth.js';

const PHOTO_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 }, MAX_PHOTO = 300 * 1024;
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
export const photoUrl = (row) => row ? `/cphoto/${row.key}?v=${row.updated_at}` : '';

export async function accountSummary(env, cid) {
  const q = async (sql) => (await env.DB.prepare(sql).bind(cid).first()).n;
  return { reviews: await q('SELECT COUNT(*) n FROM product_reviews WHERE customer_id=?'), wishlist: await q('SELECT COUNT(*) n FROM wishlist WHERE customer_id=?'), orders: await q('SELECT COUNT(*) n FROM orders WHERE customer_id=? AND cust_hidden=0'), addresses: await q('SELECT COUNT(*) n FROM addresses WHERE customer_id=?') };
}

export async function accountRoutes({ env, request, p, M, body, authed, url }) {
  /* صورة العميل: عامة بمفتاح عشوائي غير قابل للتخمين */
  if (p.startsWith('/cphoto/') && M === 'GET') {
    const key = p.slice(8); if (!/^[a-f0-9]{24}$/.test(key)) return J({ error: 'not found' }, 404);
    const r = await env.DB.prepare('SELECT type,data FROM customer_photos WHERE key=?').bind(key).first(); if (!r) return J({ error: 'not found' }, 404);
    const bin = Uint8Array.from(atob(r.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': r.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  }
  /* تقييمات معتمدة لمنتج (عام) */
  if (p === '/reviews' && M === 'GET') {
    if (!(await hit(env, 'rvw:' + ipOf(request), 120, 600e3))) return J({ error: 'محاولات كثيرة' }, 429);
    const code = clip(url.searchParams.get('code'), 60); if (!code) return J({ error: 'code' }, 400);
    const rows = (await env.DB.prepare(`SELECT r.rating,r.comment,r.reply,r.created_at,c.name FROM product_reviews r JOIN customers c ON c.id=r.customer_id WHERE r.product_code=? AND r.status='approved' ORDER BY r.id DESC LIMIT 30`).bind(code).all()).results;
    const avg = rows.length ? Math.round(rows.reduce((a, x) => a + x.rating, 0) / rows.length * 10) / 10 : 0;
    return J({ n: rows.length, avg, items: rows.map(x => ({ rating: x.rating, comment: x.comment, reply: x.reply, at: x.created_at, name: String(x.name || '').split(' ')[0] || '—' })) });
  }
  /* إدارة التقييمات (المدير) */
  if (p.startsWith('/adm/reviews')) {
    if (!authed) return J({ error: 'unauthorized' }, 401);
    if (p === '/adm/reviews' && M === 'GET') {
      const st = url.searchParams.get('status') || '';
      const rows = (await env.DB.prepare(`SELECT r.*, c.name, c.phone FROM product_reviews r LEFT JOIN customers c ON c.id=r.customer_id ${['pending', 'approved', 'hidden'].includes(st) ? 'WHERE r.status=?' : ''} ORDER BY r.id DESC LIMIT 200`).bind(...(['pending', 'approved', 'hidden'].includes(st) ? [st] : [])).all()).results;
      return J({ items: rows });
    }
    if (p === '/adm/reviews' && M === 'POST') {
      const b = await body(), id = +b.id, st = String(b.status || '');
      if (!id || !['pending', 'approved', 'hidden'].includes(st)) return J({ error: 'بيانات غير صحيحة' }, 400);
      const old = await env.DB.prepare('SELECT status,reply FROM product_reviews WHERE id=?').bind(id).first(); if (!old) return J({ error: 'غير موجود' }, 404);
      await env.DB.prepare('UPDATE product_reviews SET status=?, reply=?, updated_at=? WHERE id=?').bind(st, b.reply !== undefined ? clip(b.reply, 500) : old.reply, now(), id).run();
      await audit(env, request, 'admin', 'review_' + st, String(id), { status: old.status }, { status: st });
      return J({ ok: true });
    }
    return null;
  }
  if (!p.startsWith('/me/')) return null;
  const me = await sessionCustomer(env, request); if (!me) return null;      // بقية المسارات تتولاها auth.js
  const cid = me.id;

  if (p === '/me/summary' && M === 'GET') return J(await accountSummary(env, cid));

  if (p === '/me/photo' && M === 'POST') {
    if (!(await hit(env, 'phot:' + cid, 10, 3600e3))) return J({ error: 'محاولات كثيرة، حاول لاحقاً' }, 429);
    const type = (request.headers.get('content-type') || '').split(';')[0];
    if (!PHOTO_TYPES[type]) return J({ error: 'الصيغة المدعومة: JPG أو PNG أو WebP' }, 415);
    const buf = await request.arrayBuffer(); if (!buf.byteLength || buf.byteLength > MAX_PHOTO) return J({ error: 'حجم الصورة يجب أن يكون أقل من 300KB' }, 413);
    const u = new Uint8Array(buf);
    const sig = (type === 'image/jpeg' && u[0] === 0xFF && u[1] === 0xD8) || (type === 'image/png' && u[0] === 0x89 && u[1] === 0x50) || (type === 'image/webp' && u[8] === 0x57 && u[9] === 0x45);
    if (!sig) return J({ error: 'الملف ليس صورة صالحة' }, 400);
    let bin = ''; for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
    const key = randHex(12), t = now();
    await env.DB.batch([env.DB.prepare('INSERT INTO customer_photos(customer_id,key,type,data,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET key=excluded.key,type=excluded.type,data=excluded.data,updated_at=excluded.updated_at').bind(cid, key, type, btoa(bin), t), env.DB.prepare('UPDATE customers SET photo_key=?,photo_at=? WHERE id=?').bind(key, t, cid)]);
    return J({ ok: true, photo: photoUrl({ key, updated_at: t }) });
  }
  if (p === '/me/photo' && M === 'DELETE') { await env.DB.batch([env.DB.prepare('DELETE FROM customer_photos WHERE customer_id=?').bind(cid), env.DB.prepare('UPDATE customers SET photo_key=NULL,photo_at=NULL WHERE id=?').bind(cid)]); return J({ ok: true }); }

  if (p === '/me/wish' && M === 'GET') return J({ codes: (await env.DB.prepare('SELECT product_code c FROM wishlist WHERE customer_id=? ORDER BY at DESC').bind(cid).all()).results.map(r => r.c) });
  if (p === '/me/wish' && M === 'POST') {            // {add:[..], remove:[..]} — دمج، لا استبدال
    const b = await body(), add = [].concat(b.add || []).map(x => clip(x, 60)).filter(Boolean).slice(0, 200), rm = [].concat(b.remove || []).map(x => clip(x, 60)).filter(Boolean).slice(0, 200);
    const st = [...add.map(c => env.DB.prepare('INSERT OR IGNORE INTO wishlist(customer_id,product_code,at) VALUES(?,?,?)').bind(cid, c, now())), ...rm.map(c => env.DB.prepare('DELETE FROM wishlist WHERE customer_id=? AND product_code=?').bind(cid, c))];
    for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
    return J({ codes: (await env.DB.prepare('SELECT product_code c FROM wishlist WHERE customer_id=? ORDER BY at DESC').bind(cid).all()).results.map(r => r.c) });
  }

  if (p === '/me/addr' && M === 'GET') return J({ items: (await env.DB.prepare('SELECT id,label,city,area,landmark,is_default FROM addresses WHERE customer_id=? ORDER BY is_default DESC,id DESC').bind(cid).all()).results });
  if (p === '/me/addr' && M === 'POST') {
    const b = await body(), city = clip(b.city, 80), area = clip(b.area, 120), lm = clip(b.lm, 160), label = clip(b.label, 40);
    if (!city || !area) return J({ error: 'المحافظة والمنطقة مطلوبتان' }, 400);
    if ((await env.DB.prepare('SELECT COUNT(*) n FROM addresses WHERE customer_id=?').bind(cid).first()).n >= 10) return J({ error: 'الحد الأقصى 10 عناوين' }, 400);
    const first = !(await env.DB.prepare('SELECT 1 x FROM addresses WHERE customer_id=?').bind(cid).first());
    const id = (await env.DB.prepare('INSERT INTO addresses(customer_id,label,city,area,landmark,is_default,created_at) VALUES(?,?,?,?,?,?,?) RETURNING id').bind(cid, label, city, area, lm, first ? 1 : 0, now()).first()).id;
    if (first) await env.DB.prepare('UPDATE customers SET city=?,area=?,landmark=? WHERE id=?').bind(city, area, lm, cid).run();
    return J({ ok: true, id });
  }
  if (p === '/me/addr/default' && M === 'POST') {
    const b = await body(), a = await env.DB.prepare('SELECT * FROM addresses WHERE id=? AND customer_id=?').bind(+b.id, cid).first(); if (!a) return J({ error: 'غير موجود' }, 404);
    await env.DB.batch([env.DB.prepare('UPDATE addresses SET is_default=0 WHERE customer_id=?').bind(cid), env.DB.prepare('UPDATE addresses SET is_default=1 WHERE id=?').bind(a.id), env.DB.prepare('UPDATE customers SET city=?,area=?,landmark=? WHERE id=?').bind(a.city, a.area, a.landmark, cid)]);
    return J({ ok: true });
  }
  if (p === '/me/addr' && M === 'DELETE') {
    const id = +url.searchParams.get('id'), a = await env.DB.prepare('SELECT is_default FROM addresses WHERE id=? AND customer_id=?').bind(id, cid).first(); if (!a) return J({ error: 'غير موجود' }, 404);
    await env.DB.prepare('DELETE FROM addresses WHERE id=? AND customer_id=?').bind(id, cid).run();
    if (a.is_default) { const n = await env.DB.prepare('SELECT * FROM addresses WHERE customer_id=? ORDER BY id DESC LIMIT 1').bind(cid).first(); if (n) await env.DB.batch([env.DB.prepare('UPDATE addresses SET is_default=1 WHERE id=?').bind(n.id), env.DB.prepare('UPDATE customers SET city=?,area=?,landmark=? WHERE id=?').bind(n.city, n.area, n.landmark, cid)]); }
    return J({ ok: true });
  }

  if (p === '/me/reviews' && M === 'GET') {
    const items = (await env.DB.prepare('SELECT id,product_code,rating,comment,status,reply,created_at FROM product_reviews WHERE customer_id=? ORDER BY id DESC').bind(cid).all()).results;
    // منتجات تسلّمها العميل ولم يقيّمها بعد
    const od = (await env.DB.prepare('SELECT code,items FROM orders WHERE customer_id=? AND status=5 ORDER BY created_at DESC LIMIT 60').bind(cid).all()).results, done = new Set(items.map(i => i.product_code)), todo = new Map();
    for (const o of od) for (const i of jp(o.items, [])) if (!done.has(i.c) && !todo.has(i.c)) todo.set(i.c, { code: i.c, name: i.n || i.c, order: o.code });
    return J({ items, todo: [...todo.values()].slice(0, 20) });
  }
  if (p === '/me/reviews' && M === 'POST') {
    if (!(await hit(env, 'rev:' + cid, 20, 3600e3))) return J({ error: 'محاولات كثيرة' }, 429);
    const b = await body(), code = clip(b.code, 60), rating = Math.round(+b.rating), comment = clip(b.comment, 600);
    if (!code || !(rating >= 1 && rating <= 5)) return J({ error: 'اختر تقييماً من 1 إلى 5' }, 400);
    const od = (await env.DB.prepare('SELECT code,items FROM orders WHERE customer_id=? AND status=5').bind(cid).all()).results;
    const ord = od.find(o => jp(o.items, []).some(i => i.c === code)); if (!ord) return J({ error: 'يمكن تقييم منتج استلمته فقط' }, 403);
    const t = now(), ex = await env.DB.prepare('SELECT id FROM product_reviews WHERE customer_id=? AND product_code=?').bind(cid, code).first();
    if (ex) { await env.DB.prepare("UPDATE product_reviews SET rating=?,comment=?,status='pending',updated_at=? WHERE id=?").bind(rating, comment, t, ex.id).run(); return J({ ok: true, updated: true }); }
    await env.DB.prepare('INSERT INTO product_reviews(customer_id,product_code,order_code,rating,comment,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(cid, code, ord.code, rating, comment, t, t).run();
    return J({ ok: true });
  }
  return null;
}
