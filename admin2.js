/* admin2.js — تبويبات لوحة التحكم الجديدة: الأكواد، البوكسات، الواجهة والوصف، الإحصائيات، واتساب، الدعم، الدفع والتوصيل */
(function () {
  'use strict';
  const N = n => Number(n || 0).toLocaleString('en-US');
  const dt = t => new Date(t).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  const up = (tag, html) => `<div class="cd" style="margin-bottom:14px"><h3>${tag}</h3>${html}</div>`;
  const prodChecks = (name, sel = [], withQty = false) => `<div class="pck">${S.P.map(p => { const on = sel.find(x => (x.c || x) == p.c); return `<label><input type="checkbox" name="${name}" value="${esc(p.c)}" ${on ? 'checked' : ''}><i class="pth" ${p.i ? `style="background-image:url('${esc(p.i)}')"` : ''}></i><span>${esc(p.n)}<small>${esc(p.c)}</small></span>${withQty ? ` <input type="number" min="1" max="20" name="q_${esc(p.c)}" value="${on && on.q || 1}" style="width:54px">` : ''}</label>`; }).join('')}</div>`;
  const act = () => document.querySelector('#ab');
  const J = async (u, o) => { const r = await apiJ(u, o); if (r && r.error) throw new Error(r.error); return r; };
  const barSvg = (rows, key, color) => {
    if (!rows.length) return '<p class="em">لا توجد بيانات بعد</p>';
    const max = Math.max(...rows.map(r => r[key] || 0), 1), w = 26, h = 120;
    return `<div class="chw"><svg viewBox="0 0 ${rows.length * w + 10} ${h + 30}" role="img" style="min-width:${rows.length * 22}px;height:160px">${rows.map((r, i) => { const v = r[key] || 0, bh = Math.round(v / max * h); return `<g><rect x="${i * w + 6}" y="${h - bh + 4}" width="${w - 6}" height="${bh}" rx="3" fill="${color}"><title>${esc(r.k)}: ${N(v)}</title></rect><text x="${i * w + 6 + (w - 6) / 2}" y="${h - bh}" font-size="9" text-anchor="middle" fill="currentColor">${v || ''}</text><text x="${i * w + 6 + (w - 6) / 2}" y="${h + 18}" font-size="8" text-anchor="middle" fill="currentColor" transform="rotate(-40 ${i * w + 6 + (w - 6) / 2} ${h + 18})">${esc(String(r.k).slice(-5))}</text></g>`; }).join('')}</svg></div>`;
  };
  const add = (id, name) => { if (!TABS.find(t => t[0] === id)) TABS.push([id, name]); };
  ['cp:الخصومات', 'lo:برنامج الوفاء', 'bx:البوكسات', 'hr:الواجهة والوصف', 'st:الإحصائيات', 'wm:رسائل واتساب', 'ch:الدعم والتقييم', 'pm:الدفع والتوصيل', 'ig:الربط والمفاتيح', 'sf:الموظفون'].forEach(s => { const [a, b] = s.split(':'); add(a, b); });
  TABS.unshift(...TABS.splice(TABS.findIndex(t => t[0] === 'st'), 1));      // الإحصائيات أولاً

  /* ---------- تنظيم الأقسام في مجموعات (صفحة مستقلة لكل مجموعة) ---------- */
  add('db', 'اللوحة'); add('au', 'سجل النشاط'); add('tg', 'بوتات تلغرام');
  const GROUPS = window.GROUPS = [
    ['home', 'الرئيسية', ['db', 'st']],
    ['orders', 'الطلبات', ['or']],
    ['catalog', 'الكتالوج', ['p', 'g', 'sb', 'br', 'bx']],
    ['customers', 'العملاء', ['cu']],
    ['marketing', 'التسويق', ['a', 'cp', 'lo', 'wm']],
    ['support', 'الدعم والموظفون', ['ch', 'sf']],
    ['settings', 'إعدادات المتجر', ['s', 'l', 'hr', 'pm', 'lg', 'gd']],
    ['system', 'الأمان والنظام', ['tg', 'ig', 'au', 'u']],
  ];
  const tl = k => (TABS.find(t => t[0] === k) || [k, k])[1];
  window.navHTML = () => {
    const gi = Math.max(0, GROUPS.findIndex(g => g[2].includes(at))), g = GROUPS[gi];
    return '<nav class="gn" aria-label="الأقسام">' + GROUPS.map((x, i) => `<button data-a="grp" data-c="${i}" class="${i == gi ? 'on' : ''}">${x[1]}<i class="abd" data-g="${x[0]}" hidden></i></button>`).join('') + '</nav>'
      + (g[2].length > 1 ? '<nav class="sn">' + g[2].map(k => `<button data-a="tab" data-c="${k}" class="${at == k ? 'on' : ''}">${tl(k)}</button>`).join('') + '</nav>' : '');
  };
  A.grp = c => { const g = GROUPS[+c]; if (!g) return; at = g[2][0]; ed = null; ea = null; es = null; upl = ''; ups = []; ra(); };
  window.loadBadges = async () => {
    try {
      const d = await J('/adm/dashboard'), set = (g, n) => { const e = document.querySelector(`.abd[data-g=${g}]`); if (e) { e.textContent = n > 99 ? '99+' : n; e.hidden = !n; } };
      set('orders', d.new_orders); set('support', d.unread_support);
    } catch (e) {}
  };
  TB.db = () => { setTimeout(loadDb, 0); return '<div id="dbb"><p class="em">جارٍ التحميل…</p></div>'; };
  async function loadDb() {
    const el = $('#dbb'); if (!el) return;
    try {
      const d = await J('/adm/dashboard');
      const cards = [['طلبات جديدة', d.new_orders, 'or'], ['طلبات متأخرة', d.overdue, 'or'], ['دعم بانتظار موظف', d.unread_support, 'ch'], ['طلبات اليوم', d.today_orders, 'or'], ['مبيعات اليوم', fm(d.today_sales), 'st']];
      el.innerHTML = '<div class="dbg">' + cards.map(([l, n, t]) => `<button class="dbc" data-a="tab" data-c="${t}"><small>${l}</small><b>${esc(String(n))}</b></button>`).join('') + '</div>';
    } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; }
  }
  TB.au = () => { setTimeout(loadAu, 0); return '<p class="em">آخر 200 عملية إدارية (لا تُسجَّل كلمات السر ولا المفاتيح).</p><div id="aub"><p class="em">جارٍ التحميل…</p></div>'; };
  async function loadAu() {
    const el = $('#aub'); if (!el) return;
    try {
      const r = (await J('/adm/audit')).items;
      el.innerHTML = r.length ? `<div class="chw"><table class="tb"><tr><th>الوقت</th><th>المنفّذ</th><th>العملية</th><th>العنصر</th><th>IP</th></tr>${r.map(x => `<tr><td>${esc(new Date(x.at).toLocaleString('ar-IQ'))}</td><td>${esc(x.actor)}</td><td>${esc(x.action)}</td><td dir="ltr">${esc(x.entity)}</td><td dir="ltr">${esc(x.ip)}</td></tr>`).join('')}</table></div>` : '<p class="em">لا توجد عمليات بعد</p>';
    } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; }
  }
  at = 'db';

  /* ---------- أكواد الخصم ---------- */
  let codes = [];
  let ecp = null;
  const dateV = t => t ? new Date(t).toISOString().slice(0, 10) : '';
  const KN = { percent: 'نسبة %', amount: 'مبلغ ثابت', bogo: 'اشترِ 1 واحصل على 1', bundle: 'خصم مجموعة منتجات', free_shipping: 'توصيل مجاني' };
  TB.cp = () => { setTimeout(loadCodes, 0); const e = (codes || []).find(x => x.code == ecp) || { brands: [], cats: [], prods: [] };
    const ks = [...new Set(S.P.map(p => p.k).filter(Boolean))], ck = (n, v, sel) => `<label><input type="checkbox" name="${n}" value="${esc(v)}" ${sel.includes(v) ? 'checked' : ''}> ${esc(v)}</label>`;
    return `<div id="cpl"><p class="em">جارٍ التحميل…</p></div>` + up(ecp ? 'تعديل الخصم ' + ecp : 'إنشاء خصم جديد', `<form id="cpf" class="fm">
    <input name="name" placeholder="اسم الخصم (مثل: عرض نوفمبر)" value="${esc(e.name)}">
    <input name="code" placeholder="الكود (حروف إنجليزية/أرقام)" required style="text-transform:uppercase" value="${esc(e.code)}" ${ecp ? 'readonly' : ''}>
    <select name="kind">${Object.entries(KN).map(([k, l]) => `<option value="${k}" ${e.kind == k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input name="value" type="number" min="0" placeholder="القيمة (نسبة أو مبلغ — لا تلزم للتوصيل المجاني وBuy1Get1)" value="${e.value || ''}">
    <input name="min" type="number" min="0" placeholder="حد أدنى للسلة" value="${e.min || ''}">
    <input name="maxd" type="number" min="0" placeholder="أعلى مبلغ خصم (اختياري)" value="${e.maxd || ''}">
    <label>تاريخ البداية<input name="start" type="date" value="${dateV(e.start)}"></label>
    <label>تاريخ الانتهاء<input name="exp" type="date" value="${dateV(e.exp)}"></label>
    <input name="max" type="number" min="1" placeholder="أقصى عدد استخدامات" value="${e.max || ''}">
    <input name="pc" type="number" min="1" placeholder="أقصى استخدام لكل عميل" value="${e.pc || ''}">
    <input name="ph" placeholder="مخصص لرقم هاتف (اختياري)" value="${esc(e.ph)}">
    <label><input type="checkbox" name="auto" ${e.auto ? 'checked' : ''}> تلقائي (يُطبَّق بدون كود)</label>
    <label><input type="checkbox" name="first" ${e.first ? 'checked' : ''}> لأول طلب فقط</label>
    <label><input type="checkbox" name="stack" ${e.stack ? 'checked' : ''}> يمكن جمعه مع خصومات أخرى</label>
    <details class="full" ${e.brands.length ? 'open' : ''}><summary>براندات معينة</summary><div class="pck">${(S.br || []).map(b => `<label><input type="checkbox" name="brands" value="${esc(String(b.id))}" ${e.brands.map(String).includes(String(b.id)) ? 'checked' : ''}> ${esc(b.n)}</label>`).join('') || '<small>لا توجد براندات</small>'}</div></details>
    <details class="full" ${e.cats.length ? 'open' : ''}><summary>فئات معينة</summary><div class="pck">${ks.map(k => ck('cats', k, e.cats)).join('') || '<small>لا توجد فئات</small>'}</div></details>
    <details class="full" ${e.prods.length ? 'open' : ''}><summary>منتجات معينة (لخصم المجموعة: كلها مطلوبة في السلة)</summary>${prodChecks('prods', e.prods)}</details>
    <button class="btn">${ecp ? 'حفظ التعديل' : 'حفظ الخصم'}</button>${ecp ? '<button type="button" class="btn g" data-a="cpe" data-c="">إلغاء التعديل</button>' : ''}</form><p class="em">بدون تحديد براند أو فئة أو منتج = يشمل كل المنتجات. القاعدة: لا يُجمع خصمان إلا إذا سمحت بذلك في الاثنين. التوصيل المجاني يجتمع مع أي خصم. الخصم التلقائي يُطبَّق بعد أكواد الزبون. الكوبون الترحيبي للزبون الجديد يُنشأ تلقائياً ويظهر في القائمة.</p>`); };
  async function loadCodes() {
    const el = $('#cpl'); if (!el) return;
    try { codes = (await J('/codes')).codes; } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    const d = t => new Date(t).toLocaleDateString('ar-IQ'), st = c => c.start && c.start > Date.now() ? 'مجدول' : c.exp && c.exp < Date.now() ? 'منتهٍ' : c.max && c.used >= c.max ? 'استُنفد' : c.active ? 'فعّال' : 'معطّل';
    el.innerHTML = codes.length ? `<table class="tb"><tr><th>الخصم</th><th>النوع</th><th>القيمة</th><th>شروط</th><th>استخدام</th><th>الحالة</th><th></th></tr>${codes.map(c => `<tr><td dir="ltr"><b>${esc(c.name || c.code)}</b>${c.name ? `<br><small>${esc(c.code)}</small>` : ''}${c.auto ? ' <small>⚡تلقائي</small>' : ''}${c.welcome ? ' <small>ترحيبي</small>' : ''}</td><td>${KN[c.kind]}</td><td>${c.kind == 'percent' || c.kind == 'bundle' ? c.value + '%' : c.kind == 'amount' ? N(c.value) : '—'}</td><td><small>${[c.min ? 'حد أدنى ' + N(c.min) : '', c.maxd ? 'سقف ' + N(c.maxd) : '', c.first ? 'أول طلب' : '', c.pc ? c.pc + '/عميل' : '', c.prods.length ? c.prods.length + ' منتج' : '', c.brands.length ? c.brands.length + ' براند' : '', c.cats.length ? c.cats.length + ' فئة' : '', c.start ? 'من ' + d(c.start) : '', c.exp ? 'حتى ' + d(c.exp) : '', c.stack ? 'يُجمع' : '', c.ph ? esc(c.ph) : ''].filter(Boolean).join(' · ')}</small></td><td>${c.used}${c.max ? '/' + c.max : ''}</td><td>${st(c)}</td><td><button class="btn g" data-a="cpe" data-c="${esc(c.code)}">تعديل</button> <button class="btn g" data-a="cpt" data-c="${esc(c.code)}">${c.active ? 'تعطيل' : 'تفعيل'}</button> <button class="btn g" data-a="cpd" data-c="${esc(c.code)}">حذف</button></td></tr>`).join('')}</table>` : '<p class="em">لا توجد خصومات بعد.</p>';
  }
  const D0 = s => s ? Date.parse(s + 'T00:00:00') : null;
  H.cpf = async (v, f) => {
    const g = n => [...f.querySelectorAll(`[name=${n}]:checked`)].map(x => x.value);
    try { await J('/codes', { method: 'POST', body: JSON.stringify({ name: v.name, code: v.code, kind: v.kind, value: +v.value || 0, min: +v.min || 0, maxd: +v.maxd || null, start: D0(v.start), exp: v.exp ? Date.parse(v.exp + 'T23:59:59') : null, max: +v.max || null, pc: +v.pc || null, ph: v.ph.trim(), stack: !!v.stack, first: !!v.first, auto: !!v.auto, prods: g('prods'), brands: g('brands'), cats: g('cats') }) }); toast('تم حفظ الخصم'); ecp = null; ra(); }
    catch (e) { toast(e.message || 'تعذر الحفظ'); }
  };
  A.cpe = c => { ecp = c || null; ra(); };
  A.cpt = async c => { const x = codes.find(k => k.code == c); if (!x) return; await J('/codes', { method: 'POST', body: JSON.stringify({ ...x, active: !x.active }) }); loadCodes(); };
  A.cpd = async c => { if (!ask('cp' + c)) return; await J('/codes?code=' + encodeURIComponent(c), { method: 'DELETE' }); loadCodes(); };

  /* ---------- برنامج الوفاء (نقاط) ---------- */
  let LO = null, LOC = null;
  const KLO = { earn: 'منح', redeem: 'استبدال', restore: 'إرجاع', reverse: 'عكس', expire: 'انتهاء', adjust: 'تعديل إداري' };
  TB.lo = () => { setTimeout(loadLo, 0); return '<div id="lol"><p class="em">جارٍ التحميل…</p></div>'; };
  async function loadLo() {
    const el = $('#lol'); if (!el) return;
    try { LO = await J('/adm/loy'); } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    const c = LO.cfg, st = LO.stats, N0 = x => Number(x || 0).toLocaleString('en');
    el.innerHTML = up('LACEY SKIN BEAUTY REWARDS — ' + (c.live ? 'يعمل' : 'متوقف'), `<div class="kp"><div><b>${N0(st.m)}</b><small>أعضاء لديهم حركات</small></div><div><b>${N0(st.outstanding)}</b><small>رصيد قائم</small></div><div><b>${N0(st.earned)}</b><small>نقاط ممنوحة</small></div><div><b>${N0(st.redeemed)}</b><small>مستبدلة</small></div><div><b>${N0(st.expired)}</b><small>منتهية</small></div></div>`)
      + up('الإعدادات (كل الأرقام من اعتمادك؛ لا قيم افتراضية مالية)', `<form id="lof" class="fm">
        <label><input type="checkbox" name="on" ${c.on ? 'checked' : ''}> تشغيل البرنامج</label>
        <label>كل كم دينار مشتريات<input name="unit" type="number" min="1" value="${c.unit}"></label>
        <label>نقاط تُمنح لكل وحدة<input name="per" type="number" min="0" value="${c.per}"></label>
        <label>نقاط إضافية لأول طلب مكتمل<input name="first" type="number" min="0" value="${c.first}"></label>
        <label>قيمة النقطة الواحدة (دينار)<input name="val" type="number" min="0" value="${c.val}"></label>
        <label>أقل نقاط للاستبدال<input name="min" type="number" min="0" value="${c.min}"></label>
        <label>أعلى نسبة % من الطلب تُدفع بالنقاط<input name="maxpct" type="number" min="1" max="100" value="${c.maxpct}"></label>
        <label>صلاحية النقاط بالأشهر (0 = لا تنتهي)<input name="exp" type="number" min="0" max="60" value="${c.exp}"></label>
        <button class="btn">حفظ</button></form><p class="em">تُمنح النقاط مرة واحدة عند تسليم الطلب (على قيمة المنتجات بعد الخصم، دون التوصيل). عند إلغاء الطلب تُرجع النقاط المستبدلة وتُعكس الممنوحة. لا يصير الرصيد سالباً، وكل حركة تُسجَّل ولا تُعدَّل.</p>`)
      + up('رصيد عميل وتعديل', `<form id="loq" class="fm"><input name="q" placeholder="رقم الهاتف أو معرف العضو LS-000001" required><button class="btn">بحث</button></form><div id="loc">${LOC ? loCust() : ''}</div>`);
  }
  const loCust = () => { const j = LOC; return `<h4>${esc(j.customer.name || '')} · ${esc(j.customer.phone || '')} · LS-${String(j.customer.id).padStart(6, '0')}</h4><p><b>${Number(j.balance).toLocaleString('en')}</b> نقطة</p>
    <form id="loa" class="fm"><input name="points" type="number" placeholder="± نقاط (سالب للخصم)" required><input name="note" placeholder="سبب التعديل (إلزامي)" required><button class="btn">تعديل</button></form>
    <table class="tb"><tr><th>الحركة</th><th>النقاط</th><th>الطلب</th><th>ملاحظة</th><th>التاريخ</th></tr>${j.history.map(h => `<tr><td>${KLO[h.kind] || h.kind}</td><td dir="ltr">${h.points > 0 ? '+' : ''}${h.points}</td><td>${esc(h.order_code || '')}</td><td>${esc(h.note || '')}</td><td>${new Date(h.at).toLocaleString('ar-IQ')}</td></tr>`).join('')}</table>`; };
  H.lof = async (v) => { try { await J('/adm/loy', { method: 'POST', body: JSON.stringify({ on: !!v.on, unit: +v.unit, per: +v.per, first: +v.first, val: +v.val, min: +v.min, maxpct: +v.maxpct, exp: +v.exp }) }); toast('تم الحفظ'); loadLo(); } catch (e) { toast(e.message || 'تعذر الحفظ'); } };
  H.loq = async (v) => { try { LOC = await J('/adm/loy/c?q=' + encodeURIComponent(v.q.trim())); $('#loc').innerHTML = loCust(); } catch (e) { LOC = null; $('#loc').innerHTML = ''; toast(e.message || 'غير موجود'); } };
  H.loa = async (v) => { try { await J('/adm/loy/adjust', { method: 'POST', body: JSON.stringify({ customer_id: LOC.customer.id, points: +v.points, note: v.note }) }); toast('تم التعديل'); LOC = await J('/adm/loy/c?q=' + LOC.customer.id.toString().padStart(6, '0').replace(/^/, 'LS-')); loadLo(); } catch (e) { toast(e.message || 'تعذر التعديل'); } };

  /* ---------- البوكسات ---------- */
  let ebx = null;
  const boxImg = b => b && b.i ? `<img src="${esc(b.i)}" style="width:60px;height:60px;object-fit:cover;border-radius:10px">` : '';
  async function uploadFile(file) {
    const r = await fetch(API() + '/media', { method: 'POST', headers: { ...authH(), 'Content-Type': file.type }, body: file });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'فشل الرفع'); return j;
  }
  window.uploadFile = uploadFile;
  TB.bx = () => { const e = (S.B || []).find(b => b.id == ebx) || { it: [] };
    return `<p class="em">البوكس: عدة منتجات بسعر واحد. يظهر في المتجر بصور محتوياته ويُضاف للسلة بنقرة.</p>${(S.B || []).map(b => `<div class="row" style="grid-template-columns:70px 1fr auto auto">${boxImg(b)}<span><b>${esc(b.n)}</b><small> ${N(b.p)} — ${(b.it || []).length} منتج${b.on === 0 ? ' (مخفي)' : ''}</small></span><button class="btn g" data-a="bxe" data-c="${esc(b.id)}">تعديل</button><button class="btn g" data-a="bxd" data-c="${esc(b.id)}">حذف</button></div>`).join('') || '<p class="em">لا توجد بوكسات</p>'}
    <form id="bxf" class="fm" style="margin-top:14px"><input name="n" placeholder="اسم البوكس" value="${esc(e.n)}" required><input name="p" type="number" min="1" placeholder="سعر البوكس" value="${e.p || ''}" required>
    <textarea name="d" placeholder="وصف البوكس">${esc(e.d)}</textarea><label class="up">صورة البوكس (اختياري — تُستخدم صور المنتجات إن تُركت فارغة)<input type="file" accept="image/*" name="img"></label><input type="hidden" name="i" value="${esc(e.i)}">
    <div class="full"><b>محتويات البوكس</b>${prodChecks('items', e.it, true)}</div><label><input type="checkbox" name="on" ${e.on === 0 ? '' : 'checked'}> ظاهر في المتجر</label><button class="btn">${e.id ? 'حفظ التعديل' : 'إضافة البوكس'}</button></form>`; };
  A.bxe = c => { ebx = c; ra(); }; A.bxd = c => { if (!ask('bx' + c)) return; S.B = (S.B || []).filter(b => b.id != c); save(); render(); ra(); };
  H.bxf = async (v, f) => {
    const it = [...f.querySelectorAll('[name=items]:checked')].map(x => ({ c: x.value, q: Math.max(1, +f.querySelector(`[name="q_${x.value}"]`).value || 1) }));
    if (!it.length) return toast('اختر منتجاً واحداً على الأقل');
    let i = v.i; const file = f.img.files[0]; if (file) { try { i = (await uploadFile(file)).url; } catch (e) { return toast(e.message); } }
    const b = { id: ebx || 'bx' + Date.now().toString(36), n: v.n.trim(), p: Math.round(+v.p), d: v.d.trim(), i, it, on: v.on ? 1 : 0 };
    S.B = [...(S.B || []).filter(x => x.id != b.id), b]; ebx = null; save(); render(); ra(); toast('تم حفظ البوكس');
  };

  /* ---------- الواجهة + صور الوصف ---------- */
  let dp = '';
  TB.hr = () => { const hm = S.hm || {}; const p = S.P.find(x => x.c == dp), di = (p && p.di) || [];
    return up('وسائط الواجهة الرئيسية (Hero)', `<p class="em">ارفع فيديو (mp4/webm) أو صورة متحركة (GIF/WebP) تظهر بدل الصورة الثابتة. النص الافتراضي: «عناية لطيفة لبشرة مشرقة — عناية نقية وبسيطة بالبشرة تُبرز إشراقتك الطبيعية.»</p>
      ${hm.u ? `<div style="margin-bottom:10px">${hm.t == 'video' ? `<video src="${esc(hm.u)}" muted loop autoplay playsinline style="max-width:260px;border-radius:14px"></video>` : `<img src="${esc(hm.u)}" style="max-width:260px;border-radius:14px">`}</div>` : ''}
      <form id="hmf" class="fm"><label class="up">ملف الواجهة<input type="file" name="f" accept="image/gif,image/webp,image/png,image/jpeg,video/mp4,video/webm"></label><button class="btn">رفع وتطبيق</button><button type="button" class="btn g" data-a="hmx">إزالة (العودة للافتراضي)</button></form>`)
      + up('صور داخل وصف المنتج', `<select id="dps" data-a="dpp" style="margin-bottom:10px"><option value="">اختر منتجاً…</option>${S.P.map(x => `<option value="${esc(x.c)}" ${x.c == dp ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select>
      ${p ? `${di.map((d, k) => `<div class="row" style="grid-template-columns:60px 1fr 1fr 1fr auto"><img src="${esc(d.u)}" style="width:50px;height:50px;object-fit:cover;border-radius:8px">
        <select data-a="dpe" data-c="${k}|pos"><option value="start" ${d.pos == 'start' ? 'selected' : ''}>بداية النص</option><option value="mid" ${d.pos == 'mid' ? 'selected' : ''}>وسط النص</option><option value="end" ${d.pos == 'end' ? 'selected' : ''}>نهاية النص</option></select>
        <select data-a="dpe" data-c="${k}|al"><option value="right" ${d.al == 'right' ? 'selected' : ''}>يمين</option><option value="center" ${d.al == 'center' ? 'selected' : ''}>وسط</option><option value="left" ${d.al == 'left' ? 'selected' : ''}>يسار</option></select>
        <label>العرض % <input type="number" min="10" max="100" value="${d.w || 100}" data-a="dpe" data-c="${k}|w" style="width:64px"></label><button class="btn g" data-a="dpx" data-c="${k}">حذف</button></div>`).join('')}
        <form id="dpf" class="fm"><label class="up">إضافة صورة للوصف<input type="file" name="f" accept="image/*" required></label><button class="btn">رفع وإضافة</button></form>` : '<p class="em">اختر منتجاً لإدارة صور وصفه</p>'}`); };
  H.hmf = async (v, f) => { const file = f.f.files[0]; if (!file) return toast('اختر ملفاً'); try { const j = await uploadFile(file); S.hm = { u: j.url, t: j.type.startsWith('video') ? 'video' : 'image' }; save(); render(); ra(); toast('تم تطبيق وسائط الواجهة'); } catch (e) { toast(e.message); } };
  A.hmx = () => { delete S.hm; save(); render(); ra(); };
  document.addEventListener('change', e => {
    const t = e.target, a = t.dataset && t.dataset.a;
    if (a == 'dpp') { dp = t.value; ra(); }
    if (a == 'dpe') { const [k, f] = t.dataset.c.split('|'), p = S.P.find(x => x.c == dp); if (!p || !p.di[k]) return; p.di[k][f] = f == 'w' ? Math.max(10, Math.min(100, +t.value || 100)) : t.value; save(); render(); toast('تم'); }
  });
  A.dpx = k => { const p = S.P.find(x => x.c == dp); p.di.splice(+k, 1); save(); render(); ra(); };
  H.dpf = async (v, f) => { const p = S.P.find(x => x.c == dp); if (!p) return; try { const j = await uploadFile(f.f.files[0]); (p.di ||= []).push({ u: j.url, pos: 'start', al: 'center', w: 100 }); save(); render(); ra(); } catch (e) { toast(e.message); } };

  /* ---------- الإحصائيات ---------- */
  let sr = 'day';
  TB.st = () => { setTimeout(loadSt, 0); return `<div class="act2"><button class="btn g" data-a="srg" data-c="day">يومي</button><button class="btn g" data-a="srg" data-c="week">أسبوعي</button><button class="btn g" data-a="srg" data-c="month">شهري</button></div><div id="stb"><p class="em">جارٍ التحميل…</p></div>`; };
  A.srg = c => { sr = c; loadSt(); };
  async function loadSt() {
    const el = $('#stb'); if (!el) return; let s;
    try { s = await J('/adm/stats2?range=' + sr); } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    const tile = (n, l) => `<div class="tl2"><b>${n}</b><span>${l}</span></div>`;
    el.innerHTML = `<div class="tls">${tile(N(s.totals.customers), 'إجمالي الحسابات')}${tile(N(s.active.d1), 'نشطون اليوم')}${tile(N(s.active.d7), 'نشطون 7 أيام')}${tile(N(s.active.d30), 'نشطون 30 يوماً')}${tile(N(s.loggedIn), 'جلسات دخول فعّالة')}${tile(N(s.totals.orders), 'الطلبات')}${tile(N(s.totals.revenue), 'الإيرادات')}${tile(N(s.totals.avg), 'متوسط الطلب')}${tile(s.rating.n ? s.rating.avg + ' ★' : '—', 'تقييم الخدمة (' + s.rating.n + ')')}</div>
      ${up('الحسابات الجديدة', barSvg(s.accounts, 'n', 'var(--ac)'))}${up('عدد الطلبات', barSvg(s.orders, 'n', 'var(--gold)'))}${up('الإيرادات', barSvg(s.orders, 'rev', 'var(--ink)'))}
      ${up('الأكثر مبيعاً', s.top.length ? `<table class="tb"><tr><th>المنتج</th><th>الكمية</th><th>المبيعات</th></tr>${s.top.map(t => `<tr><td>${esc(t.n)}</td><td>${t.q}</td><td>${N(t.rev)}</td></tr>`).join('')}</table>` : '<p class="em">لا مبيعات بعد</p>')}`;
  }

  /* ---------- رسائل واتساب التسويقية ---------- */
  TB.wm = () => { setTimeout(loadCamps, 0); return `<p class="em">يُلحق رابط المتجر تلقائياً في نهاية كل رسالة. الرسائل خارج نافذة الـ24 ساعة تتطلب قالب promo معتمداً من Meta (راجع README).</p>
    <form id="wmf" class="fm"><textarea name="body" rows="4" placeholder="نص الإعلان أو العرض" required></textarea>
    <label>الجمهور<select name="aud"><option value="today">المسجّلون اليوم</option><option value="day">المسجّلون في يوم محدد</option><option value="all">كل العملاء</option><option value="ordered">من طلبوا سابقاً</option><option value="noorders">لم يطلبوا بعد</option><option value="phones">أرقام محددة</option></select></label>
    <label>اليوم (لخيار يوم محدد)<input type="date" name="day"></label>
    <textarea name="phones" rows="2" placeholder="أرقام (للخيار «أرقام محددة»): كل رقم في سطر أو مفصولة بفاصلة"></textarea>
    <input name="codes" placeholder="أكواد موجودة تُلحق بالرسالة (مفصولة بفاصلة) مثل SHIP10">
    <label><input type="checkbox" name="per"> إنشاء كود خاص لكل مستلم (استخدام واحد)</label>
    <select name="pk"><option value="percent">خصم %</option><option value="amount">خصم مبلغ</option><option value="free_shipping">توصيل مجاني</option></select>
    <input name="pv" type="number" min="0" placeholder="قيمة الكود الخاص"><input name="pd" type="number" min="1" placeholder="صلاحية بالأيام (مثال 7)">
    <button class="btn" name="go" value="send">إرسال</button><button class="btn g" name="go" value="dry" type="button" data-a="wmd">معاينة عدد المستلمين</button></form><div id="wml"></div>`; };
  const wmBody = f => { const v = Object.fromEntries(new FormData(f)); const type = v.aud;
    return { body: v.body, audience: { type, day: v.day, phones: String(v.phones || '').split(/[\s,،]+/).filter(Boolean) }, codes: String(v.codes || '').split(/[\s,،]+/).filter(Boolean), perUser: v.per ? { kind: v.pk, value: +v.pv || 0, days: +v.pd || 0 } : null }; };
  A.wmd = async (c, t) => { const f = t.closest('form'); if (!f.body.value.trim()) return toast('اكتب النص'); const r = await J('/adm/campaign', { method: 'POST', body: JSON.stringify({ ...wmBody(f), dry: true }) }); toast(`عدد المستلمين: ${r.total}`); };
  H.wmf = async (v, f) => { const r = await J('/adm/campaign', { method: 'POST', body: JSON.stringify(wmBody(f)) }).catch(e => ({ error: e.message })); if (r.error) return toast(r.error); toast(`وُضعت ${r.total} رسالة في طابور الإرسال`); loadCamps(); };
  async function loadCamps() { const el = $('#wml'); if (!el) return; try { const j = await J('/adm/campaigns'); const d = j.delivery || {};
    el.innerHTML = up('حالة الإرسال', `<p>تم: <b>${d.sent || 0}</b> · بالانتظار: <b>${d.queued || 0}</b> · فشل: <b>${d.failed || 0}</b> · متخطى: <b>${d.skipped || 0}</b></p>${j.campaigns.map(c => `<div class="row"><span>${dt(c.t)} — <b>${c.total}</b> مستلم<br><small>${esc(c.body.slice(0, 90))}</small></span></div>`).join('')}`); } catch (e) {} }

  /* ---------- الدعم والتقييم ---------- */
  let chc = 'support', chId = 0, chPoll = 0, chLast = 0;
  TB.ch = () => { setTimeout(loadChats, 0); clearInterval(chPoll); chPoll = setInterval(() => { if (!$('#chl')) return clearInterval(chPoll); loadChats(true); }, 8000);
    return `<div id="chr"></div><div class="act2"><button class="btn ${chc == 'support' ? '' : 'g'}" data-a="chc" data-c="support">خدمة الزبائن</button><button class="btn ${chc == 'admin' ? '' : 'g'}" data-a="chc" data-c="admin">قناة الأدمن (خاصة)</button></div>
    ${chc == 'admin' ? `<form id="chq" class="fm"><select name="product">${S.P.map(p => `<option value="${esc(p.c)}">${esc(p.n)}</option>`).join('')}</select><input name="text" placeholder="ملاحظة/استفسار عن المنتج (خاص — لا يراه الزبائن)" required><button class="btn">إضافة</button></form>` : ''}
    <div id="chl" class="chg"><div id="chs"></div><div id="chm"></div></div>`; };
  A.chc = c => { chc = c; chId = 0; ra(); };
  async function loadChats(quiet) { const el = $('#chs'); if (!el) return;
    try { const [j, r] = await Promise.all([J('/adm/chats?channel=' + chc), J('/adm/ratings')]);
      const rr = $('#chr'); if (rr) rr.innerHTML = `<div class="tls">${`<div class="tl2"><b>${r.count ? r.avg + ' ★' : '—'}</b><span>متوسط تقييم الخدمة (${r.count} تقييم)</span></div>`}</div>`;
      el.innerHTML = j.chats.map(c => `<div class="row ${c.id == chId ? 'sel' : ''}" data-a="cho" data-c="${c.id}" style="cursor:pointer;grid-template-columns:1fr auto"><span><b>${esc(chc == 'admin' ? (S.P.find(p => p.c == c.product) || { n: c.product }).n : c.name || 'زائر')}</b> ${c.status == 'open' ? '' : '<small>(منتهية)</small>'}${c.rating ? ` ★${c.rating}` : ''} ${chc == 'support' ? (c.mode == 'human' ? '<small>👤 ' + esc(c.staff || 'بانتظار موظف') + '</small>' : '<small>🤖</small>') : ''}<br><small>${esc(c.last.slice(0, 50))}</small></span>${(c.lastby == 'customer' || c.mode == 'human' && !c.staff) && c.status == 'open' ? '<i class="dot"></i>' : ''}</div>`).join('') || '<p class="em">لا محادثات</p>';
      if (chId) openChat(chId, quiet); } catch (e) {} }
  A.cho = c => { chId = +c; chLast = 0; openChat(chId); };
  const chPc = m => { let x = null; try { x = m.meta && (typeof m.meta == 'string' ? JSON.parse(m.meta) : m.meta).product } catch (e) {} return x ? `<div class="pc"><i style="${x.i !== '' ? `background-image:url('${esc(API() + '/pimg/' + encodeURIComponent(x.c))}')` : ''}"></i><span><b>${esc(x.n)}</b><small>${esc(x.c)} · ${Number(x.p || 0).toLocaleString('en-US')} د.ع</small></span></div>` : ''; };
  async function openChat(id, quiet) { const el = $('#chm'); if (!el) return; const j = await J('/adm/chat?id=' + id);
    const hd = j.chat ? `<div class="chhd"><b>${esc(j.chat.name || 'زائر')}</b> ${esc(j.chat.ph || '')} · ${j.chat.mode == 'human' ? '👤 ' + esc(j.chat.staff || 'بانتظار موظف') : '🤖 المساعد'}</div>` : '';
    el.innerHTML = `${hd}<div class="msgs">${j.messages.map(m => `<div class="m ${m.sender}"><small class="au">${esc(m.author || '')}</small>${chPc(m)}${esc(m.text || m.body)}<small>${dt(m.at)}</small></div>`).join('')}</div><form id="chf" class="fm" style="grid-template-columns:1fr auto auto auto"><input name="text" placeholder="اكتب رداً…" required autocomplete="off"><button class="btn">إرسال</button>${chc == 'support' ? '<button type="button" class="btn g" data-a="chk">استلام</button><button type="button" class="btn g" data-a="chx">إنهاء</button>' : ''}</form>`;
    const ms = el.querySelector('.msgs'); ms.scrollTop = ms.scrollHeight; }
  H.chf = async v => { await J(chc == 'admin' ? '/adm/inquiry' : '/adm/chat/reply', { method: 'POST', body: JSON.stringify(chc == 'admin' ? { product: (await J('/adm/chats?channel=admin')).chats.find(c => c.id == chId).product, text: v.text } : { id: chId, text: v.text }) }); openChat(chId); };
  H.chq = async (v, f) => { const r = await J('/adm/inquiry', { method: 'POST', body: JSON.stringify(v) }); f.reset(); chId = r.id; loadChats(); };
  A.chk = async () => { try { await J('/adm/chat/claim', { method: 'POST', body: JSON.stringify({ id: chId, force: true }) }); toast('استلمت المحادثة'); loadChats(); } catch (e) { toast(e.message); } };
  A.chx = async () => { await J('/adm/chat/close', { method: 'POST', body: JSON.stringify({ id: chId }) }); toast('أُنهيت المحادثة وسيظهر للزبون نموذج التقييم'); loadChats(); };

  /* ---------- الربط والمفاتيح ---------- */
  const IGF = [['واتساب (Meta Cloud API)', [['WA_TOKEN', 'التوكن الدائم (Access Token)', 1], ['WA_PHONE_ID', 'معرّف رقم الهاتف (Phone Number ID)'], ['WA_LANG', 'لغة القوالب (مثل ar)'], ['WA_TPL_OTP', 'اسم قالب رمز التحقق'], ['WA_TPL_WELCOME', 'اسم قالب الترحيب'], ['WA_TPL_ORDER', 'اسم قالب حالة الطلب'], ['WA_TPL_PROMO', 'اسم قالب الرسائل التسويقية']]],
    ['المتجر و Google', [['STORE_URL', 'رابط المتجر الذي يُلحق برسائل واتساب'], ['GOOGLE_CLIENT_ID', 'Google Client ID (لتسجيل الدخول بجوجل)']]],
    ['الذكاء الاصطناعي للدعم (اختياري)', [['ANTHROPIC_API_KEY', 'مفتاح Anthropic (Claude API)', 1], ['AI_MODEL', 'اسم النموذج (اتركه فارغاً للافتراضي)'], ['AI_ON', 'تشغيل الرد الآلي (اكتب 0 لإيقافه، وأي قيمة أخرى للتشغيل)'], ['AI_PROMPT', 'تعليمات إضافية للمساعد (نبرة الكلام، سياسات المتجر، ما لا يجيب عنه)']]]];
  TB.ig = () => { setTimeout(loadIg, 0); return `<div id="igb"><p class="em">جارٍ التحميل…</p></div>`; };
  async function loadIg() {
    const el = $('#igb'); if (!el) return; let v;
    try { v = await J('/adm/integrations'); } catch (e) { el.innerHTML = '<p class="em">سجّل الدخول أولاً</p>'; return; }
    const act = v._active;
    el.innerHTML = `<p class="em">القيم تُحفظ مباشرة في قاعدة البيانات ولا تحتاج Cloudflare. اترك الحقل فارغاً للإبقاء على القيمة الحالية، واكتب <b>__clear__</b> لحذفها.<br>الحالة: واتساب ${act.wa ? '✅ مفعّل' : '⛔ غير مفعّل'} · Google ${act.google ? '✅' : '⛔'} · تلجرام ${act.telegram ? '✅' : '⛔'}</p>
    <form id="igf" class="fm">${IGF.map(([t, fs]) => `<h3 class="full" style="margin:10px 0 0">${t}</h3>${fs.map(([k, l, sec]) => `<label>${l} <small dir="ltr">${k}</small><input name="${k}" ${sec ? 'type="password" autocomplete="off"' : ''} dir="ltr" placeholder="${sec ? (v[k].set ? 'محفوظ ' + v[k].hint + ' — اتركه للإبقاء' : 'غير مضبوط') : ''}" value="${sec ? '' : esc(v[k].value || '')}"></label>`).join('')}`).join('')}
    <button class="btn">حفظ</button></form>
    <div class="cd"><h3>اختبار الربط</h3><form id="igt" class="fm"><input name="ph" dir="ltr" placeholder="رقم لإرسال رسالة اختبار 07XXXXXXXXX"><button class="btn">اختبار واتساب</button></form></div>`;
  }
  H.igf = async (v) => { try { await J('/adm/integrations', { method: 'POST', body: JSON.stringify(v) }); toast('تم الحفظ'); loadIg(); } catch (e) { toast(e.message || 'تعذر الحفظ'); } };
  H.igt = async (v) => { try { await J('/adm/integrations/test', { method: 'POST', body: JSON.stringify({ kind: 'wa', ph: v.ph.trim() }) }); toast('✅ أُرسلت رسالة الاختبار'); } catch (e) { toast(e.message || 'فشل الاختبار'); } };
  A.igtg = async () => { try { await J('/adm/integrations/test', { method: 'POST', body: JSON.stringify({ kind: 'telegram' }) }); toast('✅ وصلت رسالة تلجرام'); } catch (e) { toast(e.message || 'فشل الاختبار'); } };

  /* ---------- بوتات تلغرام (طلبات / دعم / تقارير) ---------- */
  let tgd = [], tgs = [];
  const TGP = { view: 'عرض', confirm: 'تأكيد', reject: 'رفض', processing: 'تجهيز', ship: 'شحن', deliver: 'تسليم', assign: 'استلام', status: 'تغيير حالة', resolve: 'حل', dept_service: 'قسم الدعم', dept_routine: 'قسم الروتين' };
  const TGI = { orders: '🛍', support: '💬', reports: '📊' };
  const RKN = { daily: 'التقرير اليومي', weekly: 'التقرير الأسبوعي', monthly: 'التقرير الشهري', yearly: 'التقرير السنوي' }, DOW = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const tgAuto = b => { const a = (b.cfg || {}).auto || {}, rs = b.recipients.filter(r => r.active); return `<h4>الإرسال التلقائي للتقارير</h4><p class="em">الأوامر داخل البوت: <b dir="ltr">/daily /weekly /monthly /yearly /sales /orders /customers /invoices</b> (للمعرّفات ذات صلاحية «عرض» فقط). الأسبوعي يغطي الأسبوع الماضي (السبت–الجمعة)، والشهري والسنوي يُرسلان في أول الشهر/السنة. اترك المستلمين بلا تحديد ليصل لكل المعرّفات الفعّالة. التوقيت بتوقيت بغداد.</p>
    <form class="fm" data-f="tga">${Object.keys(RKN).map(k => { const c = a[k] || {}; return `<div class="full" style="border:1px solid var(--bd,#e3ecee);border-radius:10px;padding:8px 10px"><label class="ck"><input type="checkbox" name="on_${k}" ${c.on ? 'checked' : ''}> <b>${RKN[k]}</b></label> <input type="time" name="t_${k}" value="${c.time || '09:00'}" style="width:auto">${k == 'weekly' ? ` <select name="d_weekly" style="width:auto">${DOW.map((n, i) => `<option value="${i}" ${(c.dow ?? 6) == i ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''} <button type="button" class="btn g" data-a="tgrp" data-c="${k}">إرسال الآن</button><br>${rs.length ? rs.map(r => `<label class="ck"><input type="checkbox" name="to_${k}" value="${r.chat_id}" ${(c.to || []).includes(r.chat_id) ? 'checked' : ''}> ${esc(r.name || r.chat_id)}</label>`).join(' ') : '<small>أضف معرّفات فعّالة أولاً</small>'}</div>`; }).join('')}<button class="btn">حفظ جدول الإرسال</button></form>`; };
  const tgT = t => t ? new Date(t).toLocaleString('ar-IQ') : '—';
  TB.tg = () => { setTimeout(loadTg, 0); return '<div id="tgb"><p class="em">جارٍ التحميل…</p></div>'; };
  async function loadTg() {
    const el = $('#tgb'); if (!el) return;
    try { tgd = (await J('/adm/tg')).bots; tgs = (await J('/adm/staff')).staff || []; } catch (e) { el.innerHTML = '<p class="em">سجّل الدخول أولاً</p>'; return; }
    el.innerHTML = `<p class="em">ثلاثة بوتات مستقلة: لكل بوت توكن وقائمة معرّفات خاصة به (أنشئ كل بوت من <b>@BotFather</b>). كل مستلم يضغط <b>Start</b> على البوت أولاً، ويكتب /start ليعرف رقمه ويعطيك إياه. إضافة معرّف لبوت لا تضيفه تلقائياً للبوتات الأخرى، والتوكن لا يظهر في الموقع بعد الحفظ.</p>` + tgd.map(b => `<div class="cd tgc" data-bot="${b.bot}">
      <h3>${TGI[b.bot]} ${esc(b.label)} ${b.username ? `<small dir="ltr">@${esc(b.username)}</small>` : ''}</h3>
      <p class="em">${b.enabled ? '✅ مفعّل' : '⛔ معطّل'} · ${b.connected ? '🔗 متصل' : '⚠️ غير مربوط'} · المعرّفات الفعّالة: <b>${b.count}</b>/${b.total} · آخر إرسال ناجح: ${tgT(b.last_ok)}${b.last_err ? `<br>⚠️ آخر خطأ: ${esc(b.last_err)} (${tgT(b.last_err_at)})` : ''}</p>
      <form class="fm" data-f="tgb"><input type="hidden" name="bot" value="${b.bot}"><label>اسم البوت<input name="name" value="${esc(b.name)}" placeholder="${esc(b.label)}"></label>
        <label>التوكن <small>(من @BotFather)</small><input name="token" type="password" dir="ltr" autocomplete="off" placeholder="${b.hasToken ? 'محفوظ ' + b.tokenHint + ' — اتركه فارغاً للإبقاء عليه' : '123456789:AA…'}"></label>
        ${b.bot == 'support' ? `<label>تذكير «زبون ينتظر» بعد (دقيقة)<input name="wait_min" type="number" min="2" max="240" value="${(b.cfg || {}).wait_min || 10}"></label>` : ''}<label class="ck"><input type="checkbox" name="enabled" ${b.enabled ? 'checked' : ''}> تفعيل البوت</label>
        <button class="btn">حفظ</button><button type="button" class="btn g" data-a="tgcn" data-c="${b.bot}">اختبار الاتصال وربط البوت</button><button type="button" class="btn g" data-a="tglg" data-c="${b.bot}">سجل الإرسال</button></form>
      ${b.bot == 'reports' ? tgAuto(b) : ''}
      <h4>المعرّفات المسموح لها (${b.total})</h4>
      ${b.recipients.length ? `<table class="tbd"><tr><th>الاسم</th><th>المعرّف</th><th>الصلاحيات</th><th>الحالة</th><th></th></tr>${b.recipients.map(r => `<tr><td>${esc(r.name || '—')}${r.staff_id ? `<br><small>🔗 ${esc((tgs.find(x => x.id == r.staff_id) || {}).name || 'موظف')}</small>` : ''}</td><td dir="ltr">${esc(r.chat_id)}</td><td>${r.perms.map(x => TGP[x] || x).join('، ') || '—'}</td>
        <td>${r.active ? '✅ فعّال' : '⏸ موقوف'}<br><small>${r.last_err ? '⚠️ ' + esc(r.last_err) : r.last_ok ? 'آخر وصول ' + tgT(r.last_ok) : 'لم يُرسل بعد'}</small></td>
        <td><button class="btn g" data-a="tget" data-c="${r.id}">اختبار</button> <button class="btn g" data-a="tgee" data-c="${b.bot}|${r.id}">تعديل</button> <button class="btn g" data-a="tgea" data-c="${r.id}|${r.active ? 0 : 1}">${r.active ? 'إيقاف' : 'تفعيل'}</button> <button class="btn g" data-a="tgdl" data-c="${r.id}">حذف</button></td></tr>`).join('')}</table>` : '<p class="em">لا توجد معرّفات بعد.</p>'}
      <form class="fm" data-f="tgr"><input type="hidden" name="bot" value="${b.bot}"><input type="hidden" name="id" value=""><input name="name" placeholder="الاسم (مثلاً: مدير المبيعات)"><input name="chat_id" dir="ltr" inputmode="numeric" placeholder="Telegram ID أو Chat ID" required>
        ${b.bot == 'support' ? `<select name="staff_id" title="ربط بحساب موظف (لزر استلام المحادثة)"><option value="">بدون ربط بحساب موظف</option>${tgs.filter(x => x.active).map(x => `<option value="${x.id}">${esc(x.name)} (${esc(x.username)})</option>`).join('')}</select>` : ''}<div class="full tgp">${b.perms.map(k => `<label class="ck"><input type="checkbox" name="pm" value="${k}" ${['deliver'].includes(k) ? '' : 'checked'}> ${TGP[k]}</label>`).join('')}</div><button class="btn">إضافة / حفظ معرّف</button></form>
    </div>`).join('') + '<div id="tglog"></div>';
  }
  document.addEventListener('submit', async e => {
    const f = e.target.closest && e.target.closest('form[data-f^="tg"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
    const fd = new FormData(f), v = Object.fromEntries(fd);
    try {
      if (f.dataset.f === 'tga') {
        const auto = {}; for (const k of Object.keys(RKN)) auto[k] = { on: !!v['on_' + k], time: v['t_' + k] || '09:00', to: fd.getAll('to_' + k), ...(k == 'weekly' ? { dow: +v.d_weekly } : {}) };
        const cur = tgd.find(x => x.bot == 'reports'); await J('/adm/tg/bot', { method: 'POST', body: JSON.stringify({ bot: 'reports', enabled: cur.enabled, name: cur.name, cfg: { auto } }) }); toast('تم حفظ جدول الإرسال');
      } else if (f.dataset.f === 'tgb') { await J('/adm/tg/bot', { method: 'POST', body: JSON.stringify({ bot: v.bot, name: v.name, token: v.token, enabled: !!v.enabled, cfg: v.wait_min ? { wait_min: +v.wait_min } : undefined }) }); toast('تم الحفظ'); }
      else { await J('/adm/tg/rec', { method: 'POST', body: JSON.stringify({ bot: v.bot, id: v.id ? +v.id : undefined, name: v.name, chat_id: v.chat_id, perms: fd.getAll('pm'), staff_id: v.staff_id ? +v.staff_id : null }) }); toast('تم حفظ المعرّف'); }
      loadTg();
    } catch (x) { toast(x.message || 'تعذر الحفظ'); }
  }, true);
  A.tgrp = async k => { try { const j = await J('/adm/tg/report', { method: 'POST', body: JSON.stringify({ kind: k }) }); toast('✅ أُرسل إلى ' + j.sent + ' معرّف'); } catch (e) { toast(e.message); } loadTg(); };
  A.tgcn = async b => { try { const j = await J('/adm/tg/connect', { method: 'POST', body: JSON.stringify({ bot: b }) }); toast('✅ متصل: @' + j.username); } catch (e) { toast(e.message); } loadTg(); };
  A.tget = async id => { try { await J('/adm/tg/rec/test', { method: 'POST', body: JSON.stringify({ id: +id }) }); toast('✅ وصلت رسالة الاختبار'); } catch (e) { toast(e.message); } loadTg(); };
  A.tgdl = async id => { if (!confirm('حذف هذا المعرّف؟ لن يستلم إشعارات ولن ينفّذ أي إجراء.')) return; try { await J('/adm/tg/rec?id=' + id, { method: 'DELETE' }); toast('تم الحذف'); } catch (e) { toast(e.message); } loadTg(); };
  A.tgea = async c => { const [id, on] = String(c).split('|'), bot = tgd.find(b => b.recipients.some(r => r.id == id)), r = bot.recipients.find(r => r.id == id);
    try { await J('/adm/tg/rec', { method: 'POST', body: JSON.stringify({ bot: bot.bot, id: r.id, name: r.name, chat_id: r.chat_id, perms: r.perms, staff_id: r.staff_id, active: on == 1 }) }); toast(on == 1 ? 'تم التفعيل' : 'تم الإيقاف'); } catch (e) { toast(e.message); } loadTg(); };
  A.tgee = c => { const [bot, id] = String(c).split('|'), b = tgd.find(x => x.bot == bot), r = b.recipients.find(x => x.id == id), f = document.querySelector(`.tgc[data-bot="${bot}"] form[data-f="tgr"]`);
    f.id.value = r.id; f.name.value = r.name; if (f.staff_id) f.staff_id.value = r.staff_id || ''; f.chat_id.value = r.chat_id; f.querySelectorAll('[name=pm]').forEach(i => i.checked = r.perms.includes(i.value)); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('عدّل ثم اضغط حفظ'); };
  A.tglg = async b => { try { const j = await J('/adm/tg/log?bot=' + b); $('#tglog').innerHTML = `<div class="cd"><h3>سجل ${esc((tgd.find(x => x.bot == b) || {}).label || '')}</h3><table class="tbd"><tr><th>الوقت</th><th>المعرّف</th><th>النوع</th><th>النتيجة</th></tr>${j.log.map(l => `<tr><td>${tgT(l.at)}</td><td dir="ltr">${esc(l.chat_id)}</td><td>${esc(l.kind)}</td><td>${l.ok ? '✅' : '⚠️ ' + esc(l.detail)}</td></tr>`).join('') || '<tr><td colspan=4>لا سجلات</td></tr>'}</table></div>`; } catch (e) { toast(e.message); } };

  /* ---------- الموظفون ---------- */
  let est = [], esid = 0;
const SRL = [['support', 'فريق الدعم', ['Support Agent', 'Order Support', 'Support Manager']], ['routine', 'فريق الروتين', ['Routine Specialist', 'Senior Specialist', 'Routine Manager']]], TMN = { support: 'الدعم', routine: 'الروتين' }, XPN = { 'dept:routine': 'يفتح صندوق الروتين', 'dept:service': 'يفتح صندوق الدعم', routine_view: 'يرى نتائج الاختبار' };
  const roleOpts = () => SRL.map(([t, n, rs]) => `<optgroup label="${n}">${rs.map(r => `<option value="${t}|${r}">${r}</option>`).join('')}</optgroup>`).join('');
  TB.sf = () => { setTimeout(loadStaff, 0); return `<p class="em">أنشئ حساباً لكل موظف. يدخل من الرابط <b dir="ltr">/#staff</b> ويرد على الزبائن باسمه، ولا يرى بقية لوحة التحكم. <b>فريق الدعم</b> و<b>فريق الروتين</b> منفصلان: كل موظف يرى صندوق فريقه فقط، وتُفرض العزلة من الخادم.</p><div id="sfl"><p class="em">جارٍ التحميل…</p></div>`
    + `<form id="sff" class="fm" style="margin-top:14px"><input name="name" placeholder="اسم الموظف" required><input name="username" dir="ltr" placeholder="اسم المستخدم (إنجليزي)" required><input name="pw" type="password" placeholder="كلمة السر (6+ أحرف)" autocomplete="new-password"><select name="role" aria-label="الفريق والدور">${roleOpts()}</select><select name="xp" aria-label="صلاحية إضافية"><option value="">بدون صلاحية إضافية</option><option value="dept:routine">+ صندوق الروتين</option><option value="dept:service">+ صندوق الدعم</option><option value="routine_view">+ نتائج الاختبار</option></select><button class="btn">إضافة موظف</button></form>`; };
  async function loadStaff() { const el = $('#sfl'); if (!el) return; try { est = (await J('/adm/staff')).staff; } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    el.innerHTML = est.length ? `<table class="tb"><tr><th>الاسم</th><th>المستخدم</th><th>الفريق / الدور</th><th>آخر دخول</th><th>الحالة</th><th></th></tr>${est.map(s => `<tr><td>${esc(s.name)}</td><td dir="ltr">${esc(s.username)}</td><td>${TMN[s.team] || ''}${s.role ? ' · ' + esc(s.role) : ''}${(s.perms || []).length ? '<br><small>' + s.perms.map(x => XPN[x]).join('، ') + '</small>' : ''}</td><td>${s.last_login ? new Date(s.last_login).toLocaleString('ar-IQ') : '—'}</td><td>${s.active ? 'فعّال' : 'معطّل'}${s.must_change ? '<br><small>لم يغيّر كلمة السر</small>' : ''}</td><td><button class="btn g" data-a="sfl" data-c="${s.id}">السجل</button> <button class="btn g" data-a="sfr" data-c="${s.id}">إنهاء الجلسات</button> <button class="btn g" data-a="sfe" data-c="${s.id}">الفريق</button> <button class="btn g" data-a="sft" data-c="${s.id}">${s.active ? 'تعطيل' : 'تفعيل'}</button> <button class="btn g" data-a="sfp" data-c="${s.id}">كلمة سر جديدة</button> <button class="btn g" data-a="sfd" data-c="${s.id}">حذف</button></td></tr>`).join('')}</table>` : '<p class="em">لا موظفين بعد</p>'; }
  H.sff = async (v, f) => { try { const [team, role] = String(v.role || 'support|').split('|'); v = { ...v, team, role, perms: v.xp ? [v.xp] : [] }; delete v.xp; await J('/adm/staff', { method: 'POST', body: JSON.stringify(v) }); toast('تمت الإضافة'); f.reset(); loadStaff(); } catch (e) { toast(e.message); } };
  A.sfe = async c => { const s = est.find(x => x.id == c), all = SRL.flatMap(([t, n, rs]) => rs.map(r => [t, r])), cur = all.findIndex(([t, r]) => t == s.team && r == s.role) + 1;
    const n = prompt('اختر رقم الفريق/الدور للموظف ' + s.name + ':\n' + all.map(([t, r], i) => (i + 1) + ') ' + TMN[t] + ' — ' + r).join('\n'), cur || 1); if (!n) return; const pick = all[+n - 1]; if (!pick) return toast('رقم غير صحيح');
    const xs = prompt('صلاحية إضافية (اتركه فارغاً لعدم المنح):\n1) فتح صندوق الروتين\n2) فتح صندوق الدعم\n3) رؤية نتائج الاختبار', ({ 'dept:routine': '1', 'dept:service': '2', routine_view: '3' })[(s.perms || [])[0]] || ''); if (xs === null) return;
    try { await J('/adm/staff', { method: 'POST', body: JSON.stringify({ id: s.id, name: s.name, username: s.username, active: !!s.active, team: pick[0], role: pick[1], perms: ({ 1: ['dept:routine'], 2: ['dept:service'], 3: ['routine_view'] })[xs] || [] }) }); toast('تم الحفظ'); loadStaff(); } catch (e) { toast(e.message); } };
  A.sfl = async c => { try { const j = await J('/adm/staff/log?id=' + c), AN = { staff_login: 'دخول', staff_logout: 'خروج', staff_password_change: 'تغيير كلمة السر', staff_password_reset: 'إعادة تعيين كلمة السر', staff_revoke: 'إنهاء الجلسات', staff_team: 'تغيير الفريق', staff_create: 'إنشاء الحساب', chat_claim: 'استلام محادثة', chat_close: 'إغلاق محادثة', chat_transfer: 'تحويل محادثة', chat_status: 'تغيير حالة محادثة' }; alert(j.log.length ? j.log.map(x => new Date(x.at).toLocaleString('ar-IQ') + ' — ' + (AN[x.action] || x.action) + (x.entity ? ' (' + x.entity + ')' : '')).join('\n') : 'لا نشاط مسجّل بعد'); } catch (e) { toast(e.message); } };
  A.sfr = async c => { if (!confirm('إنهاء كل جلسات هذا الموظف؟ سيحتاج لتسجيل الدخول من جديد.')) return; try { await J('/adm/staff/revoke', { method: 'POST', body: JSON.stringify({ id: +c }) }); toast('تم إنهاء الجلسات'); } catch (e) { toast(e.message); } };
  A.sft = async c => { const s = est.find(x => x.id == c); await J('/adm/staff', { method: 'POST', body: JSON.stringify({ id: s.id, name: s.name, username: s.username, active: !s.active, team: s.team, role: s.role, perms: s.perms }) }); loadStaff(); };
  A.sfp = async c => { const s = est.find(x => x.id == c), pw = prompt('كلمة السر الجديدة للموظف ' + s.name + ' (6 أحرف على الأقل)'); if (!pw) return; try { await J('/adm/staff', { method: 'POST', body: JSON.stringify({ id: s.id, name: s.name, username: s.username, active: !!s.active, team: s.team, role: s.role, perms: s.perms, pw }) }); toast('تم تغيير كلمة السر'); } catch (e) { toast(e.message); } };
  A.sfd = async c => { if (!ask('sf' + c)) return; await J('/adm/staff?id=' + c, { method: 'DELETE' }); loadStaff(); };

  /* ---------- الدفع والتوصيل ---------- */
  TB.pm = () => { const pm = (S.pm && S.pm.length ? S.pm : [{ id: 'cod', n: 'الدفع عند الاستلام', on: 1, d: '' }]);
    return `<form id="pmf" class="fm"><label>رسوم التوصيل (د.ع) — 0 = توصيل مجاني للجميع<input name="sf" type="number" min="0" value="${+S.sf || 0}"></label>
    <textarea name="pm" rows="6">${pm.map(x => [x.id, x.n, x.d || '', x.on === 0 ? 0 : 1].join(' | ')).join('\n')}</textarea>
    <p class="em full">طرق الدفع: سطر لكل طريقة بالشكل  <b>المعرّف | الاسم | تعليمات للزبون | 1 مفعّل أو 0 معطّل</b>. «cod» هي الأساسية (الدفع عند الاستلام) وتبقى الافتراضية دائماً. مثال: <code>zain | زين كاش | حوّل إلى 07xxxxxxxxx | 1</code></p><button class="btn">حفظ</button></form>`; };
  H.pmf = v => { const rows = v.pm.split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r[0] && r[1]).map(r => ({ id: r[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'm' + Math.random().toString(36).slice(2, 5), n: r[1], d: r[2] || '', on: r[3] === '0' ? 0 : 1 }));
    if (!rows.find(r => r.id == 'cod')) rows.unshift({ id: 'cod', n: 'الدفع عند الاستلام', d: '', on: 1 }); else rows.find(r => r.id == 'cod').on = 1;
    S.pm = rows; S.sf = Math.max(0, Math.round(+v.sf || 0)); save(); render(); ra(); toast('تم الحفظ'); };
})();
