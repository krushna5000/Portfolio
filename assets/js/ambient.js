/* ==========================================================================
   ambient.js — subtle drifting particles inside the fixed .ambient layer.

   Deliberately small:
     - desktop-class devices only (fine pointer, >= 900px, motion allowed)
     - ~30-45 tiny dots, no connecting lines, one <canvas>, DPR capped at 1.5
     - repels gently from the pointer
     - pauses when the tab is hidden; self-throttles if frames run slow
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var host = document.querySelector('.ambient');
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  if (!host || mq('(prefers-reduced-motion: reduce)') || !mq('(hover: hover) and (pointer: fine)') || window.innerWidth < 900) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'ambient__particles';
  canvas.setAttribute('aria-hidden', 'true');
  host.insertBefore(canvas, host.querySelector('.ambient__noise'));
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var w = 0, h = 0, dpr = 1;
  var particles = [];
  var pointer = { x: -9999, y: -9999 };
  var running = false, last = 0, slowFrames = 0, frames = 0;
  var rgb = '99,102,241';

  function readColor() {
    rgb = root.getAttribute('data-theme') === 'light' ? '79,70,229' : '129,200,255';
  }
  readColor();
  new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function seed() {
    var count = Math.min(44, Math.max(18, Math.round((w * h) / 42000)));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.4,
        vy: -(6 + Math.random() * 14),          // px per second, drifting upwards
        vx: (Math.random() - 0.5) * 6,
        ph: Math.random() * Math.PI * 2,
        tw: 0.6 + Math.random() * 1.2
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Self-throttle: if 60 frames average > 24ms, halve the particles once, then stop.
    frames++;
    if (dt > 0.024) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45) {
        if (particles.length > 12) particles.length = Math.floor(particles.length / 2);
        else { stop(); canvas.remove(); return; }
      }
      frames = 0; slowFrames = 0;
    }

    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.ph += p.tw * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      var dx = p.x - pointer.x, dy = p.y - pointer.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 16000) {                       // within ~126px: ease away from the cursor
        var d = Math.sqrt(d2) || 1;
        var push = (1 - d / 126) * 40 * dt;
        p.x += (dx / d) * push;
        p.y += (dy / d) * push;
      }

      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;

      var a = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(p.ph));
      ctx.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { pointer.x = pointer.y = -9999; });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });

  resize();
  start();
})();
