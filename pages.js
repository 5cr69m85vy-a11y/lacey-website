/* pages.js — صفحات معزولة برابط لكل صفحة + الشريط السفلي + قسم «روتين» */
(function () {
  'use strict';
  const T = (a, e) => (typeof lang !== 'undefined' && lang == 'en') ? e : a;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $1 = s => document.querySelector(s);
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const PAGES = { '': 'home', categories: 'categories', offers: 'offers', routine: 'routine', help: 'help', tracking: 'tracking', preferences: 'preferences', cart: 'cart', checkout: 'checkout', account: 'account', support: 'support' };
  const TITLES = { home: 'Lacey Skincare', categories: 'الفئات | Lacey', offers: 'عروضنا | Lacey', routine: 'روتين | Lacey', cart: 'السلة | Lacey', checkout: 'إتمام الطلب | Lacey', account: 'حسابي | Lacey', support: 'الدعم | Lacey', help: 'مركز المساعدة | Lacey', tracking: 'تتبع الطلب | Lacey', preferences: 'الإعدادات | Lacey' };
  const OVERLAY = ['cart', 'checkout', 'account'];
  const hdr = document.getElementById('hlp'); if (hdr) hdr.addEventListener('click', e => { e.preventDefault(); lcNav('/help'); });
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
    if ((was === 'routine' || was === 'help') && window.LCChat && !(page === was)) LCChat.unmount();
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
    if (page === 'help') renderHelp();
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
    A.rtn = c => lcNav('/routine/ask?p=' + encodeURIComponent(c));
    const ox = A.x; A.x = function () { ox.apply(this, arguments); if (OVERLAY.includes(cur)) lcNav(prevPath || '/'); };
    const ogo = A.go, MAP = { shop: 'categories', dpt: 'categories', offers: 'offers', best: 'home', half: 'home', delivery: 'home', how: 'home', reviews: 'home', top: 'home', trk: 'tracking' };
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
  rq.skin = rq.skin || ''; rq.concerns = rq.concerns || []; rq.when = rq.when || 'both'; rq.preg = !!rq.preg; rq.budget = rq.budget || '';
  const sv = () => ls.set('lc_rq', JSON.stringify({ skin: rq.skin, concerns: rq.concerns, when: rq.when, preg: rq.preg, budget: rq.budget }));
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

  function recommend() {
    const me = typeof custMe == 'function' ? custMe() : null, young = me && me.age != null && me.age < 18, list = prodList().filter(p => !(young && /retinol|ريتينول/i.test(plain(p))) && !(rq.preg && /retinol|ريتينول|salicylic|ساليسيليك|benzoyl|بنزويل/i.test(plain(p))));
    return STEPS.map(([id, ar, en, re, when]) => {
      const pool = list.filter(p => re.test(p.k || '') || re.test(p.n || ''));
      const scored = pool.map(p => { const t = plain(p); let s = rq.budget === 'low' ? -p.p / 1e6 : 0; if (rq.skin && KW[rq.skin].test(t)) s += 3; rq.concerns.forEach(c => { if (KW[c].test(t)) s += 2; }); return [s, p]; }).sort((a, b) => b[0] - a[0] || a[1].p - b[1].p);
      return { id, ar, en, when, items: scored.slice(0, 2).map(x => x[1]) };
    });
  }
  const pcard = (p, acts) => `<div class="rt-p"><div class="th" style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></div><div><b>${E(p.n)}</b><small>${E(p.c)} · ${fmM(p.p)}</small></div><div class="acts">${acts ? `<button data-rt="add" data-c="${E(p.c)}">${T('أضف', 'Add')}</button><button class="g" data-rt="ask" data-c="${E(p.c)}">${T('اسأل', 'Ask')}</button>` : ''}</div></div>`;

  function quizHTML() {
    const me = typeof custMe == 'function' ? custMe() : null;
    const pre = savedHTML();
    const opt = (list, sel, kind) => list.map(([k, ar, en]) => `<button type="button" data-rt="${kind}" data-v="${k}" class="${(Array.isArray(sel) ? sel.includes(k) : sel === k) ? 'on' : ''}" aria-pressed="${Array.isArray(sel) ? sel.includes(k) : sel === k}">${T(ar, en)}</button>`).join('');
    let out = pre + `<div class="rt-c"><h3>1. ${T('ما نوع بشرتك؟', 'What is your skin type?')}</h3><div class="rt-opts">${opt(SKINS, rq.skin, 'skin')}</div>
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
      out += `<div class="rt-c"><h3>✨ ${T('روتينك للبشرة ' + sk[1], 'Your routine for ' + sk[2] + ' skin')}</h3><p class="em">${E(TIPS[rq.skin])}</p></div>`;
      const pick = w => (w === 'am' ? rec : rec.filter(s => s.when !== 'am')).map(s => s.items[0]).filter(Boolean);
      const warn = w => conflicts(actsOf(pick(w))).map(x => `<p class="rt-warn">⚠️ ${E(x)}</p>`).join('');
      if (rq.when !== 'pm') out += blk('☀️ ' + T('الصباح', 'Morning'), show1('am')) + warn('am');
      if (rq.when !== 'am') out += blk('🌙 ' + T('المساء', 'Evening'), show1('pm')) + warn('pm');
      out += `<div class="rt-c"><button class="btn" data-rt="send">${T('أرسلي روتيني إلى مختصة', 'Send my routine to a specialist')}</button> <button class="btn g" data-rt="saveR">${T('احفظي روتيني', 'Save my routine')}</button> <button class="btn g" data-rt="addall">${T('أضيفي الكل للسلة', 'Add all to bag')}</button></div>`;
    }
    return out;
  }
  function savedHTML() {
    const sr = savedR(); if (!sr || !(sr.am && sr.am.length || sr.pm && sr.pm.length)) return '';
    const d = daily(), line = (w, codes) => codes.map(c => { const pr = prodBy(c); return pr ? `<label class="rt-chk${d[w].includes(c) ? ' done' : ''}"><input type="checkbox" data-rt="tick" data-w="${w}" data-c="${E(c)}" ${d[w].includes(c) ? 'checked' : ''}><div class="th" style="width:40px;height:40px;border-radius:10px;background:#eee center/cover;${pr.i ? `background-image:url('${E(pr.i)}')` : ''}"></div><span><b>${E(pr.n)}</b><small> ${E(pr.c)}</small></span></label>` : ''; }).join('');
    const total = (sr.am || []).length + (sr.pm || []).length, got = d.am.length + d.pm.length;
    return `<div class="rt-c"><h3>📋 ${T('روتيني اليوم', 'My routine today')}</h3><div class="rt-str"><span>🔥 ${T('أيام متتالية: ', 'Streak: ')}${d.streak}</span><span>${got}/${total} ${T('خطوات اليوم', 'steps today')}</span></div>
      ${(sr.am || []).length ? `<h4>☀️ ${T('الصباح', 'Morning')}</h4>${line('am', sr.am)}` : ''}${(sr.pm || []).length ? `<h4>🌙 ${T('المساء', 'Evening')}</h4>${line('pm', sr.pm)}` : ''}
      <p class="em">${T('علّمي الخطوات التي أنجزتِها اليوم لتحافظي على سلسلة التزامك.', 'Tick the steps you did today to keep your streak.')}</p></div>`;
  }
  function guideHTML() {
    const q = ingQ.trim().toLowerCase(), list = ING.filter(i => !q || (i[1] + ' ' + i[2]).toLowerCase().includes(q));
    const sel = ING.filter(i => ingSel.includes(i[0])), cf = sel.length > 1 ? CONFLICT.filter(c => ingSel.includes(c[0]) && ingSel.includes(c[1])) : [];
    return `<div class="rt-c"><h3>🧪 ${T('دليل المكونات', 'Ingredient guide')}</h3><input id="rt-iq" type="search" placeholder="${T('ابحثي عن مكوّن…', 'Search an ingredient…')}" value="${E(ingQ)}" style="width:100%;padding:12px 14px;border:1px solid #d9cfe8;border-radius:14px;font:inherit">
      ${list.map(i => `<div class="rt-ing"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-rt="ing" data-v="${i[0]}" ${ingSel.includes(i[0]) ? 'checked' : ''}><b>${T(i[1], i[2])}</b></label><small>${T(i[3], i[4])}</small><small>${i[5].includes('am') ? '☀️ ' : ''}${i[5].includes('pm') ? '🌙 ' : ''}${i[6] === 'avoid' ? T('· لا يناسب الحمل', '· not for pregnancy') : i[6] === 'limit' ? T('· باعتدال', '· use in moderation') : ''}</small></div>`).join('') || `<p class="em">${T('لا نتائج', 'No results')}</p>`}</div>
      <div class="rt-c"><h3>⚖️ ${T('هل يمكن الجمع بينها؟', 'Can I combine them?')}</h3><p class="em">${T('علّمي مكوّنين أو أكثر من القائمة لنخبرك.', 'Tick two or more ingredients above.')}</p>
      ${sel.length > 1 ? (cf.length ? cf.map(c => `<p class="rt-warn">⚠️ ${T(c[2], c[3])}</p>`).join('') : `<p class="rt-ok">✅ ${T('لا تعارض معروف بين هذه المكوّنات.', 'No known conflict between these.')}</p>`) : ''}</div>`;
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
    const tab = rsub === 'ask' ? 'ask' : rsub === 'support' ? 'support' : rsub === 'guide' ? 'guide' : 'quiz';
    if (u && u.searchParams.get('p')) { askP = u.searchParams.get('p'); }
    if (tab !== 'support' && window.LCChat) LCChat.unmount();
    const tabs = [['quiz', '/routine', T('روتيني', 'My routine')], ['guide', '/routine/guide', T('دليل المكونات', 'Ingredients')], ['ask', '/routine/ask', T('اسألي عن منتج', 'Ask about a product')], ['support', '/routine/support', T('الدعم', 'Support')]];
    el.innerHTML = `<div class="w"><div class="rh"><h2>🌸 ${T('روتين', 'Routine')}</h2><p>${T('مستشارتك الشخصية للعناية بالبشرة: تحليل بشرتك، اقتراح منتجات، وتحدّثي مع فريقنا.', 'Your personal skincare advisor: analyse your skin, get product picks, and chat with our team.')}</p></div>
      <nav class="rt-tabs" aria-label="Routine">${tabs.map(([k, h, n]) => `<a href="${h}" class="${tab === k ? 'on' : ''}">${n}</a>`).join('')}</nav>
      <div id="rtb">${tab === 'quiz' ? quizHTML() : tab === 'ask' ? askHTML() : tab === 'guide' ? guideHTML() : `<div id="rt-chat"></div>`}</div></div>`;
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
    if (k === 'skin') { rq.skin = v; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'con') { rq.concerns = rq.concerns.includes(v) ? rq.concerns.filter(x => x !== v) : [...rq.concerns, v]; res = false; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'when') { rq.when = v; sv(); renderRoutine(rsub, null, true); }
    else if (k === 'go') { res = true; renderRoutine(rsub, null, true); const r = document.querySelector('#rtb .rt-c:nth-child(2)'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }
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
  document.addEventListener('input', e => { if (e.target.id === 'rt-iq') { ingQ = e.target.value; const p = e.target.selectionStart; renderRoutine(rsub, null, true); const n = $1('#rt-iq'); if (n) { n.focus(); n.setSelectionRange(p, p); } return; } if (e.target.name === 'prod' && e.target.form && e.target.form.id === 'rt-ask') { const p = resolveCode(e.target.value); const code = p ? p.c : ''; if (code !== askP && p && /—/.test(e.target.value)) { askP = code; const t = $1('#rt-ask textarea'), v = t ? t.value : '', n = $1('#rt-ask [name=nm]'), nv = n ? n.value : ''; renderRoutine(rsub, null, true); const t2 = $1('#rt-ask textarea'); if (t2) t2.value = v; const n2 = $1('#rt-ask [name=nm]'); if (n2) n2.value = nv; } } });


  /* ================= مركز المساعدة / تتبع الطلب / الإعدادات (صفحات معزولة) ================= */
  const FAQ = [
    ['كم مدة التوصيل؟', 'How long is delivery?', 'يصل الطلب عادةً خلال 1–3 أيام عمل داخل العراق، وتصلك رسالة عند كل مرحلة.', 'Orders usually arrive within 1–3 working days in Iraq, with an update at each stage.'],
    ['كيف أتتبع طلبي؟', 'How do I track my order?', 'اذهبي إلى «تتبع الطلب» وأدخلي رمز الطلب (LC-XXXXXX) من الإيصال.', 'Open “Track order” and enter the code (LC-XXXXXX) from your receipt.'],
    ['هل أستطيع تعديل أو إلغاء الطلب؟', 'Can I change or cancel my order?', 'نعم قبل الشحن: اكتبي لنا في المحادثة «تعديل طلبي» أو «إلغاء طلبي».', 'Yes, before it ships: tell us in the chat — “modify” or “cancel” my order.'],
    ['كيف أسأل عن منتج؟', 'How do I ask about a product?', 'اضغطي زر «روتين» على بطاقة المنتج أو اكتبي كود المنتج في المحادثة.', 'Tap the “Routine” button on the product card or type its code in the chat.'],
    ['كيف أحصل على الأكواد والعروض؟', 'How do I get codes and offers?', 'فعّلي استلام العروض من «الإعدادات» وستصلك الأكواد على واتساب.', 'Turn on offers in “Settings” and we will send codes on WhatsApp.'],
  ];
  function renderHelp() {
    const el = $1('#hlpg'); if (!el) return;
    el.innerHTML = `<div class="w"><div class="rh"><h2>🎧 ${T('مركز المساعدة', 'Help centre')}</h2><p>${T('تحدّثي مع فريق خدمة الزبائن أو ابحثي في الأسئلة الشائعة.', 'Chat with customer service or browse the FAQ.')}</p></div>
      <div class="hg"><div><div class="tiles2"><a href="/tracking"><b>📦 ${T('تتبع الطلب', 'Track order')}</b><small>${T('برمز الطلب', 'By order code')}</small></a><a href="/routine/support"><b>🌸 ${T('دعم روتين', 'Routine support')}</b><small>${T('استشارة بشرة', 'Skin advice')}</small></a><a href="/account/orders"><b>🧾 ${T('طلباتي', 'My orders')}</b><small>${T('وإيصالاتي', 'and receipts')}</small></a></div>
      <h3>${T('أسئلة شائعة', 'FAQ')}</h3><div class="faq">${FAQ.map(f => `<details><summary>${T(f[0], f[1])}</summary><p>${T(f[2], f[3])}</p></details>`).join('')}</div></div>
      <div id="hl-chat"></div></div></div>`;
    if (window.LCChat) LCChat.mount($1('#hl-chat'), 'service');
  }
  function renderTrack(u) {
    const f = $1('#tkf'); if (!f) return; const c = u && u.searchParams.get('c');
    const sub = $1('#tks'); if (sub) sub.textContent = T('أدخلي رمز الطلب من الإيصال (LC-XXXXXX).', 'Enter the order code from your receipt (LC-XXXXXX).');
    if (c && f.elements.code && f.elements.code.value !== c) { f.elements.code.value = c; try { H.tkf({ code: c }); } catch (e) {} }
  }
  function renderPrefs() {
    const el = $1('#prf'); if (!el) return; const me = typeof custMe == 'function' ? custMe() : null;
    el.innerHTML = `<div class="w"><div class="rh"><h2>⚙️ ${T('الإعدادات', 'Settings')}</h2></div>
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
