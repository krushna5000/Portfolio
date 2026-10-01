/* ==========================================================================
   project-modal.js — project detail view (index.html).

   Content is read from the card that was clicked (title, description, tags,
   links, cover) — nothing is duplicated. If a card has data-detail="page.html",
   that existing page is fetched once and its overview, feature list and
   screenshots are reused. Optional data-problem / data-solution attributes on a
   card add those sections; when absent they are simply not shown.

   Motion: the dialog opens by expanding from the card's own rectangle
   (clip-path FLIP — no content distortion), then content staggers in.
   Accessibility: role=dialog, focus trap, Esc, focus restored, background inert.
   ========================================================================== */
(function () {
  'use strict';

  var grid = document.querySelector('.projects-container');
  if (!grid) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CATEGORY = { web: 'Web', mobile: 'Mobile', backend: 'Backend', ml: 'ML / AI' };
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var detailCache = {};

  /* ---------- build the dialog once ---------- */
  var root = document.createElement('div');
  root.className = 'pm';
  root.hidden = true;
  root.innerHTML =
    '<div class="pm__backdrop"></div>' +
    '<div class="pm__panel" role="dialog" aria-modal="true" aria-labelledby="pm-title" tabindex="-1">' +
      '<button class="pm__close" type="button" aria-label="Close project details"><i class="fas fa-times"></i></button>' +
      '<div class="pm__cover"></div>' +
      '<div class="pm__body">' +
        '<span class="pm__eyebrow pm-s"></span>' +
        '<h3 class="pm__title pm-s" id="pm-title"></h3>' +
        '<p class="pm__desc pm-s"></p>' +
        '<div class="pm__grid">' +
          '<div class="pm__main">' +
            '<section class="pm__sec pm-s" data-sec="problem" hidden><h4>Problem</h4><p></p></section>' +
            '<section class="pm__sec pm-s" data-sec="solution" hidden><h4>Solution</h4><p></p></section>' +
            '<section class="pm__sec pm-s" data-sec="features" hidden><h4>Key features</h4><ul class="pm__features"></ul></section>' +
          '</div>' +
          '<aside class="pm__side">' +
            '<h4 class="pm-s">Technologies</h4><div class="pm__tech"></div>' +
            '<h4 class="pm-s">Links</h4><div class="pm__links"></div>' +
          '</aside>' +
        '</div>' +
        '<section class="pm__sec pm__gallery-wrap pm-s" data-sec="gallery" hidden><h4>Screenshots</h4><div class="pm__gallery"></div></section>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var panel = root.querySelector('.pm__panel');
  var backdrop = root.querySelector('.pm__backdrop');
  var closeBtn = root.querySelector('.pm__close');
  var cover = root.querySelector('.pm__cover');
  var el = {
    eyebrow: root.querySelector('.pm__eyebrow'),
    title: root.querySelector('.pm__title'),
    desc: root.querySelector('.pm__desc'),
    tech: root.querySelector('.pm__tech'),
    links: root.querySelector('.pm__links'),
    features: root.querySelector('.pm__features'),
    gallery: root.querySelector('.pm__gallery')
  };
  function sec(name) { return root.querySelector('[data-sec="' + name + '"]'); }

  var state = { open: false, card: null, lastFocus: null, animating: false };

  /* ---------- content ---------- */
  function fill(card) {
    var cat = card.getAttribute('data-category');
    var featured = card.classList.contains('featured');
    el.eyebrow.textContent = (CATEGORY[cat] || 'Project') + (featured ? ' · Featured' : '');
    el.title.textContent = card.querySelector('h3').textContent.trim();
    var p = card.querySelector('p');
    el.desc.textContent = p ? p.textContent.replace(/\s+/g, ' ').trim() : '';

    // cover: clone the card's own cover (gradient/icon or screenshot)
    cover.textContent = '';
    var srcCover = card.querySelector('.project-cover');
    if (srcCover) {
      var c = srcCover.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.card-open, .featured-badge'), function (n) { n.remove(); });
      Array.prototype.forEach.call(c.querySelectorAll('img'), function (img) { img.removeAttribute('loading'); });
      cover.appendChild(c);
    }

    // technologies
    el.tech.textContent = '';
    Array.prototype.forEach.call(card.querySelectorAll('.project-tech .tech-tag'), function (t) {
      var s = document.createElement('span');
      s.className = 'tech-tag pm-s';
      s.textContent = t.textContent.trim();
      el.tech.appendChild(s);
    });

    // links: reuse the card's own anchors so URLs live in exactly one place
    el.links.textContent = '';
    Array.prototype.forEach.call(card.querySelectorAll('.project-links a'), function (a) {
      var n = a.cloneNode(true);
      n.classList.add('pm-s');
      el.links.appendChild(n);
    });

    // optional authored sections
    ['problem', 'solution'].forEach(function (k) {
      var s = sec(k);
      var txt = card.getAttribute('data-' + k);
      s.hidden = !txt;
      if (txt) s.querySelector('p').textContent = txt;
    });

    // reset detail-derived parts
    sec('features').hidden = true;
    el.features.textContent = '';
    sec('gallery').hidden = true;
    el.gallery.textContent = '';
  }

  function loadDetail(card) {
    var url = card.getAttribute('data-detail');
    if (!url) return;
    var p = detailCache[url] || (detailCache[url] = fetch(url).then(function (r) { return r.text(); }).then(parseDetail));
    p.then(function (d) {
      if (!d || state.card !== card) return;
      if (d.overview) el.desc.textContent = d.overview;
      if (d.features.length) {
        d.features.forEach(function (f) {
          var li = document.createElement('li');
          li.className = 'pm-s';
          var b = document.createElement('strong');
          b.textContent = f.title;
          li.appendChild(b);
          li.appendChild(document.createTextNode(' ' + f.text));
          el.features.appendChild(li);
        });
        sec('features').hidden = false;
      }
      if (d.shots.length) {
        d.shots.forEach(function (s) {
          var fig = document.createElement('figure');
          var img = document.createElement('img');
          img.src = s.src;
          img.alt = s.alt;
          img.loading = 'lazy';
          var cap = document.createElement('figcaption');
          cap.textContent = s.caption;
          fig.appendChild(img);
          fig.appendChild(cap);
          el.gallery.appendChild(fig);
        });
        sec('gallery').hidden = false;
      }
      stagger();
    }).catch(function () { /* e.g. opened from file:// — the card data alone is enough */ });
  }

  function parseDetail(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var d = { overview: '', features: [], shots: [] };
    var details = doc.querySelector('.project-details');
    if (!details) return d;
    var first = details.querySelector('p');
    if (first) d.overview = first.textContent.replace(/\s+/g, ' ').trim();
    Array.prototype.forEach.call(details.querySelectorAll('h3'), function (h) {
      if (/feature/i.test(h.textContent) && h.nextElementSibling && h.nextElementSibling.tagName === 'UL') {
        Array.prototype.forEach.call(h.nextElementSibling.children, function (li) {
          var s = li.querySelector('strong');
          var title = s ? s.textContent.replace(/:\s*$/, '') : '';
          var rest = li.textContent.replace(s ? s.textContent : '', '').replace(/\s+/g, ' ').trim();
          d.features.push({ title: title, text: rest });
        });
      }
    });
    Array.prototype.forEach.call(details.querySelectorAll('.project-image-gallery'), function (img) {
      var cap = img.previousElementSibling && img.previousElementSibling.tagName === 'P' ? img.previousElementSibling.textContent.trim() : '';
      d.shots.push({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '', caption: cap });
    });
    return d;
  }

  function stagger() {
    Array.prototype.forEach.call(panel.querySelectorAll('.pm-s'), function (n, i) { n.style.setProperty('--i', i); });
  }

  /* ---------- motion ---------- */
  function insetFrom(cardRect, panelRect, radius) {
    var t = cardRect.top - panelRect.top;
    var l = cardRect.left - panelRect.left;
    var r = panelRect.right - cardRect.right;
    var b = panelRect.bottom - cardRect.bottom;
    return 'inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px round ' + radius + 'px)';
  }

  function panelRadius() { return parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0; }

  function inViewport(rect) { return rect.bottom > 40 && rect.top < window.innerHeight - 40 && rect.width > 0; }

  function lockScroll(lock) {
    var body = document.body;
    if (lock) {
      body.style.setProperty('--sbw', (window.innerWidth - document.documentElement.clientWidth) + 'px');
      body.classList.add('modal-open');
    } else {
      body.classList.remove('modal-open');
      body.style.removeProperty('--sbw');
    }
    Array.prototype.forEach.call(document.querySelectorAll('main, .site-header, .footer, #scroll-top'), function (n) {
      if (lock) n.setAttribute('inert', ''); else n.removeAttribute('inert');
    });
  }

  function open(card) {
    if (state.open || state.animating || !card) return;
    state.card = card;
    state.lastFocus = document.activeElement;
    fill(card);
    stagger();

    var cardRect = card.getBoundingClientRect();
    root.hidden = false;
    root.classList.remove('is-closing');
    lockScroll(true);
    panel.scrollTop = 0;
    var panelRect = panel.getBoundingClientRect();

    state.open = true;
    root.classList.add('is-open');
    loadDetail(card);

    if (reduce) {
      backdrop.style.opacity = 1;
      closeBtn.focus();
      return;
    }

    state.animating = true;
    var radius = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0;
    var fromClip = inViewport(cardRect) ? insetFrom(cardRect, panelRect, 18) : 'inset(14% 14% 14% 14% round 24px)';
    var a = panel.animate(
      [{ clipPath: fromClip, opacity: inViewport(cardRect) ? 1 : 0 }, { clipPath: 'inset(0px 0px 0px 0px round ' + radius + 'px)', opacity: 1 }],
      { duration: 650, easing: EASE, fill: 'none' }
    );
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out', fill: 'forwards' });
    a.onfinish = function () { state.animating = false; };
    setTimeout(function () { state.animating = false; }, 700); // never stay locked if frames are throttled
    setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 120);
  }

  function close() {
    if (!state.open || state.animating) return;
    var card = state.card;
    state.open = false;

    var finish = function () {
      root.hidden = true;
      root.classList.remove('is-open', 'is-closing');
      backdrop.style.opacity = '';
      lockScroll(false);
      state.animating = false;
      if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
    };

    if (reduce) { finish(); return; }

    state.animating = true;
    root.classList.add('is-closing');
    var cardRect = card.getBoundingClientRect();
    var panelRect = panel.getBoundingClientRect();
    var toClip = inViewport(cardRect) ? insetFrom(cardRect, panelRect, 18) : 'inset(14% 14% 14% 14% round 24px)';
    var a = panel.animate(
      [{ clipPath: 'inset(0px 0px 0px 0px round ' + panelRadius() + 'px)', opacity: 1 }, { clipPath: toClip, opacity: inViewport(cardRect) ? 1 : 0 }],
      { duration: 480, easing: EASE, fill: 'forwards' }
    );
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
    // Timer fallback: if frames are throttled (background tab) the dialog must still close.
    var done = false;
    var end = function () { if (done) return; done = true; a.cancel(); finish(); };
    a.onfinish = end;
    setTimeout(end, 650);
  }

  /* ---------- events ---------- */
  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.project-card');
    if (!card) return;
    if (e.target.closest('a')) return;                       // real links keep working
    var sel = window.getSelection && String(window.getSelection());
    if (sel) return;                                         // don't hijack text selection
    open(card);
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {                                   // focus trap
      var f = panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.ProjectModal = { open: open, close: close };
})();
