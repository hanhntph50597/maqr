// PWA register + offline banner
(function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  function ensureOfflineBanner() {
    if (document.getElementById('offlineBanner')) return;
    var bar = document.createElement('div');
    bar.id = 'offlineBanner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'display:none',
      'position:fixed',
      'left:0',
      'right:0',
      'top:0',
      'z-index:10000',
      'padding:8px 12px',
      'text-align:center',
      'font-size:0.8rem',
      'font-weight:600',
      'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      'background:rgba(15,23,42,0.92)',
      'color:#fbbf24',
      'backdrop-filter:blur(8px)'
    ].join(';');
    bar.textContent = 'Đang offline — hiển thị dữ liệu đã lưu trên máy';
    document.body.appendChild(bar);
  }

  function setOfflineUI(offline) {
    ensureOfflineBanner();
    var bar = document.getElementById('offlineBanner');
    if (bar) bar.style.display = offline ? 'block' : 'none';
    document.documentElement.classList.toggle('is-offline', offline);
  }

  window.addEventListener('online', function () {
    setOfflineUI(false);
    if (typeof showToast === 'function') showToast('Đã kết nối lại mạng', 'success');
    if (typeof refreshQRListBackground === 'function') refreshQRListBackground();
  });
  window.addEventListener('offline', function () {
    setOfflineUI(true);
    if (typeof showToast === 'function') showToast('Mất mạng — dùng dữ liệu offline', 'warning');
  });

  window.addEventListener('load', function () {
    setOfflineUI(!navigator.onLine);

    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(function (reg) {
        console.log('[PWA] SW registered', reg.scope);
        reg.addEventListener('updatefound', function () {
          var worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', function () {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Bản mới sẵn sàng');
              if (typeof showToast === 'function') {
                showToast('Có bản cập nhật — tải lại trang để dùng', 'info');
              }
            }
          });
        });
      })
      .catch(function (err) {
        console.warn('[PWA] SW register failed', err);
      });
  });

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    window.__pwaInstallPrompt = function () {
      if (!deferredPrompt) return Promise.resolve(false);
      deferredPrompt.prompt();
      return deferredPrompt.userChoice.then(function (choice) {
        deferredPrompt = null;
        return choice.outcome === 'accepted';
      });
    };
    var btn = document.getElementById('btnInstallPwa');
    if (btn) {
      btn.style.display = '';
      btn.onclick = function () {
        window.__pwaInstallPrompt && window.__pwaInstallPrompt();
      };
    }
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    var btn = document.getElementById('btnInstallPwa');
    if (btn) btn.style.display = 'none';
    if (typeof showToast === 'function') showToast('Đã cài app thành công!', 'success');
  });
})();
