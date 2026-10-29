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

  /* ---------- دردشة الدعم: مساعد ذكي + موظفون ---------- */
  let tk = ls.get('lc_ch') || '', after = 0, openP = false, poll = 0, status = 'open', rated = false, rate = 0, mode = 'bot', staffN = '', all = [], seen = +ls.get('lc_chs') || 0;
  const REASONS = [['أين طلبي؟', 'track'], ['تغيير طلبي', 'edit'], ['تعديل طلبي', 'edit'], ['إلغاء طلبي', 'cancel'], ['الاتصال بموظف', 'human']];
  const fab = document.createElement('button'); fab.id = 'chfab'; fab.setAttribute('aria-label', 'Support');
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 5h16v11H9l-5 4z"/></svg><i id="chdot"></i>'; document.body.appendChild(fab);
  const pn = document.createElement('div'); pn.id = 'chp'; document.body.appendChild(pn);
  const hdrs = () => ({ 'Content-Type': 'application/json', ...(typeof custAuth == 'function' ? custAuth() : {}) });
  async function chat(path, body) { const r = await fetch(base() + path, { method: body ? 'POST' : 'GET', headers: hdrs(), body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'error'); return j; }
  const who = () => mode == 'human' ? (staffN ? T('يرد عليك: ', 'Replying: ') + staffN : T('بانتظار موظف…', 'Waiting for an agent…')) : T('المساعد الذكي', 'Smart assistant');
  const bubble = m => m.sender == 'customer' ? `<div class="m customer">${E(m.body)}</div>` : `<div class="m ${m.sender}"><small class="au">${E(m.sender == 'bot' ? (m.author || T('المساعد الذكي', 'Assistant')) : m.author || T('فريق الدعم', 'Support'))}</small>${E(m.body)}</div>`;
  function shell(inner) { pn.innerHTML = `<div class="chh"><div><b>${T('خدمة الزبائن', 'Customer support')}</b><small>${E(who())}</small></div><span><button data-c="end" title="${T('إنهاء المحادثة', 'End chat')}">✓</button><button data-c="x">×</button></span></div>${inner}`; }
  function draw() {
    const ml = `<div class="msgs" id="chmsgs">${all.length ? all.map(bubble).join('') : `<div class="m bot"><small class="au">${T('المساعد الذكي', 'Assistant')}</small>${T('أهلاً بك في لاسي 🌸 كيف أستطيع مساعدتك؟ اختر السبب أدناه أو اكتب سؤالك.', 'Welcome to Lacey 🌸 How can we help? Pick a reason below or type your question.')}</div>`}</div>`;
    const me = typeof custMe == 'function' ? custMe() : null;
    if (status == 'closed' && rated) { shell(`<div class="chr"><p>${T('شكراً لتقييمك 🌸', 'Thanks for your feedback 🌸')}</p><button class="btn" data-c="new">${T('محادثة جديدة', 'New chat')}</button></div>`); return; }
    if (status == 'closed' && all.length) {
      shell(`${ml}<div class="chr"><p>${T('كيف كانت تجربتك مع خدمة الزبائن؟', 'How was your support experience?')}</p><div class="stars">${[1, 2, 3, 4, 5].map(i => `<button data-c="star" data-v="${i}" class="${i <= rate ? 'on' : ''}">★</button>`).join('')}</div><textarea id="chc" rows="2" placeholder="${T('تعليق (اختياري)', 'Comment (optional)')}"></textarea><button class="btn" data-c="rate">${T('إرسال التقييم', 'Submit')}</button></div>`);
    } else {
      const chips = mode == 'bot' ? `<div class="chips"><small>${T('لماذا تراسل الدعم؟', 'Why are you contacting support?')}</small>${REASONS.map(([t, k]) => `<button data-c="reason" data-k="${k}" data-t="${E(t)}">${E(t)}</button>`).join('')}</div>` : '';
      const nm = !me && !all.length ? `<input id="scn" placeholder="${T('اسمك (اختياري)', 'Your name (optional)')}" value="${E(ls.get('lc_cn') || '')}">` : '';
      shell(`${ml}${chips}${nm}<form id="scf"><input name="text" autocomplete="off" placeholder="${T('اكتب رسالة…', 'Type a message…')}" required><button class="btn">➤</button></form>`);
    }
    const m = document.getElementById('chmsgs'); if (m) m.scrollTop = m.scrollHeight;
  }
  async function refresh() {
    try {
      const j = await chat('/chat/poll?token=' + encodeURIComponent(tk) + '&after=' + after);
      if (!j.chat) { if (!pn.querySelector('.msgs,.chr')) draw(); return; }
      status = j.status; rated = j.rated; mode = j.mode || 'bot'; staffN = j.staff || '';
      const fresh = j.messages; if (fresh.length) { all = all.concat(fresh); after = all[all.length - 1].id; }
      const typing = pn.querySelector('#scf input'), v = typing ? typing.value : '';
      if (fresh.length || !pn.querySelector('.msgs,.chr') || pn.dataset.m !== mode + staffN) { pn.dataset.m = mode + staffN; draw(); const i = pn.querySelector('#scf input'); if (i && v) { i.value = v; i.focus(); } }
      seen = after; ls.set('lc_chs', String(seen));
    } catch (e) {}
  }
  const open = () => { openP = true; pn.classList.add('on'); fab.classList.add('hide'); document.getElementById('chdot').style.display = 'none'; all = []; after = 0; draw(); refresh(); clearInterval(poll); poll = setInterval(refresh, 4000); };
  const close = () => { openP = false; pn.classList.remove('on'); fab.classList.remove('hide'); clearInterval(poll); poll = setInterval(dotCheck, 20000); };
  async function dotCheck() { if (openP || !tk && !(typeof custAuth == 'function' && custAuth().Authorization)) return; try { const j = await chat('/chat/poll?token=' + encodeURIComponent(tk) + '&after=' + seen); if (j.messages.some(m => m.sender != 'customer' && m.id > seen)) document.getElementById('chdot').style.display = 'block'; } catch (e) {} }
  poll = setInterval(dotCheck, 20000); setTimeout(dotCheck, 3000);
  fab.addEventListener('click', open);
  async function sendMsg(text, intent) {
    const me = typeof custMe == 'function' ? custMe() : null, nmI = pn.querySelector('#scn'), nm = (me && me.name) || (nmI && nmI.value.trim()) || ls.get('lc_cn') || '';
    if (nmI && nmI.value.trim()) ls.set('lc_cn', nmI.value.trim());
    try { const j = await chat('/chat/send', { text, intent: intent || '', token: tk, name: nm, ph: (me && me.ph) || '' }); if (j.token && j.token !== tk) { tk = j.token; ls.set('lc_ch', tk); } status = 'open'; await refresh(); } catch (x) { toast(x.message); }
  }
  pn.addEventListener('click', async e => {
    const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
    if (c == 'x') close();
    else if (c == 'reason') sendMsg(b.dataset.t, b.dataset.k);
    else if (c == 'end') { if (!all.length) return close(); try { await chat('/chat/close', { token: tk }); status = 'closed'; draw(); } catch (x) {} }
    else if (c == 'star') { rate = +b.dataset.v; draw(); }
    else if (c == 'rate') { if (!rate) return toast(T('اختر عدد النجوم', 'Pick a star rating')); try { await chat('/chat/rate', { token: tk, rating: rate, comment: (document.getElementById('chc') || {}).value || '' }); rated = true; draw(); } catch (x) { toast(x.message); } }
    else if (c == 'new') { tk = ''; ls.set('lc_ch', ''); all = []; after = 0; seen = 0; status = 'open'; rated = false; rate = 0; mode = 'bot'; staffN = ''; draw(); }
  });
  pn.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); const inp = e.target.querySelector('input'), text = inp.value.trim(); if (!text) return; inp.value = ''; sendMsg(text, ''); });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/localhost:\d+$/.test(location.host + '') ) navigator.serviceWorker.register('/sw.js').catch(() => {});
  else if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(() => {});
  let dip = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; const b = document.createElement('button'); b.id = 'inst'; b.textContent = T('📲 ثبّت التطبيق', '📲 Install app'); b.onclick = async () => { dip.prompt(); await dip.userChoice; b.remove(); dip = null; }; document.body.appendChild(b); });
  const tm = document.querySelector('meta[name=theme-color]'); if (tm && S.ac) tm.content = S.ac;
})();
