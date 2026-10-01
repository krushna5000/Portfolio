/* ==========================================================================
   effects.js — interaction layer, shared by every page.

   Always on (cheap, touch-safe):  stat counters · scroll parallax ·
     scramble-decode labels · scroll-speed marquees · click ripple
   Fine pointers only (mouse / trackpad, not reduced-motion):
     custom cursor + labels · cursor glow · pointer-reactive background ·
     card spotlight / tilt / image shift · magnetic buttons · hero letter lift ·
     mouse-parallax layers

   Performance rules followed here:
     - one passive pointermove listener, work coalesced into one rAF per frame
     - inside that frame: ALL layout reads first, THEN all style writes
     - the cursor loop stops itself once the ring has caught up
     - IntersectionObserver / visibility sets decide what is worth updating
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var finePointer = mq('(hover: hover) and (pointer: fine)');
  var pointerFx = finePointer && !reduceMotion;

  /* ---------- Stat counters (opt-in via data-count) ---------- */
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
      var writes = [];
      // read pass
      visible.forEach(function (el) {
        // measure the parent: the element's own translate would feed back into its rect
        var r = el.parentElement.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute('data-parallax-y')) || 0;
        writes.push([el, ((r.top + r.height / 2 - vh / 2) * speed).toFixed(1) + 'px']);
      });
      // write pass
      writes.forEach(function (w) { w[0].style.setProperty('--ps', w[1]); });
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
    var collect = function () {
      scrollAnims = document.getAnimations().filter(function (a) { return a.animationName && NAMES[a.animationName]; });
    };
    var applyRate = function () {
      var rate = 1 + Math.min(Math.abs(vel) * 0.35, 9);
      if (!scrollAnims.length) collect();
      scrollAnims.forEach(function (a) { try { a.updatePlaybackRate(rate); } catch (err) { /* finished/removed */ } });
      return rate;
    };
    var settle = function () {
      vel *= 0.93;
      var rate = applyRate();
      if (rate > 1.03) requestAnimationFrame(settle);
      else { vel = 0; applyRate(); settling = false; }
    };
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

  /* ======================================================================
     Fine-pointer layer
     ====================================================================== */

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

  // Cursor states: default · link/button (expand) · text (caret) · label (e.g. "View") · hidden over iframes
  function setCursorState(target) {
    var closest = target.closest ? function (s) { return target.closest(s); } : function () { return null; };
    var isText = closest(TEXT);
    var onControl = closest('a, button, input, textarea, select');
    var labelEl = !onControl ? closest('[data-cursor]') : null;
    var isLink = !isText && !labelEl && closest(INTERACTIVE);
    if (labelEl) ring.setAttribute('data-label', labelEl.getAttribute('data-cursor'));
    root.classList.toggle('cursor-label', !!labelEl);
    root.classList.toggle('cursor-text', !!isText);
    root.classList.toggle('cursor-link', !!isLink);
    root.classList.toggle('cursor-hidden', target.tagName === 'IFRAME');
  }

  /* ---------- Shared pointermove pipeline ---------- */
  var ambient = document.querySelector('.ambient');
  var glow = document.querySelector('.ambient__glow');
  var lastTarget = null, lastEvent = null, moveQueued = false;
  var hoverCard = null;       // spotlight / tilt target under the pointer
  var activeScope = null;     // parallax scope under the pointer
  var magnets = [];

  // Hero name: character centres are cached relative to the name box (they never move
  // independently), so the per-frame cost is one rect read instead of one per letter.
  var heroName = document.querySelector('.hero__name');
  var charCache = [];   // [{el, cx, cy}] offsets from heroName's top-left
  function cacheChars() {
    if (!heroName) return;
    // offsetLeft/Top are layout positions (unaffected by the entrance transform), so this is
    // safe to run at any time. Words and the name share one offsetParent (.home).
    charCache = Array.prototype.map.call(heroName.querySelectorAll('.hero__char'), function (el) {
      var word = el.parentElement;
      return {
        el: el,
        cx: word.offsetLeft - heroName.offsetLeft + el.offsetLeft + el.offsetWidth / 2,
        cy: word.offsetTop - heroName.offsetTop + el.offsetTop + el.offsetHeight / 2,
        hp: 0
      };
    });
  }
  window.addEventListener('load', function () { setTimeout(cacheChars, 600); });
  window.addEventListener('resize', function () { setTimeout(cacheChars, 200); });
  setTimeout(cacheChars, 1200); // chars are built by home.js after this file runs

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
    var cx = e.clientX, cy = e.clientY;
    var vw = window.innerWidth, vh = window.innerHeight;

    setCursorState(t);

    /* ---- READ PHASE: gather every rect we need before touching styles ---- */
    var card = t.closest ? t.closest('[data-spotlight], [data-tilt]') : null;
    var cardRect = card ? card.getBoundingClientRect() : null;

    var nameRect = charCache.length ? heroName.getBoundingClientRect() : null;

    var magnetReads = magnets.map(function (m) {
      var b = m.el.getBoundingClientRect();
      return { m: m, b: b };
    });

    var scope = t.closest ? t.closest('[data-parallax-scope]') : null;
    var scopeRect = scope ? scope.getBoundingClientRect() : null;

    /* ---- WRITE PHASE ---- */
    // Cursor glow + pointer-reactive background (normalised -0.5..0.5)
    if (glow) {
      glow.style.setProperty('--gx', cx + 'px');
      glow.style.setProperty('--gy', cy + 'px');
    }
    if (ambient) {
      ambient.style.setProperty('--bx', (cx / vw - 0.5).toFixed(3));
      ambient.style.setProperty('--by', (cy / vh - 0.5).toFixed(3));
    }

    // Card spotlight, tilt and image shift
    if (hoverCard && hoverCard !== card) resetCard(hoverCard);
    hoverCard = card;
    if (card) {
      var x = cx - cardRect.left;
      var y = cy - cardRect.top;
      var nx = x / cardRect.width - 0.5;
      var ny = y / cardRect.height - 0.5;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      card.style.setProperty('--nx', nx.toFixed(3));
      card.style.setProperty('--ny', ny.toFixed(3));
      if (card.hasAttribute('data-tilt')) {
        var max = parseFloat(card.getAttribute('data-tilt')) || 6;
        card.style.setProperty('--ry', (nx * 2 * max).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-ny * 2 * max).toFixed(2) + 'deg');
      }
    }

    // Hero name: letters lift as the pointer approaches
    if (nameRect) {
      var near = cx > nameRect.left - 200 && cx < nameRect.right + 200 && cy > nameRect.top - 200 && cy < nameRect.bottom + 200;
      charCache.forEach(function (c) {
        var hp = 0;
        if (near) {
          var d = Math.hypot(cx - (nameRect.left + c.cx), cy - (nameRect.top + c.cy));
          hp = Math.max(0, 1 - d / 170);
        }
        if (Math.abs(hp - c.hp) > 0.01) { c.hp = hp; c.el.style.setProperty('--hp', hp.toFixed(3)); }
      });
    }

    // Magnetic elements: pull towards the pointer inside a padded hit area
    magnetReads.forEach(function (r) {
      var b = r.b, m = r.m, pad = 60;
      var inside = cx > b.left - pad && cx < b.right + pad && cy > b.top - pad && cy < b.bottom + pad;
      if (inside) {
        m.el.style.setProperty('--mx-btn', ((cx - (b.left + b.width / 2)) * m.strength).toFixed(1) + 'px');
        m.el.style.setProperty('--my-btn', ((cy - (b.top + b.height / 2)) * m.strength).toFixed(1) + 'px');
        m.active = true;
      } else if (m.active) {
        m.el.style.setProperty('--mx-btn', '0px');
        m.el.style.setProperty('--my-btn', '0px');
        m.active = false;
      }
    });

    // Mouse parallax layers inside [data-parallax-scope]
    if (activeScope && activeScope !== scope) {
      activeScope.style.setProperty('--px', 0);
      activeScope.style.setProperty('--py', 0);
    }
    activeScope = scope;
    if (scope) {
      scope.style.setProperty('--px', (((cx - scopeRect.left) / scopeRect.width) - 0.5).toFixed(3));
      scope.style.setProperty('--py', (((cy - scopeRect.top) / scopeRect.height) - 0.5).toFixed(3));
    }
  }

  function resetCard(card) {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    card.style.setProperty('--nx', '0');
    card.style.setProperty('--ny', '0');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-magnetic]'), function (el) {
    magnets.push({ el: el, strength: parseFloat(el.getAttribute('data-magnetic')) || 0.25, active: false });
  });

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerdown', function () { root.classList.add('cursor-down'); });
  document.addEventListener('pointerup', function () { root.classList.remove('cursor-down'); });
  root.addEventListener('mouseleave', function () {
    root.classList.remove('cursor-on');
    magnets.forEach(function (m) {
      m.el.style.setProperty('--mx-btn', '0px');
      m.el.style.setProperty('--my-btn', '0px');
    });
    if (hoverCard) resetCard(hoverCard);
    if (ambient) { ambient.style.setProperty('--bx', 0); ambient.style.setProperty('--by', 0); }
    var scope = document.querySelector('[data-parallax-scope]');
    if (scope) { scope.style.setProperty('--px', 0); scope.style.setProperty('--py', 0); }
    charCache.forEach(function (c) { c.hp = 0; c.el.style.setProperty('--hp', 0); });
  });
  root.addEventListener('mouseenter', function () { root.classList.add('cursor-on'); });
})();
