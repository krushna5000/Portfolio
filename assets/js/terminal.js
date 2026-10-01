/* ==========================================================================
   terminal.js — the interactive "explore by command" terminal (index.html).

   A purely front-end toy: every answer is read from content already on the page
   (experience, projects, skills, education, links) so nothing is duplicated and
   nothing pretends to be live system status. Output is always inserted as text.
   ========================================================================== */
(function () {
  'use strict';

  var term = document.querySelector('.terminal');
  if (!term) return;

  var out = term.querySelector('.terminal__out');
  var form = term.querySelector('.terminal__form');
  var input = term.querySelector('.terminal__input');
  var chips = document.querySelectorAll('[data-cmd]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var history = [];
  var hIdx = 0;
  var busy = false;
  var timers = [];

  /* ---------- helpers ---------- */
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function line(text, cls, delay) {
    var d = document.createElement('div');
    d.className = 't-line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    if (delay) d.style.animationDelay = delay + 'ms';
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
    return d;
  }

  // Print several lines with a tiny stagger so output "streams" in.
  function lines(arr, cls) {
    arr.forEach(function (t, i) { line(t, cls, reduce ? 0 : Math.min(i, 14) * 45); });
  }

  function text(sel, ctx) { var el = (ctx || document).querySelector(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function projectCards() { return Array.prototype.slice.call(document.querySelectorAll('.project-card')); }

  var SECTIONS = {
    home: '#home', top: '#home', about: '#about', experience: '#experience', projects: '#github-projects',
    skills: '#skills', education: '#education', certs: '#certificates', certifications: '#certificates',
    terminal: '#terminal', contact: '#contact'
  };

  function go(name) {
    var sel = SECTIONS[name];
    var el = sel && document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    return true;
  }

  function href(sel) { var a = document.querySelector(sel); return a ? a.getAttribute('href') : null; }

  /* ---------- commands ---------- */
  var COMMANDS = {
    help: {
      desc: 'list available commands',
      run: function () {
        lines([
          'Available commands:',
          '  whoami          who is this?',
          '  about           short bio',
          '  mern            the MERN stack and how I use it',
          '  neofetch        quick profile card',
          '  experience      work history',
          '  projects        list projects  (then: open <number>)',
          '  skills          tech stack      (skills <frontend|backend|database|tools>)',
          '  education       degrees',
          '  contact         ways to reach me',
          '  resume          download my resume',
          '  github | linkedin   open profiles',
          '  ls | goto <section>  jump around the page',
          '  theme           toggle light / dark',
          '  clear           clear the screen'
        ]);
      }
    },
    whoami: { desc: '', run: function () { line('Krushna Vasant Kakde — Software Developer @ Devanta Tech'); } },
    about: {
      run: function () { lines([text('.bento__bio p') || 'Full-Stack Software Developer.']); }
    },
    mern: {
      run: function () {
        lines([
          'MERN stack — what I use each part for:',
          '  M  MongoDB     document data modelling',
          '  E  Express.js  RESTful APIs, JWT auth, role-based access',
          '  R  React.js    responsive, component-driven interfaces',
          '  N  Node.js     server runtime behind the API layer',
          '',
          'Used in production at Devanta Tech and Farmseasy.'
        ], 't-accent');
      }
    },
    neofetch: {
      run: function () {
        var role = text('.bento__now h4') + ' @ ' + (text('.bento__now p').split('·')[0] || '').trim();
        var stack = 'MERN — MongoDB · Express.js · React.js · Node.js (+ PostgreSQL)';
        lines([
          'krushna@portfolio',
          '-----------------',
          'Role      ' + role + ' · MERN stack',
          'Location  ' + text('.bento__photo-tag'),
          'Stack     ' + stack,
          'Focus     IIoT · Cloud automation · REST APIs',
          'Education ' + text('.education .box h3') + ', ' + text('.education .box .content > p')
        ], 't-accent');
      }
    },
    experience: {
      run: function () {
        var items = document.querySelectorAll('.exp-item');
        var rows = ['Experience:'];
        Array.prototype.forEach.call(items, function (it, i) {
          var h3 = it.querySelector('h3');
          var title = h3 && h3.firstChild ? h3.firstChild.textContent.trim() : '';
          var co = it.querySelector('.exp-company');
          var company = co ? Array.prototype.filter.call(co.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join('').trim() : '';
          rows.push('  ' + (i + 1) + '. ' + title + ' · ' + company + ' · ' + text('.exp-duration', it));
        });
        lines(rows);
      }
    },
    projects: {
      run: function () {
        var rows = ['Projects  (type "open <number>" for the detail view):'];
        projectCards().forEach(function (c, i) {
          rows.push('  ' + String(i + 1).padStart(2, ' ') + '. ' + text('h3', c) + '  [' + (c.getAttribute('data-category') || '') + ']');
        });
        lines(rows);
      }
    },
    open: {
      run: function (args) {
        var cards = projectCards();
        var q = (args[0] || '').toLowerCase();
        var card = /^\d+$/.test(q) ? cards[parseInt(q, 10) - 1] : cards.filter(function (c) { return text('h3', c).toLowerCase().indexOf(args.join(' ').toLowerCase()) > -1; })[0];
        if (!card) { line('open: no such project. Run "projects" to list them.', 't-err'); return; }
        line('Opening ' + text('h3', card) + ' …');
        if (window.ProjectModal) window.ProjectModal.open(card);
      }
    },
    skills: {
      run: function (args) {
        var data = window.PortfolioData && window.PortfolioData.skills;
        if (!data) { line('Skills are still loading — try again in a second.', 't-err'); return; }
        var want = (args[0] || '').toLowerCase();
        var groups = { frontend: 'Frontend', backend: 'Backend', database: 'Database', tools: 'Tools & DevOps' };
        var keys = want && groups[want] ? [want] : Object.keys(groups);
        keys.forEach(function (k) {
          var names = data.filter(function (s) { return s.category === k; }).map(function (s) { return s.name; });
          line(groups[k] + ': ' + names.join(', '));
        });
      }
    },
    education: {
      run: function () {
        var rows = ['Education:'];
        Array.prototype.forEach.call(document.querySelectorAll('.education .box'), function (b) {
          rows.push('  ' + text('h3', b) + ' — ' + text('.content > p', b) + ' (' + text('.year', b) + ')');
        });
        lines(rows);
      }
    },
    contact: {
      run: function () {
        lines([
          'Email     ' + (href('.contact-links a[href^="mailto:"]') || '').replace('mailto:', ''),
          'LinkedIn  ' + href('.contact-links a[href*="linkedin"]'),
          'GitHub    ' + href('.contact-links a[href*="github.com"]'),
          'WhatsApp  ' + href('.contact-links a[href*="wa.me"]'),
          '',
          'Tip: "goto contact" scrolls to the form.'
        ]);
      }
    },
    resume: {
      run: function () {
        var a = document.querySelector('a[download][href$=".pdf"]');
        if (!a) { line('Resume link not found.', 't-err'); return; }
        line('Downloading ' + a.getAttribute('download') + ' …');
        var tmp = document.createElement('a');
        tmp.href = a.getAttribute('href');
        tmp.download = a.getAttribute('download');
        document.body.appendChild(tmp);
        tmp.click();
        tmp.remove();
      }
    },
    github: { run: function () { openLink(href('.contact-links a[href*="github.com"]'), 'GitHub'); } },
    linkedin: { run: function () { openLink(href('.contact-links a[href*="linkedin"]'), 'LinkedIn'); } },
    ls: { run: function () { line(Object.keys(SECTIONS).filter(function (k) { return k !== 'top' && k !== 'certifications'; }).join('   ')); } },
    goto: {
      run: function (args) {
        var name = (args[0] || '').toLowerCase();
        if (go(name)) line('→ ' + name); else line('goto: unknown section "' + name + '". Try "ls".', 't-err');
      }
    },
    theme: {
      run: function () {
        var btn = document.getElementById('theme-toggle');
        if (btn) { btn.click(); line('Theme switched → ' + document.documentElement.getAttribute('data-theme')); }
      }
    },
    clear: { run: function () { out.textContent = ''; } },
    sudo: {
      run: function (args) {
        if (args.join(' ').toLowerCase().indexOf('hire') === 0) {
          line('[sudo] password for recruiter: ********');
          line('✓ Permission granted — opening contact…', 't-ok', 350);
          later(function () {
            go('contact');
            later(function () { var n = document.getElementById('f-name'); if (n) n.focus({ preventScroll: true }); }, reduce ? 0 : 900);
          }, reduce ? 0 : 800);
        } else {
          line('sudo: you are not in the sudoers file. This incident will be reported. 😉', 't-err');
        }
      }
    }
  };
  COMMANDS.cd = COMMANDS.goto;

  function openLink(url, label) {
    if (!url) { line('Link not found.', 't-err'); return; }
    line('Opening ' + label + ' …');
    window.open(url, '_blank', 'noopener');
  }

  /* ---------- execution ---------- */
  function execute(raw) {
    var cmd = raw.trim();
    line('$ ' + cmd, 't-cmd');
    if (!cmd) return;
    history.push(cmd);
    hIdx = history.length;

    var parts = cmd.split(/\s+/);
    var name = parts[0].toLowerCase();
    var cmdObj = COMMANDS[name];
    if (cmdObj) {
      try { cmdObj.run(parts.slice(1)); } catch (err) { line('error: ' + err.message, 't-err'); }
    } else {
      line('command not found: ' + name + '. Type "help".', 't-err');
    }
  }

  // Type the command into the prompt, then run it (used by the quick-command chips).
  function typeAndRun(cmd) {
    if (busy) return;
    clearTimers();
    if (reduce) { input.value = ''; execute(cmd); return; }
    busy = true;
    input.value = '';
    var i = 0;
    (function step() {
      if (i < cmd.length) { input.value += cmd.charAt(i++); later(step, 28); }
      else later(function () { input.value = ''; busy = false; execute(cmd); }, 220);
    })();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    clearTimers();
    var v = input.value;
    input.value = '';
    execute(v);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIdx > 0) { hIdx--; input.value = history[hIdx]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIdx < history.length - 1) { hIdx++; input.value = history[hIdx]; } else { hIdx = history.length; input.value = ''; }
    } else if (e.key === 'Tab') {
      var v = input.value.trim().toLowerCase();
      if (!v) return;
      var hits = Object.keys(COMMANDS).filter(function (k) { return k.indexOf(v) === 0; });
      if (hits.length === 1) { e.preventDefault(); input.value = hits[0] + ' '; }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      COMMANDS.clear.run();
    }
  });

  // clicking the window focuses the prompt (without scrolling the page)
  term.addEventListener('click', function (e) {
    if (e.target.closest('button, a')) return;
    var sel = window.getSelection && String(window.getSelection());
    if (!sel) input.focus({ preventScroll: true });
  });

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () { typeAndRun(chip.getAttribute('data-cmd')); });
  });

  /* ---------- auto-play intro (visual demo) when first scrolled into view ---------- */
  var intro = [
    ['$ npm run dev', 't-cmd', 0],
    ['> portfolio dev', 't-dim', 450],
    ['✓ Styles compiled', 't-ok', 850],
    ['✓ Scripts loaded', 't-ok', 1150],
    ['✓ Ready — type "help" or tap a command below', 't-ok', 1500]
  ];
  function playIntro() {
    if (reduce) { intro.forEach(function (r) { line(r[0], r[1]); }); return; }
    intro.forEach(function (r) { later(function () { line(r[0], r[1]); }, r[2]); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); playIntro(); }
    }, { threshold: 0.35 });
    io.observe(term);
  } else {
    playIntro();
  }
})();
