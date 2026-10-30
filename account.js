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
  /* أفتارات مانغا/أنمي حديثة بناتية (SVG أصلي مولَّد). نخزّن المعرّف فقط */
  const SKN = ['#fff0e6', '#ffe0cc', '#f6c9a8', '#d9a07a'];
  const HAIR = [['#ff8fb8', '#d63a84', '#ffd1e3'], ['#b79bff', '#6a45d8', '#e4d8ff'], ['#2f3560', '#0f1230', '#7482c4'], ['#9a6240', '#5a3220', '#d9a37c'], ['#ffd37a', '#e39a2a', '#fff0c2'], ['#6fe0d2', '#1f9fa0', '#c8fff6']];
  const EYE = [['#aef0ff', '#1f6fe0'], ['#ffc0e2', '#c2287f'], ['#b6f5ae', '#23904a'], ['#ffe08a', '#d1741a'], ['#dcc6ff', '#6a37d6'], ['#a9f2ff', '#118aa6']];
  const BGS = [['#ffd6e8', '#c9b6ff'], ['#cfe3ff', '#e9d8ff'], ['#c9f5e4', '#d6ecff'], ['#ffe6c4', '#ffd0dc'], ['#e6d6ff', '#c4dcff'], ['#ffd9cf', '#ffe9b8']], OFS = [['#ff6f9f', '#fff'], ['#4d8cff', '#fff'], ['#2fbf8a', '#fff'], ['#ffa21f', '#3a2a40'], ['#8a5cf0', '#fff'], ['#ff7a54', '#fff']];
  function avSvg(id, cls) {
    const m = /^av(\d+)$/.exec(id || ''), n = m ? +m[1] - 1 : -1;
    if (n < 0 || n > 23) return '<svg class="' + (cls || 'avs') + '" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#eadfd6"/><circle cx="32" cy="26" r="11" fill="#c9b8aa"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#c9b8aa"/></svg>';
    const st = n % 6, v = n / 6 | 0, k = 'a' + n;
    const sk = SKN[(n * 3 + v) % 4], [h1, h2, h3] = HAIR[(st * 2 + v * 5 + n) % 6], [e1, e2] = EYE[(n * 7 + 3 + v * 2) % 6], [b1, b2] = BGS[(n * 5 + v) % 6], [of, oc] = OFS[(n * 7 + 1) % 6];
    const G = `url(#h${k})`, hi = (d, w = 1.3) => `<path d="${d}" stroke="${h3}" stroke-opacity=".65" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    let back = '', top = '', side = '', ahoge = '';
    if (st == 0) { back = `<path d="M12 36C9 14 20 3 32 3s23 11 20 33c-1 10 3 18 7 24-9 1-14-4-16-11V30H21v19c-2 7-7 12-16 11 4-6 8-14 7-24z" fill="${G}"/>`; side = `<path d="M17 28c-3 8-3 16-6 24 3-1 5-5 6-9z M47 28c3 8 3 16 6 24-3-1-5-5-6-9z" fill="${G}"/>`; ahoge = `<path d="M32 6c-3-5 2-6 5-3-3 0-3 2-5 3z" fill="${G}"/>`; }
    if (st == 1) { back = `<path d="M13 22C3 28 3 46 8 60c5-5 7-12 7-20z M51 22c10 6 10 24 5 38-5-5-7-12-7-20z" fill="${G}"/><path d="M14 30C13 11 22 3 32 3s19 8 18 27z" fill="${G}"/>`; top = `<circle cx="14" cy="21" r="3.2" fill="${of}"/><circle cx="50" cy="21" r="3.2" fill="${of}"/>`; }
    if (st == 2) { back = `<circle cx="32" cy="7.5" r="8" fill="${G}"/><path d="M12 32C12 12 21 5 32 5s20 7 20 27z" fill="${G}"/>`; side = `<path d="M16 30c-2 8-1 14 0 19 3-3 4-9 4-15z M48 30c2 8 1 14 0 19-3-3-4-9-4-15z" fill="${G}"/>`; top = `<path d="M24 10l8 4 8-4-3 7h-10z" fill="${of}"/><circle cx="32" cy="14" r="2" fill="#fff"/>`; }
    if (st == 3) { back = `<path d="M11 40C8 14 20 3 32 3s24 11 21 37c-1 5-5 8-9 6V30H20v16c-4 2-8-1-9-6z" fill="${G}"/>`; side = `<path d="M18 30c-2 7-2 12-1 16 3-2 5-6 5-12z M46 30c2 7 2 12 1 16-3-2-5-6-5-12z" fill="${G}"/>`; top = `<rect x="37" y="12" width="10" height="3.6" rx="1.8" fill="${of}" transform="rotate(-22 42 14)"/><rect x="38.4" y="9.8" width="10" height="3.6" rx="1.8" fill="${of}" transform="rotate(-22 43 12)" opacity=".85"/>`; }
    if (st == 4) { back = `<path d="M6 64C3 32 13 5 32 5s29 27 26 59z" fill="${of}"/><path d="M6 64C3 32 13 5 32 5" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none"/>`; }
    if (st == 5) { back = `<path d="M11 32C10 11 21 3 32 3s22 8 21 29c-1 9 4 13 7 20-6 5-14 1-16-6V30H20v16c-2 7-10 11-16 6 3-7 8-11 7-20z" fill="${G}"/><circle cx="8" cy="54" r="5" fill="${G}"/><circle cx="56" cy="54" r="5" fill="${G}"/>`; top = `<circle cx="46" cy="13" r="4" fill="#fff"/><circle cx="46" cy="13" r="1.7" fill="#ffb13d"/><circle cx="42.5" cy="11" r="2" fill="#ffd1e0"/><circle cx="49" cy="9.5" r="2" fill="#ffd1e0"/>`; }
    const face = `<path d="M16.5 31c0-10 6-17.5 15.5-17.5S47.5 21 47.5 31c0 8-3.4 15-9.2 19.4-2.2 1.6-4.4 2.2-6.3 2.2s-4.1-.6-6.3-2.2C19.9 46 16.5 39 16.5 31z" fill="${sk}"/><path d="M22 46c5 5 15 5 20 0-1 5-5 8-10 8s-9-3-10-8z" fill="#000" opacity=".05"/>`;
    const bangs = st == 4 ? `<path d="M13 40C11 17 21 8 32 8s21 9 19 32c-3-8-6-13-19-13s-16 5-19 13z" fill="${of}"/><path d="M13 40C11 17 21 8 32 8s21 9 19 32" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.3"/><path d="M20 30c4-5 20-5 24 0" stroke="#000" stroke-opacity=".08" stroke-width="2" fill="none"/>`
      : `<path d="M15.5 30c-1-12 6-19 16.500-19S49 18 48 30c-2-4-4-8-7-10-1 4-3 8-9 9-2-3-3-6-3-9-4 2-8 5-10 10z" fill="${G}"/><path d="M16 28c3-3 6-4 8-3M48 28c-3-3-6-4-8-3" stroke="${h2}" stroke-opacity=".5" stroke-width="1" fill="none"/>${hi('M21 17c3-3 8-4.500 13-3', 1.6)}${hi('M26 20c2-2 5-3 8-3', 1)}`;
    const eye = (x, f) => `<g transform="translate(${x} 36.600)${f ? ' scale(-.84 .84)' : ' scale(.84)'}"><path d="M-6.200-2.400C-5-7.200 5-7.400 6.200-3.600 6.800 1 5 6.500 0 7-5 6.600-6.700 2-6.200-2.400z" fill="#fff"/><ellipse cx="0" cy="1.200" rx="4.600" ry="5.800" fill="url(#e${k})"/><ellipse cx="0" cy="1.600" rx="4.600" ry="5.800" fill="none" stroke="${e2}" stroke-width=".7"/><ellipse cx="0" cy="2.200" rx="2.100" ry="3.200" fill="#150c28"/><path d="M-4.400-1.500C-2-4 2-4 4.400-1.500c-1-2.700-8-2.700-8.800 0z" fill="#000" opacity=".28"/><circle cx="-1.900" cy="-1.800" r="1.900" fill="#fff"/><circle cx="2.200" cy="4" r="1" fill="#fff"/><circle cx="2.800" cy="-.2" r=".55" fill="#fff"/><path d="M6.400-1.200C5.200-6.200-4.200-7.200-6.800-3.400l-1.700-1.500" stroke="#1d1030" stroke-width="1.15" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-6 6.200c2.500 1.600 8 1.600 11.500-.2" stroke="#1d1030" stroke-opacity=".35" stroke-width=".6" fill="none"/></g>`;
    const face2 = `${eye(23.4, 0)}${eye(40.6, 1)}<path d="M18.600 29.200q5-3.200 10 .200M35.400 29.400q5-3.400 10-.2" stroke="${h2}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M32 43.200l-.7.8h1.200" stroke="#c98474" stroke-width=".8" fill="none" stroke-linecap="round"/><path d="M29.600 47q2.400 1.900 4.800 0" stroke="#c0405f" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="20.400" cy="43" rx="3.200" ry="1.900" fill="#ff6f95" opacity=".4"/><ellipse cx="43.600" cy="43" rx="3.200" ry="1.900" fill="#ff6f95" opacity=".4"/><path d="M19 42l1 1.800M21 42l1 1.800M45 42l-1 1.800M43 42l-1 1.800" stroke="#ff4f80" stroke-opacity=".5" stroke-width=".5"/>`;
    const outfit = st == 1 || st == 5 ? `<path d="M8 64c1-11 10-16 24-16s23 5 24 16z" fill="${of}"/><path d="M24 49l8 9 8-9" fill="#fff"/><path d="M32 52l-3 6h6z" fill="${oc == '#fff' ? '#ff4f80' : '#fff'}"/>` : st == 0 || st == 3 ? `<path d="M8 64c1-11 10-16 24-16s23 5 24 16z" fill="${of}"/><path d="M22 49c3 6 17 6 20 0l3 3c-5 9-21 9-26 0z" fill="#fff" opacity=".92"/><path d="M26 54l6-3 6 3-6 2z" fill="${of}"/>` : `<path d="M8 64c1-11 10-16 24-16s23 5 24 16z" fill="${of}"/><path d="M25 49q7 7 14 0l-2 7q-5 3-10 0z" fill="#fff" opacity=".9"/><circle cx="27" cy="57" r="1" fill="${oc}"/><circle cx="37" cy="57" r="1" fill="${oc}"/>`;
    const sparkle = (x, y, s) => `<path d="M${x} ${y - s}l${s * .28} ${s * .72} ${s * .72} ${s * .28}-${s * .72} ${s * .28}-${s * .28} ${s * .72}-${s * .28}-${s * .72}-${s * .72}-${s * .28} ${s * .72}-${s * .28}z" fill="#fff" opacity=".95"/>`;
    return `<svg class="${cls || 'avs'}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="h${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${h1}"/><stop offset=".55" stop-color="${h1}"/><stop offset="1" stop-color="${h2}"/></linearGradient><linearGradient id="e${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${e2}"/><stop offset=".55" stop-color="${e1}"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="b${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs><rect width="64" height="64" fill="url(#b${k})"/><circle cx="12" cy="52" r="9" fill="#fff" opacity=".18"/><circle cx="54" cy="20" r="6" fill="#fff" opacity=".2"/>${sparkle(54, 9, 4.500)}${sparkle(9, 18, 3)}${sparkle(55, 44, 2.500)}${back}${outfit}<rect x="28.200" y="44" width="7.600" height="7" rx="3" fill="${sk}"/><path d="M28.200 47.500q3.800 2.600 7.600 0v-2h-7.600z" fill="#000" opacity=".07"/>${face}${side}${bangs}${top}${face2}</svg>`;
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
