/* PWA Service Worker — offline-first app shell */
const CACHE_NAME = 'qr-manager-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/edit-style.css',
  './js/script.js',
  './js/edit-qr.js',
  './js/pwa.js',
  './lib/qr/read-qr.js',
  './lib/image-optimize.js',
  './validate/validate_searchName.js',
  './validate/validate_search_name.js',
  './pwa/icon-192.png',
  './pwa/icon-512.png',
  './pwa/favicon-32.png',
  './pwa/apple-touch-icon.png',
  './sw.js'
];

// CDN — cache sau lần online đầu (offline lần sau vẫn chạy)
const CDN_CACHE = 'qr-manager-cdn-v2';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] skip', url, err);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE_NAME && k !== CDN_CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isFirebase(url) {
  var h = url.hostname;
  return (
    h.indexOf('firebaseio.com') !== -1 ||
    h.indexOf('googleapis.com') !== -1 ||
    h.indexOf('firebasedatabase.app') !== -1 ||
    h.indexOf('firebase') !== -1
  );
}

function isCdn(url) {
  var h = url.hostname;
  return (
    h.indexOf('gstatic.com') !== -1 ||
    h.indexOf('cdnjs.cloudflare.com') !== -1 ||
    h.indexOf('unpkg.com') !== -1 ||
    h.indexOf('jsdelivr.net') !== -1 ||
    h.indexOf('cdn.jsdelivr.net') !== -1
  );
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Firebase realtime: network only (data offline dùng localStorage trong app)
  if (isFirebase(url)) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // CDN: cache-first sau khi đã từng tải
  if (isCdn(url)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.status === 200) {
              try { cache.put(req, res.clone()); } catch (e) {}
            }
            return res;
          }).catch(function () {
            return hit || new Response('', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // App shell: cache first → network → offline fallback
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            try { cache.put(req, clone); } catch (e) {}
          });
        }
        return res;
      }).catch(function () {
        return null;
      });

      return cached || network.then(function (res) {
        if (res) return res;
        // Navigate offline → index
        if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
          return caches.match('./index.html').then(function (page) {
            return page || caches.match('/index.html') || caches.match('index.html');
          });
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// Cho phép page bảo SW xóa cache cũ khi cần
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
