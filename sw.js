/* sw.js — Service Worker: يعمل الموقع دون اتصال (واجهة + آخر كتالوج) ويتحدّث تلقائياً */
const V = 'lacey-v57', SHELL = ['/', '/index.html', '/style.css', '/storage.js', '/lang.js', '/script.js', '/account.js', '/admin2.js', '/admin3.js', '/admin-ops.js', '/admin-settings.js', '/store2.js', '/chat.js', '/staff.js', '/pages.js', '/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
const DYN = /^\/(login|settings|code|visit|stats|order|orders|status|track|customers?|discounts?|auth|me|quote|codes|chat|adm|staff)(\/|$)/;
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || DYN.test(u.pathname) || u.pathname === '/manifest.json') return;
  if (u.pathname.startsWith('/media/')) {                                   // وسائط ثابتة: من الكاش أولاً
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { if (res.ok && res.status === 200) { const cp = res.clone(); caches.open(V).then(x => x.put(r, cp)); } return res; })));
    return;
  }
  const hit = (req, res) => { if (res.ok && res.status === 200) { const cp = res.clone(); caches.open(V).then(x => x.put(req, cp)); } return res; };
  if (u.pathname === '/pimg' || u.pathname.startsWith('/pimg/')) {          // صور المنتجات: الرابط يحمل بصمة الصورة (?v=) فيُحفظ من الكاش أولاً
    if (!u.search) return;
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => hit(r, res))));
    return;
  }
  if (r.mode !== 'navigate' && /\.(js|css|png|jpg|svg|webp|woff2?)$/.test(u.pathname)) {   // ملفات الواجهة: من الكاش فوراً وتتحدّث بالخلفية
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(c => { const n = fetch(r).then(res => hit(r, res)).catch(() => c); return c || n; }));
    return;
  }
  e.respondWith(fetch(r).then(res => hit(r, res))
    .catch(() => caches.match(r).then(c => c || (r.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
});
