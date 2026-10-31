/* bot.js — مساعد الدعم: قائمة ذكية (أين طلبي/تغيير/تعديل/إلغاء/موظف) + ردود بالذكاء الاصطناعي (Claude) */
import { now, jp, cfgOf } from './lib.js';

export const BOT = 'مساعد لاسي';
const CANCEL_WINDOW_MS = 10 * 60 * 1000;
const ST = ['ملغى', 'تم الاستلام', 'تم التأكيد', 'تم الشحن', 'في الطريق إليك', 'تم التوصيل'];
export const MAIN = [{ k: 'where', t: 'أين طلبي؟' }, { k: 'change', t: 'تغيير طلبي' }, { k: 'modify', t: 'تعديل طلبي' }, { k: 'cancel', t: 'إلغاء طلبي' }, { k: 'human', t: 'الاتصال بموظف' }];
const HUMAN = { k: 'human', t: 'الاتصال بموظف' };
/* قسم روتين: استشارات البشرة والمنتجات (h = رابط داخل المتجر) */
export const ROUTINE = [{ k: 'skin', t: 'اعرفي نوع بشرتي' }, { k: 'plan', t: 'اقترحوا لي روتين' }, { k: 'ingr', t: 'دليل المكونات' }, { k: 'prod', t: 'سؤال عن منتج' }, { k: 'human', t: 'تحدثي مع مختصة' }];
const detectR = t => {
  t = String(t || '');
  if (/(مختص|موظف|بشري|human|agent)/i.test(t)) return 'human';
  if (/(نوع بشرت|بشرتي دهن|بشرتي جاف|بشرتي حساس|اختبار)/.test(t)) return 'skin';
  if (/(روتين|خطوات|صباح|مساء)/.test(t)) return 'plan';
  if (/(مكون|ريتينول|فيتامين|نياسين|ساليسيلك|هيالورون|retinol|niacin)/i.test(t)) return 'ingr';
  if (/^(مرحبا|هلا|السلام|اهلا|أهلا|hi|hello)/i.test(t.trim())) return 'menu';
  return '';
};

const detect = t => {
  t = String(t || '');
  if (/(موظف|شخص|بشري|اتصال|اتصل|كلمني|مسؤول|human|agent)/i.test(t)) return 'human';
  if (/(الغ|إلغ|كنسل|cancel)/i.test(t)) return 'cancel';
  if (/(تغيير|غير|بدل|استبدال)/.test(t) && /(طلب)/.test(t)) return 'change';
  if (/(تعديل|عدل|اعدل|أعدل)/.test(t)) return 'modify';
  if (/(وين|اين|أين|تتبع|وصل|شحن|متى)/.test(t) && /(طلب|LC-)/i.test(t)) return 'where';
  if (/^(مرحبا|هلا|السلام|اهلا|أهلا|hi|hello)/i.test(t.trim())) return 'menu';
  return '';
};

async function ordersFor(env, ch, text) {
  const m = /LC-[A-Z0-9]{6}/i.exec(text || '');
  if (m) { const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(m[0].toUpperCase()).first(); return o ? [o] : []; }
  if (ch.customer_id) return (await env.DB.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 3').bind(ch.customer_id).all()).results;
  return null;
}
const owns = (ch, o) => (o.customer_id && o.customer_id === ch.customer_id) || (ch.phone && ch.phone === o.phone);
const line = o => `• ${o.code}: ${ST[o.status]} — ${Number(o.total).toLocaleString('en-US')} د.ع`;
const reply = (body, chips = MAIN, extra = {}) => ({ body, chips, ...extra });

async function aiAnswer(env, ch, text, orders, routine = false) {
  const cfg = await cfgOf(env);
  const prods = (await env.DB.prepare('SELECT name,price,category FROM products ORDER BY sort LIMIT 40').all()).results;
  const hist = (await env.DB.prepare('SELECT sender,body FROM chat_messages WHERE chat_id=? ORDER BY id DESC LIMIT 10').bind(ch.id).all()).results.reverse();
  const sys = routine ? `أنت «روتين»، مستشارة عناية بالبشرة لمتجر ${cfg.n || 'لاسي'} في العراق. أجيبي بالعربية بلهجة لطيفة ومختصرة (4 جمل كحد أقصى). قدّمي نصائح عامة للعناية بالبشرة فقط ولا تشخّصي أمراضاً ولا تصفي أدوية؛ للحالات الطبية (التهاب شديد، جروح، تحسس شديد، حمل مع مكونات فعالة) انصحي بمراجعة طبيب جلدية وأضيفي [[HUMAN]] إن أرادت الزبونة مختصة. لا تخترعي أسعاراً. المنتجات المتاحة: ${prods.map(p => `${p.name} (${p.category}) ${p.price}`).join(' | ') || 'غير متوفرة حالياً'}.\n${env.AI_PROMPT || ''}` : `أنت «${BOT}»، مساعد خدمة العملاء لمتجر ${cfg.n || 'لاسي'} للعناية بالبشرة في العراق. أجب بالعربية بلهجة مهذبة وقصيرة (3 جمل كحد أقصى).
اعتمد فقط على المعلومات التالية ولا تخترع أسعاراً أو وعوداً. إن لم تعرف الجواب أو طلب الزبون موظفاً أو كانت المشكلة تحتاج صلاحية (استرجاع، شكوى، تعديل عنوان) فاختم بالكلمة [[HUMAN]] فقط.
- التوصيل: ${cfg.del || 'نوصل لكل العراق خلال 2–4 أيام والدفع عند الاستلام'}. رسوم التوصيل: ${+cfg.sf ? cfg.sf + ' د.ع' : 'مجاني'}.
- يمكن إلغاء الطلب خلال 10 دقائق من إنشائه، ثم يتأكد تلقائياً ويتابعه فريقنا.
- المنتجات: ${prods.map(p => `${p.name} (${p.category}) ${p.price}`).join(' | ') || 'غير متوفرة حالياً'}.
${orders && orders.length ? '- طلبات هذا الزبون: ' + orders.map(o => `${o.code} ${ST[o.status]} ${o.total}`).join(' | ') : ''}
${env.AI_PROMPT || ''}`;
  const msgs = hist.map(m => ({ role: m.sender === 'customer' ? 'user' : 'assistant', content: m.body })).filter(m => m.content);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const merged = []; for (const m of msgs) { const l = merged[merged.length - 1]; if (l && l.role === m.role) l.content += '\n' + m.content; else merged.push({ ...m }); }
  if (!merged.length || merged[merged.length - 1].role !== 'user') merged.push({ role: 'user', content: text });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.AI_MODEL || 'claude-haiku-5-5', max_tokens: 400, system: sys, messages: merged }) });
    if (!r.ok) return null;
    const j = await r.json(); return (j.content || []).map(c => c.text || '').join('').trim() || null;
  } catch (e) { return null; }
}

/* يعيد { body, chips, handoff?, topic? } */
export async function botReply(env, ch, { text, quick }) {
  if (ch.dept === 'routine') return routineReply(env, ch, { text, quick });
  let intent = quick || detect(text);
  if (quick && quick.startsWith('cancel_yes:')) {
    const o = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(quick.slice(11)).first();
    if (!o || !owns(ch, o)) return reply('تعذر التحقق من الطلب، سأحوّلك إلى موظف.', [], { handoff: true, topic: 'cancel' });
    if (o.status !== 1 || now() - o.created_at >= CANCEL_WINDOW_MS) return reply('انتهت مهلة الإلغاء (10 دقائق). سأحوّلك إلى موظف لمساعدتك.', [], { handoff: true, topic: 'cancel ' + o.code });
    const t = now();
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status=0,cancelled_at=?,cancel_reason='ألغاه الزبون عبر الدعم' WHERE code=?").bind(t, o.code),
      env.DB.prepare('INSERT INTO order_events(order_code,status,at,actor,note) VALUES(?,?,?,?,?)').bind(o.code, 0, t, 'customer', 'عبر الدعم'),
      env.DB.prepare("INSERT INTO notifications(customer_id,phone,channel,template,payload,status,created_at) VALUES(?,?,'whatsapp','order_status',?,'queued',?)").bind(o.customer_id, o.phone, JSON.stringify({ code: o.code, status: 0, text: 'تم إلغاء طلبك' }), t),
    ]);
    return reply(`تم إلغاء الطلب ${o.code} ✅`);
  }
  if (intent === 'no') return reply('حسناً، لم يتم تغيير شيء. كيف أساعدك؟');
  if (intent === 'human') return reply('تم تحويلك إلى موظف من فريقنا، سيرد عليك هنا بأقرب وقت 🌸 اكتب سؤالك أو تفاصيل طلبك.', [], { handoff: true, topic: 'human' });
  if (intent === 'menu' || intent === 'why') return reply('أهلاً بك في لاسي 🌸 كيف أقدر أساعدك؟ اختر ما يناسبك أو اكتب سؤالك:');
  if (['where', 'cancel', 'change', 'modify'].includes(intent)) {
    const os = await ordersFor(env, ch, text);
    if (os === null) return reply('اكتب كود طلبك (مثل LC-ABC123) أو سجّل الدخول من أيقونة الحساب لأعرف طلباتك.', [HUMAN]);
    if (!os.length) return reply('لم أجد طلباً بهذا الكود. تأكد من الكود أو اتصل بموظف.', [HUMAN]);
    if (intent === 'where') return reply('حالة طلباتك:\n' + os.map(line).join('\n'));
    const o = os.find(x => x.status === 1 && now() - x.created_at < CANCEL_WINDOW_MS && owns(ch, x));
    if (intent === 'cancel') {
      if (o) return reply(`هل تريد إلغاء الطلب ${o.code}؟ اكتب «نعم» للتأكيد أو «لا» للتراجع.`, [{ k: 'cancel_yes:' + o.code, t: 'نعم، ألغِ الطلب' }, { k: 'no', t: 'لا' }]);
      const any = os[0];
      if (any.status === 0) return reply(`الطلب ${any.code} ملغى مسبقاً.`);
      return reply(`الطلب ${any.code} (${ST[any.status]}) لا يمكن إلغاؤه تلقائياً الآن. سأحوّلك إلى موظف.`, [], { handoff: true, topic: 'cancel ' + any.code });
    }
    if (o) return reply(`يمكن تعديل الطلب ${o.code} خلال 10 دقائق من إنشائه عبر إلغائه وإعادة الطلب بالتعديل المطلوب. اكتب «نعم» لإلغاء الطلب الآن، أو اضغط «الاتصال بموظف».`, [{ k: 'cancel_yes:' + o.code, t: 'نعم، ألغِ الطلب' }, HUMAN]);
    return reply(`سأحوّلك إلى موظف لإتمام ${intent === 'change' ? 'تغيير' : 'تعديل'} طلبك ${os[0].code}.`, [], { handoff: true, topic: intent + ' ' + os[0].code });
  }
  /* نص حر */
  if (env.ANTHROPIC_API_KEY && env.AI_ON !== '0') {
    const os = ch.customer_id ? await ordersFor(env, ch, '') : null;
    const ans = await aiAnswer(env, ch, text, os);
    if (ans) {
      if (ans.includes('[[HUMAN]]')) { const clean = ans.replace('[[HUMAN]]', '').trim(); return reply((clean ? clean + '\n\n' : '') + 'سأحوّلك إلى موظف ليساعدك بشكل أفضل 🌸', [], { handoff: true, topic: 'ai' }); }
      return reply(ans, [HUMAN, ...MAIN.slice(0, 1)]);
    }
  }
  return reply('لم أفهم سؤالك تماماً. اختر من الخيارات التالية أو اتصل بموظف:');
}

const R_HUMAN = reply => reply;
async function routineReply(env, ch, { text, quick }) {
  const intent = quick || detectR(text);
  const link = (body, h, t) => ({ body, chips: [{ k: 'go', t, h }, ...ROUTINE.filter(x => x.k === 'human')] });
  if (intent === 'human') return reply('تم تحويلك إلى مختصة العناية بالبشرة من فريقنا، ستردّ عليك هنا بأقرب وقت 🌸 اكتبي نوع بشرتك وما تريدين معالجته.', [], { handoff: true, topic: 'routine' });
  if (intent === 'menu') return reply('أهلاً بك في «روتين» 🌸 مستشارتك للعناية بالبشرة. اختاري ما يناسبك أو اكتبي سؤالك:', ROUTINE);
  if (intent === 'skin' || intent === 'plan') return link('ابدئي باختبار قصير (دقيقة واحدة) لتحصلي على روتين صباحي ومسائي بمنتجات من المتجر 🌿', '/routine', 'ابدئي الاختبار');
  if (intent === 'ingr') return link('في دليل المكونات ستجدين فوائد كل مكوّن ومتى تستخدمينه وما لا يجتمع معه ✨', '/routine/guide', 'افتحي الدليل');
  if (intent === 'prod') return reply('اكتبي كود المنتج (مثل LC101) وسؤالك في رسالة واحدة، أو اضغطي «اسألي عن منتج» وسيرد عليك مختص.', [{ k: 'go', t: 'اسألي عن منتج', h: '/routine/ask' }, ...ROUTINE.filter(x => x.k === 'human')]);
  if (env.ANTHROPIC_API_KEY && env.AI_ON !== '0') {
    const ans = await aiAnswer(env, ch, text, null, true);
    if (ans) {
      if (ans.includes('[[HUMAN]]')) { const clean = ans.replace('[[HUMAN]]', '').trim(); return reply((clean ? clean + '\n\n' : '') + 'سأحوّلك إلى مختصة لتساعدك بشكل أفضل 🌸', [], { handoff: true, topic: 'routine-ai' }); }
      return reply(ans, ROUTINE);
    }
  }
  return reply('لم أفهم سؤالك تماماً. اختاري من الخيارات أو تحدثي مع مختصة:', ROUTINE);
}
