/* admin3.js — لوحة مباشرة برسوم بيانية حية، جاهزية المتجر، تأكيد الحفظ، بحث وتصدير */
(function () {
  'use strict';
  const J = async (u, o) => { const r = await apiJ(u, o); if (r && r.error) throw new Error(r.error); return r; };
  const nf = n => Number(n || 0).toLocaleString('en-US');
  const C = { ink: '#2a2224', rose: '#d6567f', teal: '#2fa9a0', gold: '#e0a63a', violet: '#7b57d6', blue: '#3b82d6', red: '#d64545', mute: '#8a7d80', grid: '#eadfdf' };
  const STN = { 0: ['ملغى', C.red], 1: ['جديد', C.gold], 2: ['مؤكد', C.blue], 3: ['مشحون', C.violet], 4: ['في الطريق', C.teal], 5: ['مسلّم', '#3f9d5e'] };

  /* ---------- رسوم SVG صغيرة بلا مكتبات ---------- */
  function spark(vals, color) {
    const w = 110, h = 34, max = Math.max(...vals, 1), pts = vals.map((v, i) => [i * (w / Math.max(vals.length - 1, 1)), h - 3 - v / max * (h - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}L${w} ${h}L0 ${h}z" fill="${color}" opacity=".13"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="3" fill="${color}"/></svg>`;
  }
  function area(labels, vals, color, fmtv) {
    const W = 640, H = 210, L = 44, R = 12, T = 14, B = 28, max = Math.max(...vals, 1), x = i => L + i * ((W - L - R) / Math.max(vals.length - 1, 1)), y = v => T + (H - T - B) * (1 - v / max);
    const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="${C.grid}"/><text x="${L - 6}" y="${y(max * f) + 4}" text-anchor="end" font-size="10" fill="${C.mute}">${fmtv(max * f)}</text>`).join('');
    const xl = labels.map((l, i) => i % 2 == 0 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${C.mute}">${l}</text>` : '').join('');
    const dots = vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="9" fill="transparent"><title>${labels[i]}: ${fmtv(v)}</title></circle><circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#fff" stroke="${color}" stroke-width="2" pointer-events="none"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" style="width:100%;height:auto" dir="ltr">${grid}<path d="${d}L${x(vals.length - 1)} ${y(0)}L${x(0)} ${y(0)}z" fill="${color}" opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>${dots}${xl}</svg>`;
  }
  function bars(labels, vals, color, hi) {
    const W = 640, H = 150, L = 8, max = Math.max(...vals, 1), bw = (W - L * 2) / vals.length;
    return `<svg viewBox="0 0 ${W} ${H + 22}" role="img" style="width:100%;height:auto" dir="ltr">${vals.map((v, i) => { const h = Math.max(v / max * H, v ? 4 : 1); return `<rect x="${L + i * bw + 2}" y="${H - h}" width="${bw - 4}" height="${h}" rx="4" fill="${i === hi ? C.rose : color}" opacity="${i === hi ? 1 : .75}"><title>${labels[i]}: ${v}</title></rect>${i % 3 == 0 ? `<text x="${L + i * bw + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="10" fill="${C.mute}">${labels[i]}</text>` : ''}`; }).join('')}</svg>`;
  }
  function donut(parts, center, sub) {
    const tot = parts.reduce((s, p) => s + p.v, 0) || 1, r = 52, c = 2 * Math.PI * r; let off = 0;
    const arcs = parts.filter(p => p.v).map(p => { const len = p.v / tot * c, s = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${p.l}: ${p.v}</title></circle>`; off += len; return s; }).join('');
    return `<svg viewBox="0 0 140 140" width="140" height="140" role="img"><circle cx="70" cy="70" r="${r}" fill="none" stroke="${C.grid}" stroke-width="18"/>${arcs}<text x="70" y="68" text-anchor="middle" font-size="24" font-weight="800" fill="${C.ink}">${center}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="${C.mute}">${sub || ''}</text></svg>`;
  }
  const hbars = rows => { const max = Math.max(...rows.map(r => r[1]), 1); return rows.length ? rows.map(([l, v]) => `<div class="hb"><span>${esc(l)}</span><i style="--w:${v / max * 100}%"></i><b>${v}</b></div>`).join('') : '<p class="em">لا بيانات بعد</p>'; };
  const delta = (a, b) => { if (!b) return a ? '<em class="up">جديد</em>' : ''; const p = Math.round((a - b) / b * 100); return `<em class="${p >= 0 ? 'up' : 'dn'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</em>`; };
  const kpi = (l, v, sub, sp, color) => `<div class="kc"><small>${l}</small><b>${v}</b><div class="ks">${sub || ''}</div>${sp ? spark(sp, color) : ''}</div>`;

  /* ---------- اللوحة المباشرة ---------- */
  let liveT = 0;
  function liveHTML(d) {
    const D = d.days, td = D.at(-1), yd = D.at(-2) || { rev: 0, orders: 0, customers: 0 }, nowH = new Date(d.at + 3 * 3600e3).getUTCHours();
    const st = Object.entries(STN).map(([k, [l, c]]) => ({ l, c, v: d.status[k] || 0 })), live = st.filter(x => x.l !== 'ملغى').reduce((s, x) => s + x.v, 0);
    const pay = Object.entries(d.pay).map(([k, v]) => [k == 'cod' ? 'عند الاستلام' : k, v]);
    return `<div class="lvh"><span class="liv"><i></i>مباشر</span><small>آخر تحديث ${new Date(d.at).toLocaleTimeString('ar-IQ')} · يتجدد كل 15 ثانية</small></div>
    <div class="kg">${kpi('مبيعات اليوم', nf(td.rev) + ' د.ع', delta(td.rev, yd.rev) + ' عن أمس', D.map(x => x.rev), C.rose)}${kpi('طلبات اليوم', td.orders, delta(td.orders, yd.orders) + ' عن أمس', D.map(x => x.orders), C.teal)}${kpi('متوسط الطلب', nf(d.kpi.aov) + ' د.ع', 'آخر 14 يوماً')}${kpi('معدل التحويل', d.kpi.conv + '%', 'طلبات ÷ زيارات', D.map(x => x.visits), C.blue)}${kpi('نسبة الإلغاء', d.kpi.cancelRate + '%', 'آخر 14 يوماً')}${kpi('عملاء عائدون', d.kpi.repeat + '%', 'طلبوا أكثر من مرة')}${kpi('عملاء جدد اليوم', td.customers, delta(td.customers, yd.customers) + ' عن أمس', D.map(x => x.customers), C.violet)}</div>
    <div class="cd"><h3>المبيعات — آخر 14 يوماً</h3>${area(D.map(x => x.k), D.map(x => x.rev), C.rose, nf)}</div>
    <div class="cd"><h3>الطلبات والزيارات</h3>${area(D.map(x => x.k), D.map(x => x.orders), C.teal, v => Math.round(v))}<p class="em" style="margin-top:6px">الزيارات اليومية: ${D.map(x => x.visits).join(' · ')}</p></div>
    <div class="g2"><div class="cd"><h3>حالات الطلبات</h3><div class="dn2">${donut(st, live, 'نشِطة')}<div class="lg2">${st.map(x => `<div><i style="background:${x.c}"></i>${x.l} <b>${x.v}</b></div>`).join('')}</div></div></div>
    <div class="cd"><h3>ساعات الذروة اليوم</h3>${bars(d.hours.map((_, i) => i + ':00'), d.hours, C.gold, nowH)}</div></div>
    <div class="g2"><div class="cd"><h3>أكثر المدن طلباً</h3>${hbars(d.cities)}</div><div class="cd"><h3>طرق الدفع</h3>${hbars(pay)}</div></div>
    <div class="cd"><h3>آخر الطلبات</h3>${d.recent.length ? d.recent.map(o => `<button class="rcl" data-a="tab" data-c="or"><b>#${o.id}</b><span>${esc(o.name)}</span><span>${nf(o.total)} د.ع</span><em style="color:${(STN[o.s] || ['', C.mute])[1]}">${(STN[o.s] || ['—'])[0]}</em><small>${new Date(o.c).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</small></button>`).join('') : '<p class="em">لا طلبات بعد</p>'}</div>`;
  }
  async function loadLive() {
    const el = document.getElementById('lvb'); if (!el) { clearInterval(liveT); liveT = 0; return; }
    try { el.innerHTML = liveHTML(await J('/adm/live')); } catch (e) { if (!el.dataset.ok) el.innerHTML = '<p class="em">تعذر التحميل</p>'; return; }
    el.dataset.ok = 1;
  }
  TB.db = () => { setTimeout(loadLive, 0); clearInterval(liveT); liveT = setInterval(() => { if (!document.hidden) loadLive(); }, 15000); return '<div id="lvb"><p class="em">جارٍ التحميل…</p></div>'; };

  /* ---------- جاهزية المتجر ---------- */
  TB.hl = () => { setTimeout(loadHl, 0); return '<div id="hlb"><p class="em">جارٍ الفحص…</p></div>'; };
  async function loadHl() {
    const el = document.getElementById('hlb'); if (!el) return;
    let h; try { h = await J('/adm/health'); } catch (e) { el.innerHTML = '<p class="em">تعذر الفحص</p>'; return; }
    const hm = S.hm || {};
    const items = [
      ['أساسيات', 'اسم المتجر والعبارة التعريفية', !!(S.n && S.s), 's'], ['أساسيات', 'شريط إعلان أعلى المتجر', !!S.ann, 's'], ['أساسيات', 'وسائط الواجهة الرئيسية (صورة/فيديو)', !!hm.u, 'hr'],
      ['المتجر', 'منتج واحد على الأقل', h.products > 0, 'p'], ['المتجر', 'رسوم التوصيل وطرق الدفع', (+S.sf > 0) || ((S.pm || []).length > 1), 'pm'], ['المتجر', 'كود خصم فعّال', h.codes > 0, 'cp'],
      ['الربط', 'واتساب (تأكيد الطلبات والتسويق)', h.wa, 'ig'], ['الربط', 'تلجرام (وصل الطلب كصورة)', h.telegram, 'ig'], ['الربط', 'تسجيل الدخول بـ Google', h.google, 'ig'], ['الربط', 'رابط المتجر (للرسائل)', h.storeUrl, 'ig'], ['الربط', 'ذكاء اصطناعي لردود الدعم', h.ai, 'ig'],
      ['الدعم', 'حساب موظف دعم واحد على الأقل', h.staff > 0, 'sf'], ['الأمان', 'كلمة سر الأدمن مضبوطة على الخادم', h.adminPass, 'ig'], ['النمو', 'أول طلب من زبون', h.orders > 0, 'or'],
    ];
    const ok = items.filter(i => i[2]).length, pct = Math.round(ok / items.length * 100), col = pct >= 80 ? '#3f9d5e' : pct >= 50 ? C.gold : C.red;
    const groups = [...new Set(items.map(i => i[0]))];
    el.innerHTML = `<div class="cd hlt"><div>${donut([{ l: 'مكتمل', v: ok, c: col }, { l: 'متبقٍ', v: items.length - ok, c: C.grid }], pct + '%', 'جاهزية')}</div><div><h3>جاهزية المتجر</h3><p class="em">${ok} من ${items.length} خطوة مكتملة. أكمل البنود الناقصة لتحصل على أفضل أداء ومبيعات.</p><div class="pgb"><i style="width:${pct}%;background:${col}"></i></div></div></div>`
      + groups.map(g => `<div class="cd"><h3>${g}</h3>${items.filter(i => i[0] === g).map(i => `<div class="ck ${i[2] ? 'ok' : ''}"><span>${i[2] ? '✓' : '○'}</span><b>${i[1]}</b>${i[2] ? '' : `<button class="btn g" data-a="tab" data-c="${i[3]}">أكمل</button>`}</div>`).join('')}</div>`).join('');
  }

  /* ---------- تأكيد الإعدادات قبل الحفظ (قبل ← بعد) ---------- */
  const CONFIRM_GROUPS = ['settings', 'system', 'marketing', 'support'];
  const curGroup = () => { const g = (window.GROUPS || []).find(x => x[2].includes(at)); return g ? g[0] : ''; };
  const labelOf = el => { const l = el.closest('label'); let t = ''; if (l) t = [...l.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim(); return (t || el.placeholder || el.getAttribute('aria-label') || el.name || '').slice(0, 60); };
  const secret = el => /pass|pw|token|key|secret|WA_TOKEN|BOT_TOKEN/i.test(el.name + ' ' + el.type);
  function diffOf(f) {
    const out = [];
    for (const el of f.elements) {
      if (!el.name || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
      let a, b;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked === el.defaultChecked) continue; a = el.defaultChecked ? 'مفعّل' : 'معطّل'; b = el.checked ? 'مفعّل' : 'معطّل'; }
      else if (el.type === 'file') { if (!el.files || !el.files[0]) continue; a = '—'; b = el.files[0].name; }
      else if (el.tagName === 'SELECT') { const o = [...el.options].find(x => x.defaultSelected) || el.options[0]; if (!o || el.selectedIndex === [...el.options].indexOf(o)) continue; a = o.text; b = el.options[el.selectedIndex].text; }
      else { if (el.value === el.defaultValue) continue; a = el.defaultValue; b = el.value; }
      if (secret(el)) { a = a ? '••••' : '—'; b = '••••'; }
      out.push([labelOf(el) || el.name, String(a || '—').slice(0, 90), String(b || '—').slice(0, 90)]);
    }
    return out;
  }
  function confirmBox(title, rows) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'ov on cfv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = `<div class="acb cfb"><h3>${title}</h3><p class="em">راجع التغييرات قبل تطبيقها على المتجر لجميع الزوار:</p><div class="cfl">${rows.map(r => `<div class="cfr"><b>${esc(r[0])}</b><span class="o">${esc(r[1])}</span><span class="n">${esc(r[2])}</span></div>`).join('')}</div><div class="cfa"><button class="btn" data-k="y">تأكيد وحفظ</button><button class="btn g" data-k="n">رجوع</button></div></div>`;
      const done = v => { ov.remove(); res(v); };
      ov.addEventListener('click', e => { if (e.target === ov) done(false); const k = e.target.closest('[data-k]'); if (k) done(k.dataset.k === 'y'); });
      ov.addEventListener('keydown', e => { if (e.key === 'Escape') done(false); });
      document.body.appendChild(ov); const y = ov.querySelector('[data-k=y]'); y.focus();
    });
  }
  let dirty = false;
  document.addEventListener('submit', async e => {
    const f = e.target; if (!f || !f.closest || !f.closest('#ab') || f.id === 'lf') return;
    dirty = false;
    if (f.dataset.cf) { delete f.dataset.cf; return; }
    if (!CONFIRM_GROUPS.includes(curGroup())) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const rows = diffOf(f);
    if (!rows.length) return toast('لا توجد تغييرات للحفظ');
    if (!(await confirmBox(`تأكيد الحفظ (${rows.length} ${rows.length > 10 ? 'تغييراً' : 'تغييرات'})`, rows))) return;
    f.dataset.cf = 1; f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }, true);
  document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#ab form') && CONFIRM_GROUPS.includes(curGroup())) dirty = true; });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- بحث وتصدير ---------- */
  const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  function csv(name, head, rows) {
    const b = new Blob(['﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const tor = TB.or; TB.or = () => `<div class="tl2"><input type="search" id="orq" placeholder="ابحث: اسم، هاتف، كود الطلب…" value="${esc(window.orQ || '')}" aria-label="بحث في الطلبات"><button class="btn g" data-a="orsr">بحث</button><button class="btn g" data-a="csvo">تصدير CSV</button></div>` + tor();
  A.orsr = () => { window.orQ = (document.getElementById('orq') || {}).value || ''; ra(); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'orq') { e.preventDefault(); A.orsr(); } });
  A.csvo = async () => { try { const l = (await J('/orders')).orders || []; csv('orders.csv', ['id', 'code', 'date', 'name', 'phone', 'address', 'items', 'subtotal', 'discount', 'total', 'payment', 'status'], l.map(o => [o.id, o.code, new Date(o.d).toISOString(), o.name, o.ph, o.ad, o.items.map(i => i.q + 'x ' + i.n).join('; '), o.s, o.dsc, o.t, o.pay, ST_AR[o.st]])); toast('تم التصدير'); } catch (e) { toast('تعذر التصدير'); } };
  const tcu = TB.cu; TB.cu = () => `<div class="tl2"><button class="btn g" data-a="csvc">تصدير العملاء CSV</button></div>` + tcu();
  A.csvc = async () => { try { const l = (await J('/customers')).customers || []; csv('customers.csv', ['name', 'phone', 'city', 'orders', 'spent', 'last_order'], l.map(c => [c.name, c.ph || c.phone, c.city, c.orders || c.n, c.spent || c.sp, c.last ? new Date(c.last).toISOString() : ''])); toast('تم التصدير'); } catch (e) { toast('تعذر التصدير'); } };

  /* ---------- تعديل المجموعات ---------- */
  const G = window.GROUPS || [];
  const set = (id, items) => { const g = G.find(x => x[0] === id); if (g) g[2] = items; };
  set('home', ['db', 'st']); set('settings', ['hl', 's', 'l', 'hr', 'pm', 'lg', 'gd']);
  at = 'db';
})();
