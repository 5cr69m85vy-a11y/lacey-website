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
  window.custMe = () => me;
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

  /* ---------- الأفتارات: 24 شخصية أصلية (SVG مولَّد، نخزّن المعرّف فقط) ---------- */
  /* أفتارات أنمي بناتية أصلية (SVG مولَّد). نخزّن المعرّف فقط */
  const SKN = ['#ffe3d3', '#fbd0b4', '#eab48e', '#c98d66'];
  const HAIR = [['#ff9fc0', '#e0508a'], ['#c9a7ff', '#7b57d6'], ['#3a3f66', '#12142b'], ['#8a5a3c', '#4a2c1c'], ['#ffd88a', '#e8a93a'], ['#8fe3d6', '#2fa9a0']];
  const EYE = [['#7be0ff', '#2476d6'], ['#ffb3d9', '#c2318b'], ['#a8f0a0', '#2f9a4f'], ['#ffd27a', '#c9791e'], ['#d0b8ff', '#6a3fc9'], ['#9ee9ff', '#1d9bb0']];
  const BGS = ['#ffe3ee', '#e4ecff', '#e6f9ef', '#fff0d9', '#f0e6ff', '#ffe8e0'], OFS = ['#ff7fa8', '#6fa8ff', '#5fd3a0', '#ffb13d', '#a07cf0', '#ff8f6b'];
  function avSvg(id, cls) {
    const m = /^av(\d+)$/.exec(id || ''), n = m ? +m[1] - 1 : -1;
    if (n < 0 || n > 23) return '<svg class="' + (cls || 'avs') + '" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#eadfd6"/><circle cx="32" cy="26" r="11" fill="#c9b8aa"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#c9b8aa"/></svg>';
    const st = n % 6, v = n / 6 | 0, k = 'a' + n;
    const sk = SKN[(n * 3 + v) % 4], [h1, h2] = HAIR[(st * 2 + v * 5 + n) % 6], [e1, e2] = EYE[(n * 7 + 3 + v * 2) % 6], bg = BGS[(n * 5 + v) % 6], of = OFS[(n * 7 + 1) % 6];
    const G = `url(#h${k})`; let back = '', front = '', top = '';
    if (st == 0) back = `<path d="M13 33C11 14 21 5 32 5s21 9 19 28c-1 10 3 17 5 21-8 1-12-3-14-8V30H22v16c-2 5-6 9-14 8 2-4 6-11 5-21z" fill="${G}"/>`;
    if (st == 1) back = `<path d="M15 20c-9 4-11 20-7 34 4-4 5-10 6-17z M49 20c9 4 11 20 7 34-4-4-5-10-6-17z" fill="${G}"/>`;
    if (st == 2) back = `<circle cx="32" cy="9" r="7.5" fill="${G}"/><path d="M13 30C13 14 21 7 32 7s19 7 19 23z" fill="${G}"/>`;
    if (st == 3) back = `<path d="M12 36C10 14 20 5 32 5s22 9 20 31c0 5-3 8-7 8V28H19v16c-4 0-7-3-7-8z" fill="${G}"/>`;
    if (st == 4) back = `<path d="M8 64C6 34 14 8 32 8s26 26 24 56z" fill="${of}"/>`;
    if (st == 5) back = `<path d="M12 30C11 12 21 5 32 5s21 7 20 25c-1 8 3 12 6 18-5 4-12 2-15-4V30H21v14c-3 6-10 8-15 4 3-6 7-10 6-18z" fill="${G}"/><circle cx="9" cy="48" r="4.5" fill="${G}"/><circle cx="55" cy="48" r="4.5" fill="${G}"/>`;
    const face = `<path d="M17 31c0-10 6-17 15-17s15 7 15 17c0 9-5 17-15 20-10-3-15-11-15-20z" fill="${sk}"/>`;
    const bangs = st == 4 ? `<path d="M14 38C13 18 22 9 32 9s19 9 18 29c-3-7-6-11-18-11s-15 4-18 11z" fill="${of}"/><path d="M14 38C13 18 22 9 32 9s19 9 18 29" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/>`
      : `<path d="M16 29c0-11 6-17 16-17s16 6 16 17c-2-5-5-8-9-9-1 5-5 9-11 9-4 0-8-1-12 0z" fill="${G}"/><path d="M22 15c3-3 8-4 13-2" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    top = st == 0 ? `<path d="M44 14l3-3 3 3-3 3z" fill="#fff"/><circle cx="47" cy="14" r="1" fill="${of}"/>` : st == 1 ? `<circle cx="14" cy="22" r="3" fill="${of}"/><circle cx="50" cy="22" r="3" fill="${of}"/>` : st == 2 ? `<path d="M25 11l7 3 7-3-3 6h-8z" fill="${of}"/><circle cx="32" cy="13.5" r="1.8" fill="#fff"/>` : st == 3 ? `<rect x="37" y="14" width="9" height="3.4" rx="1.7" fill="${of}" transform="rotate(-18 41 16)"/><circle cx="42" cy="15.4" r=".9" fill="#fff"/>` : st == 5 ? `<circle cx="45" cy="15" r="3.6" fill="#fff"/><circle cx="45" cy="15" r="1.5" fill="#ffb13d"/><circle cx="41.7" cy="13" r="1.6" fill="#ffd1e0"/><circle cx="47.5" cy="11.5" r="1.6" fill="#ffd1e0"/>` : '';
    const eye = x => `<g><ellipse cx="${x}" cy="35" rx="4.6" ry="5.6" fill="#fff"/><ellipse cx="${x}" cy="35.6" rx="3.7" ry="4.9" fill="url(#e${k})"/><ellipse cx="${x}" cy="36.4" rx="1.9" ry="2.7" fill="#1d1230"/><circle cx="${x - 1.4}" cy="33.2" r="1.5" fill="#fff"/><circle cx="${x + 1.5}" cy="37.6" r=".8" fill="#fff"/><path d="M${x - 5} 33.2c1.6-2.6 7.6-2.8 10 0" stroke="#2a1830" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`;
    const face2 = `${eye(25)}${eye(39)}<path d="M20 29.6q4-2.2 8-.6M36 29q4-1.6 8 .6" stroke="${h2}" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M32 42.6l-.8.9" stroke="#c9826f" stroke-width=".9" stroke-linecap="round"/><path d="M29.6 45.4q2.4 2 4.8 0" stroke="#c4506a" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="20.6" cy="42" rx="3" ry="1.8" fill="#ff7f9f" opacity=".38"/><ellipse cx="43.4" cy="42" rx="3" ry="1.8" fill="#ff7f9f" opacity=".38"/>`;
    return `<svg class="${cls || 'avs'}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="h${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${h1}"/><stop offset="1" stop-color="${h2}"/></linearGradient><linearGradient id="e${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${e2}"/><stop offset="1" stop-color="${e1}"/></linearGradient></defs><rect width="64" height="64" fill="${bg}"/><circle cx="52" cy="10" r="1.3" fill="#fff"/><circle cx="10" cy="14" r="1" fill="#fff"/><path d="M52 6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff" opacity=".9"/>${back}<path d="M9 64c2-12 11-17 23-17s21 5 23 17z" fill="${of}"/><path d="M27 48l5 5 5-5" fill="#fff" opacity=".85"/><rect x="28" y="43" width="8" height="7" rx="3" fill="${sk}"/>${face}${bangs}${st == 4 ? '' : ''}${face2}${top}</svg>`;
  }
  const avPick = sel => `<div class="avp" role="radiogroup" aria-label="${T('اختر شخصيتك', 'Choose your character')}"><div class="avprev">${avSvg(sel, 'avl')}<small>${T('اختياري — يمكنك تغييرها لاحقاً', 'Optional — you can change it later')}</small></div><div class="avg">${Array.from({ length: 24 }, (_, i) => { const id = 'av' + (i + 1); return `<button type="button" class="av${id == sel ? ' on' : ''}" data-v="${id}" role="radio" aria-checked="${id == sel}" aria-label="${T('شخصية', 'Character')} ${i + 1}">${avSvg(id)}</button>` }).join('')}</div><input type="hidden" name="avatar" value="${E(sel || '')}"></div>`;
  const GUEST = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';
  function btn() { const b = document.getElementById('accb'); if (!b) return; b.title = me ? me.name || me.email || me.ph : T('تسجيل الدخول', 'Sign in'); b.classList.toggle('on', !!me); b.innerHTML = me ? avSvg(me.avatar) : GUEST; if (me) b.querySelector('svg').classList.add('avs') }

  /* ---------- الهيكل ---------- */
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'acv';
  ov.innerHTML = '<div class="acb" id="acb"></div>'; document.body.appendChild(ov);
  const hb = document.createElement('button'); hb.id = 'accb'; hb.className = 'cb2'; hb.setAttribute('aria-label', 'Account');
  hb.innerHTML = GUEST;
  const bag = document.querySelector('header .cb2'); bag ? bag.parentNode.insertBefore(hb, bag) : document.querySelector('header .w').appendChild(hb);
  hb.addEventListener('click', () => open());
  const bell = document.createElement('button'); bell.id = 'bellb'; bell.className = 'cb2'; bell.setAttribute('aria-label', 'Notifications'); bell.style.display = 'none';
  bell.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l2 2H4z"/><path d="M10 21h4"/></svg><i id="belln">0</i>'; hb.parentNode.insertBefore(bell, hb);
  bell.addEventListener('click', () => { open('n'); });
  let bellSeen = +ls.get('lc_bell') || 0;
  function bellDraw(items) { bell.style.display = me ? '' : 'none'; if (!me) return; const n = (items || []).filter(i => i.t > bellSeen).length, b = document.getElementById('belln'); if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'flex' : 'none'; } }
  window.bellDraw = bellDraw;
  const body = () => document.getElementById('acb');
  const open = t => { if (t) tab = t; ov.classList.add('on'); draw(); if (me) refresh(); };
  const close = () => ov.classList.remove('on');
  window.openAccount = open;
  ov.addEventListener('click', async e => {
    if (e.target === ov) return close();
    const av = e.target.closest('.av'); if (av) { const w = av.closest('.avp'); w.querySelectorAll('.av').forEach(b => { b.classList.toggle('on', b === av); b.setAttribute('aria-checked', b === av) }); w.querySelector('[name=avatar]').value = av.dataset.v; w.querySelector('.avl').outerHTML = avSvg(av.dataset.v, 'avl'); return; }
    const el = e.target.closest('[data-x]'); if (!el) return;
    const x = el.dataset.x, v = el.dataset.v;
    if (x === 'close') return close();
    if (x === 'mode') { mode = v; step = 0; return draw(); }
    if (x === 'sub') { sub = v; return draw(); }
    if (x === 'tab') { tab = v; draw(); return load(); }
    if (x === 'out') { try { await call('/auth/logout', {}) } catch (_) {} setSession('', null); tab = 'p'; return draw(); }
    if (x === 'trk') { const box = document.getElementById('acT' + v); if (box && typeof trkMount == 'function') { box.innerHTML = ''; trkMount(v, (me && me.ph) || '', '#acT' + v); } return; }
  });
  ov.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation(); if (busy) return;
    const f = e.target, v = Object.fromEntries(new FormData(f)); busy = true; const er = f.querySelector('.er');
    if (er) er.textContent = '';
    try {
      if (f.id === 'af-otps') { await call('/auth/otp/send', { ph: v.ph }); sPh = v.ph; step = 1; draw(); }
      else if (f.id === 'af-otpv') { const j = await call('/auth/otp/verify', { ph: sPh, code: v.code, name: v.name }); done(j); }
      else if (f.id === 'af-reg') { done(await call('/auth/register', { email: v.email, pw: v.pw, name: v.name, avatar: v.avatar || '' })); }
      else if (f.id === 'af-log') { done(await call('/auth/login', { email: v.email, pw: v.pw })); }
      else if (f.id === 'af-prof') { await call('/me', { name: v.name, city: v.city, area: v.area, lm: v.lm, avatar: v.avatar || '' }); me = { ...me, name: v.name, city: v.city, area: v.area, lm: v.lm, avatar: v.avatar || '' }; setSession(tok, me); toast(T('تم الحفظ', 'Saved')); }
      else if (f.id === 'af-ph') { await call('/auth/otp/send', { ph: v.ph }); sPh = v.ph; step = 1; draw(); }
    } catch (x) { if (er) er.textContent = x.message; }
    busy = false;
  });
  function done(j) { const co = window.__co; window.__co = 0; setSession(j.token, j.customer); if (co) { close(); try { A.bag(); view = 'form'; rc(); } catch (e) {} } if (!pollT) pollT = setInterval(poll, 30000); poll(); step = 0; tab = 'p'; toast(T('أهلاً ' + (j.customer.name || ''), 'Welcome ' + (j.customer.name || ''))); draw(); load(); }

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
        : `<form id="af-otpv"><p>${T('أدخل الرمز المرسل إلى ' + E(sPh), 'Enter the code sent to ' + E(sPh))}</p><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" required autocomplete="one-time-code"><input name="name" placeholder="${T('اسمك (للحسابات الجديدة)', 'Your name (new accounts)')}"><button class="btn">${T('تحقق ودخول', 'Verify & sign in')}</button><button type="button" class="ln" data-x="mode" data-v="ph">${T('تغيير الرقم', 'Change number')}</button>${err}</form>`;
      else if (mode == 'em') f = sub == 'login'
        ? `<form id="af-log"><input name="email" type="email" placeholder="${T('البريد الإلكتروني', 'Email')}" required><input name="pw" type="password" placeholder="${T('كلمة السر', 'Password')}" required><button class="btn">${T('دخول', 'Sign in')}</button><button type="button" class="ln" data-x="sub" data-v="reg">${T('إنشاء حساب جديد', 'Create an account')}</button>${err}</form>`
        : `<form id="af-reg"><input name="name" placeholder="${T('الاسم', 'Name')}" required><input name="email" type="email" placeholder="${T('البريد الإلكتروني', 'Email')}" required><input name="pw" type="password" minlength="8" placeholder="${T('كلمة السر (8 أحرف على الأقل)', 'Password (min 8 chars)')}" required>${avPick('')}<button class="btn">${T('إنشاء الحساب', 'Create account')}</button><button type="button" class="ln" data-x="sub" data-v="login">${T('لدي حساب', 'I have an account')}</button>${err}</form>`;
      else f = `<div id="gbtn" class="gb">${cfg && cfg.google ? '' : T('تسجيل Google غير مُفعّل بعد', 'Google sign-in is not enabled yet')}</div>${err}`;
      b.innerHTML = `${head}<h3>${T('أهلاً بك في لاسي', 'Welcome to Lacey')}</h3><div class="act">${tabs}</div>${f}`;
      if (mode == 'gg') gsi();
      return;
    }
    const tabs = [['p', T('حسابي', 'Profile')], ['o', T('طلباتي', 'Orders')], ['r', T('الإيصالات', 'Receipts')], ['n', T('الإشعارات', 'Alerts')]].map(([k, n]) => `<button data-x="tab" data-v="${k}" class="${tab == k ? 'on' : ''}">${n}</button>`).join('');
    let c = '';
    if (tab == 'p') c = `<form id="af-prof">${avPick(me.avatar || '')}<input name="name" value="${E(me.name)}" placeholder="${T('الاسم', 'Name')}" required><input name="city" value="${E(me.city)}" placeholder="${T('المحافظة', 'City')}"><input name="area" value="${E(me.area)}" placeholder="${T('المنطقة', 'Area')}"><input name="lm" value="${E(me.lm)}" placeholder="${T('أقرب نقطة دالة', 'Landmark')}"><small>${E(me.ph || '')} ${E(me.email || '')}${me.ph ? '' : ' — ' + T('لم يُربط رقم واتساب بعد', 'no WhatsApp number linked')}</small><button class="btn">${T('حفظ', 'Save')}</button>${err}</form>${me.ph ? '' : phoneForm()}<button class="ln" data-x="out">${T('تسجيل الخروج', 'Sign out')}</button>`;
    else c = `<div id="acl"><p class="em">…</p></div>`;
    b.innerHTML = `${head}<h3>${E(me.name || me.email || me.ph)}</h3><div class="act">${tabs}</div>${c}`;
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
