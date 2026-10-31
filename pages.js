/* pages.js — صفحات معزولة برابط لكل صفحة + الشريط السفلي + قسم «روتين» */
(function () {
  'use strict';
  const T = (a, e) => (typeof lang !== 'undefined' && lang == 'en') ? e : a;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $1 = s => document.querySelector(s);
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const PAGES = { '': 'home', categories: 'categories', offers: 'offers', routine: 'routine', help: 'help', tracking: 'tracking', preferences: 'preferences', p: 'product', cart: 'cart', checkout: 'checkout', account: 'account', support: 'support' };
  const TITLES = { home: 'Lacey Skincare', categories: 'الفئات | Lacey', offers: 'عروضنا | Lacey', routine: 'روتين | Lacey', cart: 'السلة | Lacey', checkout: 'إتمام الطلب | Lacey', account: 'حسابي | Lacey', support: 'الدعم | Lacey', product: 'Lacey', help: 'مركز المساعدة | Lacey', tracking: 'تتبع الطلب | Lacey', preferences: 'الإعدادات | Lacey' };
  const OVERLAY = ['cart', 'checkout', 'account'];
  const hdr = document.getElementById('hlp'); if (hdr) hdr.addEventListener('click', e => { e.preventDefault(); lcNav('/help'); });
  let cur = '', prevPath = '/', bn = null;

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
    if ((was === 'routine' || was === 'help') && window.LCChat && page !== was) LCChat.unmount();
    if (was === 'account' && page !== 'account' && window.accountHide) accountHide();
    if (was && !OVERLAY.includes(was) && was !== 'support' && was !== page) prevPath = location.pathname + location.search;
    if ((was === 'cart' || was === 'checkout') && page !== 'cart' && page !== 'checkout') closeCart();
    const full = u.pathname + u.search + (u.hash || '');
    const dept = /^#\/[\w-]/.test(u.hash || '');
    if (push) history.pushState(null, '', full); else if (replace) history.replaceState(null, '', full);
    if (!dept && (location.hash || '') === '' && was === 'categories' && page !== 'categories') { try { dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) {} }
    cur = page; document.body.dataset.pg = page; document.title = TITLES[page] || TITLES.home;
    secVisible(page);
    if (bn) { bn.querySelectorAll('a[data-p]').forEach(a => { const on = a.dataset.p === 'orders' ? (page === 'tracking' || (page === 'account' && sub === 'orders')) : (a.dataset.p === page || (page === 'checkout' && a.dataset.p === 'cart')); a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); }); const ac = document.getElementById('accb'); if (ac) ac.classList.toggle('cur', page === 'account' && sub !== 'orders'); }
    if (page === 'cart' || page === 'checkout') { try { view = page === 'cart' ? 'bag' : 'form'; rc(); const cv = $1('#cv'); cv.classList.add('on', 'pgv'); } catch (e) { console.error(e); } }
    if (page === 'account' && window.accountShow) accountShow({ '': 'p', orders: 'o', receipts: 'r', alerts: 'n' }[sub] || 'p');
    if (page === 'routine') renderRoutine(sub, u);
    if (page === 'help') renderHelp(sub);
    if (page === 'product') renderProduct(sub);
    if (page === 'tracking') renderTrack(u);
    if (page === 'preferences') renderPrefs();
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
    A.pg = () => A.x();
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
    el.innerHTML = `<div class="w"><p><a href="/categories">← ${T('المتجر', 'Shop')}</a></p><div class="pgd"><div><div class="pim" style="${im ? `background-image:url('${E(im)}')` : ''}"></div>${gal.length > 1 ? `<div class="pth">${gal.map((u, k) => `<button data-pi="${k}" class="${k === pimg ? 'on' : ''}" style="background-image:url('${E(u)}')" aria-label="${k + 1}"></button>`).join('')}</div>` : ''}</div>
      <div><small>${E(pd.c)}${b ? ' · ' + E(b.n) : ''}${pd.k ? ' · ' + E(pd.k) : ''}</small><h1>${E(pd.n)}</h1><div class="pr">${fmM(pd.p)}${pd.o > pd.p ? ` <s>${fmM(pd.o)}</s>` : ''}</div>
      ${pd.left === 0 ? `<p class="so2">${T('نفد من المخزون', 'Sold out')}</p>` : low ? `<p class="lw2">${T('متبقي ' + pd.left + ' قطع فقط', 'Only ' + pd.left + ' left')}</p>` : ''}
      ${ingOf(pd).length ? `<h3>${T('المكونات الفعالة', 'Active ingredients')}</h3>${ingHTML(pd)}` : ''}
      ${typeof descHTML == 'function' ? descHTML(pd) : ''}
      <div class="row2"><button class="btn" data-a="add" data-c="${E(pd.c)}" ${pd.left === 0 ? 'disabled' : ''}>${T('أضف إلى السلة', 'Add to bag')}</button><button class="btn g" data-a="rtn" data-c="${E(pd.c)}">${T('اسأل روتين', 'Ask Routine')}</button><button class="btn g" data-pcopy="1">${T('نسخ الرابط', 'Copy link')}</button></div></div></div>
      ${same.length ? `<h3>${T('منتجات مشابهة', 'Similar products')}</h3><div class="grid">${same.map(card).join('')}</div>` : ''}</div>`;
  }
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
  rq.skin = rq.skin || ''; rq.concerns = rq.concerns || []; rq.when = rq.when || 'both'; rq.preg = !!rq.preg; rq.budget = rq.budget || ''; rq.dq = Array.isArray(rq.dq) ? rq.dq : []; rq.sens = !!rq.sens; let diagOpen = false, pfs = { step: '', q: '' };
  const sv = () => ls.set('lc_rq', JSON.stringify({ skin: rq.skin, concerns: rq.concerns, when: rq.when, preg: rq.preg, budget: rq.budget, dq: rq.dq, sens: rq.sens }));
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
      return { id, ar, en, when, items: scored.slice(0, 2).map(x => x[1]) };
    });
  }
  const pcard = (p, acts) => `<div class="rt-p"><div class="th" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></div><div><b>${E(p.n)}</b><small>${E(p.c)} · ${fmM(p.p)}</small>${ingHTML(p)}</div><div class="acts">${acts ? `<button data-rt="add" data-c="${E(p.c)}">${T('أضف', 'Add')}</button><button class="g" data-rt="ask" data-c="${E(p.c)}">${T('اسأل', 'Ask')}</button>` : ''}</div></div>`;

  function quizHTML() {
    const me = typeof custMe == 'function' ? custMe() : null;
    const pre = savedHTML();
    const opt = (list, sel, kind) => list.map(([k, ar, en]) => `<button type="button" data-rt="${kind}" data-v="${k}" class="${(Array.isArray(sel) ? sel.includes(k) : sel === k) ? 'on' : ''}" aria-pressed="${Array.isArray(sel) ? sel.includes(k) : sel === k}">${T(ar, en)}</button>`).join('');
    const dr = diagResult(rq.dq), sk0 = dr && SKINS.find(x => x[0] === dr.skin);
    const diag = !diagOpen ? `<button type="button" class="btn g" data-rt="dopen">${T('لا أعرف نوع بشرتي — قيّمي بشرتي', 'Not sure — assess my skin')}</button>` :
      `<div class="rt-dq">${DQ.map((q, qi) => `<div class="rt-q"><b>${qi + 1}. ${T(q[0], q[1])}</b><div class="rt-opts">${q[2].map((o, oi) => `<button type="button" data-rt="dq" data-q="${qi}" data-v="${oi}" class="${rq.dq[qi] === oi ? 'on' : ''}">${T(o[2], o[3])}</button>`).join('')}</div></div>`).join('')}
        ${dr ? `<p class="rt-ok">${lcIco('check')} ${T('نتيجة التقييم: بشرة ' + sk0[1] + (dr.sens && dr.skin !== 'sensitive' ? ' مع حساسية' : ''), 'Result: ' + sk0[2] + ' skin' + (dr.sens && dr.skin !== 'sensitive' ? ' with sensitivity' : ''))}</p><small class="em">${T('تم اعتماد النتيجة تلقائياً، ويمكنك تغييرها أعلاه.', 'Applied automatically — you can change it above.')}</small>` : `<small class="em">${rq.dq.filter(x => x != null).length}/${DQ.length}</small>`}</div>`;
    let out = pre + `<div class="rt-c"><h3>1. ${T('ما نوع بشرتك؟', 'What is your skin type?')}</h3><div class="rt-opts">${opt(SKINS, rq.skin, 'skin')}</div>${rq.sens && rq.skin !== 'sensitive' ? `<p class="rt-warn">${lcIco('warn')} ${T('بشرتك تتأثر بسهولة: سنُبعد الأحماض والريتينول القويّة.', 'Your skin is reactive: strong acids and retinol are deprioritised.')}</p>` : ''}${diag}
      <h3>2. ${T('ما الذي تريدين معالجته؟ (اختاري أكثر من واحد)', 'What would you like to treat? (pick any)')}</h3><div class="rt-opts">${opt(CONCERNS, rq.concerns, 'con')}</div>
      <h3>3. ${T('متى تستخدمين روتينك؟', 'When do you use your routine?')}</h3><div class="rt-opts">${opt(WHEN, rq.when, 'when')}</div>
      <h3>4. ${T('تفضيلات إضافية', 'Extras')}</h3><div class="rt-opts"><button type="button" data-rt="preg" class="${rq.preg ? 'on' : ''}" aria-pressed="${rq.preg}">${T('حامل أو مرضعة', 'Pregnant / nursing')}</button><button type="button" data-rt="budget" class="${rq.budget === 'low' ? 'on' : ''}" aria-pressed="${rq.budget === 'low'}">${T('الأوفر سعراً', 'Lowest price first')}</button></div>
      ${rq.preg ? `<p class="rt-warn">${T('استبعدنا الريتينول وحمض الساليسيليك وبيروكسيد البنزويل. استشيري طبيبتك قبل أي منتج علاجي.', 'We left out retinol, salicylic acid and benzoyl peroxide. Ask your doctor before any active product.')}</p>` : ''}
      ${me && me.age != null && me.age < 18 ? `<p class="em">${T('لأن عمرك أقل من 18 استبعدنا المنتجات القوية مثل الريتينول.', 'Because you are under 18 we left out strong actives such as retinol.')}</p>` : ''}
      <button class="btn" data-rt="go" ${rq.skin ? '' : 'disabled'}>${T('اعرضي روتيني', 'Show my routine')}</button></div>`;
    if (res && rq.skin) {
      const rec = recommend(), show1 = (w) => rec.filter(s => w === 'am' ? true : s.when !== 'am');
      const blk = (title, steps) => `<div class="rt-c"><h3>${title}</h3>${steps.map((s, i) => `<div class="rt-step"><b>${i + 1}</b><div><b>${T(s.ar, s.en)}</b>${s.items.length ? s.items.map(p => pcard(p, true)).join('') : `<p class="em">${T('لا يوجد منتج مناسب حالياً — اسألي مختصاً.', 'No matching product yet — ask a specialist.')}</p>`}</div></div>`).join('')}</div>`;
      const sk = SKINS.find(x => x[0] === rq.skin);
      out += `<div class="rt-c"><h3>${lcIco('flower')} ${T('روتينك للبشرة ' + sk[1], 'Your routine for ' + sk[2] + ' skin')}</h3><p class="em">${E(TIPS[rq.skin])}</p></div>`;
      const pick = w => (w === 'am' ? rec : rec.filter(s => s.when !== 'am')).map(s => s.items[0]).filter(Boolean);
      const warn = w => conflicts(actsOf(pick(w))).map(x => `<p class="rt-warn">${lcIco('warn')} ${E(x)}</p>`).join('');
      if (rq.when !== 'pm') out += blk(lcIco('sun') + ' ' + T('الصباح', 'Morning'), show1('am')) + warn('am');
      if (rq.when !== 'am') out += blk(lcIco('moon') + ' ' + T('المساء', 'Evening'), show1('pm')) + warn('pm');
      out += `<div class="rt-c"><button class="btn" data-rt="send">${T('أرسلي روتيني إلى مختصة', 'Send my routine to a specialist')}</button> <button class="btn g" data-rt="saveR">${T('احفظي روتيني', 'Save my routine')}</button> <button class="btn g" data-rt="addall">${T('أضيفي الكل للسلة', 'Add all to bag')}</button></div>`;
    }
    return out;
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
  function renderRoutine(sub, u, quiet) {
    rsub = sub || ''; const el = $1('#rtn'); if (!el) return;
    const tab = rsub === 'ask' ? 'ask' : rsub === 'support' ? 'support' : rsub === 'guide' ? 'guide' : rsub === 'products' ? 'products' : 'quiz';
    if (u && u.searchParams.get('p')) { askP = u.searchParams.get('p'); }
    if (tab !== 'support' && window.LCChat) LCChat.unmount();
    const tabs = [['quiz', '/routine', T('روتيني', 'My routine')], ['products', '/routine/products', T('كل المنتجات', 'All products')], ['guide', '/routine/guide', T('دليل المكونات', 'Ingredients')], ['ask', '/routine/ask', T('اسألي عن منتج', 'Ask about a product')], ['support', '/routine/support', T('الدعم', 'Support')]];
    el.innerHTML = `<div class="w"><div class="rh"><h2>${lcIco('flower')} ${T('روتين', 'Routine')}</h2><p>${T('مستشارتك الشخصية للعناية بالبشرة: تحليل بشرتك، اقتراح منتجات، وتحدّثي مع فريقنا.', 'Your personal skincare advisor: analyse your skin, get product picks, and chat with our team.')}</p></div>
      <nav class="rt-tabs" aria-label="Routine">${tabs.map(([k, h, n]) => `<a href="${h}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</nav>
      <div id="rtb">${tab === 'quiz' ? quizHTML() : tab === 'ask' ? askHTML() : tab === 'guide' ? guideHTML() : tab === 'products' ? prodsHTML() : `<div id="rt-chat"></div>`}</div></div>`;
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
    else if (k === 'addall') { recommend().forEach(s => { if (s.items[0]) cart[s.items[0].c] = (cart[s.items[0].c] || 0) + 1; }); save(); rcount(); toast(T('أُضيفت منتجات الروتين للسلة', 'Routine products added to bag')); }
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
    if (sub === 'chat') {
      el.innerHTML = `<div class="w"><div class="rh"><h2>${lcIco('headset')} ${T('محادثة خدمة الزبائن', 'Customer service chat')}</h2><p><a href="/help">← ${T('مركز المساعدة', 'Help centre')}</a></p></div><div id="hl-chat"></div></div>`;
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
