/* ==========================================================================
   core.js — shared by every page.
   Theme toggle, mobile menu, one rAF-throttled scroll loop (header state,
   progress bar, scroll-spy, nav indicator, scroll-top), reveal-on-scroll,
   and the third-party chat widget loader.
   Vanilla JS only — no jQuery.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme (initial value is set by the inline snippet in <head>) ---------- */
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyThemeMeta() {
    if (themeMeta) themeMeta.setAttribute('content', root.getAttribute('data-theme') === 'light' ? '#f7f8fc' : '#07090f');
  }
  applyThemeMeta();

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.classList.add('theme-anim');
      root.setAttribute('data-theme', next);
      themeBtn.setAttribute('aria-pressed', String(next === 'light'));
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
      applyThemeMeta();
      window.setTimeout(function () { root.classList.remove('theme-anim'); }, 500);
    });
    themeBtn.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'light'));
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menu');
  var navbar = document.querySelector('.navbar');
  var navLinks = navbar ? Array.prototype.slice.call(navbar.querySelectorAll('a')) : [];

  navLinks.forEach(function (a, i) { a.style.setProperty('--i', i); });

  function setMenu(open) {
    if (!menuBtn || !navbar) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navbar.classList.toggle('nav-toggle', open);
    document.body.classList.toggle('menu-open', open);
  }

  if (menuBtn && navbar) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  // Any in-page link closes the menu; native smooth scrolling (CSS) does the rest.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) setMenu(false);
  });

  /* ---------- Scroll loop ---------- */
  var header = document.querySelector('.site-header');
  var scrollTop = document.getElementById('scroll-top');
  var progressBar = document.querySelector('.scroll-progress');
  var indicator = navbar ? navbar.querySelector('.nav-indicator') : null;

  // Sections that drive the scroll-spy. data-nav lets a section (e.g. certificates)
  // highlight another section's link.
  var spySections = Array.prototype.slice.call(document.querySelectorAll('main > section[id], .site-section[id]'))
    .filter(function (s) { return navbar && navbar.querySelector('a[href="#' + (s.getAttribute('data-nav') || s.id) + '"]'); });
  var spyOffsets = [];
  var activeId = null;

  function measureSections() {
    var y = window.scrollY;
    spyOffsets = spySections.map(function (s) {
      var r = s.getBoundingClientRect();
      return { id: s.getAttribute('data-nav') || s.id, top: r.top + y, bottom: r.bottom + y };
    });
  }

  function moveIndicator(link) {
    if (!indicator || !link || window.innerWidth <= 900) return;
    indicator.style.setProperty('--ix', link.offsetLeft + 'px');
    indicator.style.setProperty('--iw', link.offsetWidth + 'px');
    indicator.classList.add('ready');
  }

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    var current = null;
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', on);
      if (on) { a.setAttribute('aria-current', 'true'); current = a; } else { a.removeAttribute('aria-current'); }
    });
    if (current) moveIndicator(current);
    else if (indicator) indicator.classList.remove('ready');
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    // Set on the one element that uses it — writing on :root would restyle the whole page each frame.
    if (progressBar) progressBar.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);

    if (header) header.classList.toggle('scrolled', y > 40);
    if (scrollTop) scrollTop.classList.toggle('active', y > 600);

    // Scroll-spy: the last section whose top has crossed 35% of the viewport.
    if (spyOffsets.length) {
      var probe = y + window.innerHeight * 0.35;
      var found = null;
      for (var i = 0; i < spyOffsets.length; i++) {
        if (probe >= spyOffsets[i].top && probe < spyOffsets[i].bottom) { found = spyOffsets[i].id; break; }
      }
      setActive(found);
    }

    if (typeof window.__onCoreScroll === 'function') window.__onCoreScroll(y);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    measureSections();
    var cur = navbar && navbar.querySelector('a.active');
    if (cur) moveIndicator(cur);
    onScroll();
  });
  window.addEventListener('load', function () { measureSections(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureSections(); onScroll(); });
  measureSections();
  update();

  // Layout shifts (lazy images, filters) move sections — re-measure cheaply.
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { measureSections(); });
    ro.observe(document.body);
  }

  /* ---------- Section headings: split into masked words for a staggered rise ---------- */
  function splitHeading(h) {
    var label = h.textContent.replace(/\s+/g, ' ').trim();
    var n = 0;
    function words(text, into) {
      text.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { into.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        var wi = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        wi.className = 'wi';
        wi.style.setProperty('--w', n++);
        wi.textContent = tok;
        w.appendChild(wi);
        into.appendChild(w);
      });
    }
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(h.childNodes).forEach(function (node) {
      if (node.nodeType === 3) words(node.textContent, frag);
      else if (node.nodeType === 1) {
        var shell = document.createElement('span');
        shell.className = 'hs-grad';
        words(node.textContent, shell);
        frag.appendChild(shell);
      }
    });
    h.textContent = '';
    h.appendChild(frag);
    h.setAttribute('aria-label', label);
    h.classList.add('is-split');
  }
  Array.prototype.forEach.call(document.querySelectorAll('.section-head .heading'), splitHeading);

  /* ---------- Reveal on scroll ---------- */
  // [data-stagger] containers hand out incremental delays to their children.
  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (parent) {
    var step = parseFloat(parent.getAttribute('data-stagger')) || 0.08;
    var variant = parent.getAttribute('data-stagger-variant') || 'up';
    Array.prototype.forEach.call(parent.children, function (child, i) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', variant);
      child.style.setProperty('--d', Math.min(i, 10) * step + 's');
    });
  });

  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var revealObserver = null;

  function reveal(el) { el.classList.add('in-view'); }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(reveal);
  } else {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // Exposed so home.js can register elements it renders later (skills grid).
  window.observeReveal = function (el, delay, variant) {
    if (variant) el.setAttribute('data-reveal', variant);
    else if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'up');
    if (delay != null) el.style.setProperty('--d', delay + 's');
    if (revealObserver) revealObserver.observe(el); else reveal(el);
  };

  /* ---------- Page-load entrance ---------- */
  // With the intro curtain (first visit of a session) the hero waits for the curtain to part.
  var introDelay = root.classList.contains('intro-play') ? 1250 : 0;
  var introStart = Date.now();
  function markLoaded() {
    if (root.classList.contains('loaded')) return;
    var wait = Math.max(0, introDelay - (Date.now() - introStart));
    window.setTimeout(function () { root.classList.add('loaded'); }, wait);
  }
  if (document.readyState === 'complete') markLoaded();
  else {
    window.addEventListener('load', markLoaded);
    window.setTimeout(markLoaded, 1800 + introDelay); // never leave the hero hidden if a CDN is slow
  }

  /* ---------- Existing behaviour: tab title when returning to the page ---------- */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') document.title = 'Portfolio | Krushna Kakde';
  });

  /* ---------- Existing behaviour: Tawk.to live chat widget ---------- */
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  (function () {
    var s1 = document.createElement('script');
    var s0 = document.getElementsByTagName('script')[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/60df10bf7f4b000ac03ab6a8/1f9jlirg6';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
  })();
})();
