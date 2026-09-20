/* PWA SW v3 — fix standalone app ERR_FAILED trên workers.dev */
const CACHE_NAME = 'qr-manager-v4';
const CDN_CACHE = 'qr-manager-cdn-v3';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/style.css',
  '/css/edit-style.css',
  '/js/script.js',
  '/js/edit-qr.js',
  '/js/pwa.js',
  '/lib/qr/read-qr.js',
  '/lib/image-optimize.js',
  '/lib/qr-image-cache.js',
  '/validate/validate_helpers.js',
  '/validate/validate_search.js',
  '/validate/validate_qrName.js',
  '/validate/validate_bankName.js',
  '/validate/validate_QRImage_Required.js',
  '/validate/validate_searchName.js',
  '/validate/validate_search_name.js',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/favicon-32.png',
  '/pwa/apple-touch-icon.png',
  '/sw.js',
  '/mascots/fox-directions.webp',
  '/mascots/fox-reactions.webp',
  '/js/page-mascot.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] precache skip', url, err && err.message);
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
    (h.indexOf('firebase') !== -1 && h.indexOf('gstatic') === -1)
  );
}

function isCdn(url) {
  var h = url.hostname;
  return (
    h.indexOf('gstatic.com') !== -1 ||
    h.indexOf('cdnjs.cloudflare.com') !== -1 ||
    h.indexOf('unpkg.com') !== -1 ||
    h.indexOf('jsdelivr.net') !== -1
  );
}

/** Tìm trang app trong cache (nhiều key vì PWA/workers) */
function matchAppShell() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match('/index.html')
      .then(function (r) { return r || cache.match('/'); })
      .then(function (r) { return r || cache.match('./index.html'); })
      .then(function (r) { return r || cache.match('/?utm_source=pwa'); })
      .then(function (r) { return r || caches.match('/index.html'); })
      .then(function (r) { return r || caches.match('/'); });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Chỉ xử lý same-origin + CDN/Firebase đã biết
  var sameOrigin = url.origin === self.location.origin;

  if (isFirebase(url)) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response('{"offline":true}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  if (isCdn(url)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) {
              try { cache.put(req, res.clone()); } catch (e) {}
            }
            return res;
          }).catch(function () {
            return hit || Response.error();
          });
        });
      })
    );
    return;
  }

  if (!sameOrigin) return;

  // Điều hướng (mở app standalone) — network first, fallback shell
  var isNav = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isNav) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              try {
                cache.put('/index.html', clone.clone());
                cache.put('/', clone.clone());
                cache.put(req, clone);
              } catch (e) {}
            });
          }
          return res;
        })
        .catch(function () {
          return matchAppShell().then(function (page) {
            if (page) return page;
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>Offline</h1><p>Mở lại khi có mạng để tải app.</p><button onclick="location.reload()">Thử lại</button></body></html>',
              { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        })
    );
    return;
  }

  // Asset tĩnh: cache first
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            try { cache.put(req, clone); } catch (e) {}
          });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (c) {
          return c || Response.error();
        });
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    });
  }
});
