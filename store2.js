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

/* ---------- وصل الطلب كصورة → تلجرام ---------- */
(function () {
  const W = 900, PAD = 48, INK = '#2a2224', MUTE = '#7d7074', LINE = '#d8bfbf', GOLD = '#b8975a';
  const num = n => Number(n || 0).toLocaleString('en-US') + ' د.ع';
  const loadImg = u => new Promise(res => { if (!u) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; const t = setTimeout(() => res(null), 4000); i.onload = () => { clearTimeout(t); res(i) }; i.onerror = () => { clearTimeout(t); res(null) }; i.src = u; });
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  async function draw(o) {
    try { await document.fonts.ready } catch (e) {}
    const fam = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const items = o.items || [], H = 760 + items.length * 190 + ((o.dsc || 0) > 0 ? 50 : 0) + (o.sh ? 50 : 0);
    const imgs = await Promise.all(items.map(i => loadImg(((typeof pr == 'function' && pr(i.c)) || {}).i)));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    const f = (w, px) => c.font = `${w} ${px}px ${fam}`;
    const R = W - PAD, L = PAD; let y = 0;
    c.fillStyle = '#f8f1ee'; c.fillRect(0, 0, W, H);
    f(800, 46); c.fillStyle = INK; y = 100; c.fillText(`New Order #${o.id || ''} 🛍️`, R, y);
    f(600, 26); c.fillStyle = GOLD; y += 52; c.fillText('LACEY SKIN CARE · NEW PURCHASE', R, y);
    const hr = yy => { c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.moveTo(L, yy); c.lineTo(R, yy); c.stroke(); };
    y += 34; hr(y);
    y += 62; f(700, 32); c.fillStyle = INK; c.fillText('Order Code: ', R, y); const lw = c.measureText('Order Code: ').width;
    f(600, 30); c.fillStyle = '#4a3f42'; c.fillText(o.code, R - lw, y);
    y += 66; f(800, 38); c.fillStyle = INK; c.fillText(o.name || '', R - 70, y);
    y += 58; f(500, 36); c.fillText(o.ph || '', R - 70, y);
    y += 74; f(800, 36); c.fillText('عنوان التوصيل', R - 70, y);
    y += 52; f(500, 32); c.fillText(`${o.area || ''} — ${o.city || ''}`, R - 70, y);
    y += 46; f(400, 28); c.fillStyle = MUTE; c.fillText(`تفاصيل العنوان: ${o.lm || ''}`, R - 70, y);
    y += 40; hr(y);
    y += 64; f(800, 36); c.fillStyle = INK; c.fillText('Products Ordered 🧴', R, y); y += 30;
    items.forEach((it, k) => {
      const top = y + 14, sz = 150;
      rr(c, R - sz, top, sz, sz, 22); c.save(); c.clip();
      if (imgs[k]) { const im = imgs[k], s = Math.max(sz / im.width, sz / im.height); c.drawImage(im, R - sz + (sz - im.width * s) / 2, top + (sz - im.height * s) / 2, im.width * s, im.height * s) } else { c.fillStyle = '#e8d9d6'; c.fillRect(R - sz, top, sz, sz) }
      c.restore();
      const tx = R - sz - 26; f(800, 32); c.fillStyle = INK; c.fillText(String(it.n || '').slice(0, 34), tx, top + 38);
      f(400, 26); c.fillStyle = MUTE; c.fillText(`Code: ${it.c} · Quantity: ${it.q}${it.cc ? ' · 🎨 ' + it.cc : ''}`, tx, top + 84);
      f(800, 36); c.fillStyle = INK; c.fillText(num((it.p || 0) * (it.q || 1)), tx, top + 134);
      y += 190;
    });
    y += 6; hr(y);
    if ((o.dsc || 0) > 0) { y += 50; f(500, 28); c.fillStyle = MUTE; c.fillText('Discount', R, y); c.textAlign = 'left'; c.fillText('- ' + num(o.dsc), L, y); c.textAlign = 'right'; }
    if (o.sh) { y += 50; f(500, 28); c.fillStyle = MUTE; c.fillText('Shipping', R, y); c.textAlign = 'left'; c.fillText(num(o.sh), L, y); c.textAlign = 'right'; }
    y += 80; f(800, 44); c.fillStyle = INK; c.fillText('Total 💰', R, y); c.textAlign = 'left'; f(800, 50); c.fillText(num(o.t), L, y); c.textAlign = 'right';
    y += 56; const label = 'Pending Confirmation', pw = (f(600, 26), c.measureText(label).width) + 52;
    c.fillStyle = '#f5ddd2'; rr(c, R - pw, y - 34, pw, 56, 28); c.fill(); c.fillStyle = '#a14a24'; c.fillText(label, R - 26, y + 4);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }
  window.sendReceipt = async function (o) {
    try {
      const blob = await draw(o); if (!blob || blob.size > 1.9e6) return;
      await fetch((typeof API == 'function' && API()) + '/order/receipt', { method: 'POST', headers: { 'x-order': o.code, ...(typeof custAuth == 'function' ? custAuth() : {}) }, body: blob });
    } catch (e) {}
  };
})();
