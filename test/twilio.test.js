// Twilio كمزوّد رسائل بديل: الطلب الصحيح، التبديل، عدم تسريب التوكن
const assert = require('assert');
(async () => {
  const { twSend, waSend, waOn, twOn } = await import('../worker/wa.js');
  const calls = []; global.fetch = async (u, i) => { calls.push({ u: String(u), i }); return { ok: true, json: async () => ({}) }; };
  const E = { TWILIO_SID: 'AC' + 'a'.repeat(32), TWILIO_TOKEN: 'tok', TWILIO_FROM: '+15005550006' };
  assert(twOn(E) && waOn(E) && !waOn({}));
  assert.deepStrictEqual(await waSend(E, '07701234567', 'otp', ['123456'], 'رمز 123456'), { ok: true });
  let c = calls[0], b = new URLSearchParams(c.i.body);
  assert(c.u.startsWith('https://api.twilio.com/2010-04-01/Accounts/AC') && c.u.endsWith('/Messages.json'));
  assert.strictEqual(b.get('To'), '+9647701234567'); assert.strictEqual(b.get('From'), '+15005550006'); assert(b.get('Body').includes('123456'));
  assert.strictEqual(c.i.headers.Authorization, 'Basic ' + Buffer.from(E.TWILIO_SID + ':tok').toString('base64'));
  await twSend({ ...E, TWILIO_CHANNEL: 'whatsapp', TWILIO_FROM: '+14155238886' }, '9647701234567', 'x'); b = new URLSearchParams(calls[1].i.body);
  assert.strictEqual(b.get('To'), 'whatsapp:+9647701234567'); assert.strictEqual(b.get('From'), 'whatsapp:+14155238886');
  await twSend({ ...E, TWILIO_FROM: 'MG' + 'b'.repeat(32) }, '9647701234567', 'x'); b = new URLSearchParams(calls[2].i.body);
  assert(b.get('MessagingServiceSid').startsWith('MG') && !b.get('From'));
  await waSend({ ...E, WA_TOKEN: 't', WA_PHONE_ID: '1' }, '07701234567', 'otp', ['1'], 'x'); assert(calls[3].u.includes('graph.facebook.com'), 'Meta أولاً عند تفعيله');
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ code: 20003, message: 'Authenticate' }) });
  const r = await waSend(E, '07701234567', 'otp', ['1'], 'x'); assert(!r.ok && r.error.includes('20003') && !r.error.includes('tok'));
  console.log('twilio ok');
})().catch(e => { console.error(e); process.exit(1); });
