/* staff.js — لوحة الموظف (#staff): الرد على الزبائن باسم الموظف */
(function () {
  'use strict';
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let tok = '', name = '', cur = 0, timer = 0, chats = [];
  try { tok = sessionStorage.getItem('lc_st') || ''; name = sessionStorage.getItem('lc_sn') || ''; } catch (e) {}
  const base = () => (typeof API == 'function' && API()) || location.origin;
  const api = async (p, body) => { const r = await fetch(base() + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (r.status === 401 && tok && p !== '/staff/login') { out(); } if (!r.ok) throw new Error(j.error || 'error'); return j; };
  const ov = document.createElement('div'); ov.id = 'stf'; document.body.appendChild(ov);
  const out = () => { tok = ''; try { sessionStorage.removeItem('lc_st'); } catch (e) {} clearInterval(timer); draw(); };
  const dt = t => new Date(t).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
  function draw() {
    if (location.hash !== '#staff' && location.pathname !== '/support') { ov.classList.remove('on'); clearInterval(timer); return; }
    ov.classList.add('on');
    if (!tok) { ov.innerHTML = `<form id="stl" class="stc"><h2>دخول الموظفين</h2><input name="username" dir="ltr" placeholder="اسم المستخدم" required autocomplete="username"><input name="pw" type="password" placeholder="كلمة السر" required autocomplete="current-password"><button class="btn">دخول</button><small class="er" id="ster"></small></form>`; return; }
    ov.innerHTML = `<div class="sth"><b>مرحباً ${E(name)}</b><span><a href="#" data-s="home">المتجر</a> · <button data-s="out">خروج</button></span></div><div class="stg"><div id="stc"></div><div id="stm"><p class="em">اختر محادثة</p></div></div>`;
    load(); clearInterval(timer); timer = setInterval(() => { load(); if (cur) open(cur, true); }, 5000);
  }
  const pc = m => { let x = null; try { x = m.meta && JSON.parse(m.meta).product } catch (e) {} return x ? `<div class="pc"><i style="${x.i ? `background-image:url('${E(x.i)}')` : ''}"></i><span><b>${E(x.n)}</b><small>${E(x.c)} · ${Number(x.p || 0).toLocaleString('en-US')} د.ع</small></span></div>` : ''; };
  async function load() {
    try { chats = (await api('/adm/chats?channel=support')).chats; } catch (e) { return; }
    const el = document.getElementById('stc'); if (!el) return;
    el.innerHTML = chats.map(c => `<div class="row ${c.id == cur ? 'sel' : ''}" data-s="open" data-id="${c.id}"><span><b>${E(c.name || 'زائر')}</b> ${(c.topic || '').startsWith('product:') ? '<small>🛍 استفسار منتج ' + E(c.topic.slice(8)) + '</small>' : ''} ${c.status == 'open' ? '' : '<small>(منتهية)</small>'}<br><small>${c.mode == 'human' ? '👤 ' + E(c.staff || 'بانتظار موظف') : '🤖 المساعد'} — ${E(c.last.slice(0, 40))}</small></span>${c.status == 'open' && (c.lastby == 'customer' || c.mode == 'human' && !c.staff) ? '<i class="dot"></i>' : ''}</div>`).join('') || '<p class="em">لا محادثات</p>';
  }
  async function open(id, quiet) {
    cur = id; let j; try { j = await api('/adm/chat?id=' + id); } catch (e) { return; }
    const el = document.getElementById('stm'); if (!el) return;
    const typed = el.querySelector('input[name=text]'), keep = typed ? typed.value : '', focus = typed && document.activeElement === typed;
    const c = j.chat, mine = c.staff == name;
    el.innerHTML = `<div class="chhd"><b>${E(c.name || 'زائر')}</b> ${E(c.ph || '')} · ${c.mode == 'human' ? '👤 ' + E(c.staff || 'بانتظار موظف') : '🤖 المساعد'} ${c.status == 'closed' ? '(منتهية)' : ''}</div>
      <div class="msgs">${j.messages.map(m => `<div class="m ${m.sender}"><small class="au">${E(m.author || '')}</small>${pc(m)}${E(m.body)}<small>${dt(m.at)}</small></div>`).join('')}</div>
      ${c.status == 'open' ? `<form id="str" class="fm" style="grid-template-columns:1fr auto auto auto"><input name="text" placeholder="${mine || !c.staff ? 'اكتب رداً باسمك…' : 'المحادثة بيد ' + E(c.staff)}" autocomplete="off"><button class="btn">إرسال</button>${mine ? '' : '<button type="button" class="btn g" data-s="claim">استلام</button>'}<button type="button" class="btn g" data-s="close">إنهاء</button></form>` : ''}`;
    const ms = el.querySelector('.msgs'); ms.scrollTop = ms.scrollHeight;
    const i = el.querySelector('input[name=text]'); if (i && keep) { i.value = keep; if (focus) i.focus(); }
  }
  ov.addEventListener('click', async e => {
    const b = e.target.closest('[data-s]'); if (!b) return; const s = b.dataset.s;
    if (s == 'out') { await api('/staff/me').catch(() => {}); out(); }
    else if (s == 'home') { e.preventDefault(); if (location.pathname === '/support') location.href = '/'; else location.hash = ''; }
    else if (s == 'open') { cur = +b.dataset.id; load(); open(cur); }
    else if (s == 'claim') { try { await api('/adm/chat/claim', { id: cur, force: true }); open(cur); load(); } catch (x) { toast(x.message); } }
    else if (s == 'close') { await api('/adm/chat/close', { id: cur }); open(cur); load(); }
  });
  ov.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation();
    if (e.target.id == 'stl') { const v = Object.fromEntries(new FormData(e.target)); try { const j = await api('/staff/login', v); tok = j.token; name = j.name; try { sessionStorage.setItem('lc_st', tok); sessionStorage.setItem('lc_sn', name); } catch (x) {} draw(); } catch (x) { const el = document.getElementById('ster'); if (el) el.textContent = x.message; } }
    else if (e.target.id == 'str') { const i = e.target.querySelector('input'), t = i.value.trim(); if (!t) return; i.value = ''; try { await api('/adm/chat/reply', { id: cur, text: t }); } catch (x) { toast(x.message); i.value = t; } open(cur); load(); }
  });
  addEventListener('hashchange', draw); draw();
})();
