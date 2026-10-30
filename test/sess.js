/* مساعد الاختبارات: يجهّز زبوناً موثّقاً بجلسة لكل رقم هاتف (الطلب يتطلب حساباً) */
const cache = new Map();
module.exports = async function authFor(env, ph) {
  const k = ph + '|' + (env.DB.__id || (env.DB.__id = Math.random()));
  if (cache.has(k)) return cache.get(k);
  const { newSession } = await import('../worker/auth.js');
  let c = await env.DB.prepare('SELECT id FROM customers WHERE phone=?').bind(ph).first();
  if (!c) c = await env.DB.prepare("INSERT INTO customers(phone,name,wa_verified,created_at,last_seen_at) VALUES(?,'t',1,?,?) RETURNING id").bind(ph, Date.now(), Date.now()).first();
  const h = { Authorization: 'Bearer ' + await newSession(env, c.id) };
  cache.set(k, h); return h;
};
