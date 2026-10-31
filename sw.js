/* sw.js — Service Worker: يعمل الموقع دون اتصال (واجهة + آخر كتالوج) ويتحدّث تلقائياً */
const V = 'lacey-v11', SHELL = ['/', '/index.html', '/style.css', '/storage.js', '/lang.js', '/script.js', '/account.js', '/admin2.js', '/admin3.js', '/store2.js', '/chat.js', '/staff.js', '/pages.js', '/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
const DYN = /^\/(login|settings|code|visit|stats|order|orders|status|track|customers?|discounts?|auth|me|quote|codes|chat|adm|staff)(\/|$)/;
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || DYN.test(u.pathname) || u.pathname === '/manifest.json') return;
  if (u.pathname.startsWith('/media/')) {                                   // وسائط ثابتة: من الكاش أولاً
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { if (res.ok && res.status === 200) { const cp = res.clone(); caches.open(V).then(x => x.put(r, cp)); } return res; })));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(c => c || (r.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
});
