/* chat.js — دردشة الدعم لقسمين معزولين: «خدمة الزبائن» (/help) و«روتين» (/routine/support) */
(function () {
  'use strict';
  const T = (a, e) => (typeof lang !== 'undefined' && lang == 'en') ? e : a;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };
  const base = () => (typeof API == 'function' && API()) || '';
  const hdrs = () => ({ 'Content-Type': 'application/json', ...(typeof custAuth == 'function' ? custAuth() : {}) });
  async function api(path, body) { const r = await fetch(base() + path, { method: body ? 'POST' : 'GET', headers: hdrs(), body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'error'); return j; }
  const DEPT = {
    service: { ar: 'خدمة الزبائن', en: 'Customer service', hi: ['أهلاً بك في لاسي 🌸 كيف أستطيع مساعدتك؟ اختر السبب أدناه أو اكتب سؤالك.', 'Welcome to Lacey 🌸 How can we help? Pick a reason below or type your question.'], chips: [['where', 'أين طلبي؟'], ['modify', 'تعديل طلبي'], ['cancel', 'إلغاء طلبي'], ['human', 'الاتصال بموظف']] },
    routine: { ar: 'دعم روتين', en: 'Routine support', hi: ['أهلاً بك في «روتين» 🌸 مستشارتك للعناية بالبشرة. اختاري ما يناسبك أو اكتبي سؤالك.', 'Welcome to “Routine” 🌸 your skincare advisor. Pick an option or type your question.'], chips: [['skin', 'اعرفي نوع بشرتي'], ['plan', 'اقترحوا لي روتين'], ['ingr', 'دليل المكونات'], ['human', 'تحدثي مع مختصة']] },
  };
  const st = {}; const get = d => st[d] || (st[d] = { tk: ls.get(d == 'service' ? 'lc_ch' : 'lc_ch_' + d) || '', after: 0, all: [], status: 'open', rated: false, rate: 0, mode: 'bot', staff: '', seen: 0, typing: false, unread: 0, chat: 0 });
  const tkKey = d => d == 'service' ? 'lc_ch' : 'lc_ch_' + d;
  let cur = null, el = null, timer = 0, dotT = 0, sig = '';
  const prod = c => (typeof S !== 'undefined' && S.P || []).find(p => String(p.c).toUpperCase() == String(c).toUpperCase());

  const who = s => s.mode == 'human' ? (s.staff ? T('يرد عليك: ', 'Replying: ') + s.staff : T('بانتظار موظف…', 'Waiting for an agent…')) : T('المساعد الذكي', 'Smart assistant');
  const pcard = m => { const p = m.meta && m.meta.product; return p ? `<a class="pc" href="/routine/ask?p=${encodeURIComponent(p.c)}"><i style="${p.i ? `background-image:url('${E(p.i)}')` : ''}"></i><span><b>${E(p.n)}</b><small>${E(p.c)}</small></span></a>` : ''; };
  const tm = t => { try { const d = new Date(String(t).replace(' ', 'T') + (/Z|\+/.test(t) ? '' : 'Z')); return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function bubble(m, s) {
    if (m.sender == 'customer') { const ok = m.id <= s.seen; return `<div class="m customer">${pcard(m)}${E(m.body)}<span class="tk${ok ? ' sn' : ''}" title="${ok ? T('تمت القراءة', 'Seen') : T('أُرسلت', 'Sent')}">${tm(m.created_at || m.at)} ${ok ? '✓✓' : '✓'}</span></div>`; }
    return `<div class="m ${m.sender}"><small class="au">${E(m.sender == 'bot' ? (m.author || T('المساعد الذكي', 'Assistant')) : m.author || T('فريق الدعم', 'Support'))}</small>${E(m.body)}<span class="tk">${tm(m.created_at || m.at)}</span></div>`;
  }
  const lastChips = s => { const l = s.all[s.all.length - 1]; return l && l.sender == 'bot' && l.meta && l.meta.chips ? l.meta.chips : null; };
  function chipsHTML(s, d) {
    if (s.mode != 'bot' || s.status == 'closed') return '';
    const c = lastChips(s) || (s.all.length ? null : DEPT[d].chips.map(([k, t]) => ({ k, t })));
    return c ? `<div class="chips"><small>${d == 'routine' ? T('اختاري أو اكتبي سؤالك', 'Pick one or type a question') : T('لماذا تراسل الدعم؟', 'Why are you contacting support?')}</small>${c.map(x => `<button data-c="chip" data-k="${E(x.k)}" data-t="${E(x.t)}" ${x.h ? `data-h="${E(x.h)}"` : ''}>${E(x.t)}${x.h ? ' ↗' : ''}</button>`).join('')}</div>` : '';
  }
  function frame(d, s) {
    const me = typeof custMe == 'function' ? custMe() : null;
    el.dataset.dept = d;
    el.innerHTML = `<div class="chh"><div><b>${T(DEPT[d].ar, DEPT[d].en)}</b><small id="chw"></small></div><span><button data-c="end" title="${T('إنهاء المحادثة', 'End chat')}" aria-label="End">✓</button><button data-c="x" aria-label="Close">×</button></span></div>
      <div class="msgs" id="chmsgs" aria-live="polite"></div><div id="chtyp" class="typ" hidden>${T('الموظف يكتب…', 'Agent is typing…')}<i></i><i></i><i></i></div><div id="chcp"></div><div id="chrt"></div>
      <div id="chin">${!me && !s.all.length ? `<input id="scn" placeholder="${T('اسمك (اختياري)', 'Your name (optional)')}" value="${E(ls.get('lc_cn') || '')}">` : ''}
      <form id="scf"><button type="button" class="pk" data-c="pick" title="${T('مشاركة منتج', 'Share a product')}" aria-label="Share product">${window.lcIco ? lcIco('box') : '+'}</button><input name="text" autocomplete="off" maxlength="600" placeholder="${T('اكتب رسالة…', 'Type a message…')}" required><button class="btn" aria-label="Send">➤</button></form></div>`;
  }
  function paint(d) {
    const s = get(d); if (!el || cur != d) return;
    const closed = s.status == 'closed' && s.all.length;
    const m = el.querySelector('#chmsgs'); if (!m) return;
    const near = m.scrollHeight - m.scrollTop - m.clientHeight < 80, first = !m.children.length;
    m.innerHTML = s.all.length ? s.all.map(x => bubble(x, s)).join('') : `<div class="m bot"><small class="au">${T('المساعد الذكي', 'Assistant')}</small>${T(DEPT[d].hi[0], DEPT[d].hi[1])}</div>`;
    if (near || first) m.scrollTop = m.scrollHeight;
    el.querySelector('#chw').textContent = who(s);
    el.querySelector('#chtyp').hidden = !s.typing;
    el.querySelector('#chcp').innerHTML = chipsHTML(s, d);
    const rt = el.querySelector('#chrt'), fm = el.querySelector('#scf'), inp = el.querySelector('#chin');
    if (closed) {
      inp.hidden = true;
      rt.innerHTML = s.rated ? `<div class="chr"><p>${T('شكراً لتقييمك 🌸', 'Thanks for your feedback 🌸')}</p><button class="btn" data-c="new">${T('محادثة جديدة', 'New chat')}</button></div>`
        : `<div class="chr"><p>${T('كيف كانت تجربتك؟', 'How was your experience?')}</p><div class="stars">${[1, 2, 3, 4, 5].map(i => `<button data-c="star" data-v="${i}" class="${i <= s.rate ? 'on' : ''}" aria-label="${i}">★</button>`).join('')}</div><textarea id="chc" rows="2" placeholder="${T('تعليق (اختياري)', 'Comment (optional)')}"></textarea><div class="row2"><button class="btn" data-c="rate">${T('إرسال التقييم', 'Submit')}</button><button class="btn g" data-c="new">${T('محادثة جديدة', 'New chat')}</button></div></div>`;
    } else { rt.innerHTML = ''; inp.hidden = false; }
  }
  async function refresh(d, mark) {
    const s = get(d);
    try {
      const j = await api(`/chat/poll?dept=${d}&token=${encodeURIComponent(s.tk)}&after=${s.after}${mark ? '&mark=1' : ''}`);
      if (!j.chat) { if (cur == d) paint(d); return; }
      if (s.chat && s.chat != j.chat) { s.all = []; s.after = 0; s.rate = 0; return refresh(d, mark); }
      s.chat = j.chat; s.status = j.status; s.rated = j.rated; s.mode = j.mode || 'bot'; s.staff = j.staff || ''; s.seen = j.seen || 0; s.typing = !!j.typing; s.unread = j.unread || 0;
      if (j.messages.length) { s.all = s.all.concat(j.messages); s.after = s.all[s.all.length - 1].id; }
      const g = [j.messages.length, s.status, s.mode, s.staff, s.seen, s.typing, s.rated, s.rate].join('|');
      if (cur == d && g !== sig) { sig = g; paint(d); }
    } catch (e) {}
  }
  function start(d) { clearInterval(timer); timer = setInterval(() => refresh(d, true), 3500); }
  function mount(host, d) {
    if (!host) return; d = DEPT[d] ? d : 'service'; unmount(true);
    el = document.getElementById('chp'); if (!el) { el = document.createElement('div'); el.id = 'chp'; }
    host.appendChild(el); el.className = 'inl on'; cur = d; sig = ''; const s = get(d); s.all = []; s.after = 0; s.chat = 0;
    frame(d, s); paint(d); refresh(d, true); start(d); setDots(d, 0);
  }
  function unmount(quiet) { clearInterval(timer); if (el) { el.remove(); el = null; } cur = null; if (!quiet) dots(); }
  async function send(text, product, d, quick) {
    d = d || cur || 'service'; const s = get(d), me = typeof custMe == 'function' ? custMe() : null, ni = el && el.querySelector('#scn');
    const nm = (me && me.name) || (ni && ni.value.trim()) || ls.get('lc_cn') || ''; if (ni && ni.value.trim()) ls.set('lc_cn', ni.value.trim());
    const j = await api('/chat/send', { text, dept: d, quick: quick || '', token: s.tk, name: nm, ph: (me && me.ph) || '', product: product || '' });
    if (j.token && j.token !== s.tk) { s.tk = j.token; ls.set(tkKey(d), s.tk); }
    s.status = 'open'; s.rated = false; await refresh(d, true);
  }
  /* نقاط التنبيه: شريط روتين + أيقونة الدعم في الأعلى */
  function setDots(d, n) { const sel = d == 'routine' ? '#bnav [data-p=routine]' : '#hlp'; const a = document.querySelector(sel); if (a) { a.classList.toggle(d == 'routine' ? 'dot' : 'hn', n > 0); a.dataset.n = n > 0 ? String(n) : ''; } }
  async function dots() {
    if (!ls.get('lc_ch') && !ls.get('lc_ch_routine') && !(typeof custAuth == 'function' && custAuth().Authorization)) return;
    for (const d of Object.keys(DEPT)) { if (cur == d) continue; const s = get(d); try { const j = await api(`/chat/poll?dept=${d}&token=${encodeURIComponent(s.tk)}&after=${s.after || 0}`); setDots(d, j.chat ? j.unread || 0 : 0); } catch (e) {} }
  }
  clearInterval(dotT); dotT = setInterval(dots, 25000); setTimeout(dots, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { dots(); if (cur) refresh(cur, true); } });

  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#chp [data-c]'); if (!b || !cur) return; const c = b.dataset.c, d = cur, s = get(d);
    try {
      if (c == 'chip') { if (b.dataset.h) return typeof lcNav == 'function' && lcNav(b.dataset.h); await send(b.dataset.t, '', d, b.dataset.k); }
      else if (c == 'end') { if (!s.all.length) return typeof lcBack == 'function' ? history.back() : 0; await api('/chat/close', { token: s.tk, dept: d }); s.status = 'closed'; sig = ''; paint(d); }
      else if (c == 'star') { s.rate = +b.dataset.v; paint(d); }
      else if (c == 'rate') { if (!s.rate) return toast(T('اختر عدد النجوم', 'Pick a star rating')); await api('/chat/rate', { token: s.tk, dept: d, rating: s.rate, comment: (document.getElementById('chc') || {}).value || '' }); s.rated = true; paint(d); }
      else if (c == 'new') { s.all = []; s.after = 0; s.status = 'open'; s.rated = false; s.rate = 0; s.mode = 'bot'; s.staff = ''; s.chat = 0; sig = ''; frame(d, s); paint(d); }
      else if (c == 'pick') { const code = (prompt(T('اكتب كود المنتج (مثال LC101)', 'Enter the product code (e.g. LC101)')) || '').trim(); if (!code) return; const p = prod(code); if (!p) return toast(T('كود غير موجود', 'Code not found')); await send(T('أريد الاستفسار عن هذا المنتج', 'I have a question about this product'), p.c, d); }
    } catch (x) { toast(x.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target; if (f.id != 'scf' || !cur) return; e.preventDefault(); e.stopPropagation();
    const i = f.querySelector('input[name=text]'), text = i.value.trim(); if (!text) return; i.value = '';
    try { await send(text, '', cur); } catch (x) { toast(x.message); i.value = text; }
  }, true);
  window.LCChat = { mount, unmount, send, dots };
  window.chatMount = (h, d) => mount(h, d || 'routine'); window.chatUnmount = unmount; window.chatSend = (t, p, d) => send(t, p, d || cur || 'routine');
})();
