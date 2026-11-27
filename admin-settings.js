/* admin-settings.js — تطوير صفحة «الإعدادات»: أقسام قابلة للطي، بحث، شريط حفظ ثابت، تنبيه تغييرات غير محفوظة، فحص القيم */
(function () {
  'use strict';
  if (typeof TB === 'undefined' || !TB.s) return;
  const orig = TB.s, DROP = ['tk', 'tid', 'tp'];
  const META = { 'الهوية': ['🏷️', 'اسم المتجر والعملة واللغة', 'المعلومات الأساسية التي تظهر للزائر في كل صفحة.'], 'الشريط العلوي والواجهة': ['🖼️', 'الإعلان وواجهة الصفحة الرئيسية', 'شريط الإعلان وعنوان ونص وزر الواجهة.'], 'العروض والإعلانات': ['🏷', 'شريط العرض والتخفيضات', 'نص العرض وكود المنتج ومدة عرض الإعلانات.'], 'عناوين الأقسام': ['🗂️', 'أسماء الأقسام والعناوين', 'تغيير أسماء الأقسام وعناوين فقرات الصفحة.'], 'المحتوى': ['📝', 'التوصيل والآراء', 'نصوص معلومات التوصيل وآراء الزبائن.'], 'التواصل مع المتجر': ['💬', 'حسابات وأرقام التواصل', 'تظهر للزبون في صفحة التواصل.'], 'تلجرام والأمان': ['🔐', 'كلمة مرور اللوحة', 'إعدادات بوت تلجرام في «الأمان والنظام ← تلجرام».'], 'الإظهار': ['👁️', 'إظهار وإخفاء عناصر الصفحة', 'اختر ما يظهر للزائر.'], 'النسخ الاحتياطي والمزامنة': ['💾', 'نسخ احتياطي ومزامنة', 'تصدير واستيراد البيانات ورفعها للخادم.'] };
  /* تقسيم هندسي: كل قسم ينتمي لمجموعة واحدة؛ الأقسام غير المعرّفة تذهب إلى «أخرى» ولا تضيع */
  const GROUPS = [['المتجر', ['الهوية', 'التواصل مع المتجر', 'المحتوى']], ['الواجهة والعرض', ['الشريط العلوي والواجهة', 'العروض والإعلانات', 'عناوين الأقسام', 'الإظهار']], ['النظام والأمان', ['تلجرام والأمان', 'النسخ الاحتياطي والمزامنة']]];
  const gOf = t => { const i = GROUPS.findIndex(g => g[1].includes(t)); return i < 0 ? GROUPS.length : i; }, gName = i => i < GROUPS.length ? GROUPS[i][0] : 'أخرى';
  let cur = 0;
  TB.s = () => {
    const html = orig(), bi = html.indexOf('<button class="btn">حفظ الإعدادات');
    if (bi < 0) return html;
    const k = html.indexOf('<h3 class="full"'), head = html.slice(0, k), body = html.slice(k, bi), tail = html.slice(bi, html.lastIndexOf('</form>'));
    const clean = x => x.split('</label>').filter(c => !DROP.some(n => c.includes('name="' + n + '"'))).join('</label>');
    const parts = body.split('<h3 class="full"').filter(Boolean).map(p => { const m = /^[^>]*>([^<]*)<\/h3>([\s\S]*)$/.exec(p); return m ? [m[1], clean(m[2])] : null; }).filter(Boolean);
    const tools = tail.replace('<button class="btn">حفظ الإعدادات</button>', '').replace(/<button[^>]*data-a="tt"[^>]*>[^<]*<\/button>/, '');
    const all = parts.map(([t, h]) => [t, `<div class="stg-b fm">${h}</div>`]).concat([['النسخ الاحتياطي والمزامنة', `<div class="stg-b stg-tools">${tools}</div>`]]);
    all.sort((a, b) => gOf(a[0]) - gOf(b[0]));     // ترتيب مستقر حسب المجموعة، فتبقى فهارس القائمة والأقسام متطابقة
    if (cur >= all.length) cur = 0;
    let lastG = -1;
    const nav = all.map(([t], i) => { const m = META[t] || ['⚙️', t, '']; const g = gOf(t), hd = g !== lastG ? `<div class="sxg">${gName(g)}</div>` : ''; lastG = g; return hd + `<button type="button" class="sxn${i == cur ? ' on' : ''}" data-sx="${i}"><b>${t == 'تلجرام والأمان' ? 'الأمان' : t}</b><em class="stg-n"></em><i class="sxc">‹</i></button>`; }).join('');
    const panes = all.map(([t, h], i) => { const m = META[t] || ['⚙️', t, '']; return `<section class="sxp${i == cur ? ' on' : ''}" data-t="${t}"><header><button type="button" class="sxb" data-sx="back">› الإعدادات</button><h2>${t == 'تلجرام والأمان' ? 'الأمان' : t}</h2><p>${m[2]}</p></header>${h}</section>`; }).join('');
    return head + `<div class="sx-top"><span id="stgd">لا توجد تغييرات</span><button type="button" class="btn g" data-sx="discard">تجاهل</button><button class="btn">حفظ</button></div><div class="sx"><aside class="sx-nav"><div class="sxl">⚙ الإعدادات</div><input type="search" id="stgq" placeholder="ابحث في الإعدادات…" autocomplete="off">${nav}</aside><div class="sx-main">${panes}</div></div></form>`;
  };
  const enhance = () => {
    const f = document.getElementById('sf'); if (!f || f.dataset.eh || !f.querySelector('.sx')) return; f.dataset.eh = '1';
    const d = f.querySelector('#stgd'), mark = () => { f.classList.add('dirty'); d.textContent = 'توجد تغييرات غير محفوظة'; };
    f.addEventListener('input', e => { if (e.target.id !== 'stgq') mark(); }); f.addEventListener('change', e => { if (e.target.id !== 'stgq') mark(); });
    const hint = (k, fn, msg) => { const i = f.querySelector(`[name=${k}]`); if (!i) return; const chk = () => { const bad = i.value && i.value !== i.defaultValue && !fn(i.value.trim()); i.classList.toggle('bad', !!bad); i.title = bad ? msg : ''; }; i.addEventListener('input', chk); chk(); };
    hint('kWa', v => /^(\+?964|0)?7\d{9}$/.test(v.replace(/\s|-/g, '')), 'رقم عراقي مثل 07701234567');
    hint('pw', v => v.length >= 8, 'يفضّل 8 أحرف أو أكثر');
    const pw = f.querySelector('[name=pw]'); if (pw) { pw.type = 'password'; pw.autocomplete = 'new-password'; const b = document.createElement('button'); b.type = 'button'; b.className = 'stg-eye'; b.textContent = '👁'; b.onclick = () => { pw.type = pw.type == 'password' ? 'text' : 'password'; }; pw.parentNode.appendChild(b); }
    f.addEventListener('submit', e => { const b = f.querySelector('.bad'); if (b && !confirm('بعض القيم تبدو غير صحيحة. حفظ على أي حال؟')) { e.preventDefault(); e.stopImmediatePropagation(); const p = b.closest('.sxp'); if (p) go(+[...f.querySelectorAll('.sxp')].indexOf(p)); b.scrollIntoView({ block: 'center' }); } }, true);
    const go = i => { cur = i; f.querySelectorAll('.sxn').forEach((x, j) => x.classList.toggle('on', j == i)); f.querySelectorAll('.sxp').forEach((x, j) => x.classList.toggle('on', j == i)); };
    const q = f.querySelector('#stgq');
    q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); f.classList.toggle('sx-search', !!t); f.querySelectorAll('.sxp').forEach(s => { let any = !t; s.querySelectorAll('.stg-b > label, .stg-b > .ck, .stg-b > button').forEach(l => { const hit = !t || l.textContent.toLowerCase().includes(t); l.style.display = hit ? '' : 'none'; if (hit && t) any = true; }); s.style.display = t && !any ? 'none' : ''; }); });
    f.addEventListener('click', e => {
      const b = e.target.closest('[data-sx]'); if (!b) return;
      if (b.dataset.sx == 'discard') { if (f.classList.contains('dirty') && !confirm('تجاهل كل التغييرات غير المحفوظة؟')) return; f.reset(); f.classList.remove('dirty'); d.textContent = 'لا توجد تغييرات'; f.querySelectorAll('input.bad').forEach(x => x.classList.remove('bad')); }
      else if (b.dataset.sx == 'back') f.classList.remove('sx-open'); else { go(+b.dataset.sx); f.classList.add('sx-open'); }
    });
    f.querySelectorAll('.sxp').forEach((s, i) => { const n = s.querySelectorAll('.stg-b input:not([type=checkbox]),.stg-b textarea'), fl = [...n].filter(x => x.value).length, em = f.querySelectorAll('.sxn .stg-n')[i]; if (em && n.length) em.textContent = fl + '/' + n.length; });
  };
  if (typeof window.ra == 'function') { const _ra = window.ra; window.ra = function () { const r = _ra.apply(this, arguments); try { enhance(); } catch (e) {} return r; }; ra = window.ra; }
  window.addEventListener('beforeunload', e => { const f = document.getElementById('sf'); if (f && f.classList.contains('dirty')) { e.preventDefault(); e.returnValue = ''; } });
})();
