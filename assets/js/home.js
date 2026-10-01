/* ==========================================================================
   home.js — index.html only.
   Hero name animation, typing roles, project search + filters, tech-stack
   rendering from skills.json, and contact-form feedback.
   The contact form itself still POSTs natively to Web3Forms (unchanged).
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Hero name: split into words/characters for a staggered entrance ---------- */
  function initHeroName() {
    var el = document.querySelector('[data-split]');
    if (!el) return;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var words = label.split(' ');
    el.setAttribute('aria-label', label);
    el.innerHTML = '';

    var n = 0;
    words.forEach(function (word, wi) {
      var w = document.createElement('span');
      w.className = 'hero__word' + (wi === words.length - 1 ? ' grad-word' : '');
      w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.className = 'hero__char';
        c.style.setProperty('--n', n++);
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });

    // Chars are separate layers, so give each the slice of the word's gradient it would
    // have had as one run of text. Re-measured on resize (font-size is fluid).
    function alignGradient() {
      Array.prototype.forEach.call(el.querySelectorAll('.grad-word'), function (w) {
        var width = w.offsetWidth;
        Array.prototype.forEach.call(w.children, function (c) {
          c.style.backgroundSize = (width + 12) + 'px 100%';
          c.style.backgroundPosition = -c.offsetLeft + 'px 0';
        });
      });
    }
    alignGradient();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignGradient);
    window.addEventListener('resize', debounce(alignGradient, 150));
  }

  /* ---------- Typing roles (existing behaviour) ---------- */
  function initTypingAnimation() {
    if (typeof Typed === 'undefined') return;
    var target = document.querySelector('.typing-text');
    if (!target) return;
    new Typed('.typing-text', {
      strings: [
        'Full Stack Development',
        'Frontend Engineering',
        'Backend Engineering',
        'Mobile App Development',
        'API Design',
        'Database Management'
      ],
      loop: true,
      typeSpeed: 55,
      backSpeed: 28,
      backDelay: 1400,
      startDelay: 400,
      fadeOut: true,
      fadeOutClass: 'typed-fade-out',
      fadeOutDelay: 400
    });
  }

  /* ---------- Project filtering + search (existing logic, plus empty state) ---------- */
  function initProjectFilters() {
    var section = document.querySelector('.github-projects');
    var filterBtns = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('.project-card');
    var searchInput = document.getElementById('project-search');
    var countEl = document.getElementById('project-count');
    var emptyEl = document.getElementById('project-empty');

    if (!section || !cards.length) return;

    function matchesFilter(card, value) {
      if (!value || value === 'all') return true;
      return card.getAttribute('data-category') === value;
    }

    function matchesQuery(card, query) {
      if (!query) return true;
      var h3 = card.querySelector('h3');
      var p = card.querySelector('p');
      var name = (h3 ? h3.textContent : '').toLowerCase();
      var desc = (p ? p.textContent : '').toLowerCase();
      var techs = Array.prototype.map.call(card.querySelectorAll('.project-tech .tech-tag'), function (t) {
        return t.textContent.toLowerCase();
      }).join(' ');
      return (name + ' ' + desc + ' ' + techs).indexOf(query) > -1;
    }

    function applyFilters() {
      var active = document.querySelector('.filter-btn.active');
      var value = active ? active.getAttribute('data-filter') : 'all';
      var query = (searchInput && searchInput.value || '').trim().toLowerCase();
      var visible = 0;

      cards.forEach(function (card) {
        var show = matchesFilter(card, value) && matchesQuery(card, query);
        var wasHidden = card.style.display === 'none';
        card.style.display = show ? 'flex' : 'none';
        if (show) {
          visible++;
          if (wasHidden && !reduceMotion) {
            card.classList.remove('pop');
            void card.offsetWidth; // restart the animation
            card.classList.add('pop');
          }
        }
      });

      if (countEl) {
        countEl.textContent = (query || value !== 'all')
          ? 'Showing ' + visible + ' project' + (visible === 1 ? '' : 's')
          : 'Showing all';
      }
      if (emptyEl) emptyEl.hidden = visible !== 0;
    }

    filterBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        applyFilters();
      });
    });

    if (searchInput) searchInput.addEventListener('input', debounce(applyFilters, 150));
    applyFilters();
  }

  /* ---------- Tech stack: rendered from skills.json, grouped by category ---------- */
  var CATEGORIES = [
    { key: 'frontend', title: 'Frontend', icon: 'fa-laptop-code', blurb: 'Interfaces that feel fast and look sharp.' },
    { key: 'backend', title: 'Backend', icon: 'fa-server', blurb: 'Secure, well-structured services and APIs.' },
    { key: 'database', title: 'Database', icon: 'fa-database', blurb: 'Relational and NoSQL data, modelled with care.' },
    { key: 'tools', title: 'Tools & DevOps', icon: 'fa-screwdriver-wrench', blurb: 'Workflow, delivery and cloud tooling.' }
  ];

  function renderSkills(skills) {
    var container = document.getElementById('skillsContainer');
    if (!container) return;

    var groups = {};
    skills.forEach(function (s) {
      var key = s.category || 'tools';
      (groups[key] = groups[key] || []).push(s);
    });

    container.innerHTML = CATEGORIES.filter(function (c) { return groups[c.key] && groups[c.key].length; })
      .map(function (c) {
        var items = groups[c.key].map(function (s) {
          var note = s.note ? '<span class="tech-note"><strong>' + esc(s.name) + '</strong><small>' + esc(s.note) + '</small></span>' : '';
          return '<li class="tech-item" tabindex="0" data-letter="' + esc(s.name.charAt(0)) + '">' +
            '<span class="tech-icon"><img src="' + esc(s.icon) + '" alt="" loading="lazy" width="32" height="32"></span>' +
            '<span class="tech-name">' + esc(s.name) + '</span>' + note + '</li>';
        }).join('');
        return '<article class="tech-group card" data-spotlight>' +
          '<div class="tech-group__head">' +
            '<span class="tech-group__icon"><i class="fas ' + c.icon + '"></i></span>' +
            '<div><h3>' + esc(c.title) + '</h3><p>' + esc(c.blurb) + '</p></div>' +
            '<span class="tech-group__count">' + String(groups[c.key].length).padStart(2, '0') + '</span>' +
          '</div>' +
          '<ul class="tech-grid">' + items + '</ul>' +
        '</article>';
      }).join('');

    // Broken CDN icon → fall back to a letter tile instead of a broken image.
    container.addEventListener('error', function (e) {
      var img = e.target;
      if (img && img.tagName === 'IMG') {
        var tile = img.closest('.tech-item');
        var box = tile && tile.querySelector('.tech-icon');
        img.remove();
        if (tile) { tile.classList.add('no-icon'); if (box) box.textContent = tile.getAttribute('data-letter'); }
      }
    }, true);

    if (window.observeReveal) {
      Array.prototype.forEach.call(container.querySelectorAll('.tech-group'), function (g, gi) {
        window.observeReveal(g, gi * 0.1, 'up');
        Array.prototype.forEach.call(g.querySelectorAll('.tech-item'), function (item, i) {
          item.style.setProperty('--i', i);
        });
      });
    }
  }

  /* ---------- Tech marquee: two counter-scrolling rows built from the same skills data ---------- */
  function renderMarquee(skills) {
    var host = document.querySelector('.marquee');
    if (!host) return;
    var rows = [
      skills.filter(function (s) { return s.category === 'frontend' || s.category === 'backend'; }),
      skills.filter(function (s) { return s.category === 'database' || s.category === 'tools'; })
    ];
    host.innerHTML = rows.map(function (list, i) {
      var items = list.map(function (s) {
        return '<span class="m-item"><img src="' + esc(s.icon) + '" alt="" loading="lazy" width="22" height="22"><span>' + esc(s.name) + '</span></span>';
      }).join('');
      // content twice so the -50% loop is seamless
      return '<div class="marquee__row' + (i ? ' marquee__row--rev' : '') + '"><div class="marquee__track">' + items + items + '</div></div>';
    }).join('');
    host.addEventListener('error', function (e) {
      if (e.target && e.target.tagName === 'IMG') e.target.style.display = 'none';
    }, true);
  }

  function loadSkills() {
    fetch('skills.json')
      .then(function (r) { return r.json(); })
      .then(function (skills) { renderSkills(skills); renderMarquee(skills); })
      .catch(function (err) { console.error('Error loading skills:', err); });
  }

  /* ---------- Contact form feedback (submission itself is untouched) ---------- */
  function initContactForm() {
    var form = document.querySelector('form[action*="web3forms"]');
    if (!form) return;

    var controls = form.querySelectorAll('input[name], textarea[name]');

    function fieldOf(control) { return control.closest('.field'); }

    function messageFor(control) {
      var v = control.validity;
      if (v.valueMissing) return 'This field is required.';
      if (v.typeMismatch) return 'Please enter a valid email address.';
      return control.validationMessage || 'Please check this field.';
    }

    function showError(control) {
      var field = fieldOf(control);
      if (!field) return;
      var msg = field.querySelector('.field-error');
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
      control.setAttribute('aria-invalid', 'true');
      if (msg) msg.textContent = messageFor(control);
      if (!reduceMotion) {
        field.classList.remove('shake');
        void field.offsetWidth;
        field.classList.add('shake');
      }
    }

    function clearError(control, markValid) {
      var field = fieldOf(control);
      if (!field) return;
      var msg = field.querySelector('.field-error');
      field.classList.remove('is-invalid', 'shake');
      control.removeAttribute('aria-invalid');
      if (msg) msg.textContent = '';
      field.classList.toggle('is-valid', !!markValid && control.value.trim() !== '' && control.checkValidity());
    }

    // Native validation still blocks an invalid submit; we only replace the browser bubble.
    form.addEventListener('invalid', function (e) {
      e.preventDefault();
      showError(e.target);
      var first = form.querySelector(':invalid');
      if (first === e.target) e.target.focus({ preventScroll: false });
    }, true);

    controls.forEach(function (control) {
      control.addEventListener('input', function () {
        var field = fieldOf(control);
        if (field && field.classList.contains('is-invalid') && control.checkValidity()) clearError(control, true);
      });
      control.addEventListener('blur', function () {
        if (control.type === 'hidden') return;
        if (control.value.trim() === '' && !control.required) { clearError(control, false); return; }
        if (control.checkValidity()) clearError(control, true);
      });
    });

    // Loading state (unchanged behaviour): spinner while Web3Forms handles the POST.
    form.addEventListener('submit', function () {
      var button = this.querySelector('button[type="submit"]');
      var originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      button.disabled = true;
      setTimeout(function () {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
    });
  }

  /* ---------- Existing behaviour: honour a #hash on first load once layout settles ---------- */
  function initHashScroll() {
    if (!window.location.hash) return;
    var target = document.querySelector(window.location.hash);
    if (!target) return;
    window.addEventListener('load', function () {
      setTimeout(function () { target.scrollIntoView(); }, 100);
    });
  }

  /* ---------- Timeline: line fills as the section scrolls through the viewport ---------- */
  function initTimeline() {
    var tl = document.querySelector('.exp-timeline');
    if (!tl) return;
    var spark = document.createElement('span');
    spark.className = 'tl-spark';
    spark.setAttribute('aria-hidden', 'true');
    tl.appendChild(spark);
    var prev = window.__onCoreScroll;
    function update() {
      var r = tl.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.6 - r.top) / r.height;
      tl.style.setProperty('--tl', Math.max(0, Math.min(1, p)).toFixed(4));
    }
    window.__onCoreScroll = function (y) { if (prev) prev(y); update(); };
    update();
  }

  initHeroName();
  initTypingAnimation();
  initProjectFilters();
  loadSkills();
  initContactForm();
  initTimeline();
  initHashScroll();
})();
