/* store2.js — واجهة المتجر الإضافية: البوكسات، وسائط الواجهة، دردشة الدعم + التقييم، PWA */
(function () {
  'use strict';
  const T = (ar, en) => (typeof lang !== 'undefined' && lang == 'en') ? en : ar;
  const E = s => esc(s);
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const base = () => (typeof API == 'function' && API()) || location.origin;

  /* ---------- البوكسات ---------- */
  const shop = document.getElementById('shop');
  const sec = document.createElement('section'); sec.id = 'bxs'; sec.className = 'w bxs'; sec.style.display = 'none';
  if (shop) shop.parentNode.insertBefore(sec, shop); else document.querySelector('main').appendChild(sec);
  function drawBoxes() {
    const bs = (S.B || []).filter(b => b.on !== 0 && (b.it || []).length);
    sec.style.display = bs.length ? '' : 'none'; if (!bs.length) return;
    sec.innerHTML = `<h2>${T('البوكسات', 'Boxes')}</h2><div class="bxg">${bs.map(b => {
      const ps = b.it.map(x => ({ p: S.P.find(p => p.c == x.c), q: x.q })).filter(x => x.p), tot = ps.reduce((a, x) => a + x.p.p * x.q, 0);
      return `<div class="bxc"><div class="bxi">${b.i ? `<div class="bxm" style="background-image:url('${E(b.i)}')"></div>` : ''}<div class="bxt">${ps.slice(0, 4).map(x => `<div style="background-image:url('${E(x.p.i)}')" title="${E(x.p.n)}"></div>`).join('')}</div></div>
      <h3>${E(b.n)}</h3>${b.d ? `<p>${E(b.d)}</p>` : ''}<ul>${ps.map(x => `<li>${x.q}× ${E(x.p.n)}</li>`).join('')}</ul>
      <div class="bxp"><b>${fm(b.p)}</b>${tot > b.p ? `<s>${fm(tot)}</s><em>${T('وفّر', 'Save')} ${fm(tot - b.p)}</em>` : ''}</div>
      <button class="btn" data-a="add" data-c="BOX-${E(b.id)}">${T('أضف البوكس للسلة', 'Add box to bag')}</button></div>`; }).join('')}</div>`;
  }

  /* ---------- وسائط الواجهة ---------- */
  function heroMedia() {
    const hd = document.getElementById('hd'); if (!hd) return;
    const hm = S.hm, cur = hd.dataset.hm || '';
    if (hm && hm.u) {
      if (cur === hm.u) return; hd.dataset.hm = hm.u; hd.classList.add('hm');
      hd.innerHTML = hm.t == 'video' ? `<video src="${E(hm.u)}" autoplay muted loop playsinline preload="metadata"></video>` : `<img src="${E(hm.u)}" alt="">`;
    } else if (cur) { delete hd.dataset.hm; hd.classList.remove('hm'); hd.innerHTML = typeof flower == 'function' ? flower(260) : ''; }
  }
  const _render = window.render;
  window.render = function () { _render.apply(this, arguments); try { drawBoxes(); heroMedia(); } catch (e) { console.error(e); } };
  try { window.render(); } catch (e) {}

  /* ---------- دردشة الدعم ---------- */
  let tk = ls.get('lc_ch') || '', after = 0, openP = false, poll = 0, status = 'open', rated = false, rate = 0;
  const fab = document.createElement('button'); fab.id = 'chfab'; fab.setAttribute('aria-label', 'Support');
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 5h16v11H9l-5 4z"/></svg>'; document.body.appendChild(fab);
  const pn = document.createElement('div'); pn.id = 'chp'; document.body.appendChild(pn);
  const hdrs = () => ({ 'Content-Type': 'application/json', ...(typeof custAuth == 'function' ? custAuth() : {}) });
  async function chat(path, body) { const r = await fetch(base() + path, { method: body ? 'POST' : 'GET', headers: hdrs(), body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'error'); return j; }
  function shell(inner) { pn.innerHTML = `<div class="chh"><b>${T('خدمة الزبائن', 'Customer support')}</b><span><button data-c="end" title="${T('إنهاء المحادثة', 'End chat')}">✓</button><button data-c="x">×</button></span></div>${inner}`; }
  function draw(msgs) {
    const ml = `<div class="msgs" id="chmsgs">${msgs.length ? msgs.map(m => `<div class="m ${m.sender == 'admin' ? 'admin' : 'customer'}">${E(m.body)}</div>`).join('') : `<p class="em">${T('اكتب رسالتك وسنرد عليك بأقرب وقت', 'Write to us and we will reply soon')}</p>`}</div>`;
    if (status == 'closed' && !rated && msgs.length) {
      shell(`${ml}<div class="chr"><p>${T('كيف كانت تجربتك مع خدمة الزبائن؟', 'How was your support experience?')}</p><div class="stars">${[1, 2, 3, 4, 5].map(i => `<button data-c="star" data-v="${i}" class="${i <= rate ? 'on' : ''}">★</button>`).join('')}</div><textarea id="chc" rows="2" placeholder="${T('تعليق (اختياري)', 'Comment (optional)')}"></textarea><button class="btn" data-c="rate">${T('إرسال التقييم', 'Submit')}</button></div>`);
    } else if (status == 'closed' && rated) { shell(`<div class="chr"><p>${T('شكراً لتقييمك 🌸', 'Thanks for your feedback 🌸')}</p><button class="btn" data-c="new">${T('محادثة جديدة', 'New chat')}</button></div>`); return; }
    else shell(`${ml}<form id="scf"><input name="text" autocomplete="off" placeholder="${T('اكتب رسالة…', 'Type a message…')}" required><button class="btn">➤</button></form>`);
    const m = document.getElementById('chmsgs'); if (m) m.scrollTop = m.scrollHeight;
  }
  let all = [];
  async function refresh() {
    try { const j = await chat('/chat/poll?token=' + encodeURIComponent(tk) + '&after=' + after); if (!j.chat) { if (!pn.querySelector('.msgs,.chr')) draw([]); return; }
      status = j.status; rated = j.rated; const fresh = j.messages; if (fresh.length) { all = all.concat(fresh); after = all[all.length - 1].id; }
      if (fresh.length || !pn.querySelector('.msgs,.chr')) { const typing = pn.querySelector('#scf input'); const v = typing ? typing.value : ''; draw(all); const i = pn.querySelector('#scf input'); if (i && v) { i.value = v; i.focus(); } } } catch (e) {}
  }
  const open = () => { openP = true; pn.classList.add('on'); fab.classList.add('hide'); all = []; after = 0; draw([]); refresh(); clearInterval(poll); poll = setInterval(refresh, 4000); };
  const close = () => { openP = false; pn.classList.remove('on'); fab.classList.remove('hide'); clearInterval(poll); };
  fab.addEventListener('click', open);
  pn.addEventListener('click', async e => {
    const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
    if (c == 'x') close();
    else if (c == 'end') { if (!all.length) return close(); try { await chat('/chat/close', { token: tk }); status = 'closed'; draw(all); } catch (x) {} }
    else if (c == 'star') { rate = +b.dataset.v; draw(all); }
    else if (c == 'rate') { if (!rate) return toast(T('اختر عدد النجوم', 'Pick a star rating')); try { await chat('/chat/rate', { token: tk, rating: rate, comment: (document.getElementById('chc') || {}).value || '' }); rated = true; draw(all); } catch (x) { toast(x.message); } }
    else if (c == 'new') { tk = ''; ls.set('lc_ch', ''); all = []; after = 0; status = 'open'; rated = false; rate = 0; draw([]); }
  });
  pn.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation(); const inp = e.target.querySelector('input'), text = inp.value.trim(); if (!text) return; inp.value = '';
    const me = typeof custMe == 'function' ? custMe() : null;
    try { const j = await chat('/chat/send', { text, token: tk, name: (me && me.name) || '', ph: (me && me.ph) || '' }); if (j.token && j.token !== tk) { tk = j.token; ls.set('lc_ch', tk); } status = 'open'; refresh(); } catch (x) { toast(x.message); inp.value = text; }
  });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/localhost:\d+$/.test(location.host + '') ) navigator.serviceWorker.register('/sw.js').catch(() => {});
  else if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(() => {});
  let dip = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; const b = document.createElement('button'); b.id = 'inst'; b.textContent = T('📲 ثبّت التطبيق', '📲 Install app'); b.onclick = async () => { dip.prompt(); await dip.userChoice; b.remove(); dip = null; }; document.body.appendChild(b); });
  const tm = document.querySelector('meta[name=theme-color]'); if (tm && S.ac) tm.content = S.ac;
})();
