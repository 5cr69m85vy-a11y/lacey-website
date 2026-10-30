/* guard.js — حدود المحاولات (D1) + سجل التدقيق + أدوات أمان مشتركة */
import { J, now } from './lib.js';

export const ipOf = request => request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';

/* يعيد true إن كان مسموحاً. نافذة ثابتة: max محاولات خلال winMs */
export async function hit(env, key, max, winMs) {
  max *= Number(env.RL_SCALE) || 1;
  const t = now();
  const r = await env.DB.prepare(
    'INSERT INTO rate_limits(k,n,reset_at) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=CASE WHEN reset_at<? THEN 1 ELSE n+1 END, reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END RETURNING n'
  ).bind(key, t + winMs, t, t, t + winMs).first();
  return r.n <= max;
}
export const tooMany = (msg = 'محاولات كثيرة، حاول لاحقاً') => J({ error: msg }, 429, { 'Retry-After': '60' });

/* مصفاة: تُرجع Response 429 أو null */
export async function limit(env, request, name, max, winMs, extra = '') {
  return (await hit(env, `${name}:${ipOf(request)}${extra ? ':' + extra : ''}`, max, winMs)) ? null : tooMany();
}

export async function audit(env, request, actor, action, entity = '', before = null, after = null) {
  try {
    const cut = v => v == null ? null : String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 2000);
    await env.DB.prepare('INSERT INTO audit_log(at,actor,action,entity,before,after,ip) VALUES(?,?,?,?,?,?,?)')
      .bind(now(), String(actor).slice(0, 60), action, String(entity).slice(0, 120), cut(before), cut(after), request ? ipOf(request).slice(0, 60) : '').run();
  } catch (e) { /* التدقيق لا يكسر الطلب */ }
}

/* تنظيف دوري */
export async function gc(env) {
  const t = now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_limits WHERE reset_at<?').bind(t),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(t),
    env.DB.prepare('DELETE FROM staff_sessions WHERE expires_at<?').bind(t),
    env.DB.prepare('DELETE FROM otp_codes WHERE expires_at<?').bind(t),
    env.DB.prepare('DELETE FROM audit_log WHERE at<?').bind(t - 180 * 864e5),
  ]);
}
