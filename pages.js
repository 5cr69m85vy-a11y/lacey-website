/* pages.js — صفحات معزولة برابط لكل صفحة + الشريط السفلي + قسم «روتين» */
(function () {
  'use strict';
  const T = (a, e) => (typeof lang !== 'undefined' && lang == 'en') ? e : a;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $1 = s => document.querySelector(s);
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const PAGES = { '': 'home', categories: 'categories', offers: 'offers', routine: 'routine', cart: 'cart', checkout: 'checkout', account: 'account', support: 'support' };
  const TITLES = { home: 'Lacey Skincare', categories: 'الفئات | Lacey', offers: 'عروضنا | Lacey', routine: 'روتين | Lacey', cart: 'السلة | Lacey', checkout: 'إتمام الطلب | Lacey', account: 'حسابي | Lacey', support: 'الدعم | Lacey' };
  const OVERLAY = ['cart', 'checkout', 'account'];
  let cur = '', prevPath = '/', bn = null;

  const parse = href => { const u = new URL(href, location.origin), seg = u.pathname.split('/').filter(Boolean); return { page: PAGES[seg[0] || ''] || 'home', sub: seg[1] || '', u }; };

  /* ---------- الشريط السفلي ---------- */
  function buildBar() {
    bn = $1('#bnav'); if (!bn) return;
    const acc = document.getElementById('accb'); if (acc) { acc.dataset.p = 'account'; bn.appendChild(acc); }
    const cn = document.getElementById('cn'); if (cn) { const z = () => { cn.dataset.z = cn.textContent.trim() === '0' ? '1' : ''; }; new MutationObserver(z).observe(cn, { childList: true, characterData: true, subtree: true }); z(); }
    bn.addEventListener('click', e => {
      const a = e.target.closest('a[data-p]'); if (!a) return;
      e.preventDefault(); e.stopPropagation(); lcNav(a.getAttribute('href'));
    }, true);
    langBar();
  }
  function langBar() { if (!bn) return; bn.querySelectorAll('small[data-l]').forEach(s => { const [ar, en] = s.dataset.l.split('|'); s.textContent = T(ar, en); }); }

  /* ---------- التوجيه ---------- */
  function secVisible(page) {
    document.querySelectorAll('[data-pg]').forEach(el => el.classList.toggle('pgx', !el.dataset.pg.split(' ').includes(page)));
  }
  function closeCart() { const cv = $1('#cv'); if (cv) cv.classList.remove('on', 'pgv'); }
  function show(path, push, replace) {
    const { page, sub, u } = parse(path), was = cur;
    if (was === 'routine' && page !== 'routine' && window.chatUnmount) chatUnmount();
    if (was === 'account' && page !== 'account' && window.accountHide) accountHide();
    if (was && !OVERLAY.includes(was) && was !== 'support' && was !== page) prevPath = location.pathname + location.search;
    if ((was === 'cart' || was === 'checkout') && page !== 'cart' && page !== 'checkout') closeCart();
    const full = u.pathname + u.search + (u.hash || '');
    const dept = /^#\/[\w-]/.test(u.hash || '');
    if (push) history.pushState(null, '', full); else if (replace) history.replaceState(null, '', full);
    if (!dept && (location.hash || '') === '' && was === 'categories' && page !== 'categories') { try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) {} }
    cur = page; document.body.dataset.pg = page; document.title = TITLES[page] || TITLES.home;
    secVisible(page);
    if (bn) { bn.querySelectorAll('a[data-p]').forEach(a => { const on = a.dataset.p === page || (page === 'checkout' && a.dataset.p === 'cart'); a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); }); const ac = document.getElementById('accb'); if (ac) ac.classList.toggle('cur', page === 'account'); }
    if (page === 'cart' || page === 'checkout') { try { view = page === 'cart' ? 'bag' : 'form'; rc(); const cv = $1('#cv'); cv.classList.add('on', 'pgv'); } catch (e) { console.error(e); } }
    if (page === 'account' && window.accountShow) accountShow({ '': 'p', orders: 'o', receipts: 'r', alerts: 'n' }[sub] || 'p');
    if (page === 'routine') renderRoutine(sub, u);
    if (!(was === page && page === 'routine')) scrollTo(0, 0);
    setPh();
  }
  function setPh() { const h = $1('header'); if (h) document.documentElement.style.setProperty('--ph', Math.round(h.getBoundingClientRect().bottom + scrollY) + 'px'); }
  addEventListener('resize', setPh); addEventListener('load', setPh);
  window.lcNav = (path, o) => { o = o || {}; show(path, !o.replace, !!o.replace); };
  window.lcUrl = path => { history.replaceState(null, '', path); };
  window.lcBack = from => { if (cur === from) lcNav(prevPath || '/'); };
  addEventListener('popstate', () => show(location.pathname + location.search + location.hash, false, false));
  addEventListener('hashchange', () => { if (/^#\/[\w-]/.test(location.hash) && cur !== 'categories' && cur !== 'support') show('/categories' + location.hash, false, true); });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="/"]'); if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const seg = a.getAttribute('href').split(/[?#]/)[0].split('/').filter(Boolean)[0] || '';
    if (!(seg in PAGES) || seg === 'support') return; e.preventDefault(); lcNav(a.getAttribute('href'));
  });

  /* ---------- أوامر المتجر الموجودة ---------- */
  function hook() {
    A.bag = () => lcNav('/cart');
    A.vf = () => { if (typeof needLogin == 'function' && needLogin()) return; lcNav('/checkout'); };
    A.vb = () => lcNav('/cart');
    A.rtn = c => lcNav('/routine/ask?p=' + encodeURIComponent(c));
    const ox = A.x; A.x = function () { ox.apply(this, arguments); if (OVERLAY.includes(cur)) lcNav(prevPath || '/'); };
    const ogo = A.go, MAP = { shop: 'categories', dpt: 'categories', offers: 'offers', best: 'home', half: 'home', delivery: 'home', how: 'home', reviews: 'home', top: 'home', trk: 'home' };
    A.go = c => { const pg = MAP[c]; if (pg && cur !== pg) { lcNav(pg === 'home' ? '/' : '/' + pg); setTimeout(() => ogo(c), 80); return; } ogo(c); };
    window.openAccount = t => lcNav('/account' + ({ o: '/orders', r: '/receipts', n: '/alerts' }[t] || ''));
    const sq = $1('#sq'); if (sq) sq.addEventListener('input', () => { if (sq.value.trim() && cur !== 'categories') lcNav('/categories'); });
    const r0 = window.render; window.render = function () { r0.apply(this, arguments); langBar(); if (cur === 'routine') renderRoutine(rsub, null, true); };
    const ls0 = $1('#lsw'); if (ls0) ls0.addEventListener('change', () => setTimeout(() => { langBar(); if (cur === 'routine') renderRoutine(rsub, null, true); }, 50));
    const pm = $1('#pm'); if (pm) new MutationObserver(() => {
      const md = pm.querySelector('.md'), add = md && md.querySelector('[data-a=add]');
      if (add && !md.querySelector('.rtq')) add.insertAdjacentHTML('afterend', `<button class="rtq" data-a="rtn" data-c="${E(add.dataset.c)}">🌸 ${T('روتين — اسأل عن هذا المنتج', 'Routine — ask about this product')}</button>`);
    }).observe(pm, { childList: true, subtree: true });
  }

  /* ================= قسم روتين ================= */
  const SKINS = [['oily', 'دهنية', 'Oily'], ['dry', 'جافة', 'Dry'], ['combo', 'مختلطة', 'Combination'], ['sensitive', 'حساسة', 'Sensitive'], ['normal', 'عادية', 'Normal']];
  const CONCERNS = [['acne', 'حب الشباب', 'Acne'], ['spots', 'تصبغات وبقع', 'Dark spots'], ['dry', 'جفاف', 'Dryness'], ['aging', 'خطوط وتجاعيد', 'Fine lines'], ['redness', 'احمرار وتهيّج', 'Redness'], ['pores', 'مسام واسعة', 'Large pores']];
  const WHEN = [['both', 'صباحي ومسائي', 'AM & PM'], ['am', 'صباحي', 'Morning'], ['pm', 'مسائي', 'Evening']];
  const KW = {
    oily: /oil|زيت|mattif|shine|pore|salicylic|bha|niacinamide|gel|جل/i, dry: /dry|hydrat|hyaluron|ceramide|butter|nourish|جاف|ترطيب|مرطب/i, combo: /balanc|combination|مختلط/i,
    sensitive: /sensitive|gentle|soothing|calm|fragrance[- ]free|حساس|لطيف|مهدئ/i, normal: /daily|everyday|يومي/i,
    acne: /acne|salicylic|bha|blemish|حب|شباب/i, spots: /vitamin c|brighten|dark spot|تفتيح|نمش|بقع|تصبغ/i, aging: /retinol|peptide|collagen|anti-?aging|wrinkle|تجاعيد|خطوط/i, redness: /redness|calm|centella|soothing|احمرار|مهدئ/i, pores: /pore|niacinamide|مسام/i,
  };
  const STEPS = [['cleanse', 'غسول', 'Cleanser', /clean|wash|foam|غسول|منظف/i, 'cm'], ['serum', 'سيروم علاجي', 'Treatment serum', /serum|سيروم/i, 'cm'], ['moist', 'مرطّب', 'Moisturizer', /moistur|cream|lotion|مرطب|كريم/i, 'cm'], ['spf', 'واقي شمس', 'Sunscreen', /sun|spf|واقي/i, 'am']];
  const TIPS = { oily: 'اختاري غسولاً خفيفاً بجل ومرطباً مائياً — الترطيب مهم حتى للبشرة الدهنية.', dry: 'ركّزي على الترطيب والمواد المرمّمة، وتجنّبي الماء الساخن.', combo: 'استخدمي مرطباً خفيفاً على المنطقة الدهنية وأغنى على الخدود الجافة.', sensitive: 'أدخلي منتجاً جديداً كل أسبوعين وجرّبيه على منطقة صغيرة أولاً.', normal: 'حافظي على روتين بسيط ثابت: غسول، مرطّب، واقي شمس.' };
  let rsub = '', rq = (() => { try { return JSON.parse(ls.get('lc_rq') || '') || {} } catch (e) { return {} } })(), askP = '', res = false;
  rq.skin = rq.skin || ''; rq.concerns = rq.concerns || []; rq.when = rq.when || 'both';
  const sv = () => ls.set('lc_rq', JSON.stringify({ skin: rq.skin, concerns: rq.concerns, when: rq.when }));
  const plain = p => Object.entries(p).filter(([k, v]) => typeof v === 'string' && k !== 'i').map(x => x[1]).join(' ') + ' ' + (p.k || '');
  const fmM = n => (typeof fm == 'function' ? fm(n) : Number(n).toLocaleString('en-US'));
  const prodList = () => (typeof S !== 'undefined' && S.P) || [];
  const prodBy = c => prodList().find(p => String(p.c).toUpperCase() === String(c).toUpperCase());

  function recommend() {
    const me = typeof custMe == 'function' ? custMe() : null, young = me && me.age != null && me.age < 18, list = prodList().filter(p => !(young && /retinol|ريتينول/i.test(plain(p))));
    return STEPS.map(([id, ar, en, re, when]) => {
      const pool = list.filter(p => re.test(p.k || '') || re.test(p.n || ''));
      const scored = pool.map(p => { const t = plain(p); let s = 0; if (rq.skin && KW[rq.skin].test(t)) s += 3; rq.concerns.forEach(c => { if (KW[c].test(t)) s += 2; }); return [s, p]; }).sort((a, b) => b[0] - a[0] || a[1].p - b[1].p);
      return { id, ar, en, when, items: scored.slice(0, 2).map(x => x[1]) };
    });
  }
  const pcard = (p, acts) => `<div class="rt-p"><div class="th" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></div><div><b>${E(p.n)}</b><small>${E(p.c)} · ${fmM(p.p)}</small></div><div class="acts">${acts ? `<button data-rt="add" data-c="${E(p.c)}">${T('أضف', 'Add')}</button><button class="g" data-rt="ask" data-c="${E(p.c)}">${T('اسأل', 'Ask')}</button>` : ''}</div></div>`;

  function quizHTML() {
    const me = typeof custMe == 'function' ? custMe() : null;
    const opt = (list, sel, kind) => list.map(([k, ar, en]) => `<button type="button" data-rt="${kind}" data-v="${k}" class="${(Array.isArray(sel) ? sel.includes(k) : sel === k) ? 'on' : ''}" aria-pressed="${Array.isArray(sel) ? sel.includes(k) : sel === k}">${T(ar, en)}</button>`).join('');
    let out = `<div class="rt-c"><h3>1. ${T('ما نوع بشرتك؟', 'What is your skin type?')}</h3><div class="rt-opts">${opt(SKINS, rq.skin, 'skin')}</div>
      <h3>2. ${T('ما الذي تريدين معالجته؟ (اختاري أكثر من واحد)', 'What would you like to treat? (pick any)')}</h3><div class="rt-opts">${opt(CONCERNS, rq.concerns, 'con')}</div>
      <h3>3. ${T('متى تستخدمين روتينك؟', 'When do you use your routine?')}</h3><div class="rt-opts">${opt(WHEN, rq.when, 'when')}</div>
      ${me && me.age != null && me.age < 18 ? `<p class="em">${T('لأن عمرك أقل من 18 استبعدنا المنتجات القوية مثل الريتينول.', 'Because you are under 18 we left out strong actives such as retinol.')}</p>` : ''}
      <button class="btn" data-rt="go" ${rq.skin ? '' : 'disabled'}>${T('اعرضي روتيني', 'Show my routine')}</button></div>`;
    if (res && rq.skin) {
      const rec = recommend(), show1 = (w) => rec.filter(s => w === 'am' ? true : s.when !== 'am');
      const blk = (title, steps) => `<div class="rt-c"><h3>${title}</h3>${steps.map((s, i) => `<div class="rt-step"><b>${i + 1}</b><div><b>${T(s.ar, s.en)}</b>${s.items.length ? s.items.map(p => pcard(p, true)).join('') : `<p class="em">${T('لا يوجد منتج مناسب حالياً — اسألي مختصاً.', 'No matching product yet — ask a specialist.')}</p>`}</div></div>`).join('')}</div>`;
      const sk = SKINS.find(x => x[0] === rq.skin);
      out += `<div class="rt-c"><h3>✨ ${T('روتينك للبشرة ' + sk[1], 'Your routine for ' + sk[2] + ' skin')}</h3><p class="em">${E(TIPS[rq.skin])}</p></div>`;
      if (rq.when !== 'pm') out += blk('☀️ ' + T('الصباح', 'Morning'), show1('am'));
      if (rq.when !== 'am') out += blk('🌙 ' + T('المساء', 'Evening'), show1('pm'));
      out += `<div class="rt-c"><button class="btn" data-rt="send">${T('أرسلي روتيني إلى مختصة', 'Send my routine to a specialist')}</button> <button class="btn g" data-rt="save">${T('احفظي نوع بشرتي في حسابي', 'Save my skin type to my account')}</button></div>`;
    }
    return out;
  }
  function askHTML() {
    const p = askP && prodBy(askP);
    const quick = [['هل يناسب بشرتي؟', 'Is it suitable for my skin?'], ['كيف أستخدمه؟', 'How do I use it?'], ['هل فيه مكونات تهيّج؟', 'Any irritating ingredients?'], ['ما بديله؟', 'Any alternative?'], ['هل يناسب الحمل؟', 'Is it pregnancy safe?']];
    const me = typeof custMe == 'function' ? custMe() : null;
    return `<div class="rt-c"><h3>${T('اسألي عن منتج', 'Ask about a product')}</h3><p class="em">${T('اكتبي كود المنتج أو اسمه واختاريه، ثم اكتبي سؤالك — يرد عليك موظف باسمه هنا.', 'Enter the product code or name, then write your question — a team member will reply here.')}</p>
      <form id="rt-ask" class="rt-form" autocomplete="off"><input name="prod" list="rt-pl" placeholder="${T('كود المنتج أو اسمه (مثال: LC101)', 'Product code or name (e.g. LC101)')}" value="${p ? E(p.c + ' — ' + p.n) : E(askP)}" required>
      <datalist id="rt-pl">${prodList().map(x => `<option value="${E(x.c)} — ${E(x.n)}"></option>`).join('')}</datalist>
      ${p ? `<div class="rt-sel"><div class="th" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></div><div><b>${E(p.n)}</b><small>${E(p.c)} · ${fmM(p.p)}</small></div><button type="button" class="ln" data-rt="share" data-c="${E(p.c)}">${T('مشاركة', 'Share')}</button></div>` : ''}
      <div class="rt-opts">${quick.map(([a, e]) => `<button type="button" data-rt="q" data-v="${E(T(a, e))}">${T(a, e)}</button>`).join('')}</div>
      <textarea name="q" rows="3" maxlength="600" placeholder="${T('اكتبي سؤالك هنا…', 'Write your question…')}" required></textarea>
      ${me ? '' : `<input name="nm" placeholder="${T('اسمك (اختياري)', 'Your name (optional)')}" value="${E(ls.get('lc_cn') || '')}">`}
      <button class="btn">${T('إرسال السؤال', 'Send question')}</button></form></div>`;
  }
  function renderRoutine(sub, u, quiet) {
    rsub = sub || ''; const el = $1('#rtn'); if (!el) return;
    const tab = rsub === 'ask' ? 'ask' : rsub === 'support' ? 'support' : 'quiz';
    if (u && u.searchParams.get('p')) { askP = u.searchParams.get('p'); }
    if (tab !== 'support' && window.chatUnmount) chatUnmount();
    const tabs = [['quiz', '/routine', T('روتيني', 'My routine')], ['ask', '/routine/ask', T('اسألي عن منتج', 'Ask about a product')], ['support', '/routine/support', T('الدعم', 'Support')]];
    el.innerHTML = `<div class="w"><div class="rh"><h2>🌸 ${T('روتين', 'Routine')}</h2><p>${T('مستشارتك الشخصية للعناية بالبشرة: تحليل بشرتك، اقتراح منتجات، وتحدّثي مع فريقنا.', 'Your personal skincare advisor: analyse your skin, get product picks, and chat with our team.')}</p></div>
      <nav class="rt-tabs" aria-label="Routine">${tabs.map(([k, h, n]) => `<a href="${h}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</nav>
      <div id="rtb">${tab === 'quiz' ? quizHTML() : tab === 'ask' ? askHTML() : `<div id="rt-chat"></div>`}</div></div>`;
    if (tab === 'support' && window.chatMount) chatMount(document.getElementById('rt-chat'));
  }
  function resolveCode(v) {
    v = String(v || '').trim(); if (!v) return null;
    const code = v.split(/\s+[—-]\s+/)[0].trim(), byCode = prodBy(code); if (byCode) return byCode;
    const low = v.toLowerCase(); return prodList().find(p => String(p.n).toLowerCase().includes(low)) || null;
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#rtn [data-rt]'); if (!b) return;
    const k = b.dataset.rt, v = b.dataset.v, c = b.dataset.c;
    if (k === 'skin') { rq.skin = v; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'con') { rq.concerns = rq.concerns.includes(v) ? rq.concerns.filter(x => x !== v) : [...rq.concerns, v]; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'when') { rq.when = v; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'go') { res = true; renderRoutine(rsub, null, true); const r = document.querySelector('#rtb .rt-c:nth-child(2)'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }
    else if (k === 'add') { cart[c] = (cart[c] || 0) + 1; save(); rcount(); toast(T('تمت الإضافة للسلة', 'Added to bag')); }
    else if (k === 'ask') { askP = c; lcNav('/routine/ask?p=' + encodeURIComponent(c)); }
    else if (k === 'q') { const t = $1('#rt-ask textarea'); if (t) { t.value = v; t.focus(); } }
    else if (k === 'share') { const url = location.origin + '/routine/ask?p=' + encodeURIComponent(c), p = prodBy(c); try { if (navigator.share) await navigator.share({ title: p ? p.n : 'Lacey', url }); else { await navigator.clipboard.writeText(url); toast(T('تم نسخ الرابط', 'Link copied')); } } catch (x) {} }
    else if (k === 'save') {
      const me = typeof custMe == 'function' ? custMe() : null; if (!me) { toast(T('سجّلي الدخول أولاً', 'Sign in first')); return lcNav('/account'); }
      try { await fetch((typeof API == 'function' && API() || '') + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ skin: rq.skin }) }); toast(T('تم الحفظ', 'Saved')); } catch (x) { toast('error'); }
    }
    else if (k === 'send') {
      const sk = SKINS.find(x => x[0] === rq.skin), cn = rq.concerns.map(x => CONCERNS.find(y => y[0] === x)[1]).join('، ') || '—', rec = recommend();
      const text = `طلب استشارة روتين\nنوع البشرة: ${sk ? sk[1] : '—'}\nالاهتمامات: ${cn}\nالمنتجات المقترحة: ${rec.map(s => s.items.map(p => p.c).join('/')).filter(Boolean).join(' · ') || '—'}`;
      try { await chatSend(text); } catch (x) {} lcNav('/routine/support');
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target; if (f.id !== 'rt-ask') return; e.preventDefault(); e.stopPropagation();
    const p = resolveCode(f.prod.value); if (!p) return toast(T('اختاري منتجاً من القائمة أو اكتبي كوده', 'Pick a product or type its code'));
    const text = String(f.q.value || '').trim(); if (!text) return; if (f.nm && f.nm.value.trim()) ls.set('lc_cn', f.nm.value.trim());
    const btn = f.querySelector('.btn'); btn.disabled = true;
    try { await chatSend(`${text}`, p.c); askP = ''; toast(T('وصل سؤالك، سيرد عليك الفريق هنا', 'Question sent — our team will reply here')); lcNav('/routine/support'); } catch (x) { toast('error'); }
    btn.disabled = false;
  });
  document.addEventListener('input', e => { if (e.target.name === 'prod' && e.target.form && e.target.form.id === 'rt-ask') { const p = resolveCode(e.target.value); const code = p ? p.c : ''; if (code !== askP && p && /—/.test(e.target.value)) { askP = code; const t = $1('#rt-ask textarea'), v = t ? t.value : '', n = $1('#rt-ask [name=nm]'), nv = n ? n.value : ''; renderRoutine(rsub, null, true); const t2 = $1('#rt-ask textarea'); if (t2) t2.value = v; const n2 = $1('#rt-ask [name=nm]'); if (n2) n2.value = nv; } } });

  /* ---------- إقلاع ---------- */
  function init() {
    buildBar(); hook();
    const start = location.pathname + location.search + location.hash;
    if (/^#\/[\w-]/.test(location.hash) && parse(start).page === 'home') show('/categories' + location.hash, false, true); else show(start, false, false);
    if (parse(start).page === 'support') { cur = 'support'; document.body.dataset.pg = 'support'; secVisible('support'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  }
  init();
})();
