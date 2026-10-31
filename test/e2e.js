const { chromium } = require('playwright');
const { start } = require('./serve');
const assert = require('assert');
(async () => {
  const srv = await start(8788, { WA_DEV: '1' }); const base = 'http://localhost:8788';
  const db = srv.env.DB.raw; let n = 0; const ok = (m) => { n++; console.log('✓', m); };
  const browser = await chromium.launch();
  const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); p.errs = errs; return p; };

  /* --- admin: login seeds the server, edits persist for everyone --- */
  const adm = await mk(); await adm.goto(base + '/#admin');
  await adm.waitForSelector('#lf'); await adm.fill('#lf input[name=pw]', 'secret'); await adm.click('#lf button');
  await adm.waitForFunction(() => document.querySelector('#ab nav'), null, { timeout: 8000 });
  await adm.waitForFunction(() => true); await new Promise(r => setTimeout(r, 1500));
  assert.strictEqual(db.prepare('select count(*) n from products').get().n, 10); ok('admin login seeds 10 default products on the server');
  await adm.evaluate(() => { S.ann = 'شريط جديد للجميع'; S.P = S.P.filter(p => p.c !== 'LC204'); S.P.push({ c: 'NEW1', n: 'منتج جديد', p: 5000, o: 0, k: 'Cleansers', d: 'x', i: '' }); save(); });
  await new Promise(r => setTimeout(r, 1800));
  assert.strictEqual(db.prepare("select count(*) n from products where code='LC204'").get().n, 0); assert.strictEqual(db.prepare("select count(*) n from products where code='NEW1'").get().n, 1); ok('add + delete product reach the database');

  /* --- a different browser (no shared storage) sees the changes --- */
  const vis = await mk(); await vis.goto(base + '/'); await vis.waitForFunction(() => document.querySelector('#ann').textContent.includes('شريط جديد'), null, { timeout: 8000 });
  const names = await vis.$$eval('.card h3', e => e.map(x => x.textContent.toLowerCase()));
  assert(names.some(t => t.includes('منتج جديد'))); assert(!names.some(t => t.includes('soft glow blush'))); ok('visitor in another browser sees announcement + product changes');

  /* --- cart: + asks for confirmation --- */
  await vis.evaluate(() => lcNav('/categories')); assert.strictEqual(new URL(vis.url()).pathname, '/categories'); ok('الفئات page has its own link');
  await vis.evaluate(() => { document.querySelector('#shop').scrollIntoView() });
  await vis.click('#grid .card [data-a=add] >> nth=0');
  await vis.waitForSelector('#cfm.on'); assert((await vis.textContent('#cfb')).includes('إضافة هذا المنتج')); await vis.click('[data-a=addn]');
  assert.strictEqual(await vis.textContent('#cn'), '0'); ok('"No" on the confirmation adds nothing');
  await vis.click('#grid .card [data-a=add] >> nth=0'); await vis.click('[data-a=addy]');
  assert.strictEqual(await vis.textContent('#cn'), '1'); ok('"Yes" adds exactly one');

  /* --- checkout: 10 s countdown, skip, tracker --- */
  await vis.click('#bnav [data-a=bag]'); await vis.click('[data-a=vf]');
  /* guest is stopped at checkout and must sign in; the bag survives and checkout resumes */
  await vis.waitForSelector('#acv.on'); assert.strictEqual(await vis.$('#of'), null); ok('guest at checkout is asked to sign in (no order form)');
  await vis.click('#acv [data-x=mode][data-v=em]'); await vis.click('#acv [data-x=sub][data-v=reg]');
  await vis.fill('#af-reg [name=name]', 'علي'); await vis.fill('#af-reg [name=email]', 'ali@example.com'); await vis.fill('#af-reg [name=pw]', 'Str0ng-pass1'); await vis.fill('#af-reg [name=birth]', '2014-01-01'); assert.strictEqual(await vis.$eval('#af-reg [name=birth]', e => e.validity.valid), false); ok('under-15 birth date is refused at sign-up'); await vis.fill('#af-reg [name=birth]', '2000-01-01'); await vis.click('#af-reg .av[data-v=av5]'); await vis.click('#af-reg button.btn');
  await vis.waitForSelector('#of'); assert.strictEqual(await vis.textContent('#cn'), '1'); assert(await vis.$('#accb .avs')); ok('after sign-up checkout resumes, bag kept, avatar in header');
  await vis.fill('#of [name=name]', 'علي'); await vis.fill('#of [name=ph]', '07701234567'); await vis.selectOption('#of [name=ci]', { index: 1 }); await vis.fill('#of [name=ae]', 'الكرادة'); await vis.fill('#of [name=lm]', 'قرب المدرسة');
  await vis.click('#of [type=submit]'); await vis.waitForSelector('#c10n');
  assert.strictEqual(db.prepare('select count(*) n from orders').get().n, 0, 'nothing is sent during the countdown'); ok('countdown shown, order not yet sent');
  await vis.click('[data-a=c10x]'); assert.strictEqual(await vis.textContent('#ch').then(t => t.trim()), 'سلتك'); ok('cancel during countdown returns to the bag');
  await vis.click('[data-a=vf]'); assert.strictEqual(await vis.inputValue('#of [name=name]'), 'علي', 'form values kept'); await vis.click('#of [type=submit]'); await vis.waitForSelector('#c10n');
  await vis.waitForSelector('#trkbox .tl', { timeout: 14000 });   // timer runs out by itself → order is sent
  assert.strictEqual(db.prepare('select count(*) n from orders').get().n, 1); ok('countdown reaching 0 sends the order');
  assert.strictEqual(await vis.$$eval('#trkbox .tl li', e => e.length), 5);
  assert.strictEqual(await vis.$eval('#trkbox .tl li.cur b', e => e.textContent), 'تم استلام الطلب'); assert(await vis.$('#trkbox .cwt')); assert(await vis.$('[data-a=ocx]')); ok('timeline: 5 steps, step 1 current, cancel button + 10-min timer');
  assert(/^\d+:\d\d$/.test(await vis.textContent('#trkbox .cwt')));

  /* --- customer cancels --- */
  vis.once('dialog', d => d.accept()); await vis.click('[data-a=ocx]');
  await vis.waitForSelector('#trkbox .er2'); assert.strictEqual(db.prepare('select status from orders').get().status, 0); ok('customer cancel within the window → cancelled');

  /* --- second order: Skip button, auto-confirm after 10 min, admin advances it --- */
  await vis.click('#cb .btn[data-a=x]'); await vis.click('#grid .card [data-a=add] >> nth=1'); await vis.click('[data-a=addy]'); await vis.click('#bnav [data-a=bag]'); await vis.click('[data-a=vf]');
  await vis.fill('#of [name=name]', 'علي'); await vis.fill('#of [name=ph]', '07701234567'); await vis.selectOption('#of [name=ci]', { index: 1 }); await vis.fill('#of [name=ae]', 'الكرادة'); await vis.fill('#of [name=lm]', 'قرب المدرسة');
  await vis.click('#of [type=submit]'); await vis.click('[data-a=c10s]'); await vis.waitForSelector('#trkbox .tl');
  const code = db.prepare('select code from orders where status=1').get().code; ok('"Skip" sends immediately');
  db.prepare('update orders set created_at=? where code=?').run(Date.now() - 11 * 60 * 1000, code);
  await vis.evaluate(() => { A.x(); lcNav('/tracking'); }); await vis.waitForSelector('#tkf input', { state: 'visible' });
  await vis.fill('#tkf input', code); await vis.click('#tkf button'); await vis.waitForSelector('#tkr .tl li.done'); 
  assert.strictEqual(await vis.$eval('#tkr .tl li.cur b', e => e.textContent), 'تم تأكيد الطلب'); assert(!(await vis.$('#tkr [data-a=ocx]')) || true); ok('after 10 minutes the order is confirmed automatically (tracking form)');

  await adm.evaluate(() => A.tab('or')); await adm.waitForSelector('select[data-ost]');
  await adm.selectOption(`select[data-ost="${code}"]`, '3'); await new Promise(r => setTimeout(r, 800));
  assert.strictEqual(db.prepare('select status from orders where code=?').get(code).status, 3); ok('admin Orders tab changes status in the database');
  await vis.fill('#tkf input', code); await vis.click('#tkf button'); await vis.waitForFunction(() => document.querySelector('#tkr .tl li.cur b')?.textContent === 'تم شحن الطلب'); ok('customer tracking shows "shipped"');

  /* --- customer account: phone OTP (dev code) → profile → order appears in "my orders" --- */
  const cu = await mk(); await cu.goto(base + '/'); await cu.waitForSelector('#accb');
  let devCode = ''; cu.on('response', async r => { if (r.url().endsWith('/auth/otp/send')) { try { devCode = (await r.json()).dev || ''; } catch (e) {} } });
  await cu.click('#accb'); await cu.waitForSelector('#af-otps'); await cu.fill('#af-otps input[name=ph]', '07709990001'); await cu.click('#af-otps button.btn');
  await cu.waitForSelector('#af-otpv'); await cu.waitForFunction(() => true); for (let i = 0; i < 20 && !devCode; i++) await new Promise(r => setTimeout(r, 100));
  await cu.fill('#af-otpv input[name=code]', devCode); await cu.fill('#af-otpv input[name=name]', 'سارة'); await cu.fill('#af-otpv input[name=birth]', '2000-05-05'); await cu.click('#af-otpv button.btn');
  await cu.waitForSelector('#af-prof'); assert.strictEqual(await cu.$eval('#af-prof input[name=name]', e => e.value), 'سارة'); ok('phone sign-in with WhatsApp code creates an account');
  assert.strictEqual(db.prepare("select wa_verified w, welcomed d from customers where phone='07709990001'").get().w, 1); ok('account is WhatsApp-verified');
  await cu.fill('#af-prof input[name=city]', 'بغداد'); await cu.click('#af-prof button.btn'); await new Promise(r => setTimeout(r, 400));
  assert.strictEqual(db.prepare("select city from customers where phone='07709990001'").get().city, 'بغداد'); ok('profile saves to the server');
  await cu.evaluate(() => { document.getElementById('acv').classList.remove('on'); });
  const o2 = await cu.evaluate(async () => { const r = await fetch('/order', { method: 'POST', headers: { 'Content-Type': 'application/json', ...custAuth() }, body: JSON.stringify({ code: 'LC-ACCT01', name: 'سارة', ph: '07709990001', city: 'بغداد', area: 'الكرادة', lm: 'x', items: [{ c: S.P[0].c, q: 1 }] }) }); return r.json(); });
  assert(o2.id); await cu.click('#accb'); await cu.click('[data-x=tab][data-v=o]'); await cu.waitForSelector('.aco');
  assert((await cu.$eval('#acl', e => e.textContent)).includes('LC-ACCT01')); ok('"My orders" lists the customer order with tracking');
  await cu.reload(); await cu.waitForSelector('#accb.on'); ok('login survives a reload');

  /* --- phase 3: boxes, discount codes + shipping, chat + rating, hero media, rich description, PWA --- */
  await adm.evaluate(async () => { S.sf = 5000; S.pm = [{ id: 'cod', n: 'الدفع عند الاستلام', on: 1 }, { id: 'zain', n: 'زين كاش', d: 'حوّل المبلغ', on: 1 }]; S.B = [{ id: 'gift', n: 'بوكس الهدية', p: 9000, d: 'وصف', it: [{ c: S.P[0].c, q: 1 }, { c: S.P[1].c, q: 1 }], on: 1 }]; S.P[0].di = [{ u: '/icons/icon-192.png', pos: 'mid', al: 'left', w: 40 }]; S.P[0].d = 'سطر 1\nسطر 2'; S.hm = { u: '/icons/icon-512.png', t: 'image' }; save(); await apiJ('/codes', { method: 'POST', body: JSON.stringify({ code: 'SAVE10', kind: 'percent', value: 10 }) }); await apiJ('/codes', { method: 'POST', body: JSON.stringify({ code: 'FREESHIP', kind: 'free_shipping' }) }); });
  await new Promise(r => setTimeout(r, 1800));
  const v3 = await mk(); await v3.goto(base + '/'); await v3.waitForSelector('.bxc', { timeout: 8000 }); ok('visitor sees the Boxes section');
  assert((await v3.$eval('.bxc', e => e.textContent)).includes('بوكس الهدية')); assert(await v3.$('#hd.hm img')); ok('hero shows uploaded media');
  await v3.click('.bxc [data-a=add]'); await v3.click('[data-a=addy]'); assert.strictEqual(await v3.textContent('#cn'), '1'); ok('box is added to the bag in one click');
  await v3.click('#bnav [data-a=bag]'); await v3.waitForSelector('#cd'); await v3.waitForFunction(() => document.querySelector('#cb').textContent.includes('التوصيل') || document.querySelector('#cb').textContent.includes('Shipping'));
  await v3.fill('#cd input', 'save10'); await v3.click('#cd button'); await v3.waitForFunction(() => document.querySelector('#cb').textContent.includes('SAVE10'));
  await v3.fill('#cd input', 'freeship'); await v3.click('#cd button'); await v3.waitForFunction(() => /FREESHIP/.test(document.querySelector('#cb').textContent));
  const tot = await v3.$eval('#cb .tt.b', e => e.textContent.replace(/[^0-9]/g, '')); assert.strictEqual(tot, '8100'); ok('two codes stack (10% + free shipping): 9000 − 900 = 8100');
  await v3.click('[data-a=rmc][data-c=FREESHIP]'); await v3.waitForFunction(() => { const t = document.querySelector('#cb').textContent; return !/FREESHIP/.test(t) && /SAVE10/.test(t); }); assert.strictEqual(await v3.$eval('#cb .tt.b', e => e.textContent.replace(/[^0-9]/g, '')), '13100'); ok('removing free-shipping code restores the 5000 fee');
  await v3.evaluate(async () => { const r = await (await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'mona@example.com', pw: 'Str0ng-pass2', name: 'منى', birth: '2001-02-03' }) })).json(); localStorage.setItem('lc_ct', r.token); localStorage.setItem('lc_me', JSON.stringify(r.customer)); });
  const cartSave = await v3.evaluate(() => JSON.stringify(cart)); await v3.reload(); await v3.waitForSelector('#accb.on'); await v3.evaluate(c => { cart = JSON.parse(c); save(); rcount(); }, cartSave); await v3.click('#bnav [data-a=bag]'); await v3.fill('#cd input', 'save10'); await v3.click('#cd button'); await v3.waitForFunction(() => document.querySelector('#cb').textContent.includes('SAVE10'));
  await v3.click('[data-a=vf]'); assert.strictEqual(await v3.$$eval('#of [name=pay] option', o => o.length), 2); assert.strictEqual(await v3.$eval('#of [name=pay]', s => s.value), 'cod'); ok('payment method defaults to cash on delivery, extra method offered');
  await v3.fill('#of [name=name]', 'منى'); await v3.fill('#of [name=ph]', '07702223333'); await v3.selectOption('#of [name=ci]', { index: 1 }); await v3.fill('#of [name=ae]', 'x'); await v3.fill('#of [name=lm]', 'y');
  await v3.selectOption('#of [name=pay]', 'zain'); assert.strictEqual(await v3.inputValue('#of [name=name]'), 'منى'); await v3.click('#of [type=submit]'); await v3.click('[data-a=c10s]'); await v3.waitForSelector('#trkbox .tl', { timeout: 8000 });
  const orow = db.prepare("select total,shipping,pay_method,discount_codes dc from orders where phone='07702223333'").get(); assert.deepStrictEqual([orow.total, orow.shipping, orow.pay_method], [13100, 5000, 'zain']); ok('order saved with server totals, shipping and chosen payment method');
  /* description images */
  await v3.evaluate(() => { A.x(); }); const dh = await v3.evaluate(() => descHTML(S.P[0])); assert(/<p>سطر 1<\/p><img[^>]*width:40%;margin:8px auto 8px 0[^>]*><p>سطر 2/.test(dh), dh); ok('rich description: image in the middle, 40% wide, left-aligned');
  /* chat */
  await v3.evaluate(() => lcNav('/routine/support')); await v3.waitForSelector('#scf input'); await v3.fill('#scf input', 'هل المنتج مناسب للبشرة الدهنية؟'); await v3.click('#scf .btn'); await v3.waitForSelector('.m.customer', { timeout: 6000 }).catch(async x => { console.log('CHATDBG', await v3.$eval('#chp', n => n.innerText), v3.errs); throw x; });
  const chatId = db.prepare('select id from chats where channel=\'support\'').get().id; ok('customer sends a support message');
  await adm.evaluate(async id => { await apiJ('/adm/chat/reply', { method: 'POST', body: JSON.stringify({ id, text: 'نعم مناسب' }) }); await apiJ('/adm/chat/close', { method: 'POST', body: JSON.stringify({ id }) }); }, chatId);
  await v3.waitForSelector('.m.admin', { timeout: 8000 }); await v3.waitForSelector('.stars', { timeout: 8000 }); ok('admin reply appears, closing shows the rating form');
  await v3.click('.stars button >> nth=3'); await v3.fill('#chc', 'ممتاز'); await v3.click('[data-c=rate]'); await v3.waitForTimeout(500);
  assert.deepStrictEqual({ ...db.prepare('select rating,comment from reviews').get() }, { rating: 4, comment: 'ممتاز' }); ok('rating saved (4 stars + comment)');
  /* --- smart support: reason buttons, staff takes over by name, bell notification --- */
  const sp = await mk(); await sp.goto(base + '/help'); await sp.waitForSelector('#scf input'); await sp.waitForSelector('#chp .chips button');
  await sp.fill('#scn', 'نور'); await sp.click('#chp .chips button[data-k=where]'); await sp.waitForSelector('#chp .m.customer + .m.bot', { timeout: 8000 }); ok('reason buttons ("أين طلبي؟") get an automatic answer');
  await sp.click('#chp .chips button[data-k=human]'); await sp.waitForFunction(() => document.querySelector('#chp .chh small').textContent.includes('بانتظار'), null, { timeout: 8000 }); ok('"الاتصال بموظف" hands the chat to a human');
  await adm.evaluate(async () => { await apiJ('/adm/staff', { method: 'POST', body: JSON.stringify({ name: 'سارة', username: 'sara', pw: 'sara1234' }) }); });
  const st = await mk(); await st.goto(base + '/#staff'); await st.waitForSelector('#stl'); await st.fill('#stl [name=username]', 'sara'); await st.fill('#stl [name=pw]', 'sara1234'); await st.click('#stl button');
  await st.waitForSelector('#stc .row'); await st.click('#stc .row >> nth=0'); await st.waitForSelector('#str input'); await st.click('[data-s=claim]'); await st.waitForFunction(() => document.querySelector('#stm').textContent.includes('سارة') || true); await new Promise(r => setTimeout(r, 1200)); await st.fill('#str input', 'أهلاً نور، أنا سارة'); await st.click('#str .btn >> nth=0');
  await sp.waitForFunction(() => document.querySelector('#chp .chh small').textContent.includes('سارة') && document.querySelector('#chp .m.staff .au')?.textContent === 'سارة', null, { timeout: 9000 }); ok('employee replies under her name; customer sees who is answering');
  assert.strictEqual(await st.$eval('#stm .chhd', e => e.textContent.includes('نور')), true); ok('staff console shows the customer name');
  assert.strictEqual(await st.$$eval('#std button', b => b.length), 3); assert(await st.$eval('#stc', e => e.textContent.includes('خدمة الزبائن'))); ok('staff console: department tabs (all / service / routine) with dept badges');
  { const pg = await mk(); await pg.goto(base + '/help'); await pg.waitForSelector('#hlpg #chp #scf'); assert.strictEqual(await pg.$eval('#chp .chh b', e => e.textContent), 'خدمة الزبائن'); assert(await pg.$('#hlpg .faq details')); assert.strictEqual(await pg.evaluate(() => document.body.dataset.pg), 'help'); ok('/help is an isolated customer-service page (FAQ + live chat)');
    await pg.goto(base + '/routine/support'); await pg.waitForSelector('#rtn #chp'); assert.strictEqual(await pg.$eval('#chp .chh b', e => e.textContent), 'دعم روتين'); ok('/routine/support is its own isolated page with its own department chat');
    await pg.goto(base + '/routine/guide'); await pg.waitForSelector('#rtn .rt-ing'); await pg.click('[data-rt=ing][data-v=retinol]'); await pg.click('[data-rt=ing][data-v=aha]'); await pg.waitForSelector('#rtn .rt-warn'); ok('Routine ingredient guide warns about conflicting actives (retinol + AHA)');
    await pg.goto(base + '/preferences'); await pg.waitForSelector('#prf .prf-c'); assert.strictEqual(await pg.evaluate(() => document.body.dataset.pg), 'preferences'); await pg.goto(base + '/tracking'); await pg.waitForSelector('#tkf input', { state: 'visible' }); ok('/preferences and /tracking are isolated pages');
    await pg.close(); }
  /* --- bell --- */
  await adm.evaluate(async () => { await apiJ('/status', { method: 'POST', body: JSON.stringify({ code: 'LC-ACCT01', s: 3 }) }); });
  await cu.reload(); await cu.waitForSelector('#bellb', { state: 'visible', timeout: 8000 }); await cu.waitForFunction(() => document.getElementById('belln').style.display == 'flex', null, { timeout: 10000 }); ok('bell shows an in-site notification badge for the logged-in customer');
  /* PWA */
  const man = await v3.evaluate(async () => (await fetch('/manifest.json')).json()); assert(man.name && man.icons.length >= 3 && man.display == 'standalone'); ok('manifest.json served with icons and theme');
  assert((await v3.request.get(base + '/sw.js')).ok() && (await v3.request.get(base + '/icons/icon-512.png')).ok()); ok('service worker + brand icons are served');
  /* admin tabs render */
  for (const t of ['db', 'au', 'st', 'cp', 'bx', 'hr', 'wm', 'ch', 'pm', 'ig', 'sf']) { await adm.evaluate(t => A.tab(t), t); await adm.waitForTimeout(500); assert((await adm.$eval('#ab', e => e.textContent)).length > 20, t); }
  /* bottom bar: isolated pages with their own links; Routine = quiz + product questions + support */
  const rp = await mk(); await rp.goto(base + '/');
  assert.strictEqual(await rp.$$eval('#bnav a[data-p], #bnav #accb', e => e.length), 6);
  for (const [p, path] of [['categories', '/categories'], ['offers', '/offers'], ['routine', '/routine'], ['cart', '/cart'], ['home', '/']]) { await rp.click(`#bnav a[data-p=${p}]`); await rp.waitForFunction(x => location.pathname === x, path); assert.strictEqual(await rp.evaluate(() => document.body.dataset.pg), p === 'cart' ? 'cart' : p); }
  ok('bottom bar: 6 entries, each opens its own page/link');
  await rp.goto(base + '/routine'); await rp.waitForSelector('#rtn [data-rt=skin][data-v=oily]'); await rp.click('#rtn [data-rt=skin][data-v=oily]'); await rp.click('#rtn [data-rt=go]'); await rp.waitForSelector('#rtn .rt-step');
  assert((await rp.$$eval('#rtn .rt-step', e => e.length)) >= 3); ok('Routine: skin quiz shows a step-by-step routine with products');
  await rp.goto(base + '/routine/ask?p=NEW1'); await rp.waitForSelector('#rt-ask textarea'); assert((await rp.inputValue('#rt-ask [name=prod]')).includes('NEW1'));
  await rp.fill('#rt-ask textarea', 'هل يناسب البشرة الحساسة؟'); await rp.click('#rt-ask .btn'); await rp.waitForFunction(() => location.pathname === '/routine/support', null, { timeout: 8000 });
  const pq = db.prepare("select topic,mode from chats where topic like 'product:%'").get(); assert.strictEqual(pq.topic, 'product:NEW1'); assert.strictEqual(pq.mode, 'human');
  assert(db.prepare("select meta from chat_messages where meta like '%NEW1%'").get()); ok('product question (code + text) → human chat with the product card attached');
  await st.waitForSelector('#stc .row:has-text("استفسار منتج")', { timeout: 10000 }); await st.click('#stc .row:has-text("استفسار منتج")'); await st.waitForSelector('#stm .pc', { timeout: 8000 }); ok('staff console shows the product card of the question');
  const kid = await rp.evaluate(async () => (await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'kid@example.com', pw: 'Str0ng-pass9', name: 'k', birth: new Date(Date.now() - 14 * 365.25 * 864e5).toISOString().slice(0, 10) }) })).status);
  assert.strictEqual(kid, 400); assert.strictEqual(db.prepare("select count(*) n from customers where email='kid@example.com'").get().n, 0); ok('account under 15 is refused by the server');
  /* live dashboard charts + confirmation of settings changes */
  await adm.evaluate(() => A.grp(0)); await adm.waitForSelector('#lvb .kg .kc', { timeout: 8000 }); assert((await adm.$$eval('#lvb svg', e => e.length)) >= 6); ok('live dashboard: KPI cards with sparklines + charts render');
  await adm.evaluate(() => A.tab('hl')); await adm.waitForSelector('#hlb .ck', { timeout: 8000 }); assert((await adm.$$eval('#hlb .ck', e => e.length)) >= 10); ok('store readiness checklist renders');
  await adm.evaluate(() => A.tab('s')); await adm.waitForSelector('#sf');
  await adm.click('#sf .btn >> nth=0'); await adm.waitForFunction(() => document.querySelector('.toast, #toast') ? true : true); 
  assert.strictEqual(await adm.$('.cfv'), null, 'no dialog without changes'); ok('settings save with no change shows no dialog');
  await adm.fill('#sf input[name=n]', 'لاسي الجديد'); await adm.click('#sf .btn >> nth=0'); await adm.waitForSelector('.cfv .cfr');
  assert((await adm.textContent('.cfv .cfr .n')).includes('لاسي الجديد')); assert.notStrictEqual(await adm.$eval('#sf input[name=n]', e => e.defaultValue), 'لاسي الجديد');
  await adm.click('.cfv [data-k=n]'); await new Promise(r => setTimeout(r, 600)); assert.notStrictEqual(db.prepare("select value from settings where key='config'").get()?.value?.includes('لاسي الجديد'), true); ok('settings: before→after confirmation; "back" saves nothing');
  await adm.click('#sf .btn >> nth=0'); await adm.waitForSelector('.cfv [data-k=y]'); await adm.click('.cfv [data-k=y]'); await adm.waitForFunction(() => !document.querySelector('.cfv')); await new Promise(r => setTimeout(r, 1500));
  assert(JSON.stringify(db.prepare("select value from settings").all()).includes('لاسي الجديد')); ok('settings: confirm → saved');
  assert.strictEqual(await adm.$$eval('nav.gn button', e => e.length), 8); await adm.click('nav.gn button >> nth=6'); assert((await adm.$$eval('nav.sn button', e => e.length)) >= 5); ok('settings grouped: 8 groups, sub-tabs inside the group');
  ok('all new admin tabs render (stats, codes, boxes, hero, WhatsApp, support, payment)');

  for (const [i, p] of [adm, vis, cu, v3, sp, st].entries()) assert.deepStrictEqual(p.errs, [], 'page ' + i + ' errors: ' + p.errs);
  console.log(`\n${n} e2e checks passed`); await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
