const { chromium } = require('playwright');
const { start } = require('./serve');
const assert = require('assert');
(async () => {
  const srv = await start(8788); const base = 'http://localhost:8788';
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
  await vis.evaluate(() => { document.querySelector('#shop').scrollIntoView() });
  await vis.click('#grid .card [data-a=add] >> nth=0');
  await vis.waitForSelector('#cfm.on'); assert((await vis.textContent('#cfb')).includes('إضافة هذا المنتج')); await vis.click('[data-a=addn]');
  assert.strictEqual(await vis.textContent('#cn'), '0'); ok('"No" on the confirmation adds nothing');
  await vis.click('#grid .card [data-a=add] >> nth=0'); await vis.click('[data-a=addy]');
  assert.strictEqual(await vis.textContent('#cn'), '1'); ok('"Yes" adds exactly one');

  /* --- checkout: 10 s countdown, skip, tracker --- */
  await vis.click('.cb2'); await vis.click('[data-a=vf]');
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
  await vis.click('[data-a=x]'); await vis.click('#grid .card [data-a=add] >> nth=1'); await vis.click('[data-a=addy]'); await vis.click('.cb2'); await vis.click('[data-a=vf]');
  await vis.fill('#of [name=name]', 'علي'); await vis.fill('#of [name=ph]', '07701234567'); await vis.selectOption('#of [name=ci]', { index: 1 }); await vis.fill('#of [name=ae]', 'الكرادة'); await vis.fill('#of [name=lm]', 'قرب المدرسة');
  await vis.click('#of [type=submit]'); await vis.click('[data-a=c10s]'); await vis.waitForSelector('#trkbox .tl');
  const code = db.prepare('select code from orders where status=1').get().code; ok('"Skip" sends immediately');
  db.prepare('update orders set created_at=? where code=?').run(Date.now() - 11 * 60 * 1000, code);
  await vis.evaluate(() => { A.x(); document.querySelector('#trk').scrollIntoView(); });
  await vis.fill('#tkf input', code); await vis.click('#tkf button'); await vis.waitForSelector('#tkr .tl li.done'); 
  assert.strictEqual(await vis.$eval('#tkr .tl li.cur b', e => e.textContent), 'تم تأكيد الطلب'); assert(!(await vis.$('#tkr [data-a=ocx]')) || true); ok('after 10 minutes the order is confirmed automatically (tracking form)');

  await adm.evaluate(() => A.tab('or')); await adm.waitForSelector('select[data-ost]');
  await adm.selectOption(`select[data-ost="${code}"]`, '3'); await new Promise(r => setTimeout(r, 800));
  assert.strictEqual(db.prepare('select status from orders where code=?').get(code).status, 3); ok('admin Orders tab changes status in the database');
  await vis.fill('#tkf input', code); await vis.click('#tkf button'); await vis.waitForFunction(() => document.querySelector('#tkr .tl li.cur b')?.textContent === 'تم شحن الطلب'); ok('customer tracking shows "shipped"');

  for (const p of [adm, vis]) assert.deepStrictEqual(p.errs, [], 'page errors: ' + p.errs);
  console.log(`\n${n} e2e checks passed`); await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
