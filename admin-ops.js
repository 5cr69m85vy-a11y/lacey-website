/* admin-ops.js — لوحة الإدارة: المخزون، رسوم التوصيل حسب المحافظة، ربط شركة التوصيل */
(function () {
  'use strict';
  if (typeof TB === 'undefined' || typeof A === 'undefined') return;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = (p, o) => apiJ(p, o);
  const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) });
  const GOV = ['بغداد', 'نينوى', 'أربيل', 'السليمانية', 'دهوك', 'كركوك', 'البصرة', 'النجف', 'كربلاء', 'بابل', 'الأنبار', 'ديالى', 'صلاح الدين', 'واسط', 'ميسان', 'ذي قار', 'المثنى', 'القادسية', 'حلبجة'];
  const tabs = [['sk', 'المخزون'], ['dl', 'الشحن والتوصيل']];
  tabs.forEach(t => { if (!TABS.find(x => x[0] === t[0])) TABS.push(t); });
  const G = window.GROUPS || [];
  const grp = (id, k) => { const g = G.find(x => x[0] === id); if (g && !g[2].includes(k)) g[2].push(k); };
  grp('catalog', 'sk'); grp('settings', 'dl');

  /* ---------- المخزون ---------- */
  let stk = [], stF = '';
  TB.sk = () => { setTimeout(loadStock, 0); return `<div id="skb"><p class="em">جارٍ التحميل…</p></div>`; };
  async function loadStock() {
    const el = document.getElementById('skb'); if (!el) return;
    try { stk = (await api('/adm/stock')).items; } catch (e) { el.innerHTML = '<p class="em">تعذّر التحميل — سجّل الدخول أولاً</p>'; return; }
    drawStock();
  }
  const state = r => r.qty === null ? '' : r.qty <= 0 ? 'zero' : r.qty <= r.low ? 'lo' : '';
  function drawStock() {
    const el = document.getElementById('skb'); if (!el) return;
    const q = (stF || '').toLowerCase(), list = stk.filter(r => !q || (r.code + ' ' + r.name).toLowerCase().includes(q) || (q === ':low' && state(r)) || (q === ':out' && r.qty !== null && r.qty <= 0));
    const out = stk.filter(r => r.qty !== null && r.qty <= 0).length, low = stk.filter(r => r.qty !== null && r.qty > 0 && r.qty <= r.low).length, tr = stk.filter(r => r.qty !== null).length;
    el.innerHTML = `<p class="em">اترك الكمية <b>فارغة</b> لمنتج غير محدود (لا يُتتبَّع). عند الوصول إلى «حد التنبيه» يصلك إشعار تلجرام، وعند 0 يظهر «نفد» للزبائن ويُمنع شراؤه. إلغاء الطلب يُرجع الكمية تلقائياً.</p>
    <div class="chips"><span class="ub" style="background:#4a4a4a">${out}</span> نفد <span class="ub" style="background:#e08a00">${low}</span> منخفض <span class="ub" style="background:#2e8b57">${tr}</span> متتبَّع من ${stk.length}
      <button data-a="skq" data-c="">الكل</button><button data-a="skq" data-c=":low">المنخفض</button><button data-a="skq" data-c=":out">النافد</button></div>
    <input type="search" id="skq" placeholder="ابحث بالاسم أو الكود…" value="${E(stF.startsWith(':') ? '' : stF)}" style="width:100%;margin:8px 0;padding:10px;border:1px solid #d9e3e3;border-radius:12px">
    <form id="ostk"><div style="overflow:auto"><table class="stk-t"><tr><th>الكود</th><th>المنتج</th><th>الكمية</th><th>حد التنبيه</th></tr>
    ${list.map(r => { const i = stk.indexOf(r); return `<tr class="${state(r)}"><td>${E(r.code)}</td><td>${E(r.name)}</td><td><input type="number" min="0" name="q_${i}" value="${r.qty ?? ''}" placeholder="∞"></td><td><input type="number" min="0" name="l_${i}" value="${r.low}"></td></tr>`; }).join('') || '<tr><td colspan="4">لا نتائج</td></tr>'}</table></div>
    <button class="btn">حفظ المخزون</button></form>`;
  }
  A.skq = c => { stF = c; drawStock(); };
  document.addEventListener('input', e => { if (e.target.id === 'skq') { stF = e.target.value; const p = e.target.selectionStart; drawStock(); const n = document.getElementById('skq'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
  H.ostk = async v => {
    const items = Object.keys(v).filter(k => k[0] === 'q' && k[1] === '_').map(k => { const i = +k.slice(2), r = stk[i]; return r ? { code: r.code, qty: v[k] === '' ? null : +v[k], low: +v['l_' + i] || 0 } : null; }).filter(Boolean);
    try { for (let i = 0; i < items.length; i += 400) await post('/adm/stock', { items: items.slice(i, i + 400) }); toast('تم حفظ المخزون'); loadStock(); } catch (e) { toast(e.message); }
  };

  /* ---------- الشحن والتوصيل ---------- */
  let ig = null, dlTest = '';
  TB.dl = () => { setTimeout(loadDl, 0); return `<div id="dlb"><p class="em">جارٍ التحميل…</p></div>`; };
  async function loadDl() {
    const el = document.getElementById('dlb'); if (!el) return;
    try { ig = await api('/adm/integrations'); } catch (e) { el.innerHTML = '<p class="em">سجّل الدخول أولاً</p>'; return; }
    drawDl();
  }
  const v = k => (ig && ig[k] && ig[k].value) || '';
  const sec = k => ig && ig[k] && ig[k].set ? 'محفوظ ' + ig[k].hint + ' — اتركه للإبقاء' : 'غير مضبوط';
  function drawDl() {
    const el = document.getElementById('dlb'); if (!el) return; const pv = v('DLV_PROVIDER'), sg = S.sg || {};
    const hook = `${location.origin}/delivery/hook?key=${ig.DLV_KEY && ig.DLV_KEY.set ? '••••(المفتاح المحفوظ)' : 'ولّد مفتاحاً أولاً'}`;
    el.innerHTML = `<div class="cd"><h3>رسوم التوصيل حسب المحافظة</h3><form id="ofee"><p class="em">اترك الحقل فارغاً ليُستخدم السعر الافتراضي (${Number(S.sf || 0).toLocaleString('en-US')} د.ع، يُغيَّر من تبويب «الدفع والتوصيل»). 0 = توصيل مجاني لتلك المحافظة. أكواد «الشحن المجاني» تبقى تعمل.</p>
      <div class="gvt">${GOV.map((g, i) => `<label>${g}<input type="number" min="0" name="g${i}" value="${sg[g] ?? ''}" placeholder="افتراضي"></label>`).join('')}</div><button class="btn" style="margin-top:10px">حفظ الرسوم</button></form></div>
    <div class="cd"><h3>ربط شركة التوصيل</h3>
      <form id="oprov" class="fm"><label>الشركة<select name="DLV_PROVIDER"><option value="">— بدون ربط (إدارة يدوية) —</option><option value="waseet" ${pv === 'waseet' ? 'selected' : ''}>الوسيط (Al-Waseet)</option><option value="custom" ${pv === 'custom' ? 'selected' : ''}>شركة أخرى (رابط API)</option></select></label>
      ${pv === 'waseet' ? `<label>اسم المستخدم (حساب التاجر)<input name="DLV_USER" dir="ltr" value="${E(v('DLV_USER'))}"></label><label>كلمة السر<input name="DLV_PASS" type="password" autocomplete="off" dir="ltr" placeholder="${sec('DLV_PASS')}"></label>
        <label>حجم الطرد الافتراضي (رقم من قائمة الوسيط، اختياري)<input name="DLV_SIZE" dir="ltr" value="${E(v('DLV_SIZE'))}"></label><label>نوع البضاعة المكتوب على الوصل<input name="DLV_TYPE" value="${E(v('DLV_TYPE') || 'مستحضرات تجميل')}"></label>` : ''}
      ${pv === 'custom' ? `<label>رابط الشركة (API) — يبدأ بـ https://<input name="DLV_URL" dir="ltr" value="${E(v('DLV_URL'))}" placeholder="https://api.company.com/orders"></label><label>مفتاح/توكن الشركة (يُرسل كـ Bearer)<input name="DLV_TOKEN" type="password" autocomplete="off" dir="ltr" placeholder="${sec('DLV_TOKEN')}"></label>` : ''}
      <button class="btn">حفظ الربط</button><button type="button" class="btn g" data-a="dlt">اختبار الاتصال</button></form>
      ${dlTest ? `<p class="${/✅/.test(dlTest) ? 'rt-ok' : 'rt-warn'}">${E(dlTest)}</p>` : ''}
      <div class="dlv-help">${pv === 'waseet' ? `<b>طريقة ربط الوسيط</b><ol><li>افتح تطبيق/موقع <b>الوسيط للتجار</b> واستخدم نفس <b>اسم المستخدم وكلمة السر</b> لحسابك (حساب التاجر).</li><li>اختر «الوسيط» أعلاه، أدخل البيانات واضغط <b>حفظ الربط</b> ثم <b>اختبار الاتصال</b>.</li><li>في تبويب <b>الطلبات</b> سيظهر زر <b>«إرسال لشركة التوصيل»</b> في كل طلب: اختر المنطقة (نقترحها تلقائياً) واضغط إرسال، فيُنشأ الطلب عند الوسيط ويظهر رقم الوصل ورابط الطباعة، وتصبح حالة الطلب «مشحون».</li><li>تُحدَّث الحالة تلقائياً («مع المندوب»، «تم التسليم») بواسطة المجدول، أو بزر <b>تحديث الحالات الآن</b>.</li></ol>تُحفظ كلمة السر مشفّرة الإخفاء في قاعدة بياناتك ولا تظهر مرة أخرى.` : pv === 'custom' ? `<b>ربط شركة أخرى</b><ol><li>اطلب من الشركة رابط API لاستقبال الطلبات (وتوكن إن وُجد) وأدخلهما أعلاه.</li><li>عند الإرسال نُرسل <code>POST</code> بصيغة JSON فيه: <code>order: {code, name, phone, city, area, landmark, items, total, cod, collect}</code> وننتظر ردّاً يحوي <code>tracking</code> (أو <code>id</code>) و<code>link</code> اختياري.</li><li>لتصلك حالة الطلب منهم: اطلب أن يرسلوا <code>POST</code> إلى رابط الإشعارات أدناه بصيغة <code>{"ref":"رقم التتبع","status":"مع المندوب"}</code>.</li></ol>` : '<p class="em">اختر شركة لتظهر خطوات الربط. بدون ربط يمكنك متابعة الشحن يدوياً من تبويب الطلبات.</p>'}</div>
      <div class="dlv-box"><b>رابط استقبال الحالات (Webhook)</b><br><code dir="ltr" style="word-break:break-all">${E(hook)}</code><br><button class="btn g" data-a="dlk">${ig.DLV_KEY && ig.DLV_KEY.set ? 'توليد مفتاح جديد' : 'توليد مفتاح'}</button> ${pv ? '<button class="btn g" data-a="dlr">تحديث الحالات الآن</button>' : ''}</div></div>`;
  }
  H.ofee = async f => {
    const sg = {}; GOV.forEach((g, i) => { const x = f['g' + i]; if (x !== '' && x !== undefined && Number.isFinite(+x)) sg[g] = Math.max(0, Math.round(+x)); });
    S.sg = sg; save(); toast('تم حفظ رسوم المحافظات'); drawDl();
  };
  H.oprov = async f => { try { await post('/adm/integrations', f); toast('تم حفظ الربط'); dlTest = ''; await loadDl(); } catch (e) { toast(e.message); } };
  A.dlt = async () => { try { const form = document.getElementById("oprov"); if (form) await post('/adm/integrations', Object.fromEntries(new FormData(form))); const r = await post('/adm/delivery/test'); dlTest = (r.ok ? '' : '⚠️ ') + r.msg; } catch (e) { dlTest = '⚠️ ' + e.message; } await loadDl(); };
  A.dlk = async () => { try { const k = await post('/adm/delivery/genkey'); ig = await api('/adm/integrations'); drawDl(); const code = document.querySelector('#dlb .dlv-box code'); if (code) code.textContent = `${location.origin}/delivery/hook?key=${k.key}`; toast('انسخ الرابط الآن — لن يظهر المفتاح كاملاً مرة أخرى'); } catch (e) { toast(e.message); } };
  A.dlr = async () => { try { const r = await post('/adm/delivery/refresh'); toast(`تم تحديث ${r.n} طلب`); if (typeof ra === 'function') ra(); } catch (e) { toast(e.message); } };

  /* ---------- زر الإرسال داخل بطاقة الطلب ---------- */
  window.dlvHTML = o => {
    if (o.dlv) return `<div class="dlv-box">🚚 ${E(o.dlv.p === 'waseet' ? 'الوسيط' : 'شركة التوصيل')}: <b dir="ltr">${E(o.dlv.r)}</b> — ${E(o.dlv.s || '')} ${o.dlv.l ? `<a href="${E(o.dlv.l)}" target="_blank" rel="noopener">طباعة الوصل</a>` : ''}</div>`;
    if (![1, 2, 3].includes(o.st) || !(ig ? v('DLV_PROVIDER') : window.__dlvOn)) return '';
    return `<div id="dlp-${E(o.code)}"><button class="btn g" data-a="dlo" data-c="${E(o.code)}">إرسال لشركة التوصيل</button></div>`;
  };
  /* يُجلب مرة واحدة عند فتح تبويب الطلبات فقط (وليس عند تحميل المتجر للزوّار) */
  const tor = TB.or; TB.or = () => {
    if (window.__dlvOn === undefined) { window.__dlvOn = ''; api('/adm/integrations').then(j => { window.__dlvOn = (j.DLV_PROVIDER && j.DLV_PROVIDER.value) || ''; if (window.__dlvOn && typeof loadOr === 'function') loadOr(); }).catch(() => {}); }
    return tor();
  };
  A.dlo = async code => {
    const box = document.getElementById('dlp-' + code); if (!box) return; box.innerHTML = '<span class="em">جارٍ التحميل…</span>';
    let i; try { i = await api('/adm/delivery/info?code=' + encodeURIComponent(code)); } catch (e) { box.innerHTML = E(e.message); return; }
    if (i.error) { box.innerHTML = `<p class="rt-warn">${E(i.error)}</p>`; return; }
    box.innerHTML = `<form class="dlv-box" id="osend" data-code="${E(code)}"><b>إرسال إلى ${E(i.name)}</b>
      ${i.provider === 'waseet' ? `<label>المنطقة${i.city ? ` (${E(i.city)})` : ''}<select name="region_id" required><option value="">— اختر —</option>${(i.regions || []).map(r => `<option value="${r.id}" ${String(r.id) === String(i.guess) ? 'selected' : ''}>${E(r.n)}</option>`).join('')}</select></label>
        <label>حجم الطرد<select name="size">${(i.sizes || []).map(s => `<option value="${s.id}" ${String(s.id) === String(i.size) ? 'selected' : ''}>${E(s.n)}</option>`).join('')}</select></label>` : ''}
      <label>ملاحظة للمندوب<input name="notes" maxlength="150"></label><button class="btn">تأكيد الإرسال</button><button type="button" class="btn g" data-a="dlx" data-c="${E(code)}">إلغاء</button></form>`;
  };
  A.dlx = code => { const box = document.getElementById('dlp-' + code); if (box) box.innerHTML = `<button class="btn g" data-a="dlo" data-c="${E(code)}">إرسال لشركة التوصيل</button>`; };
  H.osend = async (f, form) => { const code = form.dataset.code; try { const r = await post('/adm/delivery/send', { code, ...f }); toast('تم الإرسال — رقم الوصل ' + r.ref); if (typeof ra === 'function') ra(); } catch (e) { toast(e.message); } };
})();
