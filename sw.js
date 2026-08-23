/* PWA Service Worker — Quản lý mã QR */
const CACHE_NAME = 'qr-manager-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/edit-style.css',
  './js/script.js',
  './js/edit-qr.js',
  './lib/qr/read-qr.js',
  './pwa/icon-192.png',
  './pwa/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function (err) {
        console.warn('[SW] precache partial fail', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Không cache API Firebase / CDN động — network first
  if (
    url.hostname.indexOf('googleapis.com') !== -1 ||
    url.hostname.indexOf('firebaseio.com') !== -1 ||
    url.hostname.indexOf('gstatic.com') !== -1 ||
    url.hostname.indexOf('firebase') !== -1
  ) {
    event.respondWith(fetch(req).catch(function () {
      return caches.match(req);
    }));
    return;
  }

  // App shell: cache first, fallback network
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') {
          // CDN opaque — vẫn có thể cache
        }
        const clone = res.clone();
        if (req.url.indexOf('http') === 0 && res.status === 200) {
          caches.open(CACHE_NAME).then(function (cache) {
            try { cache.put(req, clone); } catch (e) {}
          });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return caches.match(req);
      });
    })
  );
});
