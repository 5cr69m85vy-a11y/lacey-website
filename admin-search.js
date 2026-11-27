/* admin-search.js — بحث عام في لوحة التحكم: التبويبات + المنتجات + الطلبات + العملاء (القراءة فقط، والمصادقة على السيرفر كالمعتاد) */
(function () {
  'use strict';
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  let cache = null, loading = null;
  const load = () => cache ? Promise.resolve(cache) : loading || (loading = Promise.all([apiJ('/orders').catch(() => ({})), apiJ('/customers').catch(() => ({}))]).then(([o, c]) => (cache = { o: o.orders || [], c: c.customers || [] })));
  const nav = window.navHTML;
  window.navHTML = () => `<div class="gsw"><input id="gsq" type="search" placeholder="بحث سريع: قسم، منتج، طلب، عميل…" autocomplete="off" aria-label="بحث"><div id="gsr" hidden></div></div>` + nav();
  const items = async q => {
    const n = norm(q), out = [];
    for (const g of ADMIN_REGISTRY.groups) for (const t of g[2]) if (norm(t[1]).includes(n) || norm(g[1]).includes(n)) out.push(['قسم', t[1] + ' — ' + g[1], t[0]]);
    (window.S && S.P || []).filter(p => norm(p.n + ' ' + p.c).includes(n)).slice(0, 5).forEach(p => out.push(['منتج', p.n + ' · ' + p.c, 'p']));
    if (n.length > 1) { const d = await load(); d.o.filter(o => norm([o.code, o.name, o.ph].join(' ')).includes(n)).slice(0, 5).forEach(o => out.push(['طلب', (o.code || o.id) + ' · ' + (o.name || ''), 'or']));
      d.c.filter(c => norm([c.name, c.ph || c.phone].join(' ')).includes(n)).slice(0, 5).forEach(c => out.push(['عميل', (c.name || '') + ' · ' + (c.ph || c.phone || ''), 'cu'])); }
    return out.slice(0, 14);
  };
  let seq = 0;
  document.addEventListener('input', async e => {
    if (!e.target || e.target.id !== 'gsq') return;
    const box = document.getElementById('gsr'), q = e.target.value.trim(), my = ++seq;
    if (!q) { box.hidden = true; return; }
    const r = await items(q); if (my !== seq) return;
    box.innerHTML = r.length ? r.map(x => `<button type="button" data-a="gsgo" data-c="${E(x[2])}"><small>${x[0]}</small>${E(x[1])}</button>`).join('') : '<p class="em">لا نتائج</p>';
    box.hidden = false;
  });
  A.gsgo = c => { at = c; ed = null; ea = null; es = null; ra(); };
  document.addEventListener('click', e => { const b = document.getElementById('gsr'); if (b && !e.target.closest('.gsw')) b.hidden = true; });
})();
