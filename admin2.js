/* admin2.js — تبويبات لوحة التحكم الجديدة: الأكواد، البوكسات، الواجهة والوصف، الإحصائيات، واتساب، الدعم، الدفع والتوصيل */
(function () {
  'use strict';
  const N = n => Number(n || 0).toLocaleString('en-US');
  const dt = t => new Date(t).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  const up = (tag, html) => `<div class="cd" style="margin-bottom:14px"><h3>${tag}</h3>${html}</div>`;
  const prodChecks = (name, sel = [], withQty = false) => `<div class="pck">${S.P.map(p => { const on = sel.find(x => (x.c || x) == p.c); return `<label><input type="checkbox" name="${name}" value="${esc(p.c)}" ${on ? 'checked' : ''}> ${esc(p.n)}${withQty ? ` <input type="number" min="1" max="20" name="q_${esc(p.c)}" value="${on && on.q || 1}" style="width:54px">` : ''}</label>`; }).join('')}</div>`;
  const act = () => document.querySelector('#ab');
  const J = async (u, o) => { const r = await apiJ(u, o); if (r && r.error) throw new Error(r.error); return r; };
  const barSvg = (rows, key, color) => {
    if (!rows.length) return '<p class="em">لا توجد بيانات بعد</p>';
    const max = Math.max(...rows.map(r => r[key] || 0), 1), w = 26, h = 120;
    return `<div class="chw"><svg viewBox="0 0 ${rows.length * w + 10} ${h + 30}" role="img" style="min-width:${rows.length * 22}px;height:160px">${rows.map((r, i) => { const v = r[key] || 0, bh = Math.round(v / max * h); return `<g><rect x="${i * w + 6}" y="${h - bh + 4}" width="${w - 6}" height="${bh}" rx="3" fill="${color}"><title>${esc(r.k)}: ${N(v)}</title></rect><text x="${i * w + 6 + (w - 6) / 2}" y="${h - bh}" font-size="9" text-anchor="middle" fill="currentColor">${v || ''}</text><text x="${i * w + 6 + (w - 6) / 2}" y="${h + 18}" font-size="8" text-anchor="middle" fill="currentColor" transform="rotate(-40 ${i * w + 6 + (w - 6) / 2} ${h + 18})">${esc(String(r.k).slice(-5))}</text></g>`; }).join('')}</svg></div>`;
  };
  const add = (id, name) => { if (!TABS.find(t => t[0] === id)) TABS.push([id, name]); };
  ['cp:أكواد الخصم', 'bx:البوكسات', 'hr:الواجهة والوصف', 'st:الإحصائيات', 'wm:رسائل واتساب', 'ch:الدعم والتقييم', 'pm:الدفع والتوصيل', 'ig:الربط والمفاتيح', 'sf:الموظفون'].forEach(s => { const [a, b] = s.split(':'); add(a, b); });
  TABS.unshift(...TABS.splice(TABS.findIndex(t => t[0] === 'st'), 1));      // الإحصائيات أولاً

  /* ---------- تنظيم الأقسام في مجموعات (صفحة مستقلة لكل مجموعة) ---------- */
  add('db', 'اللوحة'); add('au', 'سجل النشاط');
  const GROUPS = window.GROUPS = [
    ['home', 'الرئيسية', ['db', 'st']],
    ['orders', 'الطلبات', ['or']],
    ['catalog', 'الكتالوج', ['p', 'g', 'sb', 'br', 'bx']],
    ['customers', 'العملاء', ['cu', 'dc']],
    ['marketing', 'التسويق', ['a', 'cp', 'wm']],
    ['support', 'الدعم والموظفون', ['ch', 'sf']],
    ['settings', 'إعدادات المتجر', ['s', 'l', 'hr', 'pm', 'lg', 'gd']],
    ['system', 'الأمان والنظام', ['ig', 'au', 'u']],
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
  TB.cp = () => { setTimeout(loadCodes, 0); return `<div id="cpl"><p class="em">جارٍ التحميل…</p></div>` + up('إنشاء / تعديل كود', `<form id="cpf" class="fm">
    <input name="code" placeholder="الكود (حروف إنجليزية/أرقام)" required style="text-transform:uppercase">
    <select name="kind"><option value="percent">نسبة %</option><option value="amount">مبلغ ثابت</option><option value="free_shipping">توصيل مجاني</option></select>
    <input name="value" type="number" min="0" placeholder="القيمة (نسبة أو مبلغ — اتركها للتوصيل المجاني)">
    <input name="min" type="number" min="0" placeholder="حد أدنى للسلة (اختياري)">
    <label>تاريخ الانتهاء<input name="exp" type="date"></label>
    <input name="max" type="number" min="1" placeholder="أقصى عدد استخدامات (اختياري)">
    <input name="ph" placeholder="مخصص لرقم هاتف (اختياري)">
    <label><input type="checkbox" name="stack"> يمكن جمعه مع أكواد أخرى</label>
    <details class="full"><summary>تحديد منتجات معينة (بدون تحديد = كل المنتجات)</summary>${prodChecks('prods')}</details>
    <button class="btn">حفظ الكود</button></form><p class="em">القاعدة: كود واحد غير قابل للجمع، أو عدة أكواد قابلة للجمع. كود التوصيل المجاني يجتمع مع أي كود. الخصم الجزئي بحسب المنتجات المحددة فقط.</p>`); };
  async function loadCodes() {
    const el = $('#cpl'); if (!el) return;
    try { codes = (await J('/codes')).codes; } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    const kn = { percent: 'نسبة', amount: 'مبلغ', free_shipping: 'توصيل مجاني' };
    el.innerHTML = codes.length ? `<table class="tb"><tr><th>الكود</th><th>النوع</th><th>القيمة</th><th>شروط</th><th>استخدام</th><th></th></tr>${codes.map(c => `<tr><td dir="ltr"><b>${esc(c.code)}</b></td><td>${kn[c.kind]}</td><td>${c.kind == 'percent' ? c.value + '%' : c.kind == 'amount' ? N(c.value) : '—'}</td><td><small>${c.min ? 'حد أدنى ' + N(c.min) + ' · ' : ''}${c.prods.length ? c.prods.length + ' منتج · ' : ''}${c.exp ? 'حتى ' + new Date(c.exp).toLocaleDateString('ar-IQ') + ' · ' : ''}${c.stack ? 'يُجمع' : ''}${c.ph ? ' · ' + esc(c.ph) : ''}</small></td><td>${c.used}${c.max ? '/' + c.max : ''}</td><td><button class="btn g" data-a="cpt" data-c="${esc(c.code)}">${c.active ? 'تعطيل' : 'تفعيل'}</button> <button class="btn g" data-a="cpd" data-c="${esc(c.code)}">حذف</button></td></tr>`).join('')}</table>` : '<p class="em">لا توجد أكواد بعد</p>';
  }
  H.cpf = async (v, f) => {
    const prods = [...f.querySelectorAll('[name=prods]:checked')].map(x => x.value);
    try { await J('/codes', { method: 'POST', body: JSON.stringify({ code: v.code, kind: v.kind, value: +v.value || 0, min: +v.min || 0, exp: v.exp ? Date.parse(v.exp + 'T23:59:59') : null, max: +v.max || null, ph: v.ph.trim(), stack: !!v.stack, prods }) }); toast('تم حفظ الكود'); f.reset(); loadCodes(); }
    catch (e) { toast(e.message || 'تعذر الحفظ'); }
  };
  A.cpt = async c => { const x = codes.find(k => k.code == c); if (!x) return; await J('/codes', { method: 'POST', body: JSON.stringify({ ...x, exp: x.exp, active: !x.active }) }); loadCodes(); };
  A.cpd = async c => { if (!ask('cp' + c)) return; await J('/codes?code=' + encodeURIComponent(c), { method: 'DELETE' }); loadCodes(); };

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
  async function openChat(id, quiet) { const el = $('#chm'); if (!el) return; const j = await J('/adm/chat?id=' + id);
    const hd = j.chat ? `<div class="chhd"><b>${esc(j.chat.name || 'زائر')}</b> ${esc(j.chat.ph || '')} · ${j.chat.mode == 'human' ? '👤 ' + esc(j.chat.staff || 'بانتظار موظف') : '🤖 المساعد'}</div>` : '';
    el.innerHTML = `${hd}<div class="msgs">${j.messages.map(m => `<div class="m ${m.sender}"><small class="au">${esc(m.author || '')}</small>${esc(m.text || m.body)}<small>${dt(m.at)}</small></div>`).join('')}</div><form id="chf" class="fm" style="grid-template-columns:1fr auto auto auto"><input name="text" placeholder="اكتب رداً…" required autocomplete="off"><button class="btn">إرسال</button>${chc == 'support' ? '<button type="button" class="btn g" data-a="chk">استلام</button><button type="button" class="btn g" data-a="chx">إنهاء</button>' : ''}</form>`;
    const ms = el.querySelector('.msgs'); ms.scrollTop = ms.scrollHeight; }
  H.chf = async v => { await J(chc == 'admin' ? '/adm/inquiry' : '/adm/chat/reply', { method: 'POST', body: JSON.stringify(chc == 'admin' ? { product: (await J('/adm/chats?channel=admin')).chats.find(c => c.id == chId).product, text: v.text } : { id: chId, text: v.text }) }); openChat(chId); };
  H.chq = async (v, f) => { const r = await J('/adm/inquiry', { method: 'POST', body: JSON.stringify(v) }); f.reset(); chId = r.id; loadChats(); };
  A.chk = async () => { try { await J('/adm/chat/claim', { method: 'POST', body: JSON.stringify({ id: chId, force: true }) }); toast('استلمت المحادثة'); loadChats(); } catch (e) { toast(e.message); } };
  A.chx = async () => { await J('/adm/chat/close', { method: 'POST', body: JSON.stringify({ id: chId }) }); toast('أُنهيت المحادثة وسيظهر للزبون نموذج التقييم'); loadChats(); };

  /* ---------- الربط والمفاتيح ---------- */
  const IGF = [['واتساب (Meta Cloud API)', [['WA_TOKEN', 'التوكن الدائم (Access Token)', 1], ['WA_PHONE_ID', 'معرّف رقم الهاتف (Phone Number ID)'], ['WA_LANG', 'لغة القوالب (مثل ar)'], ['WA_TPL_OTP', 'اسم قالب رمز التحقق'], ['WA_TPL_WELCOME', 'اسم قالب الترحيب'], ['WA_TPL_ORDER', 'اسم قالب حالة الطلب'], ['WA_TPL_PROMO', 'اسم قالب الرسائل التسويقية']]],
    ['المتجر و Google', [['STORE_URL', 'رابط المتجر الذي يُلحق برسائل واتساب'], ['GOOGLE_CLIENT_ID', 'Google Client ID (لتسجيل الدخول بجوجل)']]],
    ['الذكاء الاصطناعي للدعم (اختياري)', [['ANTHROPIC_API_KEY', 'مفتاح Anthropic (Claude API)', 1], ['AI_MODEL', 'اسم النموذج (اتركه فارغاً للافتراضي)'], ['AI_ON', 'تشغيل الرد الآلي (اكتب 0 لإيقافه، وأي قيمة أخرى للتشغيل)'], ['AI_PROMPT', 'تعليمات إضافية للمساعد (نبرة الكلام، سياسات المتجر، ما لا يجيب عنه)']]],
    ['تلجرام (إشعار طلباتك)', [['BOT_TOKEN', 'توكن البوت', 1], ['CHAT_ID', 'معرّف المحادثة (Chat ID)']]]];
  TB.ig = () => { setTimeout(loadIg, 0); return `<div id="igb"><p class="em">جارٍ التحميل…</p></div>`; };
  async function loadIg() {
    const el = $('#igb'); if (!el) return; let v;
    try { v = await J('/adm/integrations'); } catch (e) { el.innerHTML = '<p class="em">سجّل الدخول أولاً</p>'; return; }
    const act = v._active;
    el.innerHTML = `<p class="em">القيم تُحفظ مباشرة في قاعدة البيانات ولا تحتاج Cloudflare. اترك الحقل فارغاً للإبقاء على القيمة الحالية، واكتب <b>__clear__</b> لحذفها.<br>الحالة: واتساب ${act.wa ? '✅ مفعّل' : '⛔ غير مفعّل'} · Google ${act.google ? '✅' : '⛔'} · تلجرام ${act.telegram ? '✅' : '⛔'}</p>
    <form id="igf" class="fm">${IGF.map(([t, fs]) => `<h3 class="full" style="margin:10px 0 0">${t}</h3>${fs.map(([k, l, sec]) => `<label>${l} <small dir="ltr">${k}</small><input name="${k}" ${sec ? 'type="password" autocomplete="off"' : ''} dir="ltr" placeholder="${sec ? (v[k].set ? 'محفوظ ' + v[k].hint + ' — اتركه للإبقاء' : 'غير مضبوط') : ''}" value="${sec ? '' : esc(v[k].value || '')}"></label>`).join('')}`).join('')}
    <button class="btn">حفظ</button></form>
    <div class="cd"><h3>اختبار الربط</h3><form id="igt" class="fm"><input name="ph" dir="ltr" placeholder="رقم لإرسال رسالة اختبار 07XXXXXXXXX"><button class="btn">اختبار واتساب</button><button type="button" class="btn g" data-a="igtg">اختبار تلجرام</button></form></div>`;
  }
  H.igf = async (v) => { try { await J('/adm/integrations', { method: 'POST', body: JSON.stringify(v) }); toast('تم الحفظ'); loadIg(); } catch (e) { toast(e.message || 'تعذر الحفظ'); } };
  H.igt = async (v) => { try { await J('/adm/integrations/test', { method: 'POST', body: JSON.stringify({ kind: 'wa', ph: v.ph.trim() }) }); toast('✅ أُرسلت رسالة الاختبار'); } catch (e) { toast(e.message || 'فشل الاختبار'); } };
  A.igtg = async () => { try { await J('/adm/integrations/test', { method: 'POST', body: JSON.stringify({ kind: 'telegram' }) }); toast('✅ وصلت رسالة تلجرام'); } catch (e) { toast(e.message || 'فشل الاختبار'); } };

  /* ---------- الموظفون ---------- */
  let est = [], esid = 0;
  TB.sf = () => { setTimeout(loadStaff, 0); return `<p class="em">أنشئ حساباً لكل موظف. يدخل من الرابط <b dir="ltr">/#staff</b> ويرد على الزبائن باسمه، ولا يرى بقية لوحة التحكم.</p><div id="sfl"><p class="em">جارٍ التحميل…</p></div>`
    + `<form id="sff" class="fm" style="margin-top:14px"><input name="name" placeholder="اسم الموظف" required><input name="username" dir="ltr" placeholder="اسم المستخدم (إنجليزي)" required><input name="pw" type="password" placeholder="كلمة السر (6+ أحرف)" autocomplete="new-password"><button class="btn">إضافة موظف</button></form>`; };
  async function loadStaff() { const el = $('#sfl'); if (!el) return; try { est = (await J('/adm/staff')).staff; } catch (e) { el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    el.innerHTML = est.length ? `<table class="tb"><tr><th>الاسم</th><th>المستخدم</th><th>الحالة</th><th></th></tr>${est.map(s => `<tr><td>${esc(s.name)}</td><td dir="ltr">${esc(s.username)}</td><td>${s.active ? 'فعّال' : 'معطّل'}</td><td><button class="btn g" data-a="sft" data-c="${s.id}">${s.active ? 'تعطيل' : 'تفعيل'}</button> <button class="btn g" data-a="sfp" data-c="${s.id}">كلمة سر جديدة</button> <button class="btn g" data-a="sfd" data-c="${s.id}">حذف</button></td></tr>`).join('')}</table>` : '<p class="em">لا موظفين بعد</p>'; }
  H.sff = async (v, f) => { try { await J('/adm/staff', { method: 'POST', body: JSON.stringify(v) }); toast('تمت الإضافة'); f.reset(); loadStaff(); } catch (e) { toast(e.message); } };
  A.sft = async c => { const s = est.find(x => x.id == c); await J('/adm/staff', { method: 'POST', body: JSON.stringify({ id: s.id, name: s.name, username: s.username, active: !s.active }) }); loadStaff(); };
  A.sfp = async c => { const s = est.find(x => x.id == c), pw = prompt('كلمة السر الجديدة للموظف ' + s.name + ' (6 أحرف على الأقل)'); if (!pw) return; try { await J('/adm/staff', { method: 'POST', body: JSON.stringify({ id: s.id, name: s.name, username: s.username, active: !!s.active, pw }) }); toast('تم تغيير كلمة السر'); } catch (e) { toast(e.message); } };
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
