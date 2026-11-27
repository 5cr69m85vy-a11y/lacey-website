/* Route integrity: every literal route handled by the Worker must be listed in wrangler.jsonc run_worker_first,
   otherwise the static-assets layer answers first and the route silently 404s in production. */
const fs = require('fs'), assert = require('assert');
const cfg = fs.readFileSync(__dirname + '/../wrangler.jsonc', 'utf8');
const rwf = [...cfg.match(/run_worker_first": \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
const src = fs.readdirSync(__dirname + '/../worker').filter(f => f.endsWith('.js')).map(f => fs.readFileSync(__dirname + '/../worker/' + f, 'utf8')).join('\n');
const routes = new Set();
for (const m of src.matchAll(/\bp\s*===\s*'(\/[^']*)'/g)) routes.add(m[1]);
for (const m of src.matchAll(/\bp\.startsWith\('(\/[^']*)'\)/g)) routes.add(m[1] + '*');
const covered = r => rwf.some(g => g === r || (g.endsWith('/*') && (r.startsWith(g.slice(0, -1)) || r === g.slice(0, -2))) || (r.endsWith('*') && g.endsWith('/*') && g.slice(0, -1).startsWith(r.slice(0, -1))));
const missing = [...routes].filter(r => !covered(r));
assert.deepStrictEqual(missing, [], 'routes handled by the Worker but absent from run_worker_first: ' + missing.join(', '));
/* every SPA page route must be worker-first too */
const pages = (src.match(/PAGE_ROUTES = \/\^\\\/\(([^)]*)\)/) || [])[1].split('|');
const nopage = pages.filter(p => !rwf.includes('/' + p) && !rwf.includes('/' + p + '/*'));
assert.deepStrictEqual(nopage, [], 'SPA pages missing from run_worker_first: ' + nopage.join(', '));
console.log('✓ route integrity (' + routes.size + ' worker routes, ' + pages.length + ' pages)');
/* offline shell integrity: every script/stylesheet loaded by index.html exists and is precached by the service worker */
const idx = fs.readFileSync(__dirname + '/../index.html', 'utf8'), sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
for (const f of [...idx.matchAll(/<script[^>]*src="(\/[^"?]+)/g), ...idx.matchAll(/href="(\/[^"?]+\.css)/g)].map(m => m[1])) {
  assert(fs.existsSync(__dirname + '/..' + f), 'missing asset ' + f);
  assert(sw.includes("'" + f + "'"), 'asset not in service-worker SHELL: ' + f);
}
console.log('✓ service-worker shell covers every script and stylesheet');
/* CSP guard: script-src has no 'unsafe-inline', so no inline <script> blocks or inline event-handler attributes may exist */
const hdr = fs.readFileSync(__dirname + '/../_headers', 'utf8');
assert(/script-src 'self'[^;]*;/.test(hdr) && !/script-src[^;]*unsafe-inline/.test(hdr), 'CSP script-src must stay strict');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(idx), 'inline <script> in index.html would be blocked by CSP');
for (const f of fs.readdirSync(__dirname + '/..').filter(f => /\.(js|html)$/.test(f))) {
  const t = fs.readFileSync(__dirname + '/../' + f, 'utf8');
  assert(!/\son(click|load|error|change|input|submit|focus|blur|keyup|keydown)=["'\\]/i.test(t), 'inline event-handler attribute in ' + f + ' (blocked by CSP)');
}
console.log('✓ CSP guard: no inline scripts or event-handler attributes');
