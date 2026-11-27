// حارس سجل لوحة التحكم: لا تكرار، وكل تبويب له شاشة، وكل ملف مسجّل في الكاش
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const w = {}; vm.runInNewContext(fs.readFileSync(__dirname + '/../admin-registry.js', 'utf8'), { window: w });
const R = w.ADMIN_REGISTRY, ids = R.ids();
assert.strictEqual(new Set(ids).size, ids.length, 'تبويب مكرر في المجموعات');
assert.strictEqual(new Set(R.groups.map(g => g[0])).size, R.groups.length, 'مجموعة مكررة');
assert.deepStrictEqual(w.GROUPS.map(g => g[2]), R.groups.map(g => g[2].map(t => t[0])));
const sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8'), idx = fs.readFileSync(__dirname + '/../index.html', 'utf8');
assert(sw.includes('/admin-registry.js') && idx.indexOf('admin-registry.js') < idx.indexOf('admin2.js'), 'ترتيب/كاش السجل');
console.log('registry ok:', ids.length, 'tabs');
