/* ==========================================================================
   Cpp Hero — engine/fx.js
   Motion toolkit: reduced-motion detection, safe WAAPI wrapper (with timeout
   fallback so flows never depend on animation events), confetti/particles,
   shake, flash, count-up, spring poke, floating "+XP" text, toasts.
   Everything animates transform/opacity only (60fps).
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var SPRING = 'cubic-bezier(.34,1.56,.64,1)';

  var fx = (CH.fx = {});
  fx.SPRING = SPRING;
  fx.EASE_OUT = 'cubic-bezier(.22,.9,.3,1.05)';

  /** True when the OS or the in-app toggle asks for reduced motion. */
  fx.reduced = function () {
    var s = CH.store && CH.store.state;
    return !!((s && s.settings.reduceMotion) || mq.matches);
  };

  /** Motion-aware pause: shortened drastically under reduced motion. */
  fx.pause = function (ms) { return U.sleep(fx.reduced() ? Math.min(ms, 120) : ms); };

  /**
   * Animate with WAAPI; resolves on finish OR after duration+delay+80ms
   * (hidden tabs / unsupported browsers never block the flow).
   * opts.rm: 'skip' (default: no animation under reduced motion),
   *          'fade' (replace with a short opacity fade) or 'keep'.
   */
  fx.anim = function (el, keyframes, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve();
    var rm = fx.reduced(), mode = opts.rm || 'skip';
    if (rm && mode === 'skip') return Promise.resolve();
    var kf = keyframes, o = { duration: opts.duration || 300, easing: opts.easing || 'ease-out', delay: opts.delay || 0, fill: opts.fill || 'none' };
    if (rm && mode === 'fade') { kf = [{ opacity: 0 }, { opacity: 1 }]; o.duration = 140; o.easing = 'ease'; o.delay = 0; }
    if (!el.animate) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false, a;
      function fin() { if (!done) { done = true; resolve(a); } }
      try {
        a = el.animate(kf, o);
        a.onfinish = fin; a.oncancel = fin;
        el._lastAnim = a;
      } catch (e) { fin(); return; }
      // Fallback: if frames aren't being produced (hidden tab/pane), force the
      // end state so nothing is left stuck on a first keyframe.
      setTimeout(function () {
        try {
          if (a && a.playState !== 'finished' && a.playState !== 'idle') {
            if (o.fill === 'forwards' || o.fill === 'both') { try { a.finish(); } catch (e2) { a.cancel(); } }
            else a.cancel();   // drop the effect entirely → element shows its normal style
          }
        } catch (e) { /* ignore */ }
        fin();
      }, o.duration + o.delay + 120);
    });
  };

  /** Cancel running animations on an element. */
  fx.cancel = function (el) {
    if (el && el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
  };

  /** Springy pop-in (scale from small with overshoot). */
  fx.popIn = function (el, delay) {
    return fx.anim(el, [
      { transform: 'scale(.6)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.65 },
      { transform: 'none', opacity: 1 }
    ], { duration: 380, easing: 'ease-out', delay: delay || 0, fill: 'backwards', rm: 'fade' });
  };

  /** Slide up + fade in (explanations, cards). */
  fx.slideUp = function (el, delay) {
    return fx.anim(el, [
      { transform: 'translateY(40px) scale(.96)', opacity: 0 },
      { transform: 'translateY(-5px) scale(1.01)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 }
    ], { duration: 460, easing: fx.EASE_OUT, delay: delay || 0, fill: 'backwards', rm: 'fade' });
  };

  /** Small bounce ("boing") for confirmations. */
  fx.bounce = function (el) {
    return fx.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18) rotate(-4deg)' }, { transform: 'scale(1)' }],
      { duration: 380, easing: SPRING });
  };

  /** Horizontal shake (wrong answers). */
  fx.shake = function (el, strength) {
    var s = strength || 10;
    return fx.anim(el, [
      { transform: 'none' }, { transform: 'translateX(' + -s + 'px)' }, { transform: 'translateX(' + s * 0.9 + 'px)' },
      { transform: 'translateX(' + -s * 0.6 + 'px)' }, { transform: 'translateX(' + s * 0.4 + 'px)' }, { transform: 'none' }
    ], { duration: 420 });
  };

  /** Wiggle (locked things). */
  fx.wiggle = function (el) {
    return fx.anim(el, [{ transform: 'none' }, { transform: 'rotate(-9deg)', offset: 0.2 }, { transform: 'rotate(8deg)', offset: 0.45 },
      { transform: 'rotate(-4deg)', offset: 0.7 }, { transform: 'none' }], { duration: 450, easing: SPRING });
  };

  /** Full-screen color flash (gentle). Works under reduced motion (opacity only). */
  fx.flash = function (color) {
    var f = U.$('#flash');
    if (!f) return Promise.resolve();
    f.style.background = color || 'var(--coral)';
    return fx.anim(f, [{ opacity: 0 }, { opacity: 0.22 }, { opacity: 0 }], { duration: fx.reduced() ? 300 : 450, rm: 'keep' });
  };

  /** Count a number up inside an element (eased). */
  fx.countUp = function (el, from, to, dur, fmt) {
    fmt = fmt || function (n) { return n; };
    if (!el) return;
    if (fx.reduced() || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now(), D = dur || 800;
    cancelAnimationFrame(el._cu);
    function step(t) {
      var p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) el._cu = requestAnimationFrame(step);
    }
    el._cu = requestAnimationFrame(step);
    // Fallback if rAF is throttled (hidden tab).
    setTimeout(function () { el.textContent = fmt(to); }, D + 200);
  };

  /** Damped spring squash-and-stretch (poke Curlo, press big things). */
  fx.springPoke = function (el) {
    if (!el || fx.reduced()) return;
    var x = -0.2, v = 0, last = performance.now(), k = 320, d = 10;
    cancelAnimationFrame(el._raf);
    function f(t) {
      var dt = Math.min(0.032, (t - last) / 1000); last = t;
      v += (-k * x - d * v) * dt; x += v * dt;
      el.style.transform = 'scale(' + (1 - x) + ',' + (1 + x) + ')';
      if (Math.abs(x) > 0.002 || Math.abs(v) > 0.02) el._raf = requestAnimationFrame(f);
      else el.style.transform = '';
    }
    el.style.transformOrigin = '50% 100%';
    el._raf = requestAnimationFrame(f);
    setTimeout(function () { cancelAnimationFrame(el._raf); el.style.transform = ''; }, 1600);
  };

  /** Floating text rising from an element (e.g. "+20 XP", "-1"). */
  fx.floatText = function (el, text, cls) {
    var app = U.$('#app');
    if (!el || !app) return;
    var r = el.getBoundingClientRect(), ar = app.getBoundingClientRect();
    var t = U.h('<div class="floaty ' + (cls || '') + '" aria-hidden="true"></div>');
    t.textContent = text;
    t.style.left = (r.left - ar.left + r.width / 2) + 'px';
    t.style.top = (r.top - ar.top + r.height / 3) + 'px';
    app.appendChild(t);
    fx.anim(t, [
      { transform: 'translate(-50%,0) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-18px) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-56px) scale(1)', opacity: 0 }
    ], { duration: 1000, easing: 'ease-out', rm: 'fade' }).then(function () { t.remove(); });
    setTimeout(function () { t.remove(); }, 1400);
  };

  /* ---------------- toast ---------------- */
  var toastTimer = 0;
  fx.toast = function (msg, opts) {
    var t = U.$('#toast');
    if (!t) return;
    opts = opts || {};
    t.innerHTML = (opts.icon || '') + '<span>' + (opts.html ? msg : U.esc(msg)) + '</span>';
    t.className = 'toast show' + (opts.kind ? ' ' + opts.kind : '');
    fx.cancel(t);
    fx.anim(t, [
      { opacity: 0, transform: 'translate(-50%,-60px) scale(.8)' },
      { opacity: 1, transform: 'translate(-50%,6px) scale(1.04)', offset: 0.6 },
      { opacity: 1, transform: 'translate(-50%,0) scale(1)' }
    ], { duration: 380, easing: 'ease-out', rm: 'fade' });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      fx.anim(t, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-30px)' }], { duration: 260, rm: 'keep' })
        .then(function () { t.className = 'toast'; });
    }, opts.ms || 2600);
  };

  /* ---------------- confetti / particles (canvas) ---------------- */
  var cv = null, cx = null, parts = [], craf = 0, W = 0, H = 0;
  var COLORS = ['#F2641B', '#FFC62E', '#FF5A70', '#0FA898', '#3D8BFF', '#ffffff'];

  function ensureCanvas() {
    if (cv) return true;
    cv = U.$('#confetti');
    if (!cv) return false;
    cx = cv.getContext('2d');
    return !!cx;
  }
  function sizeCanvas() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (r.width !== W || r.height !== H) {
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /**
   * Burst particles at (x,y) in #app coordinates.
   * opts: { n, colors, spread (radians), speed, up (bool: shoot upward), gravity, shapes }
   */
  fx.burst = function (x, y, opts) {
    if (fx.reduced() || !ensureCanvas()) return;
    opts = opts || {};
    sizeCanvas();
    var n = opts.n || 80, colors = opts.colors || COLORS, spread = opts.spread || 2.4, sp = opts.speed || 1;
    for (var i = 0; i < n; i++) {
      var a = (opts.up === false ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * spread);
      var s = (5 + Math.random() * 9) * sp;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: opts.gravity != null ? opts.gravity : 0.28 + Math.random() * 0.12,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6,
        c: colors[i % colors.length], sh: opts.shape != null ? opts.shape : i % 3, life: 0, max: opts.life || 240
      });
    }
    if (!craf) craf = requestAnimationFrame(tick);
  };

  /** Burst from the center of an element. */
  fx.burstAt = function (el, opts) {
    var app = U.$('#app');
    if (!el || !app) return;
    var r = el.getBoundingClientRect(), ar = app.getBoundingClientRect();
    fx.burst(r.left - ar.left + r.width / 2, r.top - ar.top + r.height / 2, typeof opts === 'number' ? { n: opts } : opts);
  };

  /** Confetti rain from the top edge (big celebrations). */
  fx.rain = function (n) {
    if (fx.reduced() || !ensureCanvas()) return;
    sizeCanvas();
    for (var i = 0; i < (n || 140); i++) {
      parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
        g: 0.05, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6,
        c: COLORS[i % COLORS.length], sh: i % 3, life: 0, max: 420 });
    }
    if (!craf) craf = requestAnimationFrame(tick);
  };

  function tick() {
    sizeCanvas();
    cx.clearRect(0, 0, W, H);
    parts = parts.filter(function (p) { return p.y < H + 30 && p.life < p.max; });
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.life++; p.vx *= 0.985; p.vy = p.vy * 0.985 + p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save();
      cx.globalAlpha = p.life > p.max - 30 ? Math.max(0, (p.max - p.life) / 30) : 1;
      cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      if (p.sh === 0) cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else if (p.sh === 1) { cx.beginPath(); cx.arc(0, 0, p.h / 1.4, 0, 7); cx.fill(); }
      else { cx.beginPath(); cx.moveTo(0, -p.w / 2); cx.lineTo(p.w / 2, p.w / 2); cx.lineTo(-p.w / 2, p.w / 2); cx.closePath(); cx.fill(); }
      cx.restore();
    }
    craf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!craf) cx.clearRect(0, 0, W, H);
  }

  fx.clearConfetti = function () { parts = []; if (cx) cx.clearRect(0, 0, W, H); };

  /** Expanding ring (shield impact). `host` must be position:relative. */
  fx.shock = function (host, x, y, color) {
    if (!host) return;
    var s = U.h('<div class="shock" aria-hidden="true"></div>');
    s.style.left = (x - 35) + 'px'; s.style.top = (y - 35) + 'px';
    if (color) s.style.borderColor = color;
    host.appendChild(s);
    fx.anim(s, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(2)', opacity: 0 }], { duration: 500 })
      .then(function () { s.remove(); });
    setTimeout(function () { s.remove(); }, 900);
  };

  /** Re-trigger a CSS animation class safely (with removal fallback). */
  fx.cssPulse = function (el, cls, ms) {
    if (!el || fx.reduced()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el['_cp_' + cls]);
    el['_cp_' + cls] = setTimeout(function () { el.classList.remove(cls); }, ms || 1600);
  };

  /** Apply the in-app reduced-motion class to the root. */
  fx.syncReduced = function () {
    var s = CH.store && CH.store.state;
    document.documentElement.classList.toggle('rm', !!(s && s.settings.reduceMotion));
    if (fx.reduced()) fx.clearConfetti();
  };
})();
