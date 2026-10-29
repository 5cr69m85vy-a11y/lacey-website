/* auth.js — حسابات الزبائن: هاتف (OTP واتساب) · بريد+كلمة سر · Google */
import { J, now, jp, rnd, sha256, hex, randHex } from './lib.js';
import { waOn, processQueue } from './wa.js';

const SESSION_MS = 90 * 864e5;
const OTP_MS = 10 * 60 * 1000;
const PHONE = /^07\d{9}$/, EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function pbkdf2(pw, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
}
export const eq = (a, b) => { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };

export async function newSession(env, cid) {
  const tok = 'c.' + randHex(32);
  await env.DB.prepare('INSERT INTO sessions(token_hash,customer_id,created_at,expires_at) VALUES(?,?,?,?)')
    .bind(await sha256(tok), cid, now(), now() + SESSION_MS).run();
  return tok;
}
export async function sessionCustomer(env, request) {
  const t = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t.startsWith('c.')) return null;
  const row = await env.DB.prepare('SELECT c.* FROM sessions s JOIN customers c ON c.id=s.customer_id WHERE s.token_hash=? AND s.expires_at>?')
    .bind(await sha256(t), now()).first();
  if (row) env.DB.prepare('UPDATE customers SET last_seen_at=? WHERE id=?').bind(now(), row.id).run().catch(() => {});
  return row || null;
}
const pub = c => ({ id: c.id, name: c.name, ph: c.phone || '', email: c.email || '', city: c.city, area: c.area, lm: c.landmark, wa: !!c.wa_verified, pw: !!c.pw_hash, google: !!c.google_sub, orders: c.orders_count });

async function welcomeOnce(env, c, origin, ctx) {
  if (c.welcomed || !c.phone) return;
  await env.DB.batch([
    env.DB.prepare('UPDATE customers SET welcomed=1 WHERE id=?').bind(c.id),
    env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'whatsapp','welcome',?,'queued',?)")
      .bind(c.id, c.phone, JSON.stringify({ name: c.name, link: env.STORE_URL || origin }), now()),
  ]);
  if (ctx && ctx.waitUntil) ctx.waitUntil(processQueue(env, 5)); else await processQueue(env, 5);
}

/* دمج حساب بلا هاتف مع صاحب الرقم (أنشأته طلبات سابقة) */
async function attachPhone(env, cur, phone, name) {
  const other = await env.DB.prepare('SELECT * FROM customers WHERE phone=?').bind(phone).first();
  if (!other) {
    await env.DB.prepare('UPDATE customers SET phone=?,wa_verified=1,name=CASE WHEN name=\'\' THEN ? ELSE name END WHERE id=?').bind(phone, name, cur.id).run();
    return cur.id;
  }
  if (other.id === cur.id) { await env.DB.prepare('UPDATE customers SET wa_verified=1 WHERE id=?').bind(cur.id).run(); return cur.id; }
  if (other.email || other.google_sub) return 0;                 // الرقم مرتبط بحساب آخر
  await env.DB.batch([                                          // نقل بيانات الدخول إلى حساب الرقم ثم حذف الفارغ
    env.DB.prepare('UPDATE customers SET email=NULL,google_sub=NULL WHERE id=?').bind(cur.id),
    env.DB.prepare('UPDATE customers SET email=?,google_sub=?,pw_hash=?,pw_salt=?,wa_verified=1,welcomed=? WHERE id=?')
      .bind(cur.email, cur.google_sub, cur.pw_hash, cur.pw_salt, cur.welcomed, other.id),
    env.DB.prepare('DELETE FROM sessions WHERE customer_id=?').bind(cur.id),
    env.DB.prepare('DELETE FROM customers WHERE id=?').bind(cur.id),
  ]);
  return other.id;
}

export async function authRoutes(c) {
  const { env, request, url, p, M, body, ctx } = c;
  if (!p.startsWith('/auth/') && !p.startsWith('/me')) return null;
  const origin = url.origin;
  const done = async (id, extra = {}) => {
    const row = await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(id).first();
    await welcomeOnce(env, row, origin, ctx);
    const fresh = await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(id).first();
    return J({ token: await newSession(env, id), customer: pub(fresh), ...extra });
  };

  /* --- OTP عبر واتساب --- */
  if (p === '/auth/otp/send' && M === 'POST') {
    const { ph } = await body();
    if (!PHONE.test(String(ph || ''))) return J({ error: 'رقم الهاتف غير صحيح' }, 400);
    if (!waOn(env) && env.WA_DEV !== '1') return J({ error: 'واتساب غير مُفعّل بعد' }, 503);
    const recent = await env.DB.prepare('SELECT COUNT(*) n FROM otp_codes WHERE phone=? AND created_at>?').bind(ph, now() - OTP_MS).first();
    if (recent.n >= 3) return J({ error: 'محاولات كثيرة، انتظر بضع دقائق' }, 429);
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await env.DB.prepare('INSERT INTO otp_codes(phone,code_hash,expires_at,created_at) VALUES(?,?,?,?)')
      .bind(ph, await sha256(ph + ':' + code), now() + OTP_MS, now()).run();
    if (env.WA_DEV === '1' && !waOn(env)) return J({ ok: true, dev: code });   // للاختبار المحلي فقط
    const { waSend } = await import('./wa.js');
    const r = await waSend(env, ph, 'otp', [code], `رمز التحقق من لاسي: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`);
    if (!r.ok) return J({ error: 'تعذر إرسال الرمز عبر واتساب' }, 502);
    return J({ ok: true });
  }
  if (p === '/auth/otp/verify' && M === 'POST') {
    const { ph, code, name } = await body();
    if (!PHONE.test(String(ph || '')) || !/^\d{6}$/.test(String(code || ''))) return J({ error: 'رمز غير صحيح' }, 400);
    const o = await env.DB.prepare('SELECT * FROM otp_codes WHERE phone=? AND expires_at>? ORDER BY id DESC LIMIT 1').bind(ph, now()).first();
    if (!o || o.attempts >= 5) return J({ error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' }, 410);
    if (!eq(o.code_hash, await sha256(ph + ':' + code))) {
      await env.DB.prepare('UPDATE otp_codes SET attempts=attempts+1 WHERE id=?').bind(o.id).run();
      return J({ error: 'الرمز غير صحيح' }, 401);
    }
    await env.DB.prepare('DELETE FROM otp_codes WHERE phone=?').bind(ph).run();
    const nm = String(name || '').trim().slice(0, 80);
    const cur = await sessionCustomer(env, request);
    let id;
    if (cur && !cur.phone) {
      id = await attachPhone(env, cur, ph, nm);
      if (!id) return J({ error: 'هذا الرقم مرتبط بحساب آخر' }, 409);
    } else {
      const ex = await env.DB.prepare('SELECT id FROM customers WHERE phone=?').bind(ph).first();
      if (ex) { id = ex.id; await env.DB.prepare("UPDATE customers SET wa_verified=1,name=CASE WHEN name='' THEN ? ELSE name END WHERE id=?").bind(nm, id).run(); }
      else id = (await env.DB.prepare('INSERT INTO customers(phone,name,wa_verified,created_at,last_seen_at) VALUES(?,?,1,?,?) RETURNING id').bind(ph, nm, now(), now()).first()).id;
    }
    return done(id);
  }

  /* --- بريد + كلمة سر --- */
  if (p === '/auth/register' && M === 'POST') {
    const b = await body();
    const email = String(b.email || '').trim().toLowerCase(), name = String(b.name || '').trim().slice(0, 80), pw = String(b.pw || '');
    if (!EMAIL.test(email)) return J({ error: 'البريد الإلكتروني غير صحيح' }, 400);
    if (pw.length < 8) return J({ error: 'كلمة السر 8 أحرف على الأقل' }, 400);
    if (name.length < 2) return J({ error: 'الاسم مطلوب' }, 400);
    if (await env.DB.prepare('SELECT 1 x FROM customers WHERE email=?').bind(email).first()) return J({ error: 'هذا البريد مسجّل مسبقاً' }, 409);
    const salt = randHex(16), h = await pbkdf2(pw, salt);
    const id = (await env.DB.prepare('INSERT INTO customers(email,name,pw_hash,pw_salt,created_at,last_seen_at) VALUES(?,?,?,?,?,?) RETURNING id').bind(email, name, h, salt, now(), now()).first()).id;
    return done(id);
  }
  if (p === '/auth/login' && M === 'POST') {
    const b = await body();
    const row = await env.DB.prepare('SELECT * FROM customers WHERE email=?').bind(String(b.email || '').trim().toLowerCase()).first();
    const salt = row && row.pw_salt || '00'.repeat(16);
    const h = await pbkdf2(String(b.pw || ''), salt);
    if (!row || !row.pw_hash || !eq(h, row.pw_hash)) return J({ error: 'البريد أو كلمة السر غير صحيحة' }, 401);
    return done(row.id);
  }

  /* --- Google --- */
  if (p === '/auth/google' && M === 'POST') {
    if (!env.GOOGLE_CLIENT_ID) return J({ error: 'Google غير مُفعّل بعد' }, 503);
    const { credential } = await body();
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(credential || '')));
    const g = r.ok ? await r.json() : null;
    if (!g || g.aud !== env.GOOGLE_CLIENT_ID || g.email_verified !== 'true' && g.email_verified !== true) return J({ error: 'تعذر التحقق من حساب Google' }, 401);
    const email = String(g.email || '').toLowerCase();
    let row = await env.DB.prepare('SELECT * FROM customers WHERE google_sub=?').bind(g.sub).first()
      || await env.DB.prepare('SELECT * FROM customers WHERE email=?').bind(email).first();
    if (row) await env.DB.prepare('UPDATE customers SET google_sub=?,email=COALESCE(email,?) WHERE id=?').bind(g.sub, email, row.id).run();
    else row = await env.DB.prepare('INSERT INTO customers(email,google_sub,name,created_at,last_seen_at) VALUES(?,?,?,?,?) RETURNING id').bind(email, g.sub, String(g.name || '').slice(0, 80), now(), now()).first();
    return done(row.id);
  }
  if (p === '/auth/logout' && M === 'POST') {
    const t = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (t.startsWith('c.')) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(t)).run();
    return J({ ok: true });
  }
  if (p === '/auth/config' && M === 'GET') return J({ google: env.GOOGLE_CLIENT_ID || '', wa: waOn(env) || env.WA_DEV === '1' });

  /* --- الحساب --- */
  if (p.startsWith('/me')) {
    const me = await sessionCustomer(env, request);
    if (!me) return J({ error: 'unauthorized' }, 401);
    if (p === '/me' && M === 'GET') return J({ customer: pub(me) });
    if (p === '/me' && M === 'POST') {
      const b = await body();
      await env.DB.prepare('UPDATE customers SET name=?,city=?,area=?,landmark=? WHERE id=?')
        .bind(String(b.name ?? me.name).slice(0, 80), String(b.city ?? me.city).slice(0, 80), String(b.area ?? me.area).slice(0, 120), String(b.lm ?? me.landmark).slice(0, 160), me.id).run();
      return J({ ok: true });
    }
    if (p === '/me/orders' && M === 'GET') {
      const rows = (await env.DB.prepare('SELECT o.*, r.number rnum FROM orders o LEFT JOIN receipts r ON r.order_code=o.code WHERE o.customer_id=? ORDER BY o.created_at DESC LIMIT 100').bind(me.id).all()).results;
      return J({ orders: rows.map(o => ({ code: o.code, id: o.id, s: o.status, total: o.total, discount: o.discount, pay: o.pay_method, t: o.created_at, items: jp(o.items, []), receipt: o.rnum || '' })) });
    }
    if (p === '/me/receipts' && M === 'GET') {
      const rows = (await env.DB.prepare('SELECT r.* FROM receipts r JOIN orders o ON o.code=r.order_code WHERE o.customer_id=? ORDER BY r.issued_at DESC LIMIT 100').bind(me.id).all()).results;
      return J({ receipts: rows.map(r => ({ number: r.number, code: r.order_code, t: r.issued_at, ...jp(r.data, {}) })) });
    }
    if (p === '/me/notifications' && M === 'GET') {
      const rows = (await env.DB.prepare('SELECT * FROM notifications WHERE customer_id=? ORDER BY id DESC LIMIT 50').bind(me.id).all()).results;
      const txt = r => { const d = jp(r.payload, {}); return r.template === 'order_received' ? `تم استلام طلبك ${d.code}` : r.template === 'order_status' ? `${d.code}: ${d.text}` : r.template === 'welcome' ? 'أهلاً بك في لاسي 🌸' : r.template === 'chat_reply' ? `${d.name}: ${d.text}` : d.text || ''; };
      return J({ items: rows.filter(r => r.template !== 'otp').map(r => ({ t: r.created_at, text: txt(r), tpl: r.template })) });
    }
  }
  return null;
}
