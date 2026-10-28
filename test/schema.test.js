const assert = require('assert'); const { makeDB } = require('./d1shim');
(async () => {
  const W = (await import('../worker/worker.js')).default;
  const env = { DB: makeDB(true), ADMIN_PASS: 's', ASSETS: { fetch: async () => new Response('a') } };
  const r = await W.fetch(new Request('https://x.dev/catalog'), env, {}); assert.strictEqual(r.status, 200);
  const t = env.DB.raw.prepare("select name from sqlite_master where type='table'").all().map(x => x.name);
  for (const n of ['products', 'boxes', 'customers', 'orders', 'discount_codes', 'chats', 'reviews', 'receipts', 'notifications', 'campaigns', 'media_chunks']) assert(t.includes(n), n);
  assert(env.DB.raw.prepare("select count(*) n from pragma_table_info('customers') where name='pw_hash'").get().n === 1);
  assert.strictEqual(env.DB.raw.prepare('select value from counters').get().value, 1000);
  console.log('✓ blank database builds its own schema on first request');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
