/* ============================================================
   worker.js — خادم المتجر (Cloudflare Worker + KV)
   ------------------------------------------------------------
   التخزين: الطلبات + العملاء + الخصومات + الإحصائيات + الإعدادات
   الإعداد (wrangler.toml):
     name = "lacey-store"
     main = "worker.js"
     kv_namespaces = [{ binding = "STORE", id = "XXXX" }]   # أنشئها: npx wrangler kv:namespace create STORE
     [vars]
     ADMIN_PASS = "كلمة-مرور-الأدمن"
     ADMIN_KEY  = "مفتاح-تحديث-الإحصائيات"        # (اختياري — للتوافق مع زر «تحديث من الخادم» القديم)
     BOT_TOKEN  = ""                               # (اختياري) توكن بوت تلجرام لإشعارك بالخصم الترحيبي
     CHAT_ID    = ""                               # (اختياري) آيدي شاتك على تلجرام
   ثم انشر:  npx wrangler deploy
   وضع رابط الـ Worker في إعدادات المتجر بخانة «رابط وسيط لتلجرام».
   ============================================================ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function adminToken(env) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.ADMIN_PASS || '1234'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('lacey-admin'));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function tgNotify(env, text) {
  if (!env.BOT_TOKEN || !env.CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (e) {}
}

const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(36)).join('').slice(0, n).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

async function listKV(STORE, prefix, limit = 500) {
  const l = await STORE.list({ prefix, limit: limit + 1 });
  const out = [];
  for (const k of l.keys.slice(0, limit)) {
    try { out.push(JSON.parse(await STORE.get(k.name))); } catch (e) {}
  }
  return out;
}

export default {
  async fetch(request, env) {
    const STORE = env.STORE;
    if (!STORE) return J({ error: 'KV binding STORE missing' }, 500);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const p = url.pathname;
    const M = request.method;
    const token = await adminToken(env);
    const authed = (env.ADMIN_KEY && request.headers.get('x-admin') === env.ADMIN_KEY) ||
                   (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '') === token;
    const needAuth = () => authed ? null : J({ error: 'unauthorized' }, 401);
    const body = async () => { try { return await request.json(); } catch (e) { return {}; } };

    /* ---------- تسجيل دخول الأدمن ---------- */
    if (p === '/login' && M === 'POST') {
      const { pw } = await body();
      if (pw && pw === (env.ADMIN_PASS || '1234')) return J({ token });
      return J({ error: 'wrong password' }, 401);
    }

    /* ---------- زيارات + إحصائيات ---------- */
    if (p === '/visit' && M === 'POST') {
      const days = JSON.parse(await STORE.get('days') || '{}');
      const k = today();
      days[k] = (days[k] || 0) + 1;
      await STORE.put('days', JSON.stringify(days));
      return J({ ok: true });
    }
    if (p === '/stats' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      return J({ days: JSON.parse(await STORE.get('days') || '{}') });
    }

    /* ---------- الطلبات ---------- */
    if (p === '/order' && M === 'POST') {
      const o = await body();
      if (!o || !o.code || !o.ph) return J({ error: 'bad order' }, 400);
      o.st = o.st || 1;
      await STORE.put('o:' + o.code, JSON.stringify(o));

      /* ملف العميل: إنشاء تلقائي من أول طلب */
      const ck = 'c:' + o.ph;
      const c = JSON.parse(await STORE.get(ck) || 'null');
      let welcome = '';
      if (!c) {
        /* زبون جديد → كود خصم ترحيبي خاص برقمه */
        welcome = 'WEL' + rnd(5);
        await STORE.put('d:' + welcome, JSON.stringify({ code: welcome, phone: o.ph, value: 10, used: 0, sent: 0, auto: 1, t: Date.now() }));
        await tgNotify(env, `🎁 زبون جديد: ${o.name} (${o.ph})\nكود الخصم الترحيبي: ${welcome}`);
      }
      const nc = {
        name: o.name, ph: o.ph, city: o.city || '', area: o.area || '', lm: o.lm || '',
        orders: (c ? c.orders : 0) + 1, spent: (c ? c.spent : 0) + (o.t || 0),
        first: c ? c.first : o.d, last: o.d,
      };
      await STORE.put(ck, JSON.stringify(nc));
      return J({ ok: true, welcome: welcome || undefined });
    }
    if (p === '/orders' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      return J({ orders: (await listKV(STORE, 'o:')).sort((x, y) => x.d - y.d) });
    }
    if (p === '/status' && M === 'POST') {
      const a = needAuth(); if (a) return a;
      const { code, s } = await body();
      const o = JSON.parse(await STORE.get('o:' + code) || 'null');
      if (!o) return J({ error: 'not found' }, 404);
      o.st = s;
      await STORE.put('o:' + code, JSON.stringify(o));
      return J({ ok: true });
    }
    if (p === '/track' && M === 'GET') {
      const o = JSON.parse(await STORE.get('o:' + (url.searchParams.get('code') || '').toUpperCase()) || 'null');
      return J({ s: o ? (o.st ?? 1) : null });
    }

    /* ---------- العملاء (CRM) ---------- */
    if (p === '/customers' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      const l = await listKV(STORE, 'c:');
      return J(l.sort((x, y) => y.spent - x.spent));
    }
    if (p === '/customer' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      const ph = url.searchParams.get('ph') || '';
      const customer = JSON.parse(await STORE.get('c:' + ph) || 'null');
      if (!customer) return J({ error: 'not found' }, 404);
      const orders = (await listKV(STORE, 'o:')).filter(x => x.ph === ph).sort((x, y) => y.d - x.d);
      const discounts = (await listKV(STORE, 'd:')).filter(x => x.phone === ph);
      return J({ customer, orders, discounts });
    }
    if (p === '/customer' && M === 'DELETE') {
      const a = needAuth(); if (a) return a;
      await STORE.delete('c:' + (url.searchParams.get('ph') || ''));
      return J({ ok: true });
    }

    /* ---------- الخصومات ---------- */
    if (p === '/discount' && M === 'POST') {
      const a = needAuth(); if (a) return a;
      const { ph, value } = await body();
      const code = 'CUST' + rnd(5);
      await STORE.put('d:' + code, JSON.stringify({ code, phone: ph || '', value: +value || 10, used: 0, sent: 0, t: Date.now() }));
      return J({ code });
    }
    if (p === '/discounts' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      return J((await listKV(STORE, 'd:')).sort((x, y) => y.t - x.t));
    }

    /* ---------- نسخة إعدادات المحفوظة على الخادم ---------- */
    if (p === '/settings' && M === 'POST') {
      const a = needAuth(); if (a) return a;
      const { data } = await body();
      if (!data) return J({ error: 'no data' }, 400);
      data.O = []; data.vis = {};
      await STORE.put('settings', JSON.stringify(data));
      return J({ ok: true });
    }
    if (p === '/settings' && M === 'GET') {
      const a = needAuth(); if (a) return a;
      return J({ data: JSON.parse(await STORE.get('settings') || 'null') });
    }

    return J({ error: 'not found' }, 404);
  },
};
