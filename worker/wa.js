/* wa.js — واتساب Cloud API الرسمي + طابور الإشعارات
   الأسرار: WA_TOKEN (توكن دائم)، WA_PHONE_ID (معرّف رقم الهاتف)
   اختياري: WA_LANG (افتراضي ar) و قوالب معتمدة من Meta:
     WA_TPL_OTP, WA_TPL_WELCOME, WA_TPL_ORDER, WA_TPL_PROMO
   بدون قالب: تُرسل رسالة نصية عادية (تعمل فقط خلال 24 ساعة من آخر رسالة من الزبون).
   متغيرات القوالب بالترتيب:
     OTP [code] · WELCOME [name, storeLink] · ORDER [orderCode, statusText] · PROMO [text]  */
import { now, jp } from './lib.js';

export const waOn = env => !!(env.WA_TOKEN && env.WA_PHONE_ID);
export const intl = ph => {                 // 07701234567 → 9647701234567
  const d = String(ph || '').replace(/\D/g, '');
  if (/^07\d{9}$/.test(d)) return '964' + d.slice(1);
  return d;
};
const TPL = { otp: 'WA_TPL_OTP', welcome: 'WA_TPL_WELCOME', order: 'WA_TPL_ORDER', promo: 'WA_TPL_PROMO' };

export async function waSend(env, phone, kind, vars, text) {
  if (!waOn(env)) return { ok: false, error: 'wa_not_configured' };
  const to = intl(phone);
  if (!to) return { ok: false, error: 'bad_phone' };
  const tpl = env[TPL[kind]];
  const msg = tpl
    ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl, language: { code: env.WA_LANG || 'ar' },
        components: [{ type: 'body', parameters: vars.map(v => ({ type: 'text', text: String(v).slice(0, 1000) })) }] } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${env.WA_PHONE_ID}/messages`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
    });
    if (r.ok) return { ok: true };
    let e = ''; try { e = (await r.json()).error.message; } catch (_) {}
    return { ok: false, error: ('wa ' + r.status + ' ' + e).slice(0, 300) };
  } catch (e) { return { ok: false, error: 'network' }; }
}

export const storeLink = env => env.STORE_URL || '';
const TEXTS = {
  otp: p => ({ vars: [p.code], text: `رمز التحقق من لاسي: ${p.code}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.` }),
  welcome: (p, env) => ({ vars: [p.name || '', p.link || storeLink(env)], text: `أهلاً ${p.name || ''} 🌸\nتم إنشاء حسابك في لاسي للعناية بالبشرة.\nتسوّق الآن: ${p.link || storeLink(env)}` }),
  order_received: p => ({ kind: 'order', vars: [p.code, 'تم استلام طلبك'], text: `تم استلام طلبك ${p.code} 🌸\nالمجموع: ${Number(p.total || 0).toLocaleString('en-US')} د.ع\nيمكنك إلغاؤه خلال 10 دقائق من صفحة تتبع الطلب.` }),
  order_status: p => ({ kind: 'order', vars: [p.code, p.text], text: `طلبك ${p.code}: ${p.text}` }),
  promo: p => ({ vars: [p.text], text: p.text }),
};

/* إرسال الطابور (يُستدعى من Cron ومن ctx.waitUntil). يعيد عدد المرسل */
export async function processQueue(env, limit = 25) {
  if (!waOn(env)) {            // لا نرسل؛ ننهي القديم (>24س) كي لا يتراكم
    await env.DB.prepare("UPDATE notifications SET status='skipped',error='wa_not_configured' WHERE status='queued' AND channel='whatsapp' AND created_at<?").bind(now() - 864e5).run();
    return 0;
  }
  const rows = (await env.DB.prepare("SELECT * FROM notifications WHERE status='queued' AND channel='whatsapp' ORDER BY id LIMIT ?").bind(limit).all()).results;
  let n = 0;
  for (const r of rows) {
    await env.DB.prepare("UPDATE notifications SET status='sending' WHERE id=? AND status='queued'").bind(r.id).run();
    const f = TEXTS[r.template];
    if (!f || !r.phone) { await env.DB.prepare("UPDATE notifications SET status='skipped',error='bad_template' WHERE id=?").bind(r.id).run(); continue; }
    const m = f(jp(r.payload, {}), env);
    const res = await waSend(env, r.phone, m.kind || r.template, m.vars, m.text);
    await env.DB.prepare('UPDATE notifications SET status=?,error=?,sent_at=? WHERE id=?')
      .bind(res.ok ? 'sent' : 'failed', res.ok ? '' : res.error, now(), r.id).run();
    if (res.ok) n++;
  }
  return n;
}
