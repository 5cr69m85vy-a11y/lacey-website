/* account.js — حساب الزبون: دخول (هاتف/بريد/Google)، الملف، طلباتي، الإيصالات، الإشعارات */
(function () {
  'use strict';
  const T = (ar, en) => (typeof lang !== 'undefined' && lang == 'en') ? en : ar;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('en-US');
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} } };
  let pollT = 0, tok = ls.get('lc_ct') || '', me = null, tab = 'h', sum = null, wCodes = null, aItems = null, rvData = null, rvPick = '', mode = 'ph', sub = 'login', cfg = null, step = 0, sPh = '', busy = false, lastN = +ls.get('lc_ln') || 0;
  try { me = JSON.parse(ls.get('lc_me') || 'null') } catch (e) {}
  window.custAuth = () => tok ? { Authorization: 'Bearer ' + tok } : {};
  /* أيقونات خطية موحّدة بدل الإيموجي */
  const ICO = {'bell': '<path d="M6 17V11a6 6 0 0112 0v6l2 2H4z"/><path d="M10 21h4"/>', 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.200"/>', 'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 'tickall': '<path d="M3 12l4 4 8-9M12 16l1 1 8-9"/>', 'headset': '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-5 2"/>', 'flower': '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5C12 6 13 3 12 3s-0 3-0 6.5M12 14.5c0 3.500 1 6.500 0 6.500s0-3 0-6.500M9.500 12C6 12 3 11 3 12s3 0 6.500 0M14.500 12c3.500 0 6.500-1 6.500 0s-3 0-6.500 0"/>', 'box': '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>', 'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100"/>', 'receipt': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', 'flask': '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.500 15h9"/>', 'scale': '<path d="M12 4v16M6 20h12M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>', 'list': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>', 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>', 'moon': '<path d="M20 14.500A8 8 0 019.500 4 8 8 0 1020 14.500z"/>', 'flame': '<path d="M12 22c4 0 7-2.500 7-7 0-3-2-5-3-7-1 2-2 2.500-3 2 0-3-1-6-3-8 0 4-5 6-5 12 0 4.500 3 8 7 8z"/>', 'warn': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>', 'heart': '<path d="M12 21s-8-5.500-8-11a4.500 4.500 0 018-2.500A4.500 4.500 0 0120 10c0 5.500-8 11-8 11z"/>', 'star': '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>', 'pin': '<path d="M12 22s7-6.500 7-12a7 7 0 10-14 0c0 5.500 7 12 7 12z"/><circle cx="12" cy="10" r="2.500"/>', 'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', 'shield': '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>', 'out': '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>', 'check': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'};
  window.lcIco = (n, c) => `<svg class="ico ${c || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICO[n] || ''}</svg>`;
  window.custMe = () => me;
  window.accountRefresh = () => refresh();
  window.wishPush = (c, on) => { if (!tok) return; call('/me/wish', on ? { add: [c] } : { remove: [c] }).then(j => { wCodes = j.codes; if (sum) sum.wishlist = j.codes.length; }).catch(() => {}); };
  async function wishMerge() { if (!tok || typeof favs == 'undefined') return; try { const j = await call('/me/wish', { add: [...favs] }); wCodes = j.codes; let ch = 0; j.codes.forEach(c => { if (!favs.has(c)) { favs.add(c); ch = 1; } }); if (ch) { favSave(); if (typeof render == 'function') render(); } } catch (e) {} }
  window.accountSignOut = () => { setSession('', null); tab = 'h'; sum = null; wCodes = null; };
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
  const avAny = (c) => me && me.photo ? '<img class="' + (c || 'avs') + ' ph" src="' + E(me.photo) + '" alt="" loading="lazy" decoding="async">' : avSvg(me && me.avatar, c);
  function btn() { const b = document.getElementById('accb'); if (!b) return; b.title = me ? me.name || me.email || me.ph : T('تسجيل الدخول', 'Sign in'); b.classList.toggle('on', !!me); b.innerHTML = '<i class="bni">' + (me ? avAny() : GUEST) + '</i><small>' + T('حسابي', 'Account') + '</small>'; if (me) { const e = b.querySelector('.bni').firstElementChild; if (e) e.classList.add('avs'); } }

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
  bell.addEventListener('click', () => { window.lcNav ? lcNav('/notifications') : open('n'); });
  let bellSeen = +ls.get('lc_bell') || 0;
  function bellDraw(items) { bell.style.display = me ? '' : 'none'; if (!me) return; const n = (items || []).filter(i => i.unread).length, b = document.getElementById('belln'); if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'flex' : 'none'; } }
  window.bellDraw = bellDraw;
  const body = () => document.getElementById('acb');
  let solo = false;
  const open = (t, s) => { solo = !!s; if (t) tab = t; ov.classList.add('on'); draw(); if (me) refresh(); };
  const close = silent => { ov.classList.remove('on', 'pgv'); if (silent !== true && window.lcBack) lcBack(solo ? 'notifications' : 'account'); };
  window.accountShow = (t, s) => { ov.classList.add('pgv'); open(t, s); };
  window.accountHide = () => close(true);
  const SLUG = { h: '', p: 'profile', o: 'orders', r: 'receipts', n: 'alerts', w: 'points', f: 'wishlist', v: 'reviews', s: 'skin', u: 'routine', a: 'addresses', y: 'privacy' };
  let LPd = 0; const lpLoad = () => { if (LPd || !me) return; LPd = 1; call('/me/points').then(j => { window.LP = j; if (document.getElementById('acl') || document.getElementById('ab') === null) draw(); }).catch(() => {}); };
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
    if (x === 'lang') { if (typeof setLang == 'function') { setLang(lang == 'en' ? 'ar' : 'en'); } return draw(); }
    if (x === 'go') { close(true); return window.lcNav ? lcNav(v) : (location.href = v); }
    if (x === 'pick') { const inp = document.getElementById('phin'); if (inp) inp.click(); return; }
    if (x === 'pdel') { try { await call('/me/photo', null, 'DELETE'); me = { ...me, photo: '' }; setSession(tok, me); draw(); toast(T('تم حذف الصورة', 'Photo removed')); } catch (e) { toast(e.message); } return; }
    if (x === 'wdel') { try { const j = await call('/me/wish', { remove: [v] }); wCodes = j.codes; favs.delete(v); favSave(); if (sum) sum.wishlist = wCodes.length; draw(); load(); } catch (e) { toast(e.message); } return; }
    if (x === 'wcart') { const p = prodOf(v); if (!p || (p.left !== undefined && p.left <= 0)) return toast(T('غير متوفر حالياً', 'Unavailable right now')); cart[v] = (cart[v] || 0) + 1; if (typeof save == 'function') save(); if (typeof rcount == 'function') rcount(); return toast(T('أُضيف للسلة', 'Added to your bag')); }
    if (x === 'wopen') { close(true); return window.lcNav ? lcNav('/p/' + encodeURIComponent(v)) : 0; }
    if (x === 'adef') { try { await call('/me/addr/default', { id: +v }); me = { ...me }; aItems = null; refresh(); load(); } catch (e) { toast(e.message); } return; }
    if (x === 'adel') { try { await call('/me/addr?id=' + (+v), null, 'DELETE'); aItems = null; if (sum) sum.addresses--; load(); refresh(); } catch (e) { toast(e.message); } return; }
    if (x === 'rv') { rvPick = v; return load(); }
    if (x === 'star') { const f = el.closest('form'), inp = f.querySelector('[name=rating]'); inp.value = v; f.querySelectorAll('.stars button').forEach(b => b.classList.toggle('on', +b.dataset.v <= +v)); return; }
    if (x === 'mkt') { try { await call('/me', { mkt: !!el.checked }); me = { ...me, mkt: !!el.checked }; setSession(tok, me); toast(T('تم الحفظ', 'Saved')); } catch (e) { toast(e.message); } return; }
    if (x === 'mode') { mode = v; step = 0; return draw(); }
    if (x === 'sub') { sub = v; return draw(); }
    if (x === 'tab' && v === 'n' && window.lcNav) return lcNav('/notifications');
    if (x === 'tab') { const b0 = document.getElementById('acb'); tab = v; draw(); if (window.lcUrl) lcUrl('/account' + (SLUG[v] ? '/' + SLUG[v] : '')); b0 && (b0.scrollTop = 0); return load(); }
    if (x === 'out') { try { await call('/auth/logout', {}) } catch (_) {} setSession('', null); tab = 'h'; sum = null; wCodes = null; return draw(); }
    if (x === 'trk') { const box = document.getElementById('acT' + v); if (box && typeof trkMount == 'function') { box.innerHTML = ''; trkMount(v, (me && me.ph) || '', '#acT' + v); } return; }
  });
  ov.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'phin' && t.files && t.files[0]) {
      const f = t.files[0]; t.value = '';
      if (!/^image\//.test(f.type)) return toast(T('اختر ملف صورة', 'Choose an image file'));
      try {
        const bmp = await createImageBitmap(f), side = Math.min(bmp.width, bmp.height), cv = document.createElement('canvas'); cv.width = cv.height = 320;
        cv.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 320, 320);
        const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', .85));
        const r = await fetch(base() + '/me/photo', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...custAuth() }, body: blob }), j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'error');
        me = { ...me, photo: j.photo }; setSession(tok, me); draw(); toast(T('تم تحديث صورتك', 'Photo updated'));
      } catch (x) { toast(x.message || T('تعذر رفع الصورة', 'Could not upload the photo')); }
    }
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
      else if (f.id === 'af-addr') { await call('/me/addr', { label: v.label, city: v.city, area: v.area, lm: v.lm }); aItems = null; if (sum) sum.addresses++; refresh(); load(); f.reset(); toast(T('تمت إضافة العنوان', 'Address added')); }
      else if (f.id === 'af-rev') { if (!+v.rating) { if (er) er.textContent = T('اختر عدد النجوم', 'Choose a star rating'); busy = false; return; } const r = await call('/me/reviews', { code: v.code, rating: +v.rating, comment: v.comment }); rvPick = ''; rvData = null; toast(r.updated ? T('تم تحديث تقييمك', 'Review updated') : T('شكراً! سيظهر تقييمك بعد المراجعة', 'Thanks! Your review shows after moderation')); load(); refreshSum(); }
      else if (f.id === 'af-sk') { await call('/me', { skin: v.skin || '' }); me = { ...me, skin: v.skin || '' }; setSession(tok, me); toast(T('تم الحفظ', 'Saved')); draw(); load(); }
      else if (f.id === 'af-ph') { await call('/auth/otp/send', { ph: v.ph }); sPh = v.ph; step = 1; draw(); }
    } catch (x) { if (er) er.textContent = x.message; }
    busy = false;
  });
  function done(j) { setTimeout(wishMerge, 600); const co = window.__co; window.__co = 0; setSession(j.token, j.customer); if (co) { close(true); if (window.lcNav) lcNav('/checkout'); else { try { A.bag(); view = 'form'; rc(); } catch (e) {} } } if (!pollT) pollT = setInterval(poll, 30000); poll(); step = 0; tab = 'h'; toast(T('أهلاً ' + (j.customer.name || ''), 'Welcome ' + (j.customer.name || ''))); draw(); load(); }

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
    if (solo) { tab = 'n'; b.innerHTML = `${head.replace('class="acx"', 'class="acx"')}<h3 class="ntt">${lcIco('bell')} ${T('الإشعارات', 'Notifications')}</h3><div id="acl"><p class="em">…</p></div>`; return; }
    lpLoad(); if (!sum) refreshSum();
    const chev = '<svg class="chv" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    const row = (ic, label, x, v, extra) => `<button type="button" class="ar" data-x="${x}" data-v="${E(v || '')}"><span class="ar-i">${lcIco(ic)}</span><span class="ar-t">${label}</span>${extra || ''}${chev}</button>`;
    const nUn = nItems.filter(n => n.unread).length, sk = SK.find(s => s[0] === me.skin);
    const TITLE = { p: T('المعلومات الشخصية', 'Personal Information'), o: T('طلباتي', 'My Orders'), r: T('الإيصالات', 'Receipts'), f: T('المفضلة', 'My Wishlist'), v: T('تقييماتي', 'My Reviews'), s: T('ملف بشرتي', 'My Skin Profile'), u: T('روتين العناية', 'My Skincare Routine'), a: T('عناويني', 'My Addresses'), y: T('الخصوصية والأمان', 'Privacy & Security'), w: T('نقاطي', 'Points') };
    if (tab == 'h') {
      const st = (n, l, x) => `<button type="button" class="as" data-x="tab" data-v="${x}"><b>${n}</b><small>${l}</small></button>`;
      b.innerHTML = `<div class="ah"><div class="ah-top"><button class="acx" data-x="close" aria-label="close">×</button><button type="button" class="ah-bell" data-x="go" data-v="/notifications" aria-label="${T('الإشعارات', 'Notifications')}">${lcIco('bell')}${nUn ? `<i>${nUn > 9 ? '9+' : nUn}</i>` : ''}</button><span class="ah-logo">LACEY</span></div>
      <div class="ah-hi"><div><h3>${T('أهلاً،', 'Hello,')} ${E((me.name || '').split(' ')[0] || me.email || me.ph)}</h3><p>${T('مرحباً بك في حسابك في لاسي', 'Welcome to your Lacey account')}</p><button type="button" class="ln" data-x="tab" data-v="p">${T('تعديل الملف الشخصي', 'Edit Profile')}</button></div><button type="button" class="ah-av" data-x="tab" data-v="p" aria-label="${T('تعديل الصورة', 'Edit photo')}">${avAny('avl')}</button></div>
      <div class="as-row">${st(sum ? sum.reviews : '–', T('التقييمات', 'Reviews'), 'v')}${st(sum ? sum.wishlist : '–', T('المفضلة', 'Wishlist'), 'f')}${st(sum ? sum.orders : '–', T('الطلبات', 'Orders'), 'o')}</div>
      <div class="ac-card"><h4>${T('حسابي', 'My Account')}</h4>${row('user', T('المعلومات الشخصية', 'Personal Information'), 'tab', 'p')}${row('box', T('طلباتي', 'My Orders'), 'tab', 'o')}${row('heart', T('المفضلة', 'My Wishlist'), 'tab', 'f')}${row('star', T('تقييماتي', 'My Reviews'), 'tab', 'v')}${row('flower', T('ملف بشرتي', 'My Skin Profile'), 'tab', 's', sk ? `<small class="ar-s">${T(sk[1], sk[2])}</small>` : '')}${row('list', T('روتين العناية', 'My Skincare Routine'), 'tab', 'u')}${window.LP && LP.live ? row('tag', T('نقاطي', 'Points'), 'tab', 'w', `<small class="ar-s">${num(LP.balance)}</small>`) : ''}</div>
      <div class="ac-card"><h4>${T('الإعدادات والدعم', 'Settings & Support')}</h4>${row('pin', T('عناويني', 'My Addresses'), 'tab', 'a')}${row('bell', T('الإشعارات', 'Notifications'), 'go', '/notifications', nUn ? `<i class="tbd" style="position:static">${nUn > 9 ? '9+' : nUn}</i>` : '')}${row('globe', T('اللغة', 'Language'), 'lang', '', `<small class="ar-s">${lang == 'en' ? 'English' : 'العربية'}</small>`)}${row('headset', T('خدمة الزبائن', 'Customer Support'), 'go', '/support')}${row('shield', T('الخصوصية والأمان', 'Privacy & Security'), 'tab', 'y')}</div>
      <button type="button" class="ar-out" data-x="out">${lcIco('out')} ${T('تسجيل الخروج', 'Log Out')}</button><p class="ar-ver">LACEY SKINCARE · ${T('الإصدار', 'Version')} 1.0</p></div>`;
      return;
    }
    const head2 = `<div class="ah-sub"><button type="button" class="ah-back" data-x="tab" data-v="h" aria-label="${T('رجوع', 'Back')}"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h3>${TITLE[tab] || ''}</h3></div>`;
    let c = '';
    if (tab == 'p') c = `<div class="ph-box"><span class="ph-av">${avAny('avl')}</span><div class="ph-b"><button type="button" class="btn" data-x="pick">${T(me.photo ? 'تغيير الصورة' : 'إضافة صورة', me.photo ? 'Change photo' : 'Add photo')}</button>${me.photo ? `<button type="button" class="ln" data-x="pdel">${T('حذف الصورة', 'Remove photo')}</button>` : ''}<small>${T('JPG أو PNG — تُقصّ تلقائياً بشكل دائري', 'JPG or PNG — cropped to a circle')}</small></div><input id="phin" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>
      <form id="af-prof" class="pf"><div class="pfs"><h4>${T('المعلومات الشخصية', 'Personal info')}</h4><input name="name" value="${E(me.name)}" placeholder="${T('الاسم', 'Name')}" required>${me.birth ? `<small>${T('تاريخ الميلاد', 'Birth date')}: ${E(me.birth)} · ${me.age} ${T('سنة', 'y')}</small>` : `<div class="dob" style="background:#fff4d6;padding:10px;border-radius:12px"><b>${T('أضف تاريخ ميلادك لتتمكن من الطلب', 'Add your birth date to place orders')}</b>${dobField(true, true)}</div>`}<small>${E(me.ph || '')} ${E(me.email || '')}${me.ph ? '' : ' — ' + T('لم يُربط رقم واتساب بعد', 'no WhatsApp number linked')}</small></div><div class="pfs"><h4>${T('عنوان التوصيل', 'Delivery address')}</h4><input name="city" value="${E(me.city)}" placeholder="${T('المحافظة', 'City')}"><input name="area" value="${E(me.area)}" placeholder="${T('المنطقة', 'Area')}"><input name="lm" value="${E(me.lm)}" placeholder="${T('أقرب نقطة دالة', 'Landmark')}"></div><button class="btn">${T('حفظ', 'Save')}</button>${err}</form>${me.ph ? '' : phoneForm()}`;
    else if (tab == 's') c = `<form id="af-sk" class="pf"><div class="pfs"><h4>${T('نوع بشرتك', 'Your skin type')}</h4><label class="dob">${T('يُستخدم في صفحة الروتين والتوصيات', 'Used for Routine and recommendations')}<select name="skin"><option value="">—</option>${SK.map(([k, n, en]) => `<option value="${k}" ${me.skin == k ? 'selected' : ''}>${T(n, en)}</option>`).join('')}</select></label></div><button class="btn">${T('حفظ', 'Save')}</button>${err}</form><a class="ln" href="/routine">${lcIco('flower')} ${T('اكتشفي روتينك', 'Discover your routine')}</a>`;
    else if (tab == 'u') { let r = null; try { r = typeof me.routine == 'string' ? JSON.parse(me.routine || 'null') : me.routine; } catch (e) {} c = `<div id="acl">${r ? `<p class="em">${lcIco('check')} ${T('لديك روتين محفوظ في حسابك.', 'You have a routine saved to your account.')}</p>` : `<p class="em nt-empty">${lcIco('flower')}<br>${T('لم تحفظي روتيناً بعد.', 'No saved routine yet.')}</p>`}</div><a class="btn" href="/routine" style="display:block;text-align:center">${r ? T('افتحي روتينك', 'Open your routine') : T('ابدئي الآن', 'Start now')}</a>`; }
    else if (tab == 'y') c = `<div class="pfs"><h4>${T('الخصوصية', 'Privacy')}</h4><label class="dob" style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" data-x="mkt" ${me.mkt ? 'checked' : ''} style="width:auto"> ${T('أوافق على استلام العروض والأكواد', 'I agree to receive offers and codes')}</label><small>${T('يمكنك تغيير هذا الخيار في أي وقت.', 'You can change this any time.')}</small></div><div class="pfs"><h4>${T('الأمان', 'Security')}</h4><small>${me.pw ? T('حسابك محمي بكلمة سر.', 'Your account is protected by a password.') : T('تسجيل الدخول عبر رمز واتساب/Google.', 'You sign in with a WhatsApp code / Google.')}</small></div><a class="ln" href="/preferences">${lcIco('gear')} ${T('المزيد من الإعدادات', 'More settings')}</a>`;
    else c = `${tab == 'o' ? `<a class="ln" href="/tracking">${lcIco('box')} ${T('تتبع طلب برمز الطلب', 'Track an order by code')}</a>` : ''}<div id="acl"><p class="em">…</p></div>`;
    b.innerHTML = `<button class="acx" data-x="close" aria-label="close">×</button>${head2}${c}`;
  }
  function refreshSum() { if (!me) return; call('/me/summary').then(j => { sum = j; if (tab == 'h' && ov.classList.contains('on')) draw(); }).catch(() => {}); }
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
    const bd = (sel, n) => { const t = document.querySelector('.tiles2 ' + sel + ' b'); if (!t) return; let i = t.querySelector('.tbd'); if (!n) { if (i) i.remove(); return; } if (!i) { i = document.createElement('i'); i.className = 'tbd'; t.appendChild(i); } i.textContent = n > 9 ? '9+' : n; };
    bd('a[href="/help"]', nItems.filter(n => n.unread && n.kind === 'support' && n.href === '/help/chat').length);
    bd('a[href="/routine/support"]', nItems.filter(n => n.unread && n.kind === 'support' && n.href === '/routine/support').length);
    bd('a[href="/tracking"]', act);
    const tn = document.querySelector('.act [data-v="n"]'); if (tn) { let i = tn.querySelector('.tbd'); if (un) { if (!i) { i = document.createElement('i'); i.className = 'tbd'; tn.appendChild(i); } i.textContent = un > 9 ? '9+' : un; } else if (i) i.remove(); }
    const to = document.querySelector('.act [data-v="o"]'); if (to) { let i = to.querySelector('.tbd'); if (act) { if (!i) { i = document.createElement('i'); i.className = 'tbd'; to.appendChild(i); } i.textContent = act; } else if (i) i.remove(); }
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
      } else if (tab == 'w') {
        const j = await call('/me/points'); window.LP = j; const KL = { earn: T('نقاط طلب', 'Earned'), redeem: T('استبدال', 'Redeemed'), restore: T('إرجاع', 'Restored'), reverse: T('عكس', 'Reversed'), expire: T('انتهاء', 'Expired'), adjust: T('تعديل', 'Adjustment') };
        el.innerHTML = `<div class="pcard" style="display:block"><small>LACEY SKIN · BEAUTY REWARDS</small><h3 style="margin:6px 0">${num(j.balance)} ${T('نقطة', 'points')}</h3><small>${T('قيمتها', 'Worth')} ${num(j.balance * j.val)} ${T('د.ع', 'IQD')} · ${T('رقم العضو', 'Member ID')}: ${E(j.id)}</small>${j.expiring ? `<p><small>⏳ ${num(j.expiring)} ${T('نقطة تنتهي خلال 60 يوماً', 'points expire within 60 days')}</small></p>` : ''}</div>
          <p><small>${T('تكسب', 'Earn')} ${num(j.per)} ${T('نقطة لكل', 'points per')} ${num(j.unit)} ${T('د.ع بعد استلام الطلب. أقل استبدال', 'IQD after delivery. Minimum redemption')} ${num(j.min)}${j.exp ? ' · ' + T('الصلاحية', 'Validity') + ' ' + j.exp + ' ' + T('شهراً', 'months') : ''}</small></p>
          ${j.history.length ? j.history.map(h => `<div class="rcp-r"><span>${KL[h.kind] || h.kind}${h.order_code ? ' · ' + E(h.order_code) : ''}<br><small>${dt(h.at)}${h.note ? ' · ' + E(h.note) : ''}</small></span><b>${h.points > 0 ? '+' : ''}${num(h.points)}</b></div>`).join('') : `<p class="em">${T('لا توجد حركات بعد', 'No activity yet')}</p>`}`;
      } else if (tab == 'f') {
        wCodes = (await call('/me/wish')).codes; const L = wCodes.map(prodOf).filter(Boolean);
        el.innerHTML = L.length ? `<div class="wl">${L.map(p => `<div class="wi"><button type="button" class="wi-img" data-x="wopen" data-v="${E(p.c)}" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}" aria-label="${E(p.n)}"></button><div class="wi-b"><b>${E(p.n)}</b><small>${num(p.p)} ${T('د.ع', 'IQD')}</small><div class="wi-a"><button type="button" class="btn" data-x="wcart" data-v="${E(p.c)}">${T('أضف للسلة', 'Add to bag')}</button><button type="button" class="ln" data-x="wdel" data-v="${E(p.c)}">${lcIco('trash')}</button></div></div></div>`).join('')}</div>` : `<p class="em nt-empty">${lcIco('flower')}<br>${T('لا منتجات في المفضلة — اضغطي القلب على أي منتج.', 'Your wishlist is empty — tap the heart on any product.')}</p>`;
      } else if (tab == 'a') {
        aItems = (await call('/me/addr')).items;
        el.innerHTML = `${aItems.length ? aItems.map(a => `<div class="ad${a.is_default ? ' on' : ''}"><div><b>${E(a.label || T('عنوان', 'Address'))}</b>${a.is_default ? `<em>${T('الافتراضي', 'Default')}</em>` : ''}<small>${E(a.city)} · ${E(a.area)}${a.landmark ? ' · ' + E(a.landmark) : ''}</small></div><div class="ad-a">${a.is_default ? '' : `<button type="button" class="ln" data-x="adef" data-v="${a.id}">${T('اجعله افتراضياً', 'Make default')}</button>`}<button type="button" class="ln" data-x="adel" data-v="${a.id}">${lcIco('trash')}</button></div></div>`).join('') : `<p class="em nt-empty">${lcIco('box')}<br>${T('لا عناوين محفوظة بعد', 'No saved addresses yet')}</p>`}
          <form id="af-addr" class="pf"><div class="pfs"><h4>${T('إضافة عنوان', 'Add an address')}</h4><input name="label" maxlength="40" placeholder="${T('التسمية (البيت، العمل…)', 'Label (Home, Work…)')}"><input name="city" required placeholder="${T('المحافظة', 'City')}"><input name="area" required placeholder="${T('المنطقة', 'Area')}"><input name="lm" placeholder="${T('أقرب نقطة دالة', 'Landmark')}"></div><button class="btn">${T('إضافة', 'Add')}</button>${err}</form>`;
      } else if (tab == 'v') {
        rvData = await call('/me/reviews'); const SL = { pending: T('قيد المراجعة', 'Pending'), approved: T('منشور', 'Published'), hidden: T('مخفي', 'Hidden') };
        const pick = rvPick && (rvData.todo.find(t => t.code == rvPick) || rvData.items.find(i => i.product_code == rvPick));
        const nm = c => { const p = prodOf(c); return p ? p.n : c; };
        el.innerHTML = (pick ? `<form id="af-rev" class="pf"><div class="pfs"><h4>${E(nm(rvPick))}</h4><input type="hidden" name="code" value="${E(rvPick)}"><input type="hidden" name="rating" value="${pick.rating || 0}"><div class="stars">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-x="star" data-v="${i}" class="${i <= (pick.rating || 0) ? 'on' : ''}" aria-label="${i}">★</button>`).join('')}</div><textarea name="comment" maxlength="600" rows="3" placeholder="${T('اكتبي رأيك (اختياري)', 'Write your review (optional)')}">${E(pick.comment || '')}</textarea></div><button class="btn">${T('إرسال', 'Submit')}</button><button type="button" class="ln" data-x="rv" data-v="">${T('إلغاء', 'Cancel')}</button>${err}</form>` : '')
          + (rvData.todo.length ? `<h4 class="sec">${T('بانتظار تقييمك', 'Waiting for your review')}</h4>${rvData.todo.map(t => `<div class="ad"><div><b>${E(nm(t.code))}</b><small>${T('الطلب', 'Order')} ${E(t.order)}</small></div><div class="ad-a"><button type="button" class="ln" data-x="rv" data-v="${E(t.code)}">${T('قيّمي', 'Rate')}</button></div></div>`).join('')}` : '')
          + (rvData.items.length ? `<h4 class="sec">${T('تقييماتي', 'My reviews')}</h4>${rvData.items.map(i => `<div class="ad"><div><b>${E(nm(i.product_code))}</b> <span class="rv-s">${'★'.repeat(i.rating)}${'☆'.repeat(5 - i.rating)}</span><small>${E(i.comment || '')}</small>${i.reply ? `<small class="rv-r">${T('ردّ المتجر', 'Store reply')}: ${E(i.reply)}</small>` : ''}</div><div class="ad-a"><em>${SL[i.status] || i.status}</em><button type="button" class="ln" data-x="rv" data-v="${E(i.product_code)}">${T('تعديل', 'Edit')}</button></div></div>`).join('')}` : '')
          || '';
        if (!rvData.todo.length && !rvData.items.length) el.innerHTML = `<p class="em nt-empty">${lcIco('flower')}<br>${T('يمكنك تقييم المنتجات بعد استلام طلبك.', 'You can review products once your order is delivered.')}</p>`;
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
  (async () => { try { cfg = await call('/auth/config'); } catch (e) { cfg = {}; } btn(); if (tok) { refresh(); wishMerge(); poll(); pollT = setInterval(poll, 30000); } })();
  btn();
})();
