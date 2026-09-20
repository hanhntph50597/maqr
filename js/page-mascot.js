/**
 * page-mascot — always visible (kể cả khi mở modal), kéo thả, boop, đổi nhân vật
 */
(function (global) {
  'use strict';
  var DIRECTIONS = ['up-left','up','up-right','left','center','right','down-left','down','down-right'];
  var REACTIONS = ['blink','heart','sparkle','surprised','wink','bashful','sleepy','dizzy','delighted'];
  var CLOCKWISE = ['right','down-right','down','down-left','left','up-left','up','up-right'];
  var CHARACTERS = ['fox','cat','otter','owl','panda','gearbot','raccoon','hamster'];
  var SECTOR = (Math.PI * 2) / 8;
  var HYSTERESIS = 0.12, DEAD_ZONE = 70;
  var PAYOFFS = ['heart','sparkle','delighted'];
  var BOOP_PAYOFF = 120, BOOP_END = 560, SQUASH_MS = 420;
  var DIZZY_AFTER = 4, DIZZY_WINDOW = 1600, DIZZY_END = 1100;
  var POS_KEY = 'qr_mascot_pos';
  var CHAR_KEY = 'qr_mascot_char';
  var SQUASH = [
    { transform: 'scale(1, 1)', easing: 'ease-in' },
    { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
    { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
    { transform: 'scale(1, 1)' }
  ];

  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function cellPos(i) { return ((i % 3) * 50) + '% ' + (Math.floor(i / 3) * 50) + '%'; }
  function resolveUrl(path) {
    try { return new URL(path, document.baseURI || location.href).href; }
    catch (e) { return path; }
  }

  function mountMascot(container, opts) {
    if (!container) return null;
    var size = (opts && opts.size) || 110;
    var savedChar = null;
    try { savedChar = localStorage.getItem(CHAR_KEY); } catch (e) {}
    var label = savedChar || (opts && opts.label) || 'fox';
    if (CHARACTERS.indexOf(label) < 0) label = 'fox';
    var directions = resolveUrl('mascots/' + label + '-directions.webp');
    var reactions = resolveUrl('mascots/' + label + '-reactions.webp');
    var direction = 'center', reaction = null, sector = -1, pointer = null;
    var timers = [], boops = { count: 0, at: 0 };
    var charIndex = Math.max(0, CHARACTERS.indexOf(label));
    var dragging = false, moved = false, startX = 0, startY = 0, origL = 0, origT = 0;

    container.innerHTML = '';
    container.style.width = size + 'px';
    container.style.height = size + 'px';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'page-mascot';
    btn.setAttribute('aria-label', 'Boop ' + label);
    Object.assign(btn.style, {
      position: 'relative', display: 'block', width: size + 'px', height: size + 'px',
      padding: '0', border: '0', background: 'transparent', cursor: 'grab',
      appearance: 'none', WebkitAppearance: 'none', userSelect: 'none', touchAction: 'none'
    });

    var squash = document.createElement('span');
    Object.assign(squash.style, {
      position: 'relative', display: 'block', width: '100%', height: '100%',
      transformOrigin: '50% 78%'
    });

    var dirLayer = document.createElement('span');
    Object.assign(dirLayer.style, {
      position: 'absolute', inset: '0', backgroundSize: '300% 300%',
      backgroundRepeat: 'no-repeat', backgroundImage: 'url("' + directions + '")',
      backgroundPosition: cellPos(4), opacity: '1', transition: 'opacity 0.08s linear'
    });

    var reactLayer = document.createElement('span');
    Object.assign(reactLayer.style, {
      position: 'absolute', inset: '0', backgroundSize: '300% 300%',
      backgroundRepeat: 'no-repeat', backgroundImage: 'url("' + reactions + '")',
      backgroundPosition: cellPos(0), opacity: '0', transition: 'opacity 0.08s linear',
      pointerEvents: 'none'
    });

    [directions, reactions].forEach(function (src) { var im = new Image(); im.src = src; });

    squash.appendChild(dirLayer);
    squash.appendChild(reactLayer);
    btn.appendChild(squash);
    container.appendChild(btn);

    // restore position
    try {
      var saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
        container.style.left = saved.left + 'px';
        container.style.top = saved.top + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
      }
    } catch (e) {}

    function setDirection(d) {
      if (d === direction) return;
      direction = d;
      var i = DIRECTIONS.indexOf(d); if (i < 0) i = 4;
      dirLayer.style.backgroundPosition = cellPos(i);
    }
    function setReaction(r) {
      reaction = r;
      if (r) {
        var i = REACTIONS.indexOf(r); if (i < 0) i = 0;
        reactLayer.style.backgroundPosition = cellPos(i);
        reactLayer.style.opacity = '1';
        dirLayer.style.opacity = '0';
      } else {
        reactLayer.style.opacity = '0';
        dirLayer.style.opacity = '1';
      }
    }
    function aim() {
      if (!pointer || dragging) return;
      var box = btn.getBoundingClientRect();
      var dx = pointer.x - (box.left + box.width / 2);
      var dy = pointer.y - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) { sector = -1; setDirection('center'); return; }
      var angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + 8) % 8;
      setDirection(CLOCKWISE[sector]);
    }
    function onMove(e) {
      pointer = { x: e.clientX, y: e.clientY };
      if (dragging) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        var nl = Math.max(0, Math.min(window.innerWidth - size, origL + dx));
        var nt = Math.max(0, Math.min(window.innerHeight - size, origT + dy));
        container.style.left = nl + 'px';
        container.style.top = nt + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        return;
      }
      aim();
    }

    var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    window.addEventListener('pointermove', onMove, { passive: true });
    if (canHover) window.addEventListener('scroll', aim, { passive: true });

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(ms, next) { timers.push(setTimeout(function () { setReaction(next); }, ms)); }
    function boop() {
      clearTimers();
      var now = Date.now();
      boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
      boops.at = now;
      if (boops.count >= DIZZY_AFTER) {
        boops.count = 0; setReaction('dizzy'); later(DIZZY_END, null);
      } else {
        setReaction('blink');
        later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
        later(BOOP_END, null);
      }
      if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) && squash.animate) {
        squash.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
      }
    }
    function switchCharacter() {
      charIndex = (charIndex + 1) % CHARACTERS.length;
      label = CHARACTERS[charIndex];
      try { localStorage.setItem(CHAR_KEY, label); } catch (e) {}
      directions = resolveUrl('mascots/' + label + '-directions.webp');
      reactions = resolveUrl('mascots/' + label + '-reactions.webp');
      dirLayer.style.backgroundImage = 'url("' + directions + '")';
      reactLayer.style.backgroundImage = 'url("' + reactions + '")';
      setReaction(null); setDirection('center');
      btn.setAttribute('aria-label', 'Boop ' + label);
      if (typeof showToast === 'function') showToast('Mascot: ' + label, 'info');
    }

    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      moved = false;
      btn.style.cursor = 'grabbing';
      container.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      var rect = container.getBoundingClientRect();
      origL = rect.left;
      origT = rect.top;
      container.style.left = origL + 'px';
      container.style.top = origT + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      btn.style.cursor = 'grab';
      container.classList.remove('is-dragging');
      try {
        var r = container.getBoundingClientRect();
        localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
      } catch (err) {}
      if (!moved) {
        // short click = boop
        boop();
      }
      // double-click handled separately
    }

    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onUp);
    btn.addEventListener('pointercancel', onUp);
    btn.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearTimers();
      switchCharacter();
    });

    console.log('[mascot] ready', label);
    return { boop: boop, switchCharacter: switchCharacter };
  }

  function init() {
    var el = document.getElementById('pageMascot');
    if (!el) return;
    if (el.getAttribute('data-mounted') === '1') return;
    el.setAttribute('data-mounted', '1');
    mountMascot(el, {
      size: parseInt(el.getAttribute('data-size') || '110', 10),
      label: el.getAttribute('data-label') || 'fox'
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 0);
  setTimeout(init, 400);

  global.mountPageMascot = mountMascot;
  global.MASCOT_CHARS = CHARACTERS;
})(typeof window !== 'undefined' ? window : this);
