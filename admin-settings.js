/* admin-settings.js — تطوير صفحة «الإعدادات»: أقسام قابلة للطي، بحث، شريط حفظ ثابت، تنبيه تغييرات غير محفوظة، فحص القيم */
(function () {
  'use strict';
  if (typeof TB === 'undefined' || !TB.s) return;
  const orig = TB.s, ICON = { 'الهوية': '🏷️', 'الشريط العلوي والواجهة': '🖼️', 'العروض والإعلانات': '🏷', 'عناوين الأقسام': '🗂️', 'المحتوى': '📝', 'التواصل مع المتجر': '💬', 'تلجرام والأمان': '🔐', 'الإظهار': '👁️' };
  const SECRET = ['tk', 'pw'];
  TB.s = () => {
    const html = orig(), bi = html.indexOf('<button class="btn">حفظ الإعدادات');
    if (bi < 0) return html;
    const head = html.slice(0, html.indexOf('<h3 class="full"')), body = html.slice(html.indexOf('<h3 class="full"'), bi), tail = html.slice(bi, html.lastIndexOf('</form>'));
    const parts = body.split('<h3 class="full"').filter(Boolean).map(p => {
      const m = /^[^>]*>([^<]*)<\/h3>([\s\S]*)$/.exec(p); return m ? [m[1], m[2]] : null;
    }).filter(Boolean);
    const cards = parts.map(([t, inner], i) => `<details class="stg" data-t="${t}" ${i < 2 ? 'open' : ''}><summary><span>${ICON[t] || '⚙️'}</span>${t}<em class="stg-n"></em></summary><div class="stg-b fm">${inner}</div></details>`).join('');
    const tools = `<details class="stg" data-t="النسخ الاحتياطي والمزامنة"><summary><span>💾</span>النسخ الاحتياطي والمزامنة</summary><div class="stg-b stg-tools">${tail.replace('<button class="btn">حفظ الإعدادات</button>', '')}</div></details>`;
    return head + `<div class="stg-top"><input type="search" id="stgq" placeholder="ابحث في الإعدادات…" autocomplete="off"><button type="button" class="stg-all" data-stg="all">فتح/طي الكل</button></div>` + cards + `<div class="stg-bar"><span id="stgd">لا توجد تغييرات</span><button class="btn">حفظ الإعدادات</button></div>` + tools + `</form>`;
  };
  const enhance = () => {
    const f = document.getElementById('sf'); if (!f || f.dataset.eh || !f.querySelector('.stg')) return; f.dataset.eh = '1';
    const d = document.getElementById('stgd'), mark = () => { f.classList.add('dirty'); d.textContent = 'توجد تغييرات غير محفوظة'; };
    f.addEventListener('input', e => { if (e.target.id !== 'stgq') mark(); }); f.addEventListener('change', e => { if (e.target.id !== 'stgq') mark(); });
    SECRET.forEach(k => { const i = f.querySelector(`[name=${k}]`); if (i) { i.type = 'password'; i.autocomplete = 'new-password'; const b = document.createElement('button'); b.type = 'button'; b.className = 'stg-eye'; b.textContent = '👁'; b.onclick = () => { i.type = i.type == 'password' ? 'text' : 'password'; }; i.parentNode.appendChild(b); } });
    const hint = (k, fn, msg) => { const i = f.querySelector(`[name=${k}]`); if (!i) return; const chk = () => { const bad = i.value && i.value !== i.defaultValue && !fn(i.value.trim()); i.classList.toggle('bad', !!bad); i.title = bad ? msg : ''; }; i.addEventListener('input', chk); chk(); };
    hint('kWa', v => /^(\+?964|0)?7\d{9}$/.test(v.replace(/\s|-/g, '')), 'رقم عراقي مثل 07701234567');
    hint('tid', v => /^-?\d+$/.test(v), 'Chat ID أرقام فقط');
    hint('pw', v => v.length >= 8, 'يفضّل 8 أحرف أو أكثر');
    hint('tp', v => /^https:\/\//.test(v), 'يبدأ بـ https://');
    f.addEventListener('submit', e => { if (f.querySelector('.bad')) { const b = f.querySelector('.bad'); if (!confirm('بعض القيم تبدو غير صحيحة. حفظ على أي حال؟')) { e.preventDefault(); e.stopImmediatePropagation(); b.scrollIntoView({ block: 'center' }); } } }, true);
    const q = f.querySelector('#stgq');
    q.addEventListener('input', () => { const t = q.value.trim().toLowerCase(); f.querySelectorAll('details.stg').forEach(s => { let any = !t; s.querySelectorAll('.stg-b > label, .stg-b > .ck, .stg-b > button').forEach(l => { const hit = !t || l.textContent.toLowerCase().includes(t) || (l.querySelector('input,textarea') || {}).name == t; l.style.display = hit ? '' : 'none'; if (hit && t) any = true; }); s.style.display = any || (s.dataset.t || '').includes(t) ? '' : 'none'; if (t && any) s.open = true; }); });
    f.addEventListener('click', e => { if (e.target.dataset.stg == 'all') { const ds = [...f.querySelectorAll('details.stg')], o = ds.some(x => !x.open); ds.forEach(x => x.open = o); } });
    f.querySelectorAll('details.stg').forEach(s => { const n = s.querySelectorAll('.stg-b input:not([type=checkbox]),.stg-b textarea').length, fl = [...s.querySelectorAll('.stg-b input:not([type=checkbox]),.stg-b textarea')].filter(x => x.value).length, em = s.querySelector('.stg-n'); if (em && n) em.textContent = fl + '/' + n; });
  };
  if (typeof window.ra == 'function') { const _ra = window.ra; window.ra = function () { const r = _ra.apply(this, arguments); try { enhance(); } catch (e) {} return r; }; ra = window.ra; }
  window.addEventListener('beforeunload', e => { const f = document.getElementById('sf'); if (f && f.classList.contains('dirty')) { e.preventDefault(); e.returnValue = ''; } });
})();
