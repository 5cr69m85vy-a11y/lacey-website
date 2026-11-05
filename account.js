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
  const ICO = {'bell': '<path d="M6 17V11a6 6 0 0112 0v6l2 2H4z"/><path d="M10 21h4"/>', 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.200"/>', 'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'tickall': '<path d="M3 12l4 4 8-9M12 16l1 1 8-9"/>', 'headset': '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-5 2"/>', 'flower': '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C12 6 13 3 12 3s-0 3-0 6.5M12 14.5c0 3.500 1 6.500 0 6.500s0-3 0-6.500M9.500 12C6 12 3 11 3 12s3 0 6.500 0M14.500 12c3.500 0 6.500-1 6.500 0s-3 0-6.500 0"/>', 'box': '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', 'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100"/>', 'receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', 'flask': '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.500 15h9"/>', 'scale': '<path d="M12 4v16M6 20h12M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>', 'list': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>', 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>', 'moon': '<path d="M20 14.500A8 8 0 019.500 4 8 8 0 1020 14.500z"/>', 'flame': '<path d="M12 22c4 0 7-2.500 7-7 0-3-2-5-3-7-1 2-2 2.500-3 2 0-3-1-6-3-8 0 4-5 6-5 12 0 4.500 3 8 7 8z"/>', 'warn': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', 'check': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'};
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
    if (true) return '<svg class="' + (cls || 'avs') + '" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#eadfd6"/><circle cx="32" cy="26" r="11" fill="#c9b8aa"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#c9b8aa"/></svg>';
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
  function bellDraw(items) { bell.style.display = me ? '' : 'none'; if (!me) return; const n = (items || []).filter(i => i.unread).length, b = document.getElementById('belln'); if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'flex' : 'none'; } }
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
    if (x === 'ohide') { const all = v === '*'; oItems = oItems.filter(o => all ? o.s !== 0 : o.code !== v); drawOrders(); metaDraw(); return nAct('/me/orders/hide', all ? { all: true } : { code: v }); }
    if (x === 'of') { oFilter = v; return drawOrders(); }
    if (x === 'rcopy') { try { await navigator.clipboard.writeText(v); toast(T('تم النسخ', 'Copied')); } catch (e) { toast(v); } return; }
    if (x === 'rprint') { const card = el.closest('.rcp'); if (card) { card.classList.add('prn'); document.body.classList.add('prn-one'); setTimeout(() => { window.print(); card.classList.remove('prn'); document.body.classList.remove('prn-one'); }, 50); } return; }
    if (x === 'reorder') { const o = oItems.find(z => z.code === v); if (!o) return; let n = 0, miss = 0; o.items.forEach(i => { const p = prodOf(i.c); if (!p || (p.left !== undefined && p.left <= 0)) { miss++; return; } const q = Math.min(i.q || 1, p.left !== undefined ? p.left : 99); cart[i.c] = (cart[i.c] || 0) + q; n++; }); if (typeof save == 'function') save(); if (typeof rcount == 'function') rcount(); toast(n ? T('أُضيفت المنتجات للسلة' + (miss ? ' (بعضها غير متوفر الآن)' : ''), 'Added to your bag' + (miss ? ' (some unavailable)' : '')) : T('المنتجات غير متوفرة حالياً', 'Items unavailable right now')); if (n && window.lcNav) lcNav('/cart'); return; }
    if (x === 'nf') { nFilter = v; return drawNotifs(); }
    if (x === 'nread') { nItems.forEach(n => n.unread = false); drawNotifs(); bellDraw(nItems); return nAct('/me/notifications/read', { all: true }); }
    if (x === 'nclear') { nItems = []; drawNotifs(); bellDraw(nItems); return nAct('/me/notifications/hide', { all: true }); }
    if (x === 'ndel') { const id = +el.dataset.id; nItems = nItems.filter(n => n.id !== id); drawNotifs(); bellDraw(nItems); return nAct('/me/notifications/hide', { id }); }
    if (x === 'nopen') { const id = +el.dataset.id, n = nItems.find(z => z.id === id), href = el.dataset.href; if (n && n.unread) { n.unread = false; bellDraw(nItems); nAct('/me/notifications/read', { id }); } if (href) { if (window.lcNav) lcNav(href); } else drawNotifs(); return; }
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
      else if (f.id === 'af-reg') { done(await call('/auth/register', { email: v.email, pw: v.pw, name: v.name, birth: v.birth || '', mkt: !!v.mkt })); }
      else if (f.id === 'af-log') { done(await call('/auth/login', { email: v.email, pw: v.pw })); }
      else if (f.id === 'af-prof') { await call('/me', { name: v.name, city: v.city, area: v.area, lm: v.lm, skin: v.skin || '', birth: v.birth || '' }); me = { ...me, name: v.name, city: v.city, area: v.area, lm: v.lm }; setSession(tok, me); toast(T('تم الحفظ', 'Saved')); }
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
        : `<form id="af-reg"><input name="name" placeholder="${T('الاسم', 'Name')}" required><input name="email" type="email" placeholder="${T('البريد الإلكتروني', 'Email')}" required><input name="pw" type="password" minlength="8" placeholder="${T('كلمة السر (8 أحرف على الأقل)', 'Password (min 8 chars)')}" required>${dobField(true)}<label class="dob" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="mkt" style="width:auto"> ${T('أوافق على استلام العروض والأكواد (يمكنك الإلغاء لاحقاً)', 'I agree to receive offers and codes (you can opt out any time)')}</label><button class="btn">${T('إنشاء الحساب', 'Create account')}</button><button type="button" class="ln" data-x="sub" data-v="login">${T('لدي حساب', 'I have an account')}</button>${err}</form>`;
      else f = `<div id="gbtn" class="gb">${cfg && cfg.google ? '' : T('تسجيل Google غير مُفعّل بعد', 'Google sign-in is not enabled yet')}</div>${err}`;
      b.innerHTML = `${head}<h3>${T('أهلاً بك في لاسي', 'Welcome to Lacey')}</h3><div class="act">${tabs}</div>${f}`;
      if (mode == 'gg') gsi();
      return;
    }
    const tabs = [['p', T('حسابي', 'Profile')], ['o', T('طلباتي', 'Orders')], ['r', T('الإيصالات', 'Receipts')], ['n', T('الإشعارات', 'Alerts')]].map(([k, n]) => `<button data-x="tab" data-v="${k}" class="${tab == k ? 'on' : ''}">${n}</button>`).join('');
    let c = '';
    if (tab == 'p') c = `<form id="af-prof"><input name="name" value="${E(me.name)}" placeholder="${T('الاسم', 'Name')}" required><input name="city" value="${E(me.city)}" placeholder="${T('المحافظة', 'City')}"><input name="area" value="${E(me.area)}" placeholder="${T('المنطقة', 'Area')}"><input name="lm" value="${E(me.lm)}" placeholder="${T('أقرب نقطة دالة', 'Landmark')}">${me.birth ? `<small>${T('تاريخ الميلاد', 'Birth date')}: ${E(me.birth)} · ${me.age} ${T('سنة', 'y')}</small>` : `<div class="dob" style="background:#fff4d6;padding:10px;border-radius:12px"><b>${T('أضف تاريخ ميلادك لتتمكن من الطلب', 'Add your birth date to place orders')}</b>${dobField(true, true)}</div>`}<label class="dob">${T('نوع بشرتك (يساعد في صفحة روتين)', 'Skin type (used by Routine)')}<select name="skin"><option value="">—</option>${SK.map(([k, n, en]) => `<option value="${k}" ${me.skin == k ? 'selected' : ''}>${T(n, en)}</option>`).join('')}</select></label><small>${E(me.ph || '')} ${E(me.email || '')}${me.ph ? '' : ' — ' + T('لم يُربط رقم واتساب بعد', 'no WhatsApp number linked')}</small><button class="btn">${T('حفظ', 'Save')}</button>${err}</form>${me.ph ? '' : phoneForm()}<button class="ln" data-x="out">${T('تسجيل الخروج', 'Sign out')}</button>`;
    else c = `${tab == 'o' ? `<a class="ln" href="/tracking">${lcIco('box')} ${T('تتبع طلب برمز الطلب', 'Track an order by code')}</a>` : ''}<div id="acl"><p class="em">…</p></div>`;
    const tiles = `<div class="tiles2"><a href="/help"><b>${lcIco('headset')} ${T('خدمة الزبائن', 'Customer service')}</b><small>${T('محادثة وأسئلة شائعة', 'Chat & FAQ')}</small></a><a href="/routine/support"><b>${lcIco('flower')} ${T('دعم روتين', 'Routine support')}</b><small>${T('استشارة بشرة', 'Skin advice')}</small></a><a href="/tracking"><b>${lcIco('box')} ${T('تتبع الطلب', 'Track order')}</b><small>${T('برمز الطلب', 'By order code')}</small></a><a href="/preferences"><b>${lcIco('gear')} ${T('الإعدادات', 'Settings')}</b><small>${T('اللغة والخصوصية', 'Language & privacy')}</small></a></div>`;
    b.innerHTML = `${head}<div class="pcard"><span class="pav">${avSvg('', 'avl')}</span><div><h3>${E(me.name || me.email || me.ph)}</h3><small>${E(me.ph || me.email || '')}${me.city ? ' · ' + E(me.city) : ''}</small></div></div><div id="acs" class="pstats"></div>${tiles}<div class="act">${tabs}</div>${c}`;
    setTimeout(metaDraw, 0);
  }
  const phoneForm = () => step == 1 && tab == 'p'
    ? `<form id="af-otpv" class="ph"><input name="code" inputmode="numeric" maxlength="6" placeholder="000000" required><input type="hidden" name="name" value="${E(me.name)}"><button class="btn">${T('تأكيد الرقم', 'Confirm number')}</button>${err}</form>`
    : `<form id="af-ph" class="ph"><p>${T('اربط رقم واتساب لتصلك إشعارات الطلب', 'Link your WhatsApp number for order updates')}</p><input name="ph" type="tel" inputmode="numeric" maxlength="11" placeholder="07XXXXXXXXX" required><button class="btn">${T('إرسال الرمز', 'Send code')}</button>${err}</form>`;
  const ST = ['ملغى', 'تم الاستلام', 'تم التأكيد', 'تم الشحن', 'في الطريق', 'تم التوصيل'], STE = ['Cancelled', 'Received', 'Confirmed', 'Shipped', 'On the way', 'Delivered'];
  const dt = t => new Date(t).toLocaleString(lang == 'en' ? 'en-GB' : 'ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  /* ---------- الطلبات: بطاقات بمراحل التوصيل، فلاتر، إعادة الطلب ---------- */
  let oItems = [], oFilter = 'all';
  const STEPS5 = [['استلام', 'Received'], ['تأكيد', 'Confirmed'], ['شحن', 'Shipped'], ['بالطريق', 'On the way'], ['توصيل', 'Delivered']];
  const prodOf = code => (typeof S !== 'undefined' && S.P || []).find(p => String(p.c) === String(code));
  function drawOrders(el) {
    el = el || document.getElementById('acl'); if (!el || tab != 'o') return;
    const live = oItems.filter(o => o.s !== 0), act = o => o.s >= 1 && o.s <= 4, L = oItems.filter(o => oFilter === 'all' ? o.s !== 0 : oFilter === 'active' ? act(o) : oFilter === 'done' ? o.s === 5 : o.s === 0);
    const chips = [['all', T('الكل', 'All'), live.length], ['active', T('جارية', 'In progress'), oItems.filter(act).length], ['done', T('مكتملة', 'Delivered'), oItems.filter(o => o.s === 5).length], ['cancel', T('ملغاة', 'Cancelled'), oItems.filter(o => o.s === 0).length]];
    el.innerHTML = `<div class="nt-chips" style="margin-bottom:10px">${chips.map(([k, n, v]) => `<button type="button" data-x="of" data-v="${k}" class="${oFilter === k ? 'on' : ''}">${n}${v ? ' (' + v + ')' : ''}</button>`).join('')}</div>` + (oFilter === 'cancel' && L.length > 1 ? `<div class="nt-acts" style="margin-bottom:8px"><button type="button" data-x="ohide" data-v="*">${lcIco('trash')} ${T('حذف كل الملغاة', 'Remove all cancelled')}</button></div>` : '') + (L.length ? L.map(o => {
      const pct = o.s === 0 ? 0 : Math.round((Math.min(o.s, 5) - 1) / 4 * 100), ths = o.items.slice(0, 4).map(i => { const p = prodOf(i.c); return `<i class="od-th" style="${p && p.i ? `background-image:url('${E(p.i)}')` : ''}"></i>`; }).join(''), more = o.items.length > 4 ? `<em class="od-m">+${o.items.length - 4}</em>` : '';
      return `<div class="od s${o.s}"><div class="od-h"><div><b>${E(o.code)}</b><small>${dt(o.t)}</small></div><span class="st s${o.s}">${T(ST[o.s], STE[o.s])}</span></div>
        ${o.s === 0 ? `<p class="od-x">${lcIco('warn')} ${T('تم إلغاء هذا الطلب', 'This order was cancelled')}</p>` : `<div class="od-p"><i style="width:${pct}%"></i>${STEPS5.map((s, i) => `<span class="${i < o.s ? 'on' : ''}"><u></u><small>${T(s[0], s[1])}</small></span>`).join('')}</div>`}
        <div class="od-i"><div class="od-ths">${ths}${more}</div><div class="od-n">${o.items.map(i => `<div>${i.q}× ${E(i.n)}${i.cc ? ' (' + E(i.cc) + ')' : ''}</div>`).join('')}</div></div>
        <div class="od-t"><span>${o.pay == 'cod' ? T('دفع عند الاستلام', 'Cash on delivery') : E(o.pay)}${o.discount ? ' · ' + T('خصم', 'Discount') + ' ' + num(o.discount) : ''}</span><b>${num(o.total)} ${T('د.ع', 'IQD')}</b></div>
        <div class="od-b"><a class="ln" href="/tracking?c=${E(o.code)}">${lcIco('box')} ${T('تتبع', 'Track')}</a><button type="button" class="ln" data-x="reorder" data-v="${E(o.code)}">${T('أعيدي الطلب', 'Order again')}</button>${o.s === 0 ? `<button type="button" class="ln od-del" data-x="ohide" data-v="${E(o.code)}">${lcIco('trash')} ${T('حذف من القائمة', 'Remove')}</button>` : ''}${o.receipt ? `<button type="button" class="ln" data-x="tab" data-v="r">${lcIco('receipt')} ${T('الإيصال', 'Receipt')}</button>` : ''}</div></div>`;
    }).join('') : `<p class="em nt-empty">${lcIco('box')}<br>${oItems.length ? T('لا طلبات في هذا التصنيف', 'No orders in this filter') : T('لا توجد طلبات بعد — ابدئي من الصفحة الرئيسية 🌸', 'No orders yet')}</p>`);
  }
  /* ملخص أعلى الصفحة + شارات البلاطات (طلبات جارية، ردود دعم غير مقروءة، إشعارات) */
  async function metaDraw() {
    const box = document.getElementById('acs'); if (!box || !me) return;
    if (!oItems.length) { try { oItems = (await call('/me/orders')).orders; } catch (e) {} }
    const act = oItems.filter(o => o.s >= 1 && o.s <= 4).length, un = nItems.filter(n => n.unread).length, sk = SK.find(s => s[0] === me.skin);
    box.innerHTML = `<span>${lcIco('box')} <b>${oItems.length}</b> ${T('طلب', 'orders')}</span>${act ? `<span class="on">${lcIco('flame')} <b>${act}</b> ${T('جارية', 'in progress')}</span>` : ''}${sk ? `<span>${lcIco('flower')} ${T(sk[1], sk[2])}</span>` : ''}${un ? `<span class="on">${lcIco('bell')} <b>${un}</b> ${T('جديدة', 'new')}</span>` : ''}`;
    const bd = (sel, n) => { const t = document.querySelector('.tiles2 ' + sel + ' b'); if (!t) return; let i = t.querySelector('.tb'); if (!n) { if (i) i.remove(); return; } if (!i) { i = document.createElement('i'); i.className = 'tb'; t.appendChild(i); } i.textContent = n > 9 ? '9+' : n; };
    bd('a[href="/help"]', nItems.filter(n => n.unread && n.kind === 'support' && n.href === '/help/chat').length);
    bd('a[href="/routine/support"]', nItems.filter(n => n.unread && n.kind === 'support' && n.href === '/routine/support').length);
    bd('a[href="/tracking"]', act);
    const tn = document.querySelector('.act [data-v="n"]'); if (tn) { let i = tn.querySelector('.tb'); if (un) { if (!i) { i = document.createElement('i'); i.className = 'tb'; tn.appendChild(i); } i.textContent = un > 9 ? '9+' : un; } else if (i) i.remove(); }
    const to = document.querySelector('.act [data-v="o"]'); if (to) { let i = to.querySelector('.tb'); if (act) { if (!i) { i = document.createElement('i'); i.className = 'tb'; to.appendChild(i); } i.textContent = act; } else if (i) i.remove(); }
  }
  /* مزامنة السلة مع الحساب (لتذكير السلة المتروكة) */
  let cst = 0;
  window.cartSync = () => { if (!tok) return; clearTimeout(cst); cst = setTimeout(() => { try { call('/me/cart', { items: typeof cart == 'object' ? cart : {} }).catch(() => {}); } catch (e) {} }, 3500); };
  /* ---------- مركز الإشعارات ---------- */
  let nItems = [], nFilter = 'all';
  const NK = { order: ['box', 'طلباتي', 'Orders', '#2e7d8a'], support: ['headset', 'الدعم', 'Support', '#7a3fb0'], promo: ['tag', 'العروض', 'Offers', '#c2185b'], remind: ['bell', 'تذكير', 'Reminder', '#b7791f'], system: ['flower', 'عام', 'General', '#6b8a8a'] };
  const ago = t => { const m = Math.floor((Date.now() - t) / 6e4); return m < 1 ? T('الآن', 'Just now') : m < 60 ? T('قبل ' + m + ' د', m + ' min ago') : m < 1440 ? T('قبل ' + Math.floor(m / 60) + ' ساعة', Math.floor(m / 60) + ' h ago') : new Date(t).toLocaleTimeString(lang == 'en' ? 'en-GB' : 'ar-IQ', { hour: '2-digit', minute: '2-digit' }); };
  const dayLabel = t => { const d = new Date(t), n = new Date(), k = x => x.toDateString(), y = new Date(Date.now() - 864e5); return k(d) === k(n) ? T('اليوم', 'Today') : k(d) === k(y) ? T('أمس', 'Yesterday') : d.toLocaleDateString(lang == 'en' ? 'en-GB' : 'ar-IQ', { dateStyle: 'medium' }); };
  function drawNotifs(el) {
    el = el || document.getElementById('acl'); if (!el || tab != 'n') return;
    const un = nItems.filter(x => x.unread).length, L = nItems.filter(x => nFilter === 'all' ? true : nFilter === 'unread' ? x.unread : x.kind === nFilter);
    const chips = [['all', T('الكل', 'All')], ['unread', T('غير المقروء', 'Unread') + (un ? ' (' + un + ')' : '')], ['order', T('الطلبات', 'Orders')], ['support', T('الدعم', 'Support')], ['promo', T('العروض', 'Offers')], ['remind', T('تذكيرات', 'Reminders')]];
    let last = '', body = '';
    L.forEach(n => { const g = dayLabel(n.t); if (g !== last) { last = g; body += `<h4 class="nt-day">${E(g)}</h4>`; } const k = NK[n.kind] || NK.system;
      body += `<div class="nt ${n.unread ? 'un' : ''}" data-x="nopen" data-id="${n.id}" data-href="${E(n.href || '')}" role="${n.href ? 'link' : 'article'}" tabindex="0"><span class="nt-i" style="--c:${k[3]}">${lcIco(k[0])}</span><div class="nt-b"><div class="nt-h"><b>${E(n.title)}</b><small>${ago(n.t)}</small></div>${n.text ? `<p>${E(n.text)}</p>` : ''}<div class="nt-f"><span class="nt-k" style="--c:${k[3]}">${T(k[1], k[2])}</span>${n.href ? `<span class="nt-go">${T('افتحي', 'Open')} ›</span>` : ''}</div></div>${n.unread ? '<i class="nt-d"></i>' : ''}<button type="button" class="nt-x" data-x="ndel" data-id="${n.id}" aria-label="${T('حذف', 'Delete')}">${lcIco('trash')}</button></div>`; });
    el.innerHTML = `<div class="nt-bar"><div class="nt-chips">${chips.map(([k, n]) => `<button type="button" data-x="nf" data-v="${k}" class="${nFilter === k ? 'on' : ''}">${n}</button>`).join('')}</div>${nItems.length ? `<div class="nt-acts"><button type="button" data-x="nread" ${un ? '' : 'disabled'}>${lcIco('tickall')} ${T('قراءة الكل', 'Mark all read')}</button><button type="button" data-x="nclear">${lcIco('trash')} ${T('مسح الكل', 'Clear all')}</button></div>` : ''}</div>${body || `<p class="em nt-empty">${lcIco('flower')}<br>${nItems.length ? T('لا إشعارات في هذا التصنيف', 'Nothing in this filter') : T('لا إشعارات بعد — سنخبرك عند أي تحديث على طلباتك أو ردود الدعم.', 'No notifications yet — we will tell you about orders and support replies.')}</p>`}`;
  }
  async function nAct(path, body) { try { await call(path, body); } catch (e) {} }
  async function load() {
    const el = document.getElementById('acl'); if (!el || !me) return;
    try {
      if (tab == 'o') {
        oItems = (await call('/me/orders')).orders; drawOrders(el); metaDraw();
      } else if (tab == 'r') {
        const j = await call('/me/receipts');
        el.innerHTML = j.receipts.length ? j.receipts.map(r => `<div class="rcp"><div class="rcp-h"><span class="rcp-i">${lcIco('receipt')}</span><div><b>${E(r.number)}</b><small>${T('الطلب', 'Order')} ${E(r.code)} · ${dt(r.t)}</small></div></div>
          <div class="rcp-l">${(r.items || []).map(i => `<div><span>${i.q}× ${E(i.n)}</span><b>${num(i.p * i.q)}</b></div>`).join('')}</div>
          ${r.discount ? `<div class="rcp-r"><span>${T('الخصم', 'Discount')}</span><b>− ${num(r.discount)}</b></div>` : ''}${r.shipping ? `<div class="rcp-r"><span>${T('التوصيل', 'Delivery')}</span><b>${num(r.shipping)}</b></div>` : ''}
          <div class="rcp-t"><span>${T('المجموع', 'Total')}</span><b>${num(r.total)} ${T('د.ع', 'IQD')}</b></div>${r.name || r.addr ? `<small class="rcp-a">${E(r.name || '')}${r.addr ? ' — ' + E(r.addr) : ''}</small>` : ''}
          <div class="rcp-b"><button type="button" class="ln" data-x="rcopy" data-v="${E(r.number)}">${T('نسخ رقم الإيصال', 'Copy receipt no.')}</button><button type="button" class="ln" data-x="rprint" data-v="${E(r.number)}">${T('طباعة', 'Print')}</button></div></div>`).join('') : `<p class="em nt-empty">${lcIco('receipt')}<br>${T('تصدر الإيصالات بعد تأكيد الطلب', 'Receipts are issued once an order is confirmed')}</p>`;
      } else if (tab == 'n') {
        const j = await call('/me/notifications'); nItems = j.items; drawNotifs(el); bellDraw(nItems);
        if (nItems[0]) { lastN = Math.max(lastN, nItems[0].t); ls.set('lc_ln', lastN); }
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
      nItems = j.items; bellDraw(j.items); if (tab == 'n' && document.getElementById('acl')) drawNotifs();
      const fresh = j.items.filter(n => n.t > lastN && n.unread && (n.tpl === 'order_status' || n.tpl === 'chat_reply'));
      if (lastN && fresh.length) toast(fresh[0].title + (fresh[0].text ? ' — ' + fresh[0].text : ''));
      if (j.items[0]) { lastN = Math.max(lastN, j.items[0].t); ls.set('lc_ln', lastN); }
    } catch (e) {}
  }
  (async () => { try { cfg = await call('/auth/config'); } catch (e) { cfg = {}; } btn(); if (tok) { refresh(); poll(); pollT = setInterval(poll, 30000); } })();
  btn();
})();
