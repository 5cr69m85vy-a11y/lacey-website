/* pages.js — صفحات معزولة برابط لكل صفحة + الشريط السفلي + قسم «روتين» */
(function () {
  'use strict';
  const T = (a, e) => (typeof lang !== 'undefined' && lang == 'en') ? e : a;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $1 = s => document.querySelector(s);
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const PAGES = { '': 'home', categories: 'categories', offers: 'offers', routine: 'routine', help: 'help', tracking: 'tracking', preferences: 'preferences', p: 'product', search: 'search', cart: 'cart', checkout: 'checkout', account: 'account', support: 'support' };
  const TITLES = { home: 'Lacey Skincare', categories: 'الفئات | Lacey', offers: 'عروضنا | Lacey', routine: 'روتين | Lacey', cart: 'السلة | Lacey', checkout: 'إتمام الطلب | Lacey', account: 'حسابي | Lacey', support: 'الدعم | Lacey', product: 'Lacey', search: 'البحث | Lacey', help: 'مركز المساعدة | Lacey', tracking: 'تتبع الطلب | Lacey', preferences: 'الإعدادات | Lacey' };
  const OVERLAY = ['cart', 'checkout', 'account'];
  const hdr = document.getElementById('hlp'); if (hdr) hdr.addEventListener('click', e => { e.preventDefault(); lcNav('/help'); });
  let cur = '', prevPath = '/', bn = null, navDepth = 0; const scrolls = {};

  const parse = href => { const u = new URL(href, location.origin), seg = u.pathname.split('/').filter(Boolean); return { page: PAGES[seg[0] || ''] || 'home', sub: seg[1] || '', u }; };

  /* ---------- الشريط السفلي ---------- */
  function buildBar() {
    bn = $1('#bnav'); if (!bn) return;
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
    scrolls[location.pathname + location.search] = scrollY;
    if (push) navDepth++; else if (!replace && navDepth > 0) navDepth--;
    if ((was === 'routine' || was === 'help') && window.LCChat && page !== was) LCChat.unmount();
    if (was === 'account' && page !== 'account' && window.accountHide) accountHide();
    if (was && !OVERLAY.includes(was) && was !== 'support' && was !== page) prevPath = location.pathname + location.search;
    if ((was === 'cart' || was === 'checkout') && page !== 'cart' && page !== 'checkout') closeCart();
    const full = u.pathname + u.search + (u.hash || '');
    const dept = /^#\/[\w-]/.test(u.hash || '');
    if (push) history.pushState(null, '', full); else if (replace) history.replaceState(null, '', full);
    if (!dept && (location.hash || '') === '' && was === 'categories' && page !== 'categories') { try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) {} }
    if (page !== 'routine' && page !== 'help') document.body.classList.remove('cfull');
    cur = page; document.body.dataset.pg = page; document.title = TITLES[page] || TITLES.home;
    secVisible(page);
    if (bn) { bn.querySelectorAll('a[data-p]').forEach(a => { const on = a.dataset.p === 'orders' ? (page === 'tracking' || (page === 'account' && sub === 'orders')) : (a.dataset.p === page || (page === 'checkout' && a.dataset.p === 'cart')); a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); }); const ac = document.getElementById('accb'); if (ac) ac.classList.toggle('cur', page === 'account' && sub !== 'orders'); }
    if (page === 'cart' || page === 'checkout') { try { view = page === 'cart' ? 'bag' : 'form'; rc(); const cv = $1('#cv'); cv.classList.add('on', 'pgv'); } catch (e) { console.error(e); } }
    if (page === 'account' && window.accountShow) accountShow({ '': 'p', orders: 'o', receipts: 'r', alerts: 'n' }[sub] || 'p');
    if (page === 'routine') renderRoutine(sub, u);
    if (page === 'help') renderHelp(sub);
    if (page === 'product') renderProduct(sub);
    if (page === 'search') renderSearch(u);
    if (page === 'tracking') renderTrack(u);
    if (page === 'preferences') renderPrefs();
    if (!(was === page && page === 'routine')) { const sy = !push && !replace ? scrolls[u.pathname + u.search] : 0; scrollTo(0, sy || 0); if (sy) setTimeout(() => scrollTo(0, sy), 120); }
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
    A.pg = () => A.x();
    A.open = c => lcNav('/p/' + encodeURIComponent(c));
    /* إعادة رسم نموذج الطلب عند وصول سعر التوصيل لا تُفقد ما كتبه الزبون ولا موضع المؤشر */
    const rc0 = window.rc; window.rc = function () {
      const f = document.querySelector('#of'); if (!(f && typeof view !== 'undefined' && view === 'form')) return rc0.apply(this, arguments);
      const ae = document.activeElement, nm = ae && f.contains(ae) ? ae.name : '', ss = ae && ae.selectionStart;
      ff = { ...ff, name: f.name.value, ph: f.ph.value, ci: f.ci.value, ae: f.ae.value, lm: f.lm.value };
      const r = rc0.apply(this, arguments), f2 = document.querySelector('#of');
      if (f2 && nm && f2.elements[nm]) { const n = f2.elements[nm]; n.focus(); try { if (ss != null) n.setSelectionRange(ss, ss); } catch (x) {} }
      return r;
    };
    A.rtn = c => lcNav('/routine/ask?p=' + encodeURIComponent(c));
    const ox = A.x; A.x = function () { ox.apply(this, arguments); if (OVERLAY.includes(cur)) lcNav(prevPath || '/'); };
    const ogo = A.go, MAP = { shop: 'categories', dpt: 'categories', offers: 'offers', best: 'home', half: 'home', delivery: 'home', how: 'home', reviews: 'home', top: 'home', trk: 'tracking' };
    A.go = c => { const pg = MAP[c]; if (pg && cur !== pg) { lcNav(pg === 'home' ? '/' : '/' + pg); setTimeout(() => ogo(c), 80); return; } ogo(c); };
    window.openAccount = t => lcNav('/account' + ({ o: '/orders', r: '/receipts', n: '/alerts' }[t] || ''));
    const sq = $1('#sq'); if (sq) sq.addEventListener('input', () => { if (sq.value.trim() && cur !== 'categories') lcNav('/categories'); });
    const r0 = window.render; window.render = function () { r0.apply(this, arguments); langBar(); if (cur === 'product') renderProduct(psub, true); if (cur === 'routine') renderRoutine(rsub, null, true); };
    const ls0 = $1('#lsw'); if (ls0) ls0.addEventListener('change', () => setTimeout(() => { langBar(); if (cur === 'routine') renderRoutine(rsub, null, true); }, 50));
    const pm = $1('#pm'); if (pm) new MutationObserver(() => {
      const md = pm.querySelector('.md'), add = md && md.querySelector('[data-a=add]');
      if (!add || md.querySelector('.rtq')) return;
      const pp = prodBy(add.dataset.c);
      if (pp && ingOf(pp).length && !md.querySelector('.ingl')) add.insertAdjacentHTML('beforebegin', `<div class="ingl"><b>${T('المكونات الفعالة', 'Active ingredients')}</b>${ingHTML(pp)}</div>`);
      add.insertAdjacentHTML('afterend', `<button class="rtq" data-a="rtn" data-c="${E(add.dataset.c)}"><svg class="ico" viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 10.500a6 6 0 01-12 0C6 10 9 7 12 3z"/></svg> ${T('روتين — اسأل عن هذا المنتج', 'Routine — ask about this product')}</button>`);
    }).observe(pm, { childList: true, subtree: true });
  }

  /* ================= صفحة المنتج المستقلة /p/CODE ================= */
  let psub = '', pimg = 0;
  function renderProduct(code, quiet) {
    psub = decodeURIComponent(code || ''); const el = $1('#prd'); if (!el) return;
    const pd = prodBy(psub);
    if (!pd) { if (!prodList().length) return; el.innerHTML = `<div class="w"><p class="em">${T('هذا المنتج غير موجود', 'This product does not exist')}</p><a class="btn" href="/categories">${T('تصفّحي المتجر', 'Browse the shop')}</a></div>`; return; }
    document.title = pd.n + ' | Lacey';
    const gal = [pd.i, ...(pd.im || [])].filter(Boolean), im = gal[pimg] || gal[0], b = typeof brd == 'function' ? brd(pd) : null;
    const low = pd.left > 0 && pd.left <= (pd.lw ?? 5), same = prodList().filter(x => x.c !== pd.c && x.k === pd.k).slice(0, 4);
    el.innerHTML = `<div class="w"><p><button class="pbk" data-pback="1" aria-label="${T('رجوع', 'Back')}">→ ${T('رجوع', 'Back')}</button></p><div class="pgd"><div><div class="pim" style="${im ? `background-image:url('${E(im)}')` : ''}"></div>${gal.length > 1 ? `<div class="pth">${gal.map((u, k) => `<button data-pi="${k}" class="${k === pimg ? 'on' : ''}" style="background-image:url('${E(u)}')" aria-label="${k + 1}"></button>`).join('')}</div>` : ''}</div>
      <div><small>${E(pd.c)}${b ? ' · ' + E(b.n) : ''}${pd.k ? ' · ' + E(pd.k) : ''}</small><div class="ph1"><h1>${E(pd.n)}</h1>${typeof favBtn == 'function' ? favBtn(pd.c) : ''}</div><div class="pr">${fmM(pd.p)}${pd.o > pd.p ? ` <s>${fmM(pd.o)}</s>` : ''}</div>
      ${pd.left === 0 ? `<p class="so2">${T('نفد من المخزون', 'Sold out')}</p><button type="button" class="btn g wt" data-wt="${E(pd.c)}">${lcIco('bell')} ${T('أعلميني عند التوفر', 'Notify me when back')}</button>` : low ? `<p class="lw2">${T('متبقي ' + pd.left + ' قطع فقط', 'Only ' + pd.left + ' left')}</p>` : ''}
      ${ingOf(pd).length ? `<h3>${T('المكونات الفعالة', 'Active ingredients')}</h3>${ingHTML(pd)}` : ''}
      ${typeof descHTML == 'function' ? descHTML(pd) : ''}
      <div class="row2"><span class="qsw" data-q="${E(pd.c)}" data-big="1">${qsHTML(pd.c, true)}</span><button class="btn g" data-a="rtn" data-c="${E(pd.c)}">${T('اسأل روتين', 'Ask Routine')}</button><button class="btn g" data-pcopy="1">${T('نسخ الرابط', 'Copy link')}</button></div></div></div>
      ${same.length ? `<h3>${T('منتجات مشابهة', 'Similar products')}</h3><div class="grid">${same.map(card).join('')}</div>` : ''}</div>${pd.left === 0 ? '' : `<div class="pstick"><div><small>${E(pd.n)}</small><b>${fmM(pd.p)}</b></div><span class="qsw" data-q="${E(pd.c)}" data-big="1">${qsHTML(pd.c, true)}</span></div>`}`;
    { const r2 = el.querySelector('.row2'), sk = el.querySelector('.pstick'); if (r2 && sk && 'IntersectionObserver' in window) { if (window.__pstIO) window.__pstIO.disconnect(); window.__pstIO = new IntersectionObserver(([en]) => sk.classList.toggle('on', !en.isIntersecting && en.boundingClientRect.top < 0)); window.__pstIO.observe(r2); } }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pback]'); if (!b) return;
    if (navDepth > 0) history.back(); else lcNav('/categories');
  });
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#prd [data-pi],#prd [data-pcopy]'); if (!t) return;
    if (t.dataset.pi !== undefined) { pimg = +t.dataset.pi; renderProduct(psub, true); }
    else { try { navigator.clipboard.writeText(location.origin + '/p/' + encodeURIComponent(psub)); toast(T('تم نسخ الرابط', 'Link copied')); } catch (x) {} }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!(t && t.matches && t.matches('#of select[name=ci]'))) return;
    QK = ''; rc();
  });

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
  const XSTEPS = [['toner', 'تونر', 'Toner', /toner|essence|mist|تونر|ايسنس/i], ['eye', 'عناية العين', 'Eye care', /eye|عين/i], ['mask', 'قناع', 'Mask', /mask|قناع|ماسك/i]];
  const STEP_ALL = () => [...STEPS.map(s => [s[0], s[1], s[2], s[3]]), ...XSTEPS, ['other', 'أخرى', 'Other', /$^/]];
  const stepOf = p => { if (p.st) return p.st; const t = (p.k || '') + ' ' + (p.n || ''); for (const s of STEP_ALL()) if (s[0] !== 'other' && s[3].test(t)) return s[0]; return 'other'; };
  const timeOf = p => p.tm || (stepOf(p) === 'spf' ? 'am' : /retinol|ريتينول/i.test(plain(p)) ? 'pm' : 'both');
  const ingOf = p => String(p.ing || '').split(/[,،;\n]/).map(x => x.trim()).filter(Boolean).slice(0, 8);
  const ingHTML = p => ingOf(p).length ? `<div class="ingc">${ingOf(p).map(x => `<span>${E(x)}</span>`).join('')}</div>` : '';
  const unsafePreg = p => !!p.np || /retinol|ريتينول|salicylic|ساليسيليك|benzoyl|بنزويل/i.test(plain(p));
  const DQ = [
    ['كيف تبدو بشرتك بعد ساعتين من غسلها؟', 'How does your skin look 2 hours after washing?', [['oily', 2, 'لامعة في كل الوجه', 'Shiny all over'], ['combo', 2, 'لامعة في الجبهة والأنف فقط', 'Shiny on forehead & nose only'], ['dry', 2, 'مشدودة أو متقشرة', 'Tight or flaky'], ['normal', 2, 'مريحة ومتوازنة', 'Comfortable & balanced']]],
    ['كيف تبدو مسامك؟', 'How do your pores look?', [['oily', 1, 'واسعة وظاهرة في الوجه', 'Large & visible'], ['combo', 1, 'واسعة في منطقة T فقط', 'Large in the T-zone only'], ['dry', 1, 'صغيرة أو غير ظاهرة', 'Small or invisible'], ['normal', 1, 'متوسطة', 'Medium']]],
    ['كيف تشعرين بعد غسل الوجه بدون مرطّب؟', 'How does it feel after washing without moisturiser?', [['dry', 2, 'مشدودة جداً وغير مريحة', 'Very tight'], ['normal', 1, 'مرتاحة', 'Comfortable'], ['oily', 1, 'تعود للمعان بسرعة', 'Gets shiny quickly']]],
    ['كيف تتفاعل بشرتك مع المنتجات الجديدة؟', 'How does your skin react to new products?', [['sens', 2, 'تحمرّ أو تحرق غالباً', 'Often red or stinging'], ['sens', 1, 'أحياناً', 'Sometimes'], ['', 0, 'نادراً أو أبداً', 'Rarely or never']]],
  ];
  function diagResult(a) {
    if (!a || a.length < DQ.length || a.some(x => x == null)) return null;
    const sc = { oily: 0, dry: 0, combo: 0, normal: 0, sens: 0 };
    a.forEach((ix, qi) => { const o = DQ[qi][2][ix]; if (o && o[0]) sc[o[0]] += o[1]; });
    const base = ['oily', 'dry', 'combo', 'normal'].sort((x, y) => sc[y] - sc[x]);
    const top = sc[base[0]] === sc[base[1]] && sc[base[0]] > 0 && base[0] !== 'normal' && base[1] !== 'normal' ? 'combo' : base[0];
    return { skin: sc.sens >= 3 ? 'sensitive' : top, base: top, sens: sc.sens >= 2 };
  }
  const TIPS = { oily: 'اختاري غسولاً خفيفاً بجل ومرطباً مائياً — الترطيب مهم حتى للبشرة الدهنية.', dry: 'ركّزي على الترطيب والمواد المرمّمة، وتجنّبي الماء الساخن.', combo: 'استخدمي مرطباً خفيفاً على المنطقة الدهنية وأغنى على الخدود الجافة.', sensitive: 'أدخلي منتجاً جديداً كل أسبوعين وجرّبيه على منطقة صغيرة أولاً.', normal: 'حافظي على روتين بسيط ثابت: غسول، مرطّب، واقي شمس.' };
  let rsub = '', rq = (() => { try { return JSON.parse(ls.get('lc_rq') || '') || {} } catch (e) { return {} } })(), askP = '', res = false;
  rq.skin = rq.skin || ''; rq.concerns = rq.concerns || []; rq.when = rq.when || 'both'; rq.preg = !!rq.preg; rq.budget = rq.budget || ''; rq.dq = Array.isArray(rq.dq) ? rq.dq : []; rq.ans = Array.isArray(rq.ans) ? rq.ans : []; rq.sens = !!rq.sens; rq.pick = rq.pick && typeof rq.pick == 'object' ? rq.pick : {}; let diagOpen = false, pfs = { step: '', q: '' };
  const sv = () => ls.set('lc_rq', JSON.stringify({ skin: rq.skin, concerns: rq.concerns, when: rq.when, preg: rq.preg, budget: rq.budget, dq: rq.dq, ans: rq.ans, pick: rq.pick, sens: rq.sens }));
  const jp = s => { try { return JSON.parse(s) || null } catch (e) { return null } };
  const savedR = () => { const me = typeof custMe == 'function' ? custMe() : null; return (me && jp(me.routine)) || jp(ls.get('lc_rt')); };
  const today = () => new Date().toISOString().slice(0, 10);
  const daily = () => { const d = jp(ls.get('lc_rd')) || {}; if (d.day !== today()) { d.am = []; d.pm = []; d.day = today(); } d.streak = d.streak || 0; return d; };
  const ACT = [['retinol', /retinol|ريتينول/i], ['aha', /\baha\b|glycolic|lactic|mandelic|جلايكوليك|لاكتيك/i], ['bha', /salicylic|\bbha\b|ساليسيليك/i], ['vitc', /vitamin c|ascorbic|فيتامين سي/i], ['bp', /benzoyl|بنزويل/i], ['niac', /niacinamide|نياسيناميد/i]];
  const CONFLICT = [['retinol', 'aha', 'الريتينول مع أحماض AHA يسبّبان تهيّجاً — استخدميهما في ليالٍ مختلفة.', 'Retinol with AHA irritates — use them on different nights.'], ['retinol', 'bha', 'الريتينول مع حمض الساليسيليك قد يجفّف البشرة — بدّليهما.', 'Retinol with salicylic acid can over-dry — alternate them.'], ['retinol', 'vitc', 'فيتامين سي صباحاً والريتينول مساءً أفضل من الجمع بينهما.', 'Vitamin C in the morning and retinol at night works better together.'], ['retinol', 'bp', 'الريتينول وبيروكسيد البنزويل يُضعفان بعضهما ويهيّجان — لا تجمعيهما.', 'Retinol and benzoyl peroxide cancel each other and irritate — do not combine.'], ['aha', 'bha', 'الجمع بين AHA وBHA يزيد التقشير — مرة أو مرتين أسبوعياً فقط.', 'AHA + BHA over-exfoliates — only once or twice a week.']];
  const actsOf = ps => { const t = ps.map(plain).join(' '); return ACT.filter(a => a[1].test(t)).map(a => a[0]); };
  const conflicts = acts => CONFLICT.filter(c => acts.includes(c[0]) && acts.includes(c[1])).map(c => T(c[2], c[3]));
  const ING = [
    ['niacinamide', 'نياسيناميد', 'Niacinamide', 'يوازن الزيوت ويقلّل مظهر المسام ويوحّد اللون.', 'Balances oil, refines pores, evens tone.', 'am pm', 'safe', ''],
    ['hyaluronic', 'حمض الهيالورونيك', 'Hyaluronic acid', 'ترطيب عميق وامتلاء للبشرة — ضعيه على بشرة رطبة.', 'Deep hydration — apply on damp skin.', 'am pm', 'safe', ''],
    ['vitc', 'فيتامين سي', 'Vitamin C', 'يفتّح البقع ويحمي من الأكسدة — الأفضل صباحاً قبل واقي الشمس.', 'Brightens spots, antioxidant — best in the morning before SPF.', 'am', 'safe', 'retinol'],
    ['retinol', 'ريتينول', 'Retinol', 'يخفّف الخطوط وحب الشباب — مساءً فقط وبتدرّج، ويلزمه واقي شمس نهاراً.', 'Smooths lines and acne — night only, build up slowly, SPF by day.', 'pm', 'avoid', 'aha bha bp vitc'],
    ['salicylic', 'حمض الساليسيليك (BHA)', 'Salicylic acid (BHA)', 'ينظّف المسام ويعالج الحبوب للبشرة الدهنية.', 'Clears pores and breakouts for oily skin.', 'pm', 'limit', 'retinol aha'],
    ['aha', 'أحماض AHA (جلايكوليك/لاكتيك)', 'AHA (glycolic/lactic)', 'تقشير لطيف يفتّح ويصقل — مرتين أسبوعياً.', 'Gentle exfoliation that brightens — twice a week.', 'pm', 'limit', 'retinol bha'],
    ['ceramide', 'سيراميد', 'Ceramides', 'يرمّم حاجز البشرة وممتاز للبشرة الجافة والحساسة.', 'Repairs the barrier — great for dry or sensitive skin.', 'am pm', 'safe', ''],
    ['spf', 'واقي الشمس', 'Sunscreen (SPF)', 'أهم خطوة ضد التصبغات والتجاعيد — كل صباح وأعيدي التطبيق.', 'The most important step against spots and ageing — every morning.', 'am', 'safe', ''],
    ['centella', 'السنتيلا', 'Centella', 'تهدّئ الاحمرار والتهيّج وتناسب البشرة الحساسة.', 'Soothes redness and irritation.', 'am pm', 'safe', ''],
    ['bp', 'بيروكسيد البنزويل', 'Benzoyl peroxide', 'مضاد قوي لحب الشباب — على الحبوب فقط.', 'Strong acne treatment — spot use only.', 'pm', 'limit', 'retinol'],
  ];
  let ingQ = '', ingSel = [];
  const plain = p => Object.entries(p).filter(([k, v]) => typeof v === 'string' && k !== 'i').map(x => x[1]).join(' ') + ' ' + (p.k || '');
  const fmM = n => (typeof fm == 'function' ? fm(n) : Number(n).toLocaleString('en-US'));
  const prodList = () => (typeof S !== 'undefined' && S.P) || [];
  const prodBy = c => prodList().find(p => String(p.c).toUpperCase() === String(c).toUpperCase());

  function okFor(p) {
    const me = typeof custMe == 'function' ? custMe() : null, young = me && me.age != null && me.age < 18;
    return !(young && /retinol|ريتينول/i.test(plain(p))) && !(rq.preg && unsafePreg(p));
  }
  function score(p) {
    const t = plain(p); let s = rq.budget === 'low' ? -p.p / 1e6 : 0;
    if (rq.skin) { if (p.sk && p.sk.length) s += p.sk.includes(rq.skin) ? 5 : -3; else if (KW[rq.skin].test(t)) s += 3; }
    rq.concerns.forEach(c => { if (KW[c].test(t)) s += 2; });
    if (rq.sens && /retinol|ريتينول|glycolic|salicylic|ساليسيليك|\baha\b/i.test(t)) s -= 3;
    return s;
  }
  const suit = p => { if (!okFor(p)) return 'avoid'; if (!rq.skin) return ''; const s = score(p); return s >= 4 ? 'good' : s < 0 ? 'weak' : 'ok'; };
  function recommend() {
    const list = prodList().filter(okFor);
    return STEPS.map(([id, ar, en, re, when]) => {
      const pool = list.filter(p => stepOf(p) === id);
      const scored = pool.map(p => [score(p), p]).sort((a, b) => b[0] - a[0] || a[1].p - b[1].p);
      let items = scored.slice(0, 3).map(x => x[1]); const pk = items.findIndex(x => String(x.c) === String(rq.pick[id])); if (pk > 0) items.unshift(items.splice(pk, 1)[0]);
      return { id, ar, en, when, items };
    });
  }
  const pcard = (p, acts) => `<div class="rt-p"><div class="th" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></div><div><b>${E(p.n)}</b><small>${E(p.c)} · ${fmM(p.p)}</small>${ingHTML(p)}</div><div class="acts">${acts ? `<button data-rt="add" data-c="${E(p.c)}">${T('أضف', 'Add')}</button><button class="g" data-rt="ask" data-c="${E(p.c)}">${T('اسأل', 'Ask')}</button>` : ''}</div></div>`;

  const HOW = { cleanse: ['دلّكي الوجه 60 ثانية بماء فاتر ثم اشطفي جيداً.', 'Massage for 60 seconds with lukewarm water, rinse well.', 0], serum: ['ضعي 3–4 قطرات على بشرة رطبة وانتظري دقيقة قبل الخطوة التالية.', 'Apply 3–4 drops on damp skin, wait a minute before the next step.', 60], moist: ['طبقة رقيقة على الوجه والرقبة، وهي تثبّت ما قبلها.', 'A thin layer over face and neck to lock in the previous steps.', 0], spf: ['مقدار إصبعين للوجه والرقبة، وأعيدي كل ساعتين خارج المنزل.', 'Two finger-lengths for face and neck; reapply every 2 hours outdoors.', 0] };
  const WHY = { cleanse: ['يزيل الزيوت والأوساخ ويهيّئ البشرة لما بعده.', 'Removes oil and dirt and preps skin.'], serum: ['الخطوة العلاجية التي تعالج اهتمامك الأساسي.', 'The treatment step targeting your main concern.'], moist: ['يرمّم حاجز البشرة ويمنع الجفاف.', 'Supports the barrier and prevents dryness.'], spf: ['أهم حماية ضد التصبغات والتجاعيد.', 'The key protection against spots and ageing.'] };
  const DAYS = [['السبت', 'Sat'], ['الأحد', 'Sun'], ['الاثنين', 'Mon'], ['الثلاثاء', 'Tue'], ['الأربعاء', 'Wed'], ['الخميس', 'Thu'], ['الجمعة', 'Fri']];
  const ACTN = { retinol: ['ريتينول', 'Retinol'], aha: ['AHA', 'AHA'], bha: ['BHA', 'BHA'], bp: ['بيروكسيد البنزويل', 'Benzoyl peroxide'] };
  function weekHTML(pmSteps) {
    const acts = []; pmSteps.forEach(s => { const it = s.items[0]; if (it) actsOf([it]).filter(a => ACTN[a]).forEach(a => { if (!acts.includes(a)) acts.push(a); }); });
    const nights = [0, 2, 4], plan = DAYS.map((d, i) => { const k = nights.indexOf(i); return k >= 0 && acts.length ? acts[k % acts.length] : ''; });
    if (!acts.length) return '';
    return `<div class="rt-c"><h3>${lcIco('list')} ${T('جدول الأسبوع (المساء)', 'Weekly plan (evening)')}</h3><div class="rt-week">${DAYS.map((d, i) => `<div class="${plan[i] ? 'act' : ''}"><b>${T(d[0], d[1])}</b><small>${plan[i] ? T(ACTN[plan[i]][0], ACTN[plan[i]][1]) : T('ترطيب وترميم', 'Hydrate & repair')}</small></div>`).join('')}</div>
      <p class="em">${T('المنتجات القوية تُستخدم في ليالٍ متباعدة (3 ليالٍ أسبوعياً كحد أقصى) وتبدئين بليلتين أول أسبوعين، وبين الليالي رطّبي فقط حتى لا يتعب حاجز البشرة.', 'Strong actives go on spaced nights (max 3 a week); start with two nights for two weeks and just hydrate in between to protect your barrier.')}</p></div>`;
  }
  function quizHTML() {
    const me = typeof custMe == 'function' ? custMe() : null;
    const pre = savedHTML();
    const opt = (list, sel, kind) => list.map(([k, ar, en]) => `<button type="button" data-rt="${kind}" data-v="${k}" class="${(Array.isArray(sel) ? sel.includes(k) : sel === k) ? 'on' : ''}" aria-pressed="${Array.isArray(sel) ? sel.includes(k) : sel === k}">${T(ar, en)}</button>`).join('');
    const diag = `<a class="btn g" href="/routine/test">${lcIco('flask')} ${T('لا أعرف نوع بشرتي — ابدئي اختبار البشرة', 'Not sure — take the skin test')}</a>`;
    let out = pre + `<div class="rt-c"><h3>1. ${T('ما نوع بشرتك؟', 'What is your skin type?')}</h3><div class="rt-opts">${opt(SKINS, rq.skin, 'skin')}</div>${rq.sens && rq.skin !== 'sensitive' ? `<p class="rt-warn">${lcIco('warn')} ${T('بشرتك تتأثر بسهولة: سنُبعد الأحماض والريتينول القويّة.', 'Your skin is reactive: strong acids and retinol are deprioritised.')}</p>` : ''}${diag}
      <h3>2. ${T('ما الذي تريدين معالجته؟ (اختاري أكثر من واحد)', 'What would you like to treat? (pick any)')}</h3><div class="rt-opts">${opt(CONCERNS, rq.concerns, 'con')}</div>
      <h3>3. ${T('متى تستخدمين روتينك؟', 'When do you use your routine?')}</h3><div class="rt-opts">${opt(WHEN, rq.when, 'when')}</div>
      <h3>4. ${T('تفضيلات إضافية', 'Extras')}</h3><div class="rt-opts"><button type="button" data-rt="preg" class="${rq.preg ? 'on' : ''}" aria-pressed="${rq.preg}">${T('حامل أو مرضعة', 'Pregnant / nursing')}</button><button type="button" data-rt="budget" class="${rq.budget === 'low' ? 'on' : ''}" aria-pressed="${rq.budget === 'low'}">${T('الأوفر سعراً', 'Lowest price first')}</button></div>
      ${rq.preg ? `<p class="rt-warn">${T('استبعدنا الريتينول وحمض الساليسيليك وبيروكسيد البنزويل. استشيري طبيبتك قبل أي منتج علاجي.', 'We left out retinol, salicylic acid and benzoyl peroxide. Ask your doctor before any active product.')}</p>` : ''}
      ${me && me.age != null && me.age < 18 ? `<p class="em">${T('لأن عمرك أقل من 18 استبعدنا المنتجات القوية مثل الريتينول.', 'Because you are under 18 we left out strong actives such as retinol.')}</p>` : ''}
      <button class="btn" data-rt="go" ${rq.skin ? '' : 'disabled'}>${T('اعرضي روتيني', 'Show my routine')}</button></div>`;
    if (res && rq.skin) {
      const rec = recommend(), show1 = (w) => rec.filter(s => w === 'am' ? true : s.when !== 'am');
      const blk = (title, steps, w) => `<div class="rt-c"><h3>${title}</h3>${steps.map((s, i) => `<div class="rt-step" data-step="${s.id}"><b>${i + 1}</b><div><b>${T(s.ar, s.en)}</b><p class="em rt-why">${T(WHY[s.id][0], WHY[s.id][1])} ${T(HOW[s.id][0], HOW[s.id][1])}</p>${s.items.length ? s.items.map((p, pi) => `<div class="rt-pw${pi ? '' : ' on'}">${pi === 0 && s.items.length > 1 ? `<small class="rt-sel-l">${T('المختار لك', 'Your pick')}</small>` : ''}${pcard(p, true)}${pi ? `<button class="g rt-swap" data-rt="pick" data-s="${s.id}" data-c="${E(p.c)}">${T('اختاري هذا بدلاً منه', 'Use this instead')}</button>` : ''}</div>`).join('') : `<p class="em">${T('لا يوجد منتج مناسب حالياً — اسألي مختصاً.', 'No matching product yet — ask a specialist.')}</p>`}</div></div>`).join('')}</div>`;
      const sk = SKINS.find(x => x[0] === rq.skin);
      out += `<div class="rt-c"><h3>${lcIco('flower')} ${T('روتينك للبشرة ' + sk[1], 'Your routine for ' + sk[2] + ' skin')}</h3><p class="em">${E(TIPS[rq.skin])}</p></div>`;
      const chosen = rec.filter(s => (rq.when === 'pm' ? s.when !== 'am' : true)).map(s => s.items[0]).filter(Boolean), uniq = [...new Map(chosen.map(x => [x.c, x])).values()], tot = uniq.reduce((a, x) => a + (x.p || 0), 0);
      out += `<div class="rt-c rt-ov"><h3>${lcIco('list')} ${T('منتجاتك المختارة', 'Your picks')}</h3><div class="rt-ovg">${rec.filter(s => s.items[0] && (rq.when === 'pm' ? s.when !== 'am' : true)).map(s => { const x = s.items[0]; return `<div class="rt-ovc"><div class="th" style="${x.i ? `background-image:url('${E(x.i)}')` : ''}"></div><small>${T(s.ar, s.en)}</small><b>${E(x.n)}</b><em>${fmM(x.p)}</em>${s.items.length > 1 ? `<button type="button" class="g" data-rt="alts" data-s="${s.id}">${T('بدائل', 'Alternatives')} (${s.items.length - 1})</button>` : `<span class="em">${T('لا بدائل', 'No alternatives')}</span>`}</div>`; }).join('')}</div></div>`;
      const pick = w => (w === 'am' ? rec : rec.filter(s => s.when !== 'am')).map(s => s.items[0]).filter(Boolean);
      const warn = w => conflicts(actsOf(pick(w))).map(x => `<p class="rt-warn">${lcIco('warn')} ${E(x)}</p>`).join('');
      if (rq.when !== 'pm') out += blk(lcIco('sun') + ' ' + T('الصباح', 'Morning'), show1('am')) + warn('am');
      if (rq.when !== 'am') out += blk(lcIco('moon') + ' ' + T('المساء', 'Evening'), show1('pm')) + warn('pm') + weekHTML(show1('pm'));
      out += `<div class="rt-c"><button class="btn" data-rt="send">${T('أرسلي روتيني إلى مختصة', 'Send my routine to a specialist')}</button> <button class="btn g" data-rt="saveR">${T('احفظي روتيني', 'Save my routine')}</button> <button class="btn g" data-rt="addall">${T('أضيفي الكل للسلة', 'Add all to bag')}</button></div>`;
    }
    return out;
  }

  /* ================= اختبار نوع البشرة (أسئلة متتالية على طبقات) =================
     مبني على أبعاد: مؤشر بومان لأنواع البشرة (دهنية/جافة، حساسة/مقاومة، مصطبغة، متجعدة)،
     أسئلة الحساسية مستلهمة من مقياس Sensitive Scale-10، وتصنيف فيتزباتريك للتعرّض للشمس. الصياغة معدّلة وللتثقيف فقط. */
  const TQ = [
    ['oil', ['الدهون', 'Oil'], ['بعد 3–4 ساعات من غسل وجهك (بدون أي منتج)، كيف تبدو بشرتك؟', 'Three to four hours after washing (no products), how does your skin look?'], [
      ['لامعة في الوجه كله', 'Shiny all over', { oil: 3 }], ['لامعة في الجبهة والأنف فقط', 'Shiny on forehead & nose only', { oil: 1, tz: 2 }], ['مرتاحة ومتوازنة', 'Comfortable & balanced', {}], ['مشدودة أو خشنة', 'Tight or rough', { dry: 3 }], ['فيها قشور أو تقشّر جاف', 'Flaky or peeling', { dry: 4 }]]],
    ['pores', ['المسام', 'Pores'], ['كيف تبدو مسامك في المرآة؟', 'How do your pores look?'], [
      ['واسعة وظاهرة في الخدين والأنف', 'Large & visible on cheeks and nose', { oil: 2 }], ['واسعة في الأنف والجبهة فقط', 'Large on nose & forehead only', { tz: 2, oil: 1 }], ['متوسطة', 'Medium', {}], ['صغيرة بالكاد تُرى', 'Small, barely visible', { dry: 1 }]]],
    ['slide', ['خلال النهار', 'Through the day'], ['هل يتجمّع المكياج أو واقي الشمس أو ينزلق عن وجهك خلال النهار؟', 'Does makeup or sunscreen slide or pile up during the day?'], [
      ['نعم، على الوجه كله', 'Yes, all over', { oil: 2 }], ['نعم، في الأنف والجبهة فقط', 'Yes, on nose & forehead only', { tz: 1, oil: 1 }], ['لا، لكنه يتشقق على مناطق جافة', 'No, but it cracks on dry patches', { dry: 2 }], ['لا', 'No', {}]]],
    ['tight', ['الترطيب', 'Hydration'], ['مباشرة بعد الغسل بالماء والغسول، هل تشعرين بشدّ؟', 'Right after washing with water and cleanser, does your skin feel tight?'], [
      ['دائماً وأحتاج مرطباً فوراً', 'Always, I need moisturiser right away', { dry: 3 }], ['أحياناً', 'Sometimes', { dry: 1 }], ['أبداً', 'Never', {}], ['أبداً، ويعود اللمعان بسرعة', 'Never, and shine returns fast', { oil: 1 }]]],
    ['dehy', ['الترطيب', 'Hydration'], ['هل يظهر على بشرتك مظهر باهت أو خطوط سطحية دقيقة تتحسّن فوراً بعد مرطب مائي؟', 'Does your skin look dull, with fine surface lines that improve right after a water-based moisturiser?'], [
      ['نعم، بوضوح', 'Yes, clearly', { dh: 2 }], ['أحياناً', 'Sometimes', { dh: 1 }], ['لا', 'No', {}]]],
    ['sting', ['الحساسية', 'Sensitivity'], ['هل تشعرين بلسع أو حرقان أو وخز عند وضع منتج جديد (غسول، كريم، واقي)؟', 'Do new products (cleanser, cream, sunscreen) sting, burn or tingle?'], [
      ['أبداً', 'Never', {}], ['نادراً', 'Rarely', { sens: 1 }], ['كثيراً', 'Often', { sens: 2 }], ['تقريباً مع كل منتج جديد', 'Almost every new product', { sens: 3 }]]],
    ['flush', ['الحساسية', 'Sensitivity'], ['هل يحمرّ وجهك أو يسخن بسهولة مع الحرارة أو الرياح أو الانفعال أو الأكل الحار؟', 'Does your face flush easily with heat, wind, emotion or spicy food?'], [
      ['لا', 'No', {}], ['قليلاً', 'Slightly', { sens: 1, flush: 1 }], ['نعم، بوضوح', 'Yes, clearly', { sens: 2, flush: 2 }], ['احمرار دائم أو شعيرات دموية ظاهرة', 'Persistent redness or visible capillaries', { sens: 2, flush: 3 }]]],
    ['react', ['الحساسية', 'Sensitivity'], ['هل تسبب العطور أو الصابون أو المنظّفات حكّة أو طفحاً أو تهيّجاً لبشرتك؟', 'Do fragrances, soaps or detergents cause itching, rash or irritation?'], [
      ['لا', 'No', {}], ['أحياناً', 'Sometimes', { sens: 1 }], ['كثيراً', 'Often', { sens: 2 }], ['شُخّصت عندي بإكزيما أو التهاب جلد', 'I have diagnosed eczema/dermatitis', { sens: 3, dry: 1, derm: 1 }]]],
    ['acne', ['حب الشباب', 'Acne'], ['كيف حال حب الشباب عندك؟', 'How is your acne?'], [
      ['لا يوجد', 'None', {}], ['حبوب قليلة بين وقت وآخر (1–5)', 'A few spots now and then (1–5)', { acne: 1 }], ['حبوب ملتهبة متكررة (6–15)', 'Frequent inflamed spots (6–15)', { acne: 2, oil: 1 }], ['حبوب عميقة/أكياس أو ندبات', 'Deep cysts or scarring', { acne: 3, derm: 1 }]]],
    ['pig', ['التصبّغ', 'Pigmentation'], ['هل تترك الحبوب أو الجروح آثاراً داكنة تبقى أسابيع؟ أو تظهر لديك بقع أو نمش أو كلف؟', 'Do spots or wounds leave dark marks for weeks, or do you get patches, freckles or melasma?'], [
      ['لا', 'No', {}], ['أحياناً', 'Sometimes', { pig: 1 }], ['كثيراً', 'Often', { pig: 2 }], ['لدي كلف أو بقع داكنة واسعة', 'I have melasma or broad dark patches', { pig: 3 }]]],
    ['sun', ['الشمس', 'Sun'], ['عند التعرّض لشمس قوية 30–45 دقيقة بلا واقٍ في بداية الصيف، ماذا يحدث عادةً؟', 'After 30–45 minutes of strong sun with no sunscreen early in summer, what usually happens?'], [
      ['أحترق دائماً ولا أسمرّ', 'I always burn, never tan', { ph: 1 }], ['أحترق بسهولة وأسمرّ قليلاً', 'I burn easily, tan lightly', { ph: 2 }], ['أحترق أحياناً وأسمرّ تدريجياً', 'I sometimes burn, tan gradually', { ph: 3 }], ['نادراً ما أحترق وأسمرّ بسهولة', 'I rarely burn, tan easily', { ph: 4 }], ['لا أحترق تقريباً وبشرتي بنية', 'I almost never burn, brown skin', { ph: 5 }], ['لا أحترق أبداً وبشرتي داكنة جداً', 'I never burn, very dark skin', { ph: 6 }]]],
    ['wr', ['علامات العمر', 'Ageing'], ['ما وضع الخطوط والتجاعيد؟', 'What about lines and wrinkles?'], [
      ['لا توجد', 'None', {}], ['خطوط دقيقة عند الابتسام أو التعبير فقط', 'Fine lines only with expression', { wr: 1 }], ['خطوط ظاهرة حتى في الراحة', 'Visible lines at rest', { wr: 2 }], ['خطوط عميقة وترهّل', 'Deep lines and loss of firmness', { wr: 3 }]]],
    ['age', ['عنك', 'About you'], ['كم عمرك؟', 'How old are you?'], [
      ['15–19', '15–19', { age: 1 }], ['20–29', '20–29', { age: 2 }], ['30–39', '30–39', { age: 3 }], ['40–49', '40–49', { age: 4 }], ['50 فأكثر', '50+', { age: 5 }]], 'age'],
    ['preg', ['أمان', 'Safety'], ['هل أنتِ حامل أو مرضعة أو تخططين للحمل قريباً؟', 'Are you pregnant, nursing or planning a pregnancy soon?'], [
      ['لا', 'No', {}], ['نعم', 'Yes', { preg: 1 }]]],
  ];
  let tqi = 0;
  const tqList = () => { const me = typeof custMe == 'function' ? custMe() : null; return TQ.filter(q => !(q[4] === 'age' && me && me.age != null)); };
  const tqSum = () => { const m = { oil: 0, dry: 0, tz: 0, dh: 0, sens: 0, flush: 0, acne: 0, pig: 0, wr: 0, ph: 0, age: 0, preg: 0, derm: 0 }, L = tqList(), me = typeof custMe == 'function' ? custMe() : null;
    L.forEach((q, i) => { const o = q[3][rq.ans[i]]; if (o) for (const k in o[2]) m[k] = k === 'ph' ? o[2][k] : m[k] + o[2][k]; });
    if (me && me.age != null) m.age = me.age < 20 ? 1 : me.age < 30 ? 2 : me.age < 40 ? 3 : me.age < 50 ? 4 : 5;
    return m; };
  function tqResult() {
    const L = tqList(); if (rq.ans.length < L.length || rq.ans.slice(0, L.length).some(x => x == null)) return null;
    const m = tqSum(); let base = 'normal';
    if (m.dry >= 5 && m.oil <= 2) base = 'dry'; else if (m.oil >= 6 && m.tz <= 2) base = 'oily'; else if (m.tz >= 3 && m.oil >= 2) base = 'combo'; else if (m.oil >= 5) base = 'oily'; else if (m.dry >= 3) base = 'dry';
    const sensHigh = m.sens >= 6, sens = m.sens >= 3, skin = sensHigh ? 'sensitive' : base;
    const concerns = []; if (m.acne >= 2 || (m.acne === 1 && m.oil >= 3)) concerns.push('acne'); if (m.pig >= 1) concerns.push('spots'); if (m.dry >= 4 || m.dh >= 2) concerns.push('dry');
    if (m.wr >= 2 || (m.wr >= 1 && m.age >= 3)) concerns.push('aging'); if (m.flush >= 2 || m.sens >= 5) concerns.push('redness'); if (m.oil >= 4 && (base === 'oily' || base === 'combo')) concerns.push('pores');
    const notes = [];
    if ((base === 'oily' || base === 'combo') && (m.dry >= 3 || m.dh >= 2)) notes.push(T('بشرتك دهنية لكنها «جافة الماء»: اختاري مرطباً مائياً خفيفاً (هيالورونيك/غليسرين) ولا تفرطي في التنظيف.', 'Your skin is oily but dehydrated: use a light water-based moisturiser and do not over-cleanse.'));
    if (sens && m.dry >= 3) notes.push(T('قد يكون حاجز بشرتك متعباً: بسّطي الروتين (غسول لطيف، مرطب بالسيراميد، واقي شمس) وأدخلي منتجاً جديداً كل أسبوعين.', 'Your barrier may be stressed: keep it simple (gentle cleanser, ceramide moisturiser, sunscreen) and add one new product every two weeks.'));
    if (m.ph && m.ph <= 3) notes.push(T('نوع بشرتك يحترق بسهولة: واقي شمس SPF 50 يومياً وإعادة تطبيقه كل ساعتين خارج المنزل.', 'You burn easily: daily SPF 50 and reapply every two hours outdoors.')); else if (m.ph) notes.push(T('حتى البشرة الداكنة تحتاج واقي شمس يومياً (SPF 30 فأكثر) لمنع التصبغات.', 'Even deeper skin tones need daily SPF 30+ to prevent pigmentation.'));
    if (m.pig >= 1) notes.push(T('لعلاج التصبغات: واقي الشمس هو الأساس، ثم فيتامين سي صباحاً أو نياسيناميد/حمض الأزيليك.', 'For pigmentation: sunscreen first, then vitamin C by day or niacinamide/azelaic acid.'));
    if (m.preg) notes.push(T('بما أنك حامل/مرضع سنستبعد الريتينول وحمض الساليسيليك وبيروكسيد البنزويل.', 'As you are pregnant/nursing we will leave out retinol, salicylic acid and benzoyl peroxide.'));
    const see = []; if (m.acne >= 3) see.push(T('حب الشباب العميق أو المسبب للندبات يحتاج طبيب جلدية.', 'Deep or scarring acne needs a dermatologist.')); if (m.flush >= 3) see.push(T('الاحمرار الدائم أو الشعيرات الظاهرة قد يكون وردية (روزاسيا): راجعي طبيب جلدية.', 'Persistent redness or visible capillaries may be rosacea: see a dermatologist.')); if (m.derm) see.push(T('الإكزيما أو التهاب الجلد يحتاج متابعة طبية.', 'Eczema or dermatitis needs medical follow-up.'));
    const pc = (v, mx) => Math.max(0, Math.min(100, Math.round(v / mx * 100)));
    return { m, base, skin, sens, sensHigh, concerns, notes, see, bars: [[T('الدهون', 'Oil'), pc(m.oil, 7)], [T('الجفاف', 'Dryness'), pc(m.dry, 9)], [T('الحساسية', 'Sensitivity'), pc(m.sens, 8)], [T('حب الشباب', 'Acne'), pc(m.acne, 3)], [T('التصبغ', 'Pigmentation'), pc(m.pig, 3)], [T('خطوط وتجاعيد', 'Lines'), pc(m.wr, 3)]] };
  }
  function tqHTML() {
    const L = tqList(), res = tqResult(), me = typeof custMe == 'function' ? custMe() : null;
    if (tqi < 0) tqi = 0;
    if (res && tqi >= L.length) {
      const sk = SKINS.find(x => x[0] === res.skin), bs = SKINS.find(x => x[0] === res.base), PH = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
      return `<div class="rt-c tq-res"><small class="em">${T('نتيجتك', 'Your result')}</small><h2>${T('بشرة ' + sk[1], sk[2] + ' skin')}</h2>
        ${res.sensHigh ? `<p class="em">${T('النوع الأساسي: ' + bs[1] + ' مع حساسية عالية', 'Base type: ' + bs[2] + ' with high sensitivity')}</p>` : res.sens ? `<p class="em">${T('مع حساسية متوسطة', 'With moderate sensitivity')}</p>` : ''}
        <div class="tq-bars">${res.bars.map(([n, v]) => `<div><span>${n}</span><i><b style="width:${v}%"></b></i><em>${v}%</em></div>`).join('')}</div>
        ${res.m.ph ? `<p class="rt-ok">${lcIco('sun')} ${T('تصنيف التعرّض للشمس (فيتزباتريك): النوع ' + PH[res.m.ph], 'Sun-reactive type (Fitzpatrick): ' + PH[res.m.ph])}</p>` : ''}
        ${res.concerns.length ? `<p><b>${T('اهتماماتك:', 'Your focus areas:')}</b></p><div class="ingc">${res.concerns.map(c => `<span>${E(T(CONCERNS.find(x => x[0] === c)[1], CONCERNS.find(x => x[0] === c)[2]))}</span>`).join('')}</div>` : ''}
        ${res.notes.map(n => `<p class="rt-warn">${lcIco('check')} ${E(n)}</p>`).join('')}${res.see.map(n => `<p class="rt-warn">${lcIco('warn')} ${E(n)}</p>`).join('')}
        <div class="row2"><button class="btn" data-rt="tapply">${T('اعرضي روتيني المناسب', 'Show my routine')}</button><button class="btn g" data-rt="tsave">${me ? T('احفظي نتيجتي في حسابي', 'Save to my account') : T('سجّلي الدخول لحفظ النتيجة', 'Sign in to save')}</button><button class="btn g" data-rt="trestart">${T('أعيدي الاختبار', 'Retake')}</button></div>
        <details class="tq-src"><summary>${T('المصادر العلمية وحدود الاختبار', 'Scientific sources & limits')}</summary><ul>
          <li>Baumann L. <a href="https://pubmed.ncbi.nlm.nih.gov/18555952/" target="_blank" rel="noopener">Understanding and treating various skin types: the Baumann Skin Type Indicator.</a> Dermatol Ther. 2008.</li>
          <li>Brzozowska JM. <a href="https://doi.org/10.5114/ada.2025.149544" target="_blank" rel="noopener">Baumann Skin Type Questionnaire (BSTQ): creation and validation of the Polish language version.</a> Postępy Dermatol Alergol. 2025;42(2):190–196.</li>
          <li>Misery L, et al. <a href="https://medicaljournals.se/acta/content/abstract/10.2340/00015555-1870" target="_blank" rel="noopener">A new ten-item questionnaire for assessing sensitive skin: the Sensitive Scale-10.</a> Acta Derm Venereol. 2014;94(6).</li>
          <li>Fitzpatrick TB. The validity and practicality of sun-reactive skin types I through VI. Arch Dermatol. 1988;124:869–871.</li>
          <li>Lane ME, et al. <a href="https://discovery.ucl.ac.uk/id/eprint/10182188/" target="_blank" rel="noopener">Epidermal barrier function in dry, flaky and sensitive skin.</a></li></ul>
          <p class="em">${T('الأسئلة هنا صياغة معدّلة مستلهمة من هذه الأدوات وليست نسخها المعتمدة نفسها، والنتيجة للتثقيف فقط ولا تغني عن فحص طبيب الجلدية، خاصةً عند حب الشباب الشديد أو الاحمرار الدائم أو الإكزيما.', 'Questions are adapted from these instruments, not the validated originals. Results are educational and do not replace seeing a dermatologist, especially for severe acne, persistent redness or eczema.')}</p></details></div>`;
    }
    const q = L[Math.min(tqi, L.length - 1)], left = L.length - 1 - tqi, cur = rq.ans[tqi];
    return `<div class="tq" data-i="${tqi}"><div class="tq-top"><button class="tq-b" data-rt="tback" ${tqi ? '' : 'disabled'} aria-label="${T('السابق', 'Back')}">→ ${T('السابق', 'Back')}</button><span>${T('السؤال', 'Question')} ${tqi + 1} ${T('من', 'of')} ${L.length}</span></div>
      <div class="tq-prog"><b style="width:${Math.round((tqi) / L.length * 100)}%"></b></div>
      <div class="tq-stack">${left >= 2 ? '<div class="tq-l tq-l2"></div>' : ''}${left >= 1 ? '<div class="tq-l tq-l1"></div>' : ''}
      <div class="tq-card"><small class="tq-sec">${T(q[1][0], q[1][1])}</small><h3>${T(q[2][0], q[2][1])}</h3>
      <div class="tq-opts">${q[3].map((o, oi) => `<button type="button" data-rt="ta" data-v="${oi}" class="${cur === oi ? 'on' : ''}">${T(o[0], o[1])}</button>`).join('')}</div></div></div>
      <p class="em tq-hint">${T('اختاري الأقرب لحالك المعتادة، وليس لحالتك اليوم.', 'Pick what is closest to your usual skin, not just today.')}</p></div>`;
  }
  function savedHTML() {
    const sr = savedR(); if (!sr || !(sr.am && sr.am.length || sr.pm && sr.pm.length)) return '';
    const d = daily(), line = (w, codes) => codes.map(c => { const pr = prodBy(c); return pr ? `<label class="rt-chk${d[w].includes(c) ? ' done' : ''}"><input type="checkbox" data-rt="tick" data-w="${w}" data-c="${E(c)}" ${d[w].includes(c) ? 'checked' : ''}><div class="th" style="width:40px;height:40px;border-radius:10px;background:#eee center/cover;${pr.i ? `background-image:url('${E(pr.i)}')` : ''}"></div><span><b>${E(pr.n)}</b><small> ${E(pr.c)}</small></span></label>` : ''; }).join('');
    const total = (sr.am || []).length + (sr.pm || []).length, got = d.am.length + d.pm.length;
    return `<div class="rt-c"><h3>${lcIco('list')} ${T('روتيني اليوم', 'My routine today')}</h3><div class="rt-str"><span>${lcIco('flame')} ${T('أيام متتالية: ', 'Streak: ')}${d.streak}</span><span>${got}/${total} ${T('خطوات اليوم', 'steps today')}</span></div>
      ${(sr.am || []).length ? `<h4>${lcIco('sun')} ${T('الصباح', 'Morning')}</h4>${line('am', sr.am)}` : ''}${(sr.pm || []).length ? `<h4>${lcIco('moon')} ${T('المساء', 'Evening')}</h4>${line('pm', sr.pm)}` : ''}
      <p class="em">${T('علّمي الخطوات التي أنجزتِها اليوم لتحافظي على سلسلة التزامك.', 'Tick the steps you did today to keep your streak.')}</p></div>`;
  }
  function guideHTML() {
    const q = ingQ.trim().toLowerCase(), list = ING.filter(i => !q || (i[1] + ' ' + i[2]).toLowerCase().includes(q));
    const sel = ING.filter(i => ingSel.includes(i[0])), cf = sel.length > 1 ? CONFLICT.filter(c => ingSel.includes(c[0]) && ingSel.includes(c[1])) : [];
    return `<div class="rt-c"><h3>${lcIco('flask')} ${T('دليل المكونات', 'Ingredient guide')}</h3><input id="rt-iq" type="search" placeholder="${T('ابحثي عن مكوّن…', 'Search an ingredient…')}" value="${E(ingQ)}" style="width:100%;padding:12px 14px;border:1px solid #d9cfe8;border-radius:14px;font:inherit">
      ${list.map(i => `<div class="rt-ing"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-rt="ing" data-v="${i[0]}" ${ingSel.includes(i[0]) ? 'checked' : ''}><b>${T(i[1], i[2])}</b></label><small>${T(i[3], i[4])}</small><small>${i[5].includes('am') ? lcIco('sun') : ''}${i[5].includes('pm') ? lcIco('moon') : ''}${i[6] === 'avoid' ? T('· لا يناسب الحمل', '· not for pregnancy') : i[6] === 'limit' ? T('· باعتدال', '· use in moderation') : ''}</small></div>`).join('') || `<p class="em">${T('لا نتائج', 'No results')}</p>`}</div>
      <div class="rt-c"><h3>${lcIco('scale')} ${T('هل يمكن الجمع بينها؟', 'Can I combine them?')}</h3><p class="em">${T('علّمي مكوّنين أو أكثر من القائمة لنخبرك.', 'Tick two or more ingredients above.')}</p>
      ${sel.length > 1 ? (cf.length ? cf.map(c => `<p class="rt-warn">${lcIco('warn')} ${T(c[2], c[3])}</p>`).join('') : `<p class="rt-ok">${lcIco('check')} ${T('لا تعارض معروف بين هذه المكوّنات.', 'No known conflict between these.')}</p>`) : ''}</div>`;
  }
  function prodsHTML() {
    const steps = STEP_ALL(), q = pfs.q.trim().toLowerCase();
    const list = prodList().filter(p => (!pfs.step || stepOf(p) === pfs.step) && (!q || (p.n + ' ' + p.c + ' ' + (p.ing || '')).toLowerCase().includes(q))).map(p => [p, suit(p)]).sort((a, b) => ({ good: 0, ok: 1, '': 2, weak: 3, avoid: 4 })[a[1]] - ({ good: 0, ok: 1, '': 2, weak: 3, avoid: 4 })[b[1]]);
    const badge = s => s === 'good' ? `<em class="bd g">${T('مناسب لبشرتك', 'Great for you')}</em>` : s === 'avoid' ? `<em class="bd r">${T('لا ننصح به لك', 'Not advised')}</em>` : s === 'weak' ? `<em class="bd y">${T('قد لا يناسبك', 'May not suit')}</em>` : '';
    return `<div class="rt-c"><h3>${T('كل المنتجات حسب روتينك', 'All products for your routine')}</h3>${rq.skin ? `<p class="em">${T('مرتّبة حسب ملاءمتها لبشرتك: ', 'Sorted by fit for your skin: ')}<b>${T(SKINS.find(x => x[0] === rq.skin)[1], SKINS.find(x => x[0] === rq.skin)[2])}</b></p>` : `<p class="em">${T('حدّدي نوع بشرتك في «روتيني» لترتيب المنتجات لك.', 'Set your skin type in “My routine” to sort products for you.')}</p>`}
      <input id="rt-pq" type="search" placeholder="${T('ابحثي بالاسم أو الكود أو المكوّن…', 'Search name, code or ingredient…')}" value="${E(pfs.q)}" style="width:100%;padding:12px 14px;border:1px solid #d9cfe8;border-radius:14px;font:inherit">
      <div class="rt-opts" style="margin:8px 0"><button type="button" data-rt="pstep" data-v="" class="${pfs.step ? '' : 'on'}">${T('الكل', 'All')}</button>${steps.map(s => `<button type="button" data-rt="pstep" data-v="${s[0]}" class="${pfs.step === s[0] ? 'on' : ''}">${T(s[1], s[2])}</button>`).join('')}</div>
      ${list.map(([p, s]) => `<div class="rt-pw">${badge(s)}${pcard(p, s !== 'avoid')}</div>`).join('') || `<p class="em">${T('لا نتائج', 'No results')}</p>`}</div>`;
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
  /* ================= يوميات البشرة: تقييم يومي + مؤشرات + اتجاه آخر 14 يوماً ================= */
  const DFLAGS = [['acne', 'حبوب', 'Breakouts'], ['dry', 'جفاف', 'Dryness'], ['red', 'احمرار', 'Redness'], ['shine', 'لمعان زائد', 'Excess shine'], ['itch', 'حكّة/لسع', 'Itch/sting'], ['new', 'جرّبتُ منتجاً جديداً', 'Tried a new product']];
  const DRATE = [['سيئة جداً', 'Very bad'], ['سيئة', 'Bad'], ['عادية', 'Okay'], ['جيدة', 'Good'], ['ممتازة', 'Great']];
  const dyKey = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
  const dyLocal = () => jp(ls.get('lc_dy')) || {};
  let dySel = '', dyDraft = null, dySynced = false;
  const dyMe = () => (typeof custMe == 'function' ? custMe() : null);
  const dyAll = () => { const me = dyMe(), a = dyLocal(); if (me && me.diary && !dySynced) { dySynced = true; const s = jp(me.diary) || {}; let ch = false; for (const k in s) if (!a[k] || (s[k].at || 0) > (a[k].at || 0)) { a[k] = s[k]; ch = true; } if (ch) ls.set('lc_dy', JSON.stringify(a)); } return a; };
  async function dyPush(a) { const me = dyMe(); if (!me) return false; try { const x = await fetch((typeof API == 'function' && API() || '') + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ diary: a }) }); if (x.ok) { if (window.accountRefresh) accountRefresh(); return true; } } catch (e) {} return false; }
  const dyDay = () => { const all = dyAll(), k = dySel || dyKey(new Date()); if (!dyDraft || dyDraft.k !== k) dyDraft = Object.assign({ k, s: 0, f: [], n: '' }, all[k] || {}, { k }); return dyDraft; };
  function diaryHTML() {
    const all = dyAll(), t = dyDay(), todayK = dyKey(new Date()), me = dyMe();
    const days = [...Array(28)].map((_, i) => { const d = new Date(Date.now() - (27 - i) * 864e5), k = dyKey(d); return { k, d, v: all[k] }; });
    const avg = a => { const x = a.filter(z => z.v && z.v.s).map(z => z.v.s); return x.length ? x.reduce((u, w) => u + w, 0) / x.length : null; };
    const d14 = days.slice(14), w1 = avg(days.slice(21)), w0 = avg(days.slice(14, 21)), cnt = {}; d14.forEach(z => z.v && (z.v.f || []).forEach(f => cnt[f] = (cnt[f] || 0) + 1));
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0], logged = days.filter(z => z.v && z.v.s).length, ins = [];
    if (w1 !== null && w0 !== null) { const df = Math.round((w1 - w0) / w0 * 100); ins.push(df > 5 ? T('بشرتك أفضل بنسبة ' + df + '% عن الأسبوع الماضي. استمري على الروتين نفسه.', 'Your skin is ' + df + '% better than last week. Keep the same routine.') : df < -5 ? T('تقييم بشرتك انخفض ' + Math.abs(df) + '% عن الأسبوع الماضي. راجعي ما تغيّر (منتج جديد، نوم، طعام) وبسّطي الروتين.', 'Your rating is down ' + Math.abs(df) + '% vs last week. Check what changed and simplify the routine.') : T('حالة بشرتك مستقرة عن الأسبوع الماضي.', 'Your skin is steady compared with last week.')); }
    if (top && top[1] >= 3) { const f = DFLAGS.find(x => x[0] === top[0]); ins.push(T('الأكثر تكراراً خلال 14 يوماً: ' + f[1] + ' (' + top[1] + ' أيام).', 'Most frequent in 14 days: ' + f[2] + ' (' + top[1] + ' days).')); }
    const wr = days.filter(z => z.v && z.v.s && (z.v.r || 0) >= 2), nr = days.filter(z => z.v && z.v.s && !(z.v.r || 0));
    if (wr.length >= 3 && nr.length >= 3) { const x = avg(wr), y = avg(nr); if (x - y >= 0.4) ins.push(T('أيام التزامك بالروتين بشرتك فيها أفضل (' + x.toFixed(1) + ' مقابل ' + y.toFixed(1) + ' من 5). الالتزام ينفع!', 'On days you follow your routine your skin is better (' + x.toFixed(1) + ' vs ' + y.toFixed(1) + ' of 5). It works!')); }
    const nw = days.filter(z => z.v && (z.v.f || []).includes('new'));
    if (nw.length && days.slice(-5).some(z => z.v && (z.v.f || []).some(f => ['red', 'itch', 'acne'].includes(f)))) ins.push(T('ظهرت أعراض بعد تجربة منتج جديد: أوقفيه أسبوعاً وراقبي بشرتك، وإن استمرت راجعي طبيبة جلدية.', 'Symptoms appeared after a new product: pause it for a week and watch; see a dermatologist if it persists.'));
    let streak = 0; for (let i = 27; i >= 0; i--) { if (days[i].v && days[i].v.s) streak++; else if (i === 27) continue; else break; }
    const col = s => !s ? '' : s >= 4 ? '#2e8b57' : s === 3 ? '#e0b000' : '#c0502e', dow = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const lead = days[0].d.getDay();
    return `<div class="rt-c"><h3>${lcIco('list')} ${t.k === todayK ? T('كيف بشرتك اليوم؟', 'How is your skin today?') : T('تعديل يوم ', 'Editing ') + t.k}</h3>
      <div class="rt-opts dy-rate">${DRATE.map((r, i) => `<button type="button" data-rt="dyr" data-v="${i + 1}" class="${t.s === i + 1 ? 'on' : ''}">${T(r[0], r[1])}</button>`).join('')}</div>
      <p class="em">${T('هل لاحظتِ شيئاً؟', 'Notice anything?')}</p><div class="rt-opts">${DFLAGS.map(f => `<button type="button" data-rt="dyf" data-v="${f[0]}" class="${t.f.includes(f[0]) ? 'on' : ''}" aria-pressed="${t.f.includes(f[0])}">${T(f[1], f[2])}</button>`).join('')}</div>
      <textarea id="dy-n" rows="2" maxlength="300" placeholder="${T('ملاحظة (اختياري): نوم، ماء، مكياج…', 'Note (optional): sleep, water, makeup…')}">${E(t.n)}</textarea>
      <div class="row2"><button class="btn" data-rt="dys" ${t.s ? '' : 'disabled'}>${T('احفظي', 'Save')}</button>${t.k !== todayK ? `<button class="btn g" data-rt="dyt">${T('العودة لليوم', 'Back to today')}</button>` : ''}${all[t.k] ? `<button class="btn g" data-rt="dyd">${T('احذفي هذا اليوم', 'Delete this day')}</button>` : ''}</div></div>
      <div class="rt-c"><h3>${T('آخر 4 أسابيع', 'Last 4 weeks')}</h3><p class="em">${lcIco('flame')} ${T('أيام متتالية من التسجيل: ', 'Logging streak: ')}${streak} · ${T('سجّلتِ ' + logged + ' من 28 يوماً', 'Logged ' + logged + ' of 28 days')}</p>
        <div class="dy-cal">${dow.map(d => `<small>${d}</small>`).join('')}${[...Array(lead)].map(() => '<i></i>').join('')}${days.map(z => `<button type="button" data-rt="dyp" data-v="${z.k}" class="${z.k === t.k ? 'sel' : ''}${z.k === todayK ? ' td' : ''}" style="${z.v && z.v.s ? 'background:' + col(z.v.s) + ';color:#fff' : ''}" title="${z.k}">${z.d.getDate()}</button>`).join('')}</div>
        <p class="em dy-leg"><span style="background:#c0502e"></span>${T('سيئة', 'Bad')} <span style="background:#e0b000"></span>${T('عادية', 'Okay')} <span style="background:#2e8b57"></span>${T('جيدة', 'Good')} · ${T('اضغطي أي يوم لتعديله', 'Tap a day to edit')}</p>
        <div class="dy-bars">${days.slice(14).map(z => `<div title="${z.k}"><i><b style="height:${z.v && z.v.s ? z.v.s * 20 : 0}%;background:${col(z.v && z.v.s) || 'transparent'}"></b></i><small>${z.d.getDate()}</small></div>`).join('')}</div>
        ${ins.map(x => `<p class="rt-ok">${lcIco('check')} ${E(x)}</p>`).join('')}
        <p class="em">${me ? T('اليوميات محفوظة في حسابك وتظهر على أي جهاز.', 'Your diary is saved to your account on any device.') : T('اليوميات على هذا الجهاز فقط — سجّلي الدخول لتُحفظ في حسابك.', 'Diary is on this device only — sign in to save it to your account.')}</p></div>
      <div class="rt-c"><h3>${T('كيف تجرّبين منتجاً جديداً بأمان؟', 'How to try a new product safely')}</h3><ol class="dy-pt"><li>${T('اختبار الحساسية: ضعي كمية صغيرة خلف الأذن أو داخل الساعد يومين.', 'Patch test: apply a little behind the ear or inner forearm for two days.')}</li><li>${T('أدخلي منتجاً واحداً كل أسبوعين حتى تعرفي المسبّب إن حدث تهيّج.', 'Add one product every two weeks so you can tell the cause of any irritation.')}</li><li>${T('ابدئي بالمنتجات القوية (ريتينول، أحماض) مرتين أسبوعياً فقط.', 'Start strong actives (retinol, acids) just twice a week.')}</li><li>${T('أوقفي المنتج عند احمرار شديد أو لسع مستمر أو طفح.', 'Stop at strong redness, persistent stinging or rash.')}</li></ol></div>`;
  }
  function renderRoutine(sub, u, quiet) {
    rsub = sub || ''; const el = $1('#rtn'); if (!el) return;
    const tab = rsub === 'ask' ? 'ask' : rsub === 'support' ? 'support' : rsub === 'guide' ? 'guide' : rsub === 'products' ? 'products' : rsub === 'test' ? 'test' : rsub === 'diary' ? 'diary' : 'quiz';
    if (u && u.searchParams.get('p')) { askP = u.searchParams.get('p'); }
    if (tab !== 'support' && window.LCChat) LCChat.unmount();
    if (tab === 'test' && !quiet) { const L0 = tqList(); tqi = tqResult() ? L0.length : Math.min(rq.ans.filter(x => x != null).length, L0.length - 1); }
    const tabs = [['quiz', '/routine', T('روتيني', 'My routine')], ['test', '/routine/test', T('اختبار البشرة', 'Skin test')], ['diary', '/routine/diary', T('يومياتي', 'Diary')], ['products', '/routine/products', T('كل المنتجات', 'All products')], ['guide', '/routine/guide', T('دليل المكونات', 'Ingredients')], ['ask', '/routine/ask', T('اسألي عن منتج', 'Ask about a product')], ['support', '/routine/support', T('الدعم', 'Support')]];
    document.body.classList.toggle('cfull', tab === 'support');
    if (tab === 'support') {
      el.innerHTML = `<a class="cfx" href="/routine" aria-label="${T('رجوع', 'Back')}">✕</a><div id="rt-chat"></div>`;
      if (window.LCChat) LCChat.mount(document.getElementById('rt-chat'), 'routine'); return;
    }
    el.innerHTML = `<div class="w"><div class="rh"><h2>${lcIco('flower')} ${T('روتين', 'Routine')}</h2><p>${T('مستشارتك الشخصية للعناية بالبشرة: تحليل بشرتك، اقتراح منتجات، وتحدّثي مع فريقنا.', 'Your personal skincare advisor: analyse your skin, get product picks, and chat with our team.')}</p></div>
      <nav class="rt-tabs" aria-label="Routine">${tabs.map(([k, h, n]) => `<a href="${h}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</nav>
      <div id="rtb">${tab === 'quiz' ? quizHTML() : tab === 'ask' ? askHTML() : tab === 'guide' ? guideHTML() : tab === 'products' ? prodsHTML() : tab === 'test' ? tqHTML() : tab === 'diary' ? diaryHTML() : `<div id="rt-chat"></div>`}</div></div>`;
    if (tab === 'support' && window.LCChat) LCChat.mount(document.getElementById('rt-chat'), 'routine');
  }
  function resolveCode(v) {
    v = String(v || '').trim(); if (!v) return null;
    const code = v.split(/\s+[—-]\s+/)[0].trim(), byCode = prodBy(code); if (byCode) return byCode;
    const low = v.toLowerCase(); return prodList().find(p => String(p.n).toLowerCase().includes(low)) || null;
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#rtn [data-rt]'); if (!b) return;
    const k = b.dataset.rt, v = b.dataset.v, c = b.dataset.c;
    if (k === 'skin') { rq.skin = v; if (v !== 'sensitive') rq.sens = rq.sens && v !== 'sensitive'; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'con') { rq.concerns = rq.concerns.includes(v) ? rq.concerns.filter(x => x !== v) : [...rq.concerns, v]; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'when') { rq.when = v; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'go') { res = true; renderRoutine(rsub, null, true); const r = document.querySelector('#rtb .rt-c:nth-child(2)'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }
    else if (k === 'dyr') { const t = dyDay(); t.s = +v; const n = $1('#dy-n'); if (n) t.n = n.value; renderRoutine(rsub, null, true); }
    else if (k === 'dyf') { const t = dyDay(), n = $1('#dy-n'); if (n) t.n = n.value; t.f = t.f.includes(v) ? t.f.filter(x => x !== v) : [...t.f, v]; renderRoutine(rsub, null, true); }
    else if (k === 'dyp') { dySel = v; dyDraft = null; renderRoutine(rsub, null, true); const c0 = $1('#rtb .rt-c'); if (c0) c0.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (k === 'dyt') { dySel = ''; dyDraft = null; renderRoutine(rsub, null, true); }
    else if (k === 'dys' || k === 'dyd') {
      const t = dyDay(), n = $1('#dy-n'); if (n) t.n = n.value.slice(0, 300); const a = dyLocal();
      if (k === 'dyd') delete a[t.k]; else { const d0 = daily(), r = t.k === dyKey(new Date()) ? d0.am.length + d0.pm.length : (a[t.k] && a[t.k].r) || 0; a[t.k] = { s: t.s, f: t.f, n: t.n, r, at: Date.now() }; }
      const keys = Object.keys(a).sort().slice(-120), o = {}; keys.forEach(k2 => o[k2] = a[k2]); ls.set('lc_dy', JSON.stringify(o)); dyDraft = null; if (k === 'dyd') dySel = '';
      const okSync = await dyPush(o); toast(k === 'dyd' ? T('تم الحذف', 'Deleted') : dyMe() ? (okSync ? T('تم الحفظ في حسابك', 'Saved to your account') : T('حُفظ على الجهاز وتعذّرت المزامنة', 'Saved locally; sync failed')) : T('تم الحفظ على هذا الجهاز', 'Saved on this device')); renderRoutine(rsub, null, true);
    }
    else if (k === 'ta') {
      const L = tqList(); rq.ans[tqi] = +v; sv();
      const card = $1('#rtn .tq-card'); if (card) card.classList.add('out');
      setTimeout(() => { tqi++; if (tqi >= L.length) { const r = tqResult(); if (r) { rq.skin = r.skin; rq.sens = r.sens; rq.concerns = r.concerns.slice(); rq.preg = !!r.m.preg; res = false; sv(); } } renderRoutine(rsub, null, true); }, 190);
    }
    else if (k === 'tback') { if (tqi > 0) { tqi--; renderRoutine(rsub, null, true); } }
    else if (k === 'trestart') { rq.ans = []; tqi = 0; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'tapply') { res = true; sv(); lcNav('/routine'); setTimeout(() => { const r = document.querySelector('#rtb .rt-c:nth-child(3)'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }, 150); }
    else if (k === 'tsave') {
      const me = typeof custMe == 'function' ? custMe() : null; if (!me) { toast(T('سجّلي الدخول أولاً', 'Sign in first')); return lcNav('/account'); }
      try { const x = await fetch((typeof API == 'function' && API() || '') + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ skin: rq.skin }) }); if (!x.ok) throw 0; if (window.accountRefresh) accountRefresh(); toast(T('تم حفظ نوع بشرتك', 'Skin type saved')); } catch (x) { toast('error'); }
    }
    else if (k === 'dopen') { diagOpen = true; renderRoutine(rsub, null, true); }
    else if (k === 'dq') { rq.dq[+b.dataset.q] = +v; for (let i = 0; i < DQ.length; i++) if (rq.dq[i] === undefined) rq.dq[i] = null; const r = diagResult(rq.dq); if (r) { rq.skin = r.skin; rq.sens = r.sens; res = false; } sv(); renderRoutine(rsub, null, true); }
    else if (k === 'pstep') { pfs.step = v; renderRoutine(rsub, null, true); }
    else if (k === 'preg') { rq.preg = !rq.preg; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'budget') { rq.budget = rq.budget === 'low' ? '' : 'low'; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'ing') { ingSel = ingSel.includes(v) ? ingSel.filter(x => x !== v) : [...ingSel, v]; renderRoutine(rsub, null, true); }
    else if (k === 'tick') {
      const d = daily(), w = b.dataset.w; d[w] = d[w].includes(c) ? d[w].filter(x => x !== c) : [...d[w], c];
      const sr = savedR() || {}, all = (sr.am || []).length + (sr.pm || []).length;
      if (d.am.length + d.pm.length >= all && all && d.credited !== today()) { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); d.streak = d.last === y ? d.streak + 1 : 1; d.last = today(); d.credited = today(); toast(T('أحسنتِ! أنجزتِ روتين اليوم 🔥', 'Well done! Routine complete 🔥')); }
      ls.set('lc_rd', JSON.stringify(d)); renderRoutine(rsub, null, true);
    }
    else if (k === 'saveR') {
      const rec = recommend(), r = { skin: rq.skin, am: rec.map(s => s.items[0] && s.items[0].c).filter(Boolean), pm: rec.filter(s => s.when !== 'am').map(s => s.items[0] && s.items[0].c).filter(Boolean) };
      if (rq.when === 'pm') r.am = []; if (rq.when === 'am') r.pm = [];
      ls.set('lc_rt', JSON.stringify(r)); const me = typeof custMe == 'function' ? custMe() : null;
      if (me) { try { const x = await fetch((typeof API == 'function' && API() || '') + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ routine: r, skin: rq.skin }) }); if (x.ok && typeof accountRefresh == 'function') accountRefresh(); } catch (x) {} }
      toast(me ? T('تم حفظ روتينك في حسابك', 'Routine saved to your account') : T('تم الحفظ على هذا الجهاز — سجّلي الدخول لحفظه في حسابك', 'Saved on this device — sign in to keep it on your account')); renderRoutine(rsub, null, true);
    }
    else if (k === 'alts') { const t = document.querySelector('#rtn .rt-step[data-step="' + b.dataset.s + '"]'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1400); } }
    else if (k === 'pick') { rq.pick[b.dataset.s] = c; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'addall') { recommend().filter(s => rq.when === 'pm' ? s.when !== 'am' : true).forEach(s => { if (s.items[0]) cart[s.items[0].c] = (cart[s.items[0].c] || 0) + 1; }); save(); rcount(); toast(T('أُضيفت منتجات الروتين للسلة', 'Routine products added to bag')); }
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
      try { await LCChat.send(text, '', 'routine'); } catch (x) {} lcNav('/routine/support');
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target; if (f.id !== 'rt-ask') return; e.preventDefault(); e.stopPropagation();
    const p = resolveCode(f.prod.value); if (!p) return toast(T('اختاري منتجاً من القائمة أو اكتبي كوده', 'Pick a product or type its code'));
    const text = String(f.q.value || '').trim(); if (!text) return; if (f.nm && f.nm.value.trim()) ls.set('lc_cn', f.nm.value.trim());
    const btn = f.querySelector('.btn'); btn.disabled = true;
    try { await LCChat.send(`${text}`, p.c, 'routine'); askP = ''; toast(T('وصل سؤالك، سيرد عليك الفريق هنا', 'Question sent — our team will reply here')); lcNav('/routine/support'); } catch (x) { toast('error'); }
    btn.disabled = false;
  });
  document.addEventListener('input', e => { if (e.target.id === 'rt-pq') { pfs.q = e.target.value; const p0 = e.target.selectionStart; renderRoutine(rsub, null, true); const n = $1('#rt-pq'); if (n) { n.focus(); n.setSelectionRange(p0, p0); } return; } if (e.target.id === 'rt-iq') { ingQ = e.target.value; const p = e.target.selectionStart; renderRoutine(rsub, null, true); const n = $1('#rt-iq'); if (n) { n.focus(); n.setSelectionRange(p, p); } return; } if (e.target.name === 'prod' && e.target.form && e.target.form.id === 'rt-ask') { const p = resolveCode(e.target.value); const code = p ? p.c : ''; if (code !== askP && p && /—/.test(e.target.value)) { askP = code; const t = $1('#rt-ask textarea'), v = t ? t.value : '', n = $1('#rt-ask [name=nm]'), nv = n ? n.value : ''; renderRoutine(rsub, null, true); const t2 = $1('#rt-ask textarea'); if (t2) t2.value = v; const n2 = $1('#rt-ask [name=nm]'); if (n2) n2.value = nv; } } });


  /* ================= صفحة البحث (معزولة: /search?q=) ================= */
  const rsGet = () => { try { return JSON.parse(ls.get('lc_rs') || '[]').filter(x => typeof x === 'string').slice(0, 10); } catch (e) { return []; } };
  const rsSet = a => ls.set('lc_rs', JSON.stringify(a.slice(0, 10)));
  const rsAdd = t => { t = String(t || '').trim().slice(0, 60); if (t.length < 2) return; const a = rsGet().filter(x => x.toLowerCase() !== t.toLowerCase()); a.unshift(t); rsSet(a); };
  let spQ = '', spC = '', spS = '';
  const lev = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const m = []; for (let i = 0; i <= a.length; i++) { m[i] = [i]; } for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; };
  function didYouMean(qs) {
    const toks = WS(nrm(qs)).filter(t => t.length >= 3); if (!toks.length) return '';
    const vocab = new Set(); prodList().forEach(x => { WS(nrm(x.n)).forEach(w => w.length >= 3 && vocab.add(w)); if (x.k) WS(nrm(x.k)).forEach(w => w.length >= 3 && vocab.add(w)); });
    const out = toks.map(t => { if (vocab.has(t)) return t; let best = t, d = 3; vocab.forEach(w => { const e = lev(t, w); if (e < d) { d = e; best = w; } }); return d <= 2 ? best : t; });
    const s = out.join(' '); return s !== toks.join(' ') && srch(s).length ? s : '';
  }
  const popular = () => { const o = (typeof S !== 'undefined' && S.sq) || {}; const a = Object.entries(o).filter(([k]) => k.length > 1 && srch(k).length).sort((x, y) => y[1] - x[1]).slice(0, 8).map(x => x[0]); if (a.length >= 3) return a; const ks = [...new Set(prodList().map(x => x.k).filter(Boolean))].slice(0, 8); return [...a, ...ks].slice(0, 8); };
  function spHome() {
    const rs = rsGet(), pop = popular(), cats = [...new Set(prodList().map(x => x.k).filter(Boolean))].slice(0, 12), best = prodList().filter(x => x.b || x.o > x.p).slice(0, 6);
    return `${rs.length ? `<div class="sp-sec"><div class="sp-h"><b>${T('عمليات البحث الأخيرة', 'Recent searches')}</b><button type="button" class="ln" data-sp="rclr">${T('مسح الكل', 'Clear all')}</button></div><div class="sp-chips">${rs.map((t, i) => `<span class="sp-c"><button type="button" data-sp="rs" data-v="${E(t)}">${lcIco('clock')} ${E(t)}</button><button type="button" class="sp-x" data-sp="rx" data-i="${i}" aria-label="${T('حذف', 'Remove')}">×</button></span>`).join('')}</div></div>` : ''}
      ${pop.length ? `<div class="sp-sec"><div class="sp-h"><b>${T('الأكثر بحثاً', 'Trending')}</b></div><div class="sp-chips">${pop.map(t => `<button type="button" class="sp-c sp-p" data-sp="rs" data-v="${E(t)}">${lcIco('flame')} ${E(t)}</button>`).join('')}</div></div>` : ''}
      ${cats.length ? `<div class="sp-sec"><div class="sp-h"><b>${T('تصفّحي بالفئة', 'Browse by category')}</b></div><div class="sp-chips">${cats.map(t => `<button type="button" class="sp-c" data-sp="rs" data-v="${E(t)}">${E(t)}</button>`).join('')}</div></div>` : ''}
      ${best.length ? `<div class="sp-sec"><div class="sp-h"><b>${T('اقتراحات لك', 'Picked for you')}</b></div><div class="grid">${best.map(card).join('')}</div></div>` : ''}`;
  }
  function spResults() {
    const M = srch(spQ); let L = M;
    const cats = {}; M.forEach(x => { if (x.k) cats[x.k] = (cats[x.k] || 0) + 1; });
    if (spC) L = L.filter(x => x.k === spC);
    if (spS === 'lo') L = [...L].sort((a, b) => a.p - b.p); else if (spS === 'hi') L = [...L].sort((a, b) => b.p - a.p); else if (spS === 'off') L = [...L].sort((a, b) => (b.o > b.p ? 1 - b.p / b.o : 0) - (a.o > a.p ? 1 - a.p / a.o : 0));
    if (!M.length) {
      const dym = didYouMean(spQ), Sm = similar(M, M, 6);
      return `<div class="sp-none">${lcIco('search')}<p><b>${T('لا نتائج عن «' + E(spQ) + '»', 'No results for “' + E(spQ) + '”')}</b></p>${dym ? `<p>${T('هل تقصدين', 'Did you mean')}: <button type="button" class="sp-c sp-p" data-sp="rs" data-v="${E(dym)}">${E(dym)}</button></p>` : `<p class="em">${T('جرّبي كلمة أخرى أو كود المنتج.', 'Try another word or the product code.')}</p>`}</div>${spHome().replace(/<div class="sp-sec"><div class="sp-h"><b>[^<]*<\/b><button[\s\S]*?<\/div><\/div>/, '')}`;
    }
    const sm = similar(M, M, 6);
    return `<div class="sp-top"><p class="rs"><b>${L.length}</b> ${T('نتيجة', 'results')}</p><label class="sp-sort">${T('ترتيب', 'Sort')}<select id="sp-s">${[['', T('الأنسب', 'Relevance')], ['off', T('أكبر خصم', 'Biggest discount')], ['lo', T('الأقل سعراً', 'Price: low')], ['hi', T('الأعلى سعراً', 'Price: high')]].map(([k, n]) => `<option value="${k}" ${spS === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      ${Object.keys(cats).length > 1 ? `<div class="sp-chips sp-f"><button type="button" class="sp-c ${spC ? '' : 'on'}" data-sp="cat" data-v="">${T('الكل', 'All')} (${M.length})</button>${Object.entries(cats).map(([k, n]) => `<button type="button" class="sp-c ${spC === k ? 'on' : ''}" data-sp="cat" data-v="${E(k)}">${E(k)} (${n})</button>`).join('')}</div>` : ''}
      <div class="grid">${L.map(card).join('')}</div>${sm.length ? `<h3 class="sh"><span>${T('منتجات مشابهة', 'Similar products')}</span></h3><div class="grid">${sm.map(card).join('')}</div>` : ''}`;
  }
  function spDraw() { const r = $1('#sp-res'), x = $1('#sp-x'); if (!r) return; if (x) x.hidden = !spQ; r.innerHTML = spQ.trim() ? spResults() : spHome(); }
  function renderSearch(u) {
    const el = $1('#srp'); if (!el) return; spQ = (u && u.searchParams.get('q')) || ''; spC = ''; spS = '';
    document.title = (spQ ? spQ + ' | ' : '') + TITLES.search;
    el.innerHTML = `<div class="w"><form id="sp-f" class="sp-bar" role="search"><button type="button" class="sp-bk" data-sp="back" aria-label="${T('رجوع', 'Back')}">→</button><div class="sp-in">${lcIco('search')}<input id="sp-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="${T('ابحثي باسم المنتج أو الكود', 'Search by product name or code')}" value="${E(spQ)}"><button type="button" id="sp-x" class="sp-clr" data-sp="clr" aria-label="${T('مسح', 'Clear')}" ${spQ ? '' : 'hidden'}>×</button></div></form><div id="sp-res"></div></div>`;
    spDraw(); const i = $1('#sp-q'); if (i && !spQ) setTimeout(() => i.focus(), 30);
  }
  let spT = 0;
  document.addEventListener('input', e => { if (e.target.id !== 'sp-q') return; spQ = e.target.value; spC = ''; clearTimeout(spT); spT = setTimeout(() => { try { history.replaceState(null, '', '/search' + (spQ.trim() ? '?q=' + encodeURIComponent(spQ.trim()) : '')); } catch (x) {} document.title = (spQ.trim() ? spQ.trim() + ' | ' : '') + TITLES.search; spDraw(); }, 140); });
  document.addEventListener('submit', e => { if (e.target.id !== 'sp-f') return; e.preventDefault(); e.stopPropagation(); const t = spQ.trim(); if (t.length > 1) { rsAdd(t); try { const k = t.toLowerCase(); S.sq = S.sq || {}; S.sq[k] = (S.sq[k] || 0) + 1; save(); } catch (x) {} } const i = $1('#sp-q'); if (i) i.blur(); }, true);
  document.addEventListener('change', e => { if (e.target.id === 'sp-s') { spS = e.target.value; spDraw(); } });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#srp [data-sp]'); if (b) {
      const k = b.dataset.sp, v = b.dataset.v;
      if (k === 'rs') { spQ = v; spC = ''; const i = $1('#sp-q'); if (i) i.value = v; rsAdd(v); try { history.replaceState(null, '', '/search?q=' + encodeURIComponent(v)); } catch (x) {} spDraw(); }
      else if (k === 'rx') { const a = rsGet(); a.splice(+b.dataset.i, 1); rsSet(a); spDraw(); }
      else if (k === 'rclr') { rsSet([]); spDraw(); toast(T('تم مسح عمليات البحث', 'Search history cleared')); }
      else if (k === 'cat') { spC = v; spDraw(); }
      else if (k === 'clr') { spQ = ''; spC = ''; const i = $1('#sp-q'); if (i) { i.value = ''; i.focus(); } try { history.replaceState(null, '', '/search'); } catch (x) {} spDraw(); }
      else if (k === 'back') { if (navDepth > 0) history.back(); else lcNav('/'); }
      return;
    }
    const c = e.target.closest && e.target.closest('#srp .card'); if (c && spQ.trim().length > 1) rsAdd(spQ.trim());
  }, true);
  { const hq = $1('#sq'); if (hq) { hq.addEventListener('focus', () => { if (cur !== 'search') { hq.blur(); lcNav('/search'); } }); } }

  /* ---------- «أعلميني عند التوفر» ---------- */
  const wtApi = (body) => fetch((typeof API == 'function' && API() || '') + '/me/watch', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
  async function wtInit() { const b = document.querySelector('#prd .wt'); if (!b || !(typeof custMe == 'function' && custMe())) return; try { const j = await wtApi(); if (j.codes && j.codes.includes(b.dataset.wt)) { b.classList.add('on'); b.innerHTML = lcIco('check') + ' ' + T('سنخبرك عند التوفر (اضغطي للإلغاء)', 'We will notify you (tap to cancel)'); } } catch (e) {} }
  new MutationObserver(() => { const b = document.querySelector('#prd .wt'); if (b && !b.dataset.i) { b.dataset.i = 1; wtInit(); } }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#prd .wt'); if (!b) return;
    if (!(typeof custMe == 'function' && custMe())) { toast(T('سجّلي الدخول لنخبرك عند توفره', 'Sign in so we can notify you')); return lcNav('/account'); }
    const on = b.classList.contains('on');
    try { const j = await wtApi({ code: b.dataset.wt, off: on }); if (j.error) throw new Error(j.error); b.classList.toggle('on', !on); b.innerHTML = on ? lcIco('bell') + ' ' + T('أعلميني عند التوفر', 'Notify me when back') : lcIco('check') + ' ' + T('سنخبرك عند التوفر (اضغطي للإلغاء)', 'We will notify you (tap to cancel)'); toast(on ? T('أُلغي التنبيه', 'Cancelled') : T('سنخبرك فور توفره 🌸', 'We will tell you as soon as it is back')); } catch (x) { toast(x.message || 'error'); }
  });

  /* ================= مركز المساعدة / تتبع الطلب / الإعدادات (صفحات معزولة) ================= */
  const FAQ = [
    ['كم مدة التوصيل؟', 'How long is delivery?', 'يصل الطلب عادةً خلال 1–3 أيام عمل داخل العراق، وتصلك رسالة عند كل مرحلة.', 'Orders usually arrive within 1–3 working days in Iraq, with an update at each stage.'],
    ['كيف أتتبع طلبي؟', 'How do I track my order?', 'اذهبي إلى «تتبع الطلب» وأدخلي رمز الطلب (LC-XXXXXX) من الإيصال.', 'Open “Track order” and enter the code (LC-XXXXXX) from your receipt.'],
    ['هل أستطيع تعديل أو إلغاء الطلب؟', 'Can I change or cancel my order?', 'نعم قبل الشحن: اكتبي لنا في المحادثة «تعديل طلبي» أو «إلغاء طلبي».', 'Yes, before it ships: tell us in the chat — “modify” or “cancel” my order.'],
    ['كيف أسأل عن منتج؟', 'How do I ask about a product?', 'اضغطي زر «روتين» على بطاقة المنتج أو اكتبي كود المنتج في المحادثة.', 'Tap the “Routine” button on the product card or type its code in the chat.'],
    ['كيف أحصل على الأكواد والعروض؟', 'How do I get codes and offers?', 'فعّلي استلام العروض من «الإعدادات» وستصلك الأكواد على واتساب.', 'Turn on offers in “Settings” and we will send codes on WhatsApp.'],
  ];
  function renderHelp(sub) {
    const el = $1('#hlpg'); if (!el) return;
    document.body.classList.toggle('cfull', sub === 'chat');
    if (sub === 'chat') {
      el.innerHTML = `<a class="cfx" href="/help" aria-label="${T('رجوع', 'Back')}">✕</a><div id="hl-chat"></div>`;
      if (window.LCChat) LCChat.mount($1('#hl-chat'), 'service'); return;
    }
    if (window.LCChat) LCChat.unmount();
    el.innerHTML = `<div class="w"><div class="rh"><h2>${lcIco('headset')} ${T('مركز المساعدة', 'Help centre')}</h2><p>${T('تحدّثي مع فريق خدمة الزبائن أو ابحثي في الأسئلة الشائعة.', 'Chat with customer service or browse the FAQ.')}</p></div>
      <a class="btn" href="/help/chat" style="display:block;text-align:center;margin-bottom:12px">${lcIco('headset')} ${T('ابدأ محادثة مع الدعم', 'Start a chat with support')}</a>
      <div class="tiles2"><a href="/tracking"><b>${lcIco('box')} ${T('تتبع الطلب', 'Track order')}</b><small>${T('برمز الطلب', 'By order code')}</small></a><a href="/routine/support"><b>${lcIco('flower')} ${T('دعم روتين', 'Routine support')}</b><small>${T('استشارة بشرة', 'Skin advice')}</small></a><a href="/account/orders"><b>${lcIco('receipt')} ${T('طلباتي', 'My orders')}</b><small>${T('وإيصالاتي', 'and receipts')}</small></a></div>
      <h3>${T('أسئلة شائعة', 'FAQ')}</h3><div class="faq">${FAQ.map(f => `<details><summary>${T(f[0], f[1])}</summary><p>${T(f[2], f[3])}</p></details>`).join('')}</div></div>`;
  }
  function renderTrack(u) {
    const f = $1('#tkf'); if (!f) return; const c = u && u.searchParams.get('c');
    const sub = $1('#tks'); if (sub) sub.textContent = T('أدخلي رمز الطلب من الإيصال (LC-XXXXXX).', 'Enter the order code from your receipt (LC-XXXXXX).');
    if (c && f.elements.code && f.elements.code.value !== c) { f.elements.code.value = c; try { H.tkf({ code: c }); } catch (e) {} }
  }
  function renderPrefs() {
    const el = $1('#prf'); if (!el) return; const me = typeof custMe == 'function' ? custMe() : null;
    el.innerHTML = `<div class="w"><div class="rh"><h2>${lcIco('gear')} ${T('الإعدادات', 'Settings')}</h2></div>
      <div class="prf-c"><b>${T('اللغة', 'Language')}</b><select id="pf-l"><option value="ar" ${lang == 'ar' ? 'selected' : ''}>العربية</option><option value="en" ${lang == 'en' ? 'selected' : ''}>English</option></select></div>
      ${me ? `<div class="prf-c"><b>${T('الخصوصية والإشعارات', 'Privacy & notifications')}</b><label><input type="checkbox" id="pf-m" ${me.mkt ? 'checked' : ''}> ${T('أرغب باستلام العروض والأكواد', 'Send me offers and codes')}</label><small>${T('الرسائل المتعلقة بطلباتك تصلك دائماً.', 'Messages about your orders are always sent.')}</small></div>
      <div class="prf-c"><b>${E(me.name || me.email || me.ph || '')}</b><div class="row2" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn g" href="/account">${T('ملفي الشخصي', 'My profile')}</a><button class="btn g" data-pf="out">${T('تسجيل الخروج', 'Sign out')}</button><button class="btn g" data-pf="outall">${T('الخروج من كل الأجهزة', 'Sign out everywhere')}</button></div></div>`
      : `<div class="prf-c"><b>${T('سجّلي الدخول لإدارة تفضيلاتك', 'Sign in to manage your preferences')}</b><a class="btn" href="/account">${T('تسجيل الدخول', 'Sign in')}</a></div>`}
      <div class="prf-c"><b>${T('مساعدة', 'Help')}</b><div class="row2" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn g" href="/help">${T('خدمة الزبائن', 'Customer service')}</a><a class="btn g" href="/routine/support">${T('دعم روتين', 'Routine support')}</a><a class="btn g" href="/tracking">${T('تتبع الطلب', 'Track order')}</a></div></div></div>`;
  }
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'pf-l') { const s = $1('#lsw'); if (s) { s.value = t.value; s.dispatchEvent(new Event('change', { bubbles: true })); } setTimeout(renderPrefs, 80); }
    else if (t.id === 'pf-m') { try { const r = await fetch((typeof API == 'function' && API() || '') + '/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ mkt: t.checked }) }); if (!r.ok) throw 0; if (window.accountRefresh) accountRefresh(); toast(T('تم الحفظ', 'Saved')); } catch (x) { t.checked = !t.checked; toast('error'); } }
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#prf [data-pf]'); if (!b) return;
    const all = b.dataset.pf === 'outall';
    try { await fetch((typeof API == 'function' && API() || '') + (all ? '/auth/logout-all' : '/auth/logout'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: '{}' }); } catch (x) {}
    if (typeof accountSignOut == 'function') accountSignOut(); else { try { localStorage.removeItem('lc_ct'); localStorage.removeItem('lc_me'); } catch (x) {} location.href = '/'; return; }
    renderPrefs();
  });

  /* ---------- إقلاع ---------- */
  function init() {
    buildBar(); hook();
    const start = location.pathname + location.search + location.hash;
    if (/^#\/[\w-]/.test(location.hash) && parse(start).page === 'home') show('/categories' + location.hash, false, true); else show(start, false, false);
    if (parse(start).page === 'support') { cur = 'support'; document.body.dataset.pg = 'support'; secVisible('support'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  }
  init();
})();
