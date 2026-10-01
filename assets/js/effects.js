/* ==========================================================================
   effects.js — pointer-driven polish, shared by every page.
   Custom cursor, cursor glow, magnetic buttons, spotlight cards, 3D tilt,
   mouse parallax and stat counters.

   Everything pointer-related is gated to fine pointers (mouse / trackpad)
   and skipped under prefers-reduced-motion, so touch devices pay nothing.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var pointerFx = finePointer && !reduceMotion;

  /* ---------- Stat counters (existing behaviour, now opt-in via data-count) ---------- */
  function animateCount(el) {
    var raw = el.textContent.trim();
    var match = raw.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return;
    var target = parseFloat(match[1]);
    var suffix = match[2] || '';
    var decimals = match[1].indexOf('.') > -1 ? match[1].split('.')[1].length : 0;
    var duration = 1400;
    var start = performance.now();

    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(counters, function (el) { counterObserver.observe(el); });
  }

  /* ---------- Scroll parallax: [data-parallax-y="speed"] drifts relative to its parent ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax-y]'));
  if (parallaxEls.length && !reduceMotion && 'IntersectionObserver' in window) {
    var visible = new Set();
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    }, { rootMargin: '20% 0px' });
    parallaxEls.forEach(function (el) { pio.observe(el); });

    var prevScroll = window.__onCoreScroll;
    window.__onCoreScroll = function (y) {
      if (prevScroll) prevScroll(y);
      var vh = window.innerHeight;
      visible.forEach(function (el) {
        // measure the parent: the element's own translate would feed back into its rect
        var r = el.parentElement.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute('data-parallax-y')) || 0;
        el.style.setProperty('--ps', ((r.top + r.height / 2 - vh / 2) * speed).toFixed(1) + 'px');
      });
    };
  }

  /* ---------- Scramble-decode for section labels ---------- */
  var GLYPHS = '01<>/{}[]_#*+=';
  function scramble(el) {
    var finalText = el.getAttribute('data-final') || el.textContent;
    el.setAttribute('data-final', finalText);
    el.setAttribute('aria-label', finalText);
    var start = performance.now();
    var duration = 900;
    function frame(now) {
      var p = Math.min((now - start) / duration, 1);
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText.charAt(i);
        var settled = p * 1.25 > i / finalText.length + 0.08;
        out += (ch === ' ' || ch === '·' || settled) ? ch : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }
  var eyebrows = document.querySelectorAll('.eyebrow');
  if (eyebrows.length && !reduceMotion && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        scramble(en.target);
        sio.unobserve(en.target);
      });
    }, { threshold: 1 });
    Array.prototype.forEach.call(eyebrows, function (el) { sio.observe(el); });
  }

  /* ---------- Marquees speed up with scroll velocity, then settle ---------- */
  if (!reduceMotion && document.getAnimations) {
    var lastY = window.scrollY, vel = 0, settling = false, scrollAnims = [];
    var NAMES = { marquee: 1, bandMove: 1 };
    var prevForVel = window.__onCoreScroll;
    function collect() {
      scrollAnims = document.getAnimations().filter(function (a) { return a.animationName && NAMES[a.animationName]; });
    }
    function applyRate() {
      var rate = 1 + Math.min(Math.abs(vel) * 0.35, 9);
      if (!scrollAnims.length) collect();
      scrollAnims.forEach(function (a) { try { a.updatePlaybackRate(rate); } catch (err) { /* finished/removed */ } });
      return rate;
    }
    function settle() {
      vel *= 0.93;
      var rate = applyRate();
      if (rate > 1.03) requestAnimationFrame(settle);
      else { vel = 0; applyRate(); settling = false; }
    }
    window.__onCoreScroll = function (y) {
      if (prevForVel) prevForVel(y);
      vel = vel * 0.6 + (y - lastY) * 0.4;
      lastY = y;
      applyRate();
      if (!settling) { settling = true; requestAnimationFrame(settle); }
    };
  }

  /* ---------- Click ripple on buttons ---------- */
  if (!reduceMotion) {
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest && e.target.closest('.btn, button[type="submit"], .filter-btn');
      if (!btn || btn.disabled) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = (e.clientX - r.left - size / 2) + 'px';
      dot.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(dot);
      dot.addEventListener('animationend', function () { dot.remove(); });
    });
  }

  if (!pointerFx) return;

  /* ---------- Custom cursor: dot (instant) + ring (eased follower) ---------- */
  var dot = document.createElement('div');
  var ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  root.classList.add('has-cursor', 'has-pointer');

  var mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
  var rafId = 0;
  var INTERACTIVE = 'a, button, [role="button"], summary, label, .card[data-spotlight], .tech-item, .filter-btn';
  var TEXT = 'input, textarea, select';

  function loop() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    dot.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0)';
    ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0)';
    // Stop the loop once the ring has caught up — no idle rAF cost.
    if (Math.abs(mouseX - ringX) > 0.1 || Math.abs(mouseY - ringY) > 0.1) rafId = requestAnimationFrame(loop);
    else rafId = 0;
  }

  function setCursorState(target) {
    var isText = target.closest && target.closest(TEXT);
    var onControl = target.closest && target.closest('a, button, input, textarea, select');
    var labelEl = !onControl && target.closest ? target.closest('[data-cursor]') : null;
    var isLink = !isText && !labelEl && target.closest && target.closest(INTERACTIVE);
    if (labelEl) ring.setAttribute('data-label', labelEl.getAttribute('data-cursor'));
    root.classList.toggle('cursor-label', !!labelEl);
    var isFrame = target.tagName === 'IFRAME';
    root.classList.toggle('cursor-text', !!isText);
    root.classList.toggle('cursor-link', !!isLink);
    root.classList.toggle('cursor-hidden', isFrame);
  }

  /* ---------- One shared pointermove handler (rAF-throttled) ---------- */
  var glow = document.querySelector('.ambient__glow');
  var lastTarget = null, lastEvent = null, moveQueued = false;
  var hoverCard = null;     // spotlight / tilt target under the pointer
  var magnets = [];
  var activeScope = null; // parallax scope currently under the pointer
  var heroName = document.querySelector('.hero__name');
  var heroChars = [];
  var charsActive = false;
  // chars are created by home.js, which runs after this file — collect lazily
  function collectChars() { heroChars = heroName ? Array.prototype.slice.call(heroName.querySelectorAll('.hero__char')) : []; }
  window.addEventListener('load', collectChars);
  setTimeout(collectChars, 800);

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastTarget = e.target;
    lastEvent = e;
    root.classList.add('cursor-on');
    if (!rafId) rafId = requestAnimationFrame(loop);
    if (!moveQueued) { moveQueued = true; requestAnimationFrame(processMove); }
  }

  function processMove() {
    moveQueued = false;
    var e = lastEvent;
    if (!e) return;
    var t = lastTarget;

    setCursorState(t);

    if (glow) {
      glow.style.setProperty('--gx', e.clientX + 'px');
      glow.style.setProperty('--gy', e.clientY + 'px');
    }

    // Spotlight + tilt on the card under the pointer
    var card = t.closest && t.closest('[data-spotlight], [data-tilt]');
    if (hoverCard && hoverCard !== card) resetCard(hoverCard);
    hoverCard = card;
    if (card) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (card.hasAttribute('data-tilt')) {
        var max = parseFloat(card.getAttribute('data-tilt')) || 6;
        card.style.setProperty('--ry', ((x / r.width - 0.5) * 2 * max).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y / r.height) * 2 * max).toFixed(2) + 'deg');
      }
    }

    // Hero name: letters lift as the pointer approaches
    if (heroChars.length) {
      var nameRect = heroName.getBoundingClientRect();
      var near = e.clientX > nameRect.left - 200 && e.clientX < nameRect.right + 200 && e.clientY > nameRect.top - 200 && e.clientY < nameRect.bottom + 200;
      if (near || charsActive) {
        heroChars.forEach(function (ch) {
          var b = ch.getBoundingClientRect();
          var d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
          ch.style.setProperty('--hp', near ? Math.max(0, 1 - d / 170).toFixed(3) : 0);
        });
        charsActive = near;
      }
    }

    // Magnetic elements: pull towards the pointer inside a padded hit area
    magnets.forEach(function (m) {
      var b = m.el.getBoundingClientRect();
      var cx = b.left + b.width / 2;
      var cy = b.top + b.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var pad = 60;
      var inside = e.clientX > b.left - pad && e.clientX < b.right + pad && e.clientY > b.top - pad && e.clientY < b.bottom + pad;
      if (inside) {
        m.el.style.setProperty('--mx-btn', (dx * m.strength).toFixed(1) + 'px');
        m.el.style.setProperty('--my-btn', (dy * m.strength).toFixed(1) + 'px');
        m.active = true;
      } else if (m.active) {
        m.el.style.setProperty('--mx-btn', '0px');
        m.el.style.setProperty('--my-btn', '0px');
        m.active = false;
      }
    });

    // Mouse parallax layers inside [data-parallax-scope]
    var scope = t.closest && t.closest('[data-parallax-scope]');
    if (activeScope && activeScope !== scope) {
      activeScope.style.setProperty('--px', 0);
      activeScope.style.setProperty('--py', 0);
    }
    activeScope = scope;
    if (scope) {
      var sr = scope.getBoundingClientRect();
      scope.style.setProperty('--px', (((e.clientX - sr.left) / sr.width) - 0.5).toFixed(3));
      scope.style.setProperty('--py', (((e.clientY - sr.top) / sr.height) - 0.5).toFixed(3));
    }
  }

  function resetCard(card) {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-magnetic]'), function (el) {
    magnets.push({ el: el, strength: parseFloat(el.getAttribute('data-magnetic')) || 0.25, active: false });
  });

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerdown', function () { root.classList.add('cursor-down'); });
  document.addEventListener('pointerup', function () { root.classList.remove('cursor-down'); });
  document.documentElement.addEventListener('mouseleave', function () {
    root.classList.remove('cursor-on');
    magnets.forEach(function (m) {
      m.el.style.setProperty('--mx-btn', '0px');
      m.el.style.setProperty('--my-btn', '0px');
    });
    if (hoverCard) resetCard(hoverCard);
    var scope = document.querySelector('[data-parallax-scope]');
    if (scope) { scope.style.setProperty('--px', 0); scope.style.setProperty('--py', 0); }
  });
  document.documentElement.addEventListener('mouseenter', function () { root.classList.add('cursor-on'); });
})();
