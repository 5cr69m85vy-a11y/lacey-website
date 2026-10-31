/* account.js — حساب الزبون: دخول (هاتف/بريد/Google)، الملف، طلباتي، الإيصالات، الإشعارات */
(function () {
  'use strict';
  const T = (ar, en) => (typeof lang !== 'undefined' && lang == 'en') ? en : ar;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('en-US');
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} } };
  let pollT = 0, tok = ls.get('lc_ct') || '', me = null, tab = 'p', mode = 'ph', sub = 'login', cfg = null, step = 0, sPh = '', busy = false, lastN = +ls.get('lc_ln') || 0;
  try { me = JSON.parse(ls.get('lc_me') || 'null') } catch (e) {}
  window.custAuth = () => tok ? { Authorization: 'Bearer ' + tok } : {};
  /* أيقونات خطية موحّدة بدل الإيموجي */
  const ICO = {'headset': '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-5 2"/>', 'flower': '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C12 6 13 3 12 3s-0 3-0 6.5M12 14.5c0 3.500 1 6.500 0 6.500s0-3 0-6.500M9.500 12C6 12 3 11 3 12s3 0 6.500 0M14.500 12c3.500 0 6.500-1 6.500 0s-3 0-6.500 0"/>', 'box': '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', 'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100"/>', 'receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', 'flask': '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.500 15h9"/>', 'scale': '<path d="M12 4v16M6 20h12M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>', 'list': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>', 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>', 'moon': '<path d="M20 14.500A8 8 0 019.500 4 8 8 0 1020 14.500z"/>', 'flame': '<path d="M12 22c4 0 7-2.500 7-7 0-3-2-5-3-7-1 2-2 2.500-3 2 0-3-1-6-3-8 0 4-5 6-5 12 0 4.500 3 8 7 8z"/>', 'warn': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', 'check': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'};
  window.lcIco = (n, c) => `<svg class="ico ${c || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICO[n] || ''}</svg>`;
  window.custMe = () => me;
  window.accountRefresh = () => refresh();
  window.accountSignOut = () => { setSession('', null); tab = 'p'; };
  const base = () => (typeof API == 'function' && API()) || location.origin;
  async function call(path, body, method) {
    const r = await fetch(base() + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...custAuth() }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && tok && path.startsWith('/me')) { setSession('', null); }
    if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { status: r.status });
    return j;
  }
  function setSession(t, c) {
    tok = t || ''; me = c || null; ls.set('lc_ct', tok || null); ls.set('lc_me', me ? JSON.stringify(me) : null);
    if (me && typeof ff != 'undefined') ff = { name: me.name || '', ph: me.ph || '', ci: me.city || '', ae: me.area || '', lm: me.lm || '' };
    btn(); bellDraw([]); }

  /* ---------- الأفتارات ---------- */
  /* أفتارات أنمي: 36 صورة جاهزة (/avatars/avN.jpg). نخزّن المعرّف فقط */
  function avSvg(id, cls) {
    const m = /^av(\d+)$/.exec(id || ''), n = m ? +m[1] : 0;
    if (n < 1 || n > 36) return '<svg class="' + (cls || 'avs') + '" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#eadfd6"/><circle cx="32" cy="26" r="11" fill="#c9b8aa"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#c9b8aa"/></svg>';
    return '<img class="' + (cls || 'avs') + '" src="/avatars/av' + n + '.jpg" alt="" width="64" height="64" loading="lazy" decoding="async">';
  }
  const SK = [['oily', 'دهنية', 'Oily'], ['dry', 'جافة', 'Dry'], ['combo', 'مختلطة', 'Combination'], ['sensitive', 'حساسة', 'Sensitive'], ['normal', 'عادية', 'Normal']];
  const isoDay = d => d.toISOString().slice(0, 10);
  const dobField = (req, inline) => { const n = new Date(), max = new Date(Date.UTC(n.getUTCFullYear() - 15, n.getUTCMonth(), n.getUTCDate())); return `<label class="dob">${T('تاريخ الميلاد (15 سنة فأكثر)', 'Birth date (15 years or older)')}<input name="birth" type="date" min="1920-01-01" max="${isoDay(max)}" ${req && !inline ? 'required' : ''}></label>`; };
  const ageOk = b => { if (!b) return true; const d = new Date(b + 'T00:00:00Z'); if (isNaN(d)) return false; const n = new Date(); let a = n.getUTCFullYear() - d.getUTCFullYear(); if (n.getUTCMonth() < d.getUTCMonth() || (n.getUTCMonth() == d.getUTCMonth() && n.getUTCDate() < d.getUTCDate())) a--; return a >= 15; };
  const avPick = sel => `<div class="avp" role="radiogroup" aria-label="${T('اختر شخصيتك', 'Choose your character')}"><div class="avprev">${avSvg(sel, 'avl')}<small>${T('اختياري — يمكنك تغييرها لاحقاً', 'Optional — you can change it later')}</small></div><div class="avg">${Array.from({ length: 36 }, (_, i) => { const id = 'av' + (i + 1); return `<button type="button" class="av${id == sel ? ' on' : ''}" data-v="${id}" role="radio" aria-checked="${id == sel}" aria-label="${T('شخصية', 'Character')} ${i + 1}">${avSvg(id)}</button>` }).join('')}</div><input type="hidden" name="avatar" value="${E(sel || '')}"></div>`;
  const GUEST = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';
  function btn() { const b = document.getElementById('accb'); if (!b) return; b.title = me ? me.name || me.email || me.ph : T('تسجيل الدخول', 'Sign in'); b.classList.toggle('on', !!me); b.innerHTML = '<i class="bni">' + (me ? avSvg(me.avatar) : GUEST) + '</i><small>' + T('حسابي', 'Account') + '</small>'; if (me) { const e = b.querySelector('.bni').firstElementChild; if (e) e.classList.add('avs'); } }

  /* ---------- الهيكل ---------- */
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'acv';
  ov.innerHTML = '<div class="acb" id="acb"></div>'; document.body.appendChild(ov);
  const hb = document.createElement('button'); hb.id = 'accb'; hb.className = 'cb2'; hb.setAttribute('aria-label', 'Account');
  hb.innerHTML = GUEST;
  const bag = document.querySelector('header .cb2'); bag ? bag.parentNode.insertBefore(hb, bag) : document.querySelector('header .w').appendChild(hb);
  btn();
  hb.addEventListener('click', () => window.lcNav ? lcNav('/account') : open());
  const bell = document.createElement('button'); bell.id = 'bellb'; bell.className = 'cb2'; bell.setAttribute('aria-label', 'Notifications'); bell.style.display = 'none';
  bell.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l2 2H4z"/><path d="M10 21h4"/></svg><i id="belln">0</i>'; hb.parentNode.insertBefore(bell, hb);
  bell.addEventListener('click', () => { window.lcNav ? lcNav('/account/alerts') : open('n'); });
  let bellSeen = +ls.get('lc_bell') || 0;
  function bellDraw(items) { bell.style.display = me ? '' : 'none'; if (!me) return; const n = (items || []).filter(i => i.t > bellSeen).length, b = document.getElementById('belln'); if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'flex' : 'none'; } }
  window.bellDraw = bellDraw;
  const body = () => document.getElementById('acb');
  const open = t => { if (t) tab = t; ov.classList.add('on'); draw(); if (me) refresh(); };
  const close = silent => { ov.classList.remove('on', 'pgv'); if (silent !== true && window.lcBack) lcBack('account'); };
  window.accountShow = t => { ov.classList.add('pgv'); open(t); };
  window.accountHide = () => close(true);
  const SLUG = { p: '', o: 'orders', r: 'receipts', n: 'alerts' };
  window.openAccount = open;
  ov.addEventListener('click', async e => {
    if (e.target === ov) return close();
    const av = e.target.closest('.av'); if (av) { const w = av.closest('.avp'); w.querySelectorAll('.av').forEach(b => { b.classList.toggle('on', b === av); b.setAttribute('aria-checked', b === av) }); w.querySelector('[name=avatar]').value = av.dataset.v; w.querySelector('.avl').outerHTML = avSvg(av.dataset.v, 'avl'); return; }
    const el = e.target.closest('[data-x]'); if (!el) return;
    const x = el.dataset.x, v = el.dataset.v;
    if (x === 'close') return close();
    if (x === 'mode') { mode = v; step = 0; return draw(); }
    if (x === 'sub') { sub = v; return draw(); }
    if (x === 'tab') { tab = v; draw(); if (window.lcUrl) lcUrl('/account' + (SLUG[v] ? '/' + SLUG[v] : '')); return load(); }
    if (x === 'out') { try { await call('/auth/logout', {}) } catch (_) {} setSession('', null); tab = 'p'; return draw(); }
    if (x === 'trk') { const box = document.getElementById('acT' + v); if (box && typeof trkMount == 'function') { box.innerHTML = ''; trkMount(v, (me && me.ph) || '', '#acT' + v); } return; }
  });
  ov.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation(); if (busy) return;
    const f = e.target, v = Object.fromEntries(new FormData(f)); const er = f.querySelector('.er');
    if (v.birth && !ageOk(v.birth)) { if (er) er.textContent = T('لا يمكن إنشاء حساب لمن عمره أقل من 15 سنة', 'You must be 15 or older to create an account'); return; }
    busy = true;
    if (er) er.textContent = '';
    try {
      if (f.id === 'af-otps') { await call('/auth/otp/send', { ph: v.ph }); sPh = v.ph; step = 1; draw(); }
      else if (f.id === 'af-otpv') { const j = await call('/auth/otp/verify', { ph: sPh, code: v.code, name: v.name, birth: v.birth || '', mkt: !!v.mkt }); done(j); }
      else if (f.id === 'af-reg') { done(await call('/auth/register', { email: v.email, pw: v.pw, name: v.name, avatar: v.avatar || '', birth: v.birth || '', mkt: !!v.mkt })); }
      else if (f.id === 'af-log') { done(await call('/auth/login', { email: v.email, pw: v.pw })); }
      else if (f.id === 'af-prof') { await call('/me', { name: v.name, city: v.city, area: v.area, lm: v.lm, avatar: v.avatar || '', skin: v.skin || '', birth: v.birth || '' }); me = { ...me, name: v.name, city: v.city, area: v.area, lm: v.lm, avatar: v.avatar || '' }; setSession(tok, me); toast(T('تم الحفظ', 'Saved')); }
      else if (f.id === 'af-ph') { await call('/auth/otp/send', { ph: v.ph }); sPh = v.ph; step = 1; draw(); }
    } catch (x) { if (er) er.textContent = x.message; }
    busy = false;
  });
  function done(j) { const co = window.__co; window.__co = 0; setSession(j.token, j.customer); if (co) { close(true); if (window.lcNav) lcNav('/checkout'); else { try { A.bag(); view = 'form'; rc(); } catch (e) {} } } if (!pollT) pollT = setInterval(poll, 30000); poll(); step = 0; tab = 'p'; toast(T('أهلاً ' + (j.customer.name || ''), 'Welcome ' + (j.customer.name || ''))); draw(); load(); }

  /* ---------- العرض ---------- */
  const err = '<small class="er"></small>';
  function draw() {
    const b = body(); if (!b) return;
    const head = `<button class="acx" data-x="close" aria-label="close">×</button>`;
    if (!me) {
      const tabs = [['ph', T('الهاتف', 'Phone')], ['em', T('البريد', 'Email')], ['gg', 'Google']].map(([k, n]) => `<button data-x="mode" data-v="${k}" class="${mode == k ? 'on' : ''}">${n}</button>`).join('');
      let f = '';
      if (mode == 'ph') f = step == 0
        ? `<form id="af-otps"><p>${T('سنرسل رمز تحقق إلى واتساب الخاص بك', 'We will send a verification code to your WhatsApp')}</p><input name="ph" type="tel" inputmode="numeric" maxlength="11" placeholder="07XXXXXXXXX" required><button class="btn">${T('إرسال الرمز', 'Send code')}</button>${err}</form>`
        : `<form id="af-otpv"><p>${T('أدخل الرمز المرسل إلى ' + E(sPh), 'Enter the code sent to ' + E(sPh))}</p><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" required autocomplete="one-time-code"><input name="name" placeholder="${T('اسمك (للحسابات الجديدة)', 'Your name (new accounts)')}">${dobField(false)}<label class="dob" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="mkt" style="width:auto"> ${T('أوافق على استلام العروض والأكواد (يمكنك الإلغاء لاحقاً)', 'I agree to receive offers and codes (you can opt out any time)')}</label><button class="btn">${T('تحقق ودخول', 'Verify & sign in')}</button><button type="button" class="ln" data-x="mode" data-v="ph">${T('تغيير الرقم', 'Change number')}</button>${err}</form>`;
      else if (mode == 'em') f = sub == 'login'
        ? `<form id="af-log"><input name="email" type="email" placeholder="${T('البريد الإلكتروني', 'Email')}" required><input name="pw" type="password" placeholder="${T('كلمة السر', 'Password')}" required><button class="btn">${T('دخول', 'Sign in')}</button><button type="button" class="ln" data-x="sub" data-v="reg">${T('إنشاء حساب جديد', 'Create an account')}</button>${err}</form>`
        : `<form id="af-reg"><input name="name" placeholder="${T('الاسم', 'Name')}" required><input name="email" type="email" placeholder="${T('البريد الإلكتروني', 'Email')}" required><input name="pw" type="password" minlength="8" placeholder="${T('كلمة السر (8 أحرف على الأقل)', 'Password (min 8 chars)')}" required>${dobField(true)}<label class="dob" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="mkt" style="width:auto"> ${T('أوافق على استلام العروض والأكواد (يمكنك الإلغاء لاحقاً)', 'I agree to receive offers and codes (you can opt out any time)')}</label>${avPick('')}<button class="btn">${T('إنشاء الحساب', 'Create account')}</button><button type="button" class="ln" data-x="sub" data-v="login">${T('لدي حساب', 'I have an account')}</button>${err}</form>`;
      else f = `<div id="gbtn" class="gb">${cfg && cfg.google ? '' : T('تسجيل Google غير مُفعّل بعد', 'Google sign-in is not enabled yet')}</div>${err}`;
      b.innerHTML = `${head}<h3>${T('أهلاً بك في لاسي', 'Welcome to Lacey')}</h3><div class="act">${tabs}</div>${f}`;
      if (mode == 'gg') gsi();
      return;
    }
    const tabs = [['p', T('حسابي', 'Profile')], ['o', T('طلباتي', 'Orders')], ['r', T('الإيصالات', 'Receipts')], ['n', T('الإشعارات', 'Alerts')]].map(([k, n]) => `<button data-x="tab" data-v="${k}" class="${tab == k ? 'on' : ''}">${n}</button>`).join('');
    let c = '';
    if (tab == 'p') c = `<form id="af-prof">${avPick(me.avatar || '')}<input name="name" value="${E(me.name)}" placeholder="${T('الاسم', 'Name')}" required><input name="city" value="${E(me.city)}" placeholder="${T('المحافظة', 'City')}"><input name="area" value="${E(me.area)}" placeholder="${T('المنطقة', 'Area')}"><input name="lm" value="${E(me.lm)}" placeholder="${T('أقرب نقطة دالة', 'Landmark')}">${me.birth ? `<small>${T('تاريخ الميلاد', 'Birth date')}: ${E(me.birth)} · ${me.age} ${T('سنة', 'y')}</small>` : `<div class="dob" style="background:#fff4d6;padding:10px;border-radius:12px"><b>${T('أضف تاريخ ميلادك لتتمكن من الطلب', 'Add your birth date to place orders')}</b>${dobField(true, true)}</div>`}<label class="dob">${T('نوع بشرتك (يساعد في صفحة روتين)', 'Skin type (used by Routine)')}<select name="skin"><option value="">—</option>${SK.map(([k, n, en]) => `<option value="${k}" ${me.skin == k ? 'selected' : ''}>${T(n, en)}</option>`).join('')}</select></label><small>${E(me.ph || '')} ${E(me.email || '')}${me.ph ? '' : ' — ' + T('لم يُربط رقم واتساب بعد', 'no WhatsApp number linked')}</small><button class="btn">${T('حفظ', 'Save')}</button>${err}</form>${me.ph ? '' : phoneForm()}<button class="ln" data-x="out">${T('تسجيل الخروج', 'Sign out')}</button>`;
    else c = `${tab == 'o' ? `<a class="ln" href="/tracking">${lcIco('box')} ${T('تتبع طلب برمز الطلب', 'Track an order by code')}</a>` : ''}<div id="acl"><p class="em">…</p></div>`;
    const tiles = `<div class="tiles2"><a href="/help"><b>${lcIco('headset')} ${T('خدمة الزبائن', 'Customer service')}</b><small>${T('محادثة وأسئلة شائعة', 'Chat & FAQ')}</small></a><a href="/routine/support"><b>${lcIco('flower')} ${T('دعم روتين', 'Routine support')}</b><small>${T('استشارة بشرة', 'Skin advice')}</small></a><a href="/tracking"><b>${lcIco('box')} ${T('تتبع الطلب', 'Track order')}</b><small>${T('برمز الطلب', 'By order code')}</small></a><a href="/preferences"><b>${lcIco('gear')} ${T('الإعدادات', 'Settings')}</b><small>${T('اللغة والخصوصية', 'Language & privacy')}</small></a></div>`;
    b.innerHTML = `${head}<h3>${E(me.name || me.email || me.ph)}</h3>${tiles}<div class="act">${tabs}</div>${c}`;
  }
  const phoneForm = () => step == 1 && tab == 'p'
    ? `<form id="af-otpv" class="ph"><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" required><input type="hidden" name="name" value="${E(me.name)}"><button class="btn">${T('تأكيد الرقم', 'Confirm number')}</button>${err}</form>`
    : `<form id="af-ph" class="ph"><p>${T('اربط رقم واتساب لتصلك إشعارات الطلب', 'Link your WhatsApp number for order updates')}</p><input name="ph" type="tel" inputmode="numeric" maxlength="11" placeholder="07XXXXXXXXX" required><button class="btn">${T('إرسال الرمز', 'Send code')}</button>${err}</form>`;
  const ST = ['ملغى', 'تم الاستلام', 'تم التأكيد', 'تم الشحن', 'في الطريق', 'تم التوصيل'], STE = ['Cancelled', 'Received', 'Confirmed', 'Shipped', 'On the way', 'Delivered'];
  const dt = t => new Date(t).toLocaleString(lang == 'en' ? 'en-GB' : 'ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  async function load() {
    const el = document.getElementById('acl'); if (!el || !me) return;
    try {
      if (tab == 'o') {
        const j = await call('/me/orders');
        el.innerHTML = j.orders.length ? j.orders.map(o => `<div class="aco"><div><b>${E(o.code)}</b> <span class="st s${o.s}">${T(ST[o.s], STE[o.s])}</span></div><small>${dt(o.t)} · ${num(o.total)} ${T('د.ع', 'IQD')} · ${o.pay == 'cod' ? T('دفع عند الاستلام', 'Cash on delivery') : E(o.pay)}</small><div class="ai">${o.items.map(i => `${i.q}× ${E(i.n)}${i.cc ? ' (' + E(i.cc) + ')' : ''}`).join(' · ')}</div><button class="ln" data-x="trk" data-v="${E(o.code)}">${T('تتبع الطلب', 'Track order')}</button><div id="acT${E(o.code)}"></div></div>`).join('') : `<p class="em">${T('لا توجد طلبات بعد', 'No orders yet')}</p>`;
      } else if (tab == 'r') {
        const j = await call('/me/receipts');
        el.innerHTML = j.receipts.length ? j.receipts.map(r => `<div class="aco"><div><b>${E(r.number)}</b> · ${E(r.code)}</div><small>${dt(r.t)}</small>${(r.items || []).map(i => `<div class="ai">${i.q}× ${E(i.n)} — ${num(i.p * i.q)}</div>`).join('')}<div class="ai">${T('الخصم', 'Discount')}: ${num(r.discount)} · <b>${T('المجموع', 'Total')}: ${num(r.total)}</b></div><div class="ai">${E(r.name || '')} — ${E(r.addr || '')}</div></div>`).join('') : `<p class="em">${T('تصدر الإيصالات بعد تأكيد الطلب', 'Receipts are issued once an order is confirmed')}</p>`;
      } else if (tab == 'n') {
        const j = await call('/me/notifications');
        el.innerHTML = j.items.length ? j.items.map(n => `<div class="aco"><div>${E(n.text)}</div><small>${dt(n.t)}</small></div>`).join('') : `<p class="em">${T('لا إشعارات', 'No notifications')}</p>`;
        if (j.items[0]) { lastN = Math.max(lastN, j.items[0].t); ls.set('lc_ln', lastN); bellSeen = Date.now(); ls.set('lc_bell', String(bellSeen)); bellDraw([]); }
      }
    } catch (x) { el.innerHTML = `<p class="em">${E(x.message)}</p>`; }
  }
  async function refresh() { try { const j = await call('/me'); me = j.customer; setSession(tok, me); if (ov.classList.contains('on')) { draw(); load(); } } catch (e) {} }

  /* ---------- Google ---------- */
  function gsi() {
    if (!cfg || !cfg.google) return;
    const go = () => { google.accounts.id.initialize({ client_id: cfg.google, callback: async r => { try { done(await call('/auth/google', { credential: r.credential })); } catch (x) { toast(x.message); } } }); google.accounts.id.renderButton(document.getElementById('gbtn'), { theme: 'outline', size: 'large', shape: 'pill' }); };
    if (window.google && google.accounts) return go();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go; document.head.appendChild(s);
  }

  /* ---------- إشعارات داخل الموقع: تنبيه عند تغيّر حالة الطلب ---------- */
  async function poll() {
    if (!tok) return;
    try {
      const j = await call('/me/notifications');
      bellDraw(j.items);
      const fresh = j.items.filter(n => n.t > lastN && (n.tpl === 'order_status' || n.tpl === 'chat_reply'));
      if (lastN && fresh.length) toast(fresh[0].text);
      if (j.items[0]) { lastN = Math.max(lastN, j.items[0].t); ls.set('lc_ln', lastN); }
    } catch (e) {}
  }
  (async () => { try { cfg = await call('/auth/config'); } catch (e) { cfg = {}; } btn(); if (tok) { refresh(); poll(); pollT = setInterval(poll, 30000); } })();
  btn();
})();
