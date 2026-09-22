/* ==========================================================================
   Cpp Hero — engine/ui.js
   UI kit: inline icon set, HUD (hearts / streak / quests / XP), router with
   springy card-slide transitions, in-app dialogs (never confirm()), bottom
   sheets, and the big skippable celebration overlays (level-up, achievement,
   bug defeated, new gear, shield upgrade, evolution).
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util, E = CH.events;
  function S() { return CH.store.state; }

  var ui = (CH.ui = {});

  /* ======================================================================
     Icons (24x24 unless noted). Decorative: aria-hidden.
     ====================================================================== */
  var I = {
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#FF5A70" stroke="#D0324C" stroke-width="1.5"/><ellipse cx="8" cy="9" rx="1.8" ry="1.2" fill="#fff" opacity=".7"/>',
    flame: '<g class="fo"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 0-5 1-8z" fill="#F2641B"/><path d="M12 11c.5 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3.5.3 1 .8 1.3 1.2 1.3 0-1.3-.2-2 .3-3.3z" fill="#FFC62E"/></g>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    ok: '<circle cx="12" cy="12" r="11" fill="#077A6F"/><path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    no: '<circle cx="12" cy="12" r="11" fill="#D0324C"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/>',
    star: '<path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    map: '<path d="M4 20c3-1 3-5 8-6s5-5 8-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="6" r="2" fill="currentColor"/><circle cx="4" cy="20" r="2" fill="currentColor"/>',
    buddy: '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="6" y="4" width="12" height="16" rx="6"/><path d="M3 8c-1 2-1 6 0 8M21 8c1 2 1 6 0 8"/></g><circle cx="10" cy="11" r="1.2" fill="currentColor"/><circle cx="14" cy="11" r="1.2" fill="currentColor"/>',
    practice: '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></g><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
    vault: '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></g><path d="M9 8h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    bug: '<g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><ellipse cx="12" cy="14" rx="5.5" ry="6.5"/><path d="M12 8v12M6.5 11H3M21 11h-3.5M6.5 16H3.5M20.5 16H17.5M9 6L7 3.5M15 6l2-2.5"/></g>',
    freeze: '<g stroke="#3D8BFF" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><path d="M9 3.5L12 6l3-2.5M9 20.5L12 18l3 2.5"/></g>',
    quest: '<path d="M6 3h9l4 4v14H6z" fill="#FFEDB0" stroke="#D69500" stroke-width="2" stroke-linejoin="round"/><path d="M9 10h6M9 14h6M9 18h4" stroke="#BF4808" stroke-width="2" stroke-linecap="round"/>',
    target: '<circle cx="12" cy="12" r="9" fill="#FFD6DC"/><circle cx="12" cy="12" r="5.5" fill="#fff"/><circle cx="12" cy="12" r="2.5" fill="#FF5A70"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2" fill="#FF5A70"/><rect x="3" y="7" width="18" height="4" rx="1.5" fill="#FFC62E"/><path d="M12 7v13" stroke="#fff" stroke-width="2.4"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0" fill="none" stroke="#D69500" stroke-width="2"/>',
    bulb: '<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" fill="#FFC62E" stroke="#D69500" stroke-width="1.8"/><path d="M9.5 19h5M10.5 21.5h3" stroke="#2A2140" stroke-width="2" stroke-linecap="round"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    step: '<path d="M5 5l9 7-9 7z" fill="currentColor"/><rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor"/>',
    retype: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    next: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z" fill="#FFC62E" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    music: '<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3" fill="#FF5A70"/><circle cx="17.5" cy="16" r="3" fill="#0FA898"/>',
    motion: '<circle cx="12" cy="12" r="8" fill="#C4F1EA"/><path d="M9 9v6M15 9v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    text: '<path d="M4 19l5-14 5 14M5.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#fff"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#077A6F" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    shieldO: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9.5C7.4 20 4 16.5 4 12V6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
    warn: '<path d="M12 3l10 18H2z" fill="#fff"/><path d="M12 10v5M12 17.5v.5" stroke="#D0324C" stroke-width="2.6" stroke-linecap="round"/>',
    alert: '<path d="M12 2.8l9.8 17.4H2.2z" fill="#D0324C" stroke="#D0324C" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9.5v5M12 17.2v.3" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="10" fill="#FFC62E"/><path d="M12 7v6M12 16.5v.5" stroke="#2A2140" stroke-width="2.6" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#FFC62E" stroke="#D69500" stroke-width="1.8"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" fill="none" stroke="#D69500" stroke-width="1.8"/><path d="M12 14v3M8 20h8l-1-3H9z" fill="#D69500" stroke="#D69500" stroke-width="1.5" stroke-linejoin="round"/>',
    sparkle: '<path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z" fill="#fff" stroke="#2A2140" stroke-width="2" stroke-linejoin="round"/>',
    grip: '<g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>',
    up: '<path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    project: '<path d="M4 20l3-9 5-5 6 6-5 5z" fill="#FFC62E" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 4l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    wand: '<path d="M4 20L16 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M17 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#FFC62E"/>',
    swords: '<path d="M4 4l10 10M20 4L10 14M6 18l-2 2M18 18l2 2M7 15l2 2M17 15l-2 2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
  };
  ui.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (I[name] || I.star) + '</svg>';
  };

  /* ======================================================================
     HUD
     ====================================================================== */
  ui.renderHUD = function () {
    var hud = U.$('#hud');
    if (!hud) return;
    var s = S();
    CH.game.regenHearts();
    var q = s.daily.quests || [], qd = q.filter(function (x) { return x.done; }).length;
    var info = CH.game.levelInfo(s.xp);
    hud.innerHTML =
      '<div class="hud-row">' +
        '<button class="chip" id="hudHearts" aria-label="Hearts: ' + s.hearts.n + ' of ' + s.hearts.max + '">' + ui.heartsHTML(s.hearts.n, s.hearts.max) + '</button>' +
        '<button class="chip" id="hudStreak" aria-label="Streak: ' + s.streak.days + ' days, ' + s.streak.freezes + ' freezes">' +
          '<svg class="flame" viewBox="0 0 24 24" aria-hidden="true" style="--fs:' + Math.min(1.5, 1 + s.streak.days * 0.04) + '">' + I.flame + '</svg><span>' + s.streak.days + '</span>' +
          (s.streak.freezes ? '<span class="frz">' + ui.icon('freeze') + s.streak.freezes + '</span>' : '') + '</button>' +
        '<button class="chip quests' + (qd === q.length && q.length ? ' hot' : '') + '" id="hudQuests" aria-label="Daily quests: ' + qd + ' of ' + q.length + ' done">' + ui.icon('quest') + '<span>' + qd + '/' + q.length + '</span></button>' +
      '</div>' +
      '<div class="xp">' +
        '<span class="lvl-badge" id="lvlBadge">Lv ' + info.level + '</span>' +
        '<div class="xpbar" role="progressbar" aria-label="Experience toward next level" aria-valuemin="0" aria-valuemax="' + info.need + '" aria-valuenow="' + info.into + '"><div class="xpfill" id="xpfill" style="--p:' + (info.into / info.need) + '"></div></div>' +
        '<span class="xpnum" id="xpnum">' + info.into + ' / ' + info.need + '</span>' +
      '</div>';
    U.$('#hudHearts').onclick = ui.heartsSheet;
    U.$('#hudStreak').onclick = ui.streakSheet;
    U.$('#hudQuests').onclick = ui.questsSheet;
    shownXP = s.xp;
  };

  ui.heartsHTML = function (n, max) {
    var h = '<span class="hearts" aria-hidden="true">';
    for (var i = 0; i < max; i++) h += '<span class="' + (i < n ? '' : 'empty') + '"><svg viewBox="0 0 24 24">' + I.heart + '</svg></span>';
    return h + '</span>';
  };

  /** Animate the XP bar toward the current XP (count-up + elastic fill). */
  var shownXP = 0;
  ui.animateXP = function () {
    var s = S(), fill = U.$('#xpfill'), num = U.$('#xpnum'), badge = U.$('#lvlBadge');
    if (!fill) return;
    var info = CH.game.levelInfo(s.xp), prev = CH.game.levelInfo(shownXP);
    if (prev.level !== info.level) {
      fill.style.setProperty('--p', 1);
      setTimeout(function () {
        fill.style.transition = 'none'; fill.style.setProperty('--p', 0); void fill.offsetWidth; fill.style.transition = '';
        fill.style.setProperty('--p', info.into / info.need);
        if (badge) { badge.textContent = 'Lv ' + info.level; CH.fx.bounce(badge); }
        if (num) CH.fx.countUp(num, 0, info.into, 700, function (n) { return n + ' / ' + info.need; });
      }, CH.fx.reduced() ? 50 : 700);
    } else {
      fill.style.setProperty('--p', info.into / info.need);
      if (num) CH.fx.countUp(num, prev.into, info.into, 700, function (n) { return n + ' / ' + info.need; });
    }
    shownXP = s.xp;
  };

  /** Pop the last heart out (animation), then re-render. */
  ui.heartLost = function (container) {
    var hs = U.$$('.hearts > span:not(.empty)', container || document);
    var h = hs[hs.length - 1];
    CH.audio.play('heart');
    if (h && !CH.fx.reduced()) {
      CH.fx.anim(h, [{ transform: 'none' }, { transform: 'scale(1.5) rotate(-15deg)' }, { transform: 'translateY(14px) scale(.3) rotate(30deg)', opacity: 0 }], { duration: 500, easing: 'ease-in' })
        .then(function () { h.classList.add('empty'); });
    } else if (h) h.classList.add('empty');
  };

  /* ---- HUD sheets ---- */
  /** "Next heart in mm:ss" line; pair with ui.bindHeartClock(root) to keep it live. */
  ui.heartClockHTML = function () {
    var secs = CH.game.nextHeartIn();
    if (S().hearts.n >= S().hearts.max) return '<p class="hclock-row">' + ui.icon('heart') + ' Hearts are full!</p>';
    return '<p class="hclock-row">' + ui.icon('clock') + ' Next heart in <b class="hclock">' + U.fmtClock(secs) + '</b></p>';
  };
  ui.bindHeartClock = function (root) {
    var t = setInterval(function () {
      if (!document.body.contains(root)) return clearInterval(t);
      CH.game.regenHearts();
      var c = root.querySelector('.hclock');
      if (c) c.textContent = U.fmtClock(CH.game.nextHeartIn());
      var hs = root.querySelector('.big-hearts');
      if (hs) hs.innerHTML = ui.heartsHTML(S().hearts.n, S().hearts.max);
    }, 1000);
  };

  ui.heartsSheet = function () {
    var s = S();
    var el = U.h('<div><div class="big-hearts">' + ui.heartsHTML(s.hearts.n, s.hearts.max) + '</div>' +
      '<div class="center">' + ui.heartClockHTML() + '</div>' +
      '<ul class="heart-rules">' +
        '<li>' + ui.icon('no') + '<span>A wrong <b>first try</b> costs one heart. Retries are free.</span></li>' +
        '<li>' + ui.icon('clock') + '<span>Hearts refill <b>1 every 30 minutes</b>.</span></li>' +
        '<li>' + ui.icon('practice') + '<span>A quick <b>practice review</b> earns one now.</span></li>' +
        '<li>' + ui.icon('ok') + '<span>At zero, practice still works. Never stuck!</span></li>' +
      '</ul>' +
      '<div class="row"><button class="pbtn teal" data-a="review">' + ui.icon('practice') + 'Practice review</button></div></div>');
    var sh = ui.sheet({ title: 'Hearts', el: el });
    el.querySelector('[data-a=review]').onclick = function () { sh.close(); CH.router.go('practice', { autoReview: true }); };
    ui.bindHeartClock(el);
  };

  ui.streakSheet = function () {
    var s = S(), st = s.streak, today = st.lastDay === U.dayStr();
    var el = U.h('<div class="center"><svg class="flame big" viewBox="0 0 24 24" aria-hidden="true">' + I.flame + '</svg>' +
      '<h2>' + U.plural(st.days, 'day') + '</h2>' +
      '<p>' + (today ? 'You’ve practiced today. The flame is lit!' : 'Finish a lesson or practice today to keep your streak going.') + '</p>' +
      '<p class="muted">Best streak: <b>' + st.best + '</b> &middot; Streak freezes: <b>' + st.freezes + '</b> / 3</p>' +
      '<p class="muted small">Freezes protect your streak on a missed day. Earn one every 5-day milestone, or by finishing all daily quests.</p></div>');
    ui.sheet({ title: 'Daily streak', el: el });
  };

  ui.questsSheet = function () {
    var s = S(); CH.game.ensureDaily();
    var goal = s.profile.dailyGoalMin || 10, mins = Math.floor(s.daily.minutes);
    var html = '<div class="goal-ring-row"><div class="ring" style="--p:' + Math.min(1, s.daily.minutes / goal) + '" aria-hidden="true"><span>' + Math.min(mins, goal) + '</span></div>' +
      '<div><b>Daily goal</b><div class="muted">' + Math.min(mins, goal) + ' of ' + goal + ' minutes today</div></div></div><ul class="quest-list">';
    s.daily.quests.forEach(function (q) {
      var d = CH.game.questDef(q.id) || { text: q.id, goal: 1 };
      var p = Math.min(1, q.progress / (d.goal || 1));
      html += '<li class="' + (q.done ? 'done' : '') + '"><span class="qi">' + (q.done ? ui.icon('ok') : ui.icon('quest')) + '</span><div class="qb"><b>' + U.esc(d.text) + '</b>' +
        '<div class="qbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + (d.goal || 1) + '" aria-valuenow="' + q.progress + '"><i style="--p:' + p + '"></i></div></div>' +
        '<span class="qx">' + (q.done ? 'Done' : Math.floor(q.progress) + '/' + (d.goal || 1)) + '<small>+' + (d.xp || 20) + ' XP</small></span></li>';
    });
    html += '</ul><p class="muted small center">New quests every day. Finish all three to earn a streak freeze.</p>';
    ui.sheet({ title: 'Daily quests', html: html });
  };

  /* ======================================================================
     Router + screen transitions
     ====================================================================== */
  var screens = (CH.screens = CH.screens || {});
  var cur = null, stack = [];

  /*
   * Motion system for screens (all transform / opacity / clip-path, <= ~420ms,
   * interruptible, reduced motion = instant crossfade):
   *   'expand'   circular clip-path reveal from opts.origin (map node, header
   *              button) into the full screen; remembered so that leaving
   *              ('down'/'close') collapses back into the same element.
   *   1 / -1     direction-aware horizontal slide + slight scale/fade with a
   *              spring settle (bottom tabs). Uses the View Transitions API when
   *              available, WAAPI otherwise.
   *   'up'       card rises from the bottom (sessions without an origin).
   *   'down'     card drops away (leaving a session without an origin).
   *   'fade'     quick crossfade.
   */
  var vtActive = null, origin = null;

  CH.router = {
    /** Navigate. opts: { dir, origin: {el, id}, replace, root } */
    go: function (name, params, opts) {
      opts = opts || {};
      var def = screens[name];
      if (!def) { console.error('[router] unknown screen', name); return; }
      var stage = U.$('#stage');
      var prev = cur;
      // Interruptible: finish any in-flight transition instantly.
      if (vtActive) { try { vtActive.skipTransition(); } catch (e) { /* ignore */ } vtActive = null; }
      U.$$('.screen', stage).forEach(function (s) { if (!prev || s !== prev.el) s.remove(); });
      if (prev) { CH.fx.cancel(prev.el); prev.el.style.clipPath = ''; prev.el.style.zIndex = ''; }
      if (prev && prev.def.onHide) try { prev.def.onHide(prev.el); } catch (e) { console.error(e); }
      var el;
      try { el = def.render(params || {}); }
      catch (e) { console.error('[router] render failed for', name, e); el = U.h('<section class="screen"><div class="scroll"><div class="card"><h3>Oops</h3><p>Something went wrong loading this screen.</p><button class="pbtn" onclick="CH.router.go(\'map\',{}, {root:true})">Back to map</button></div></div></section>'); }
      el.classList.add('screen', 'on');
      el.setAttribute('data-screen', name);

      if (opts.root) stack = [];
      else if (prev && !opts.replace) stack.push({ name: prev.name, params: prev.params, origin: origin });
      cur = { name: name, params: params || {}, el: el, def: def };

      var dir = opts.dir || 1;
      var rm = CH.fx.reduced();
      var o = opts.origin && opts.origin.el ? pointIn(opts.origin.el, stage) : null;
      if (dir === 'expand' && !o) dir = 'up';
      if (dir === 'expand' || (opts.origin && opts.origin.id)) origin = { id: opts.origin.id };
      var collapseTo = null;
      if ((dir === 'down' || dir === 'close') && origin) collapseTo = origin;
      if (dir === 'down' || dir === 'close') origin = opts.keepOrigin ? origin : null;

      var mounted = false;
      function mount() {
        if (mounted) return;
        mounted = true;
        stage.appendChild(el);
        var app = U.$('#app');
        app.classList.toggle('immersive', def.chrome === 'immersive');
        U.$$('.tab').forEach(function (t) {
          if (t.dataset.go === (def.tab || name)) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
        });
        if (def.chrome !== 'immersive') ui.renderHUD();
        if (def.onShow) try { def.onShow(el, params || {}); } catch (e) { console.error(e); }
        // Move focus to the new screen for keyboard / screen-reader users.
        var focusT = el.querySelector('[data-autofocus]') || el.querySelector('h1,h2') || el;
        if (focusT) { if (!focusT.hasAttribute('tabindex') && !focusT.matches('button, a[href], input, select, textarea')) focusT.setAttribute('tabindex', '-1'); try { focusT.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        E.emit('screen', { name: name });
      }

      var useVT = !rm && prev && (dir === 1 || dir === -1) && typeof document.startViewTransition === 'function' && document.visibilityState === 'visible';
      if (useVT) {
        document.documentElement.setAttribute('data-vt', dir === -1 ? 'back' : 'fwd');
        prev.el.style.viewTransitionName = 'ch-screen';
        try {
          vtActive = document.startViewTransition(function () {
            if (prev.el.parentNode) prev.el.remove();
            el.style.viewTransitionName = 'ch-screen';
            mount();
          });
          var clear = function () { el.style.viewTransitionName = ''; document.documentElement.removeAttribute('data-vt'); vtActive = null; };
          vtActive.finished.then(clear, clear);
          // Skipped transitions reject these promises: expected, so swallow them.
          if (vtActive.ready) vtActive.ready.catch(function () {});
          if (vtActive.updateCallbackDone) vtActive.updateCallbackDone.catch(function () {});
          setTimeout(function () { mount(); if (prev.el.parentNode) prev.el.remove(); }, 600);   // safety net
        } catch (e) { useVT = false; }
      }
      if (!useVT) {
        mount();
        var target = null;
        if (collapseTo) {
          var tEl = document.querySelector('[data-origin-id="' + cssEsc(collapseTo.id) + '"]');
          if (tEl && tEl.getClientRects().length) target = pointIn(tEl, stage);
        }
        transition(prev && prev.el, el, dir, o, target);
      }
    },
    back: function (fallback, opts) {
      var p = stack.pop();
      var dir = (opts && opts.dir) || -1;
      if (p) { CH.router.go(p.name, p.params, { dir: dir, replace: true }); if (p.origin !== undefined) origin = p.origin; }
      else CH.router.go(fallback || 'map', {}, { dir: dir, root: true });
    },
    get current() { return cur; },
    get depth() { return stack.length; },
    refresh: function () { if (cur) CH.router.go(cur.name, cur.params, { replace: true, dir: 'fade', keepOrigin: true }); }
  };

  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /** Center of an element in stage coordinates. */
  function pointIn(el, stage) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top, w: s.width, h: s.height, r: Math.max(r.width, r.height) / 2 };
  }
  function farCorner(p) {
    return Math.ceil(Math.max(Math.hypot(p.x, p.y), Math.hypot(p.w - p.x, p.y), Math.hypot(p.x, p.h - p.y), Math.hypot(p.w - p.x, p.h - p.y))) + 8;
  }

  /** WAAPI transitions (also the fallback when View Transitions aren't available). */
  function transition(from, to, dir, o, target) {
    var rm = CH.fx.reduced();
    function removeFrom() { if (from && from.parentNode) from.remove(); }
    if (!from) { CH.fx.anim(to, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: CH.fx.EASE_OUT, rm: 'fade' }); return; }
    from.style.pointerEvents = 'none';
    if (rm || dir === 'fade') {
      CH.fx.anim(from, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, rm: 'keep', fill: 'forwards' }).then(removeFrom);
      CH.fx.anim(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, rm: 'keep' });
      setTimeout(removeFrom, 360);
      return;
    }
    if (dir === 'expand' && o) {
      // Grow a circle from the tapped element until it covers the stage.
      var R = farCorner(o), at = ' at ' + o.x + 'px ' + o.y + 'px';
      CH.fx.anim(to, [{ clipPath: 'circle(' + Math.max(8, o.r) + 'px' + at + ')' }, { clipPath: 'circle(' + R + 'px' + at + ')' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.2,1)', rm: 'keep' })
        .then(function () { to.style.clipPath = ''; removeFrom(); });
      CH.fx.anim(from, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.96)', opacity: 0.6 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
      setTimeout(removeFrom, 700);
      return;
    }
    if ((dir === 'down' || dir === 'close') && target) {
      // Shrink the leaving screen back into its origin element.
      from.style.zIndex = 3;
      var R2 = farCorner(target), at2 = ' at ' + target.x + 'px ' + target.y + 'px';
      CH.fx.anim(from, [{ clipPath: 'circle(' + R2 + 'px' + at2 + ')' }, { clipPath: 'circle(' + Math.max(6, target.r * 0.6) + 'px' + at2 + ')', opacity: 0.4 }], { duration: 380, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards', rm: 'keep' })
        .then(removeFrom);
      CH.fx.anim(to, [{ transform: 'scale(.97)', opacity: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: CH.fx.EASE_OUT });
      setTimeout(removeFrom, 700);
      return;
    }
    var outK, inK, outD = 240, inD = 400;
    if (dir === 'up') {
      outK = [{ transform: 'none', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }];
      inK = [{ transform: 'translateY(60%) scale(.96)', opacity: 0 }, { transform: 'translateY(-1.5%)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }];
    } else if (dir === 'down' || dir === 'close') {
      outK = [{ transform: 'none', opacity: 1 }, { transform: 'translateY(40%) scale(.94)', opacity: 0 }];
      inK = [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'scale(1.005)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }];
      inD = 360;
    } else {
      var d = dir === -1 ? -1 : 1;
      outK = [{ transform: 'none', opacity: 1 }, { transform: 'translateX(' + (-d * 18) + '%) scale(.94)', opacity: 0 }];
      inK = [{ transform: 'translateX(' + (d * 26) + '%) scale(.97)', opacity: 0 }, { transform: 'translateX(' + (-d * 1.2) + '%) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }];
    }
    CH.fx.anim(from, outK, { duration: outD, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).then(removeFrom);
    CH.fx.anim(to, inK, { duration: inD, easing: 'cubic-bezier(.22,.9,.3,1.05)' });
    setTimeout(removeFrom, outD + 300);
  }

  /* ======================================================================
     Dialogs (focus-trapped, Escape = cancel), sheets
     ====================================================================== */
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function trapFocus(root, e) {
    if (e.key !== 'Tab') return;
    var f = U.$$(FOCUSABLE, root).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /**
   * In-app dialog. opts: { title, html, mood, buttons:[{label, value, cls}], dismissValue }
   * Resolves with the chosen button's value (dismissValue on Escape/scrim).
   */
  ui.dialog = function (opts) {
    return new Promise(function (resolve) {
      var root = U.$('#overlay-root'), prevFocus = document.activeElement;
      var id = U.uid('dlg');
      var btns = (opts.buttons || [{ label: 'OK', value: true }]).map(function (b, i) {
        return '<button class="pbtn ' + (b.cls || (i ? 'ghost' : '')) + '" data-i="' + i + '">' + b.label + '</button>';
      }).join('');
      var el = U.h('<div class="dlg-wrap"><div class="scrim open"></div>' +
        '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
          (opts.mood ? '<div class="dlg-curlo"></div>' : '') +
          '<h3 id="' + id + '">' + U.esc(opts.title || '') + '</h3>' +
          '<div class="dlg-body">' + (opts.html || '') + '</div>' +
          '<div class="dlg-btns">' + btns + '</div></div></div>');
      root.appendChild(el);
      if (opts.mood) { var c = CH.curlo.mount(el.querySelector('.dlg-curlo')); setTimeout(function () { CH.curlo.react(c, opts.mood); }, 60); }
      var box = el.querySelector('.dlg');
      CH.fx.anim(box, [{ transform: 'translateY(90px) scale(.94)', opacity: 0 }, { transform: 'translateY(-6px) scale(1.01)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: CH.fx.EASE_OUT, rm: 'fade' });
      function done(v) {
        document.removeEventListener('keydown', onKey, true);
        CH.fx.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, rm: 'keep', fill: 'forwards' }).then(function () { el.remove(); });
        setTimeout(function () { el.remove(); }, 400);
        try { if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(opts.dismissValue); }
        else trapFocus(box, e);
      }
      document.addEventListener('keydown', onKey, true);
      el.querySelector('.scrim').onclick = function () { done(opts.dismissValue); };
      swipeDown(box, box.querySelector('h3'), function () { done(opts.dismissValue); });
      swipeDown(box, box.querySelector('.dlg-curlo'), function () { done(opts.dismissValue); });
      U.$$('.dlg-btns .pbtn', el).forEach(function (b) {
        b.onclick = function () { CH.audio.play('tap'); done((opts.buttons || [{ value: true }])[+b.dataset.i].value); };
      });
      if (opts.el) el.querySelector('.dlg-body').appendChild(opts.el);
      if (opts.onMount) opts.onMount(el);
      setTimeout(function () { var f = el.querySelector('.dlg-btns .pbtn'); if (f) f.focus(); }, 50);
    });
  };

  /**
   * Swipe-down-to-dismiss for sheets/dialogs: drag the handle down; past
   * ~90px (or a quick flick) it dismisses, otherwise it springs back.
   */
  function swipeDown(panel, handle, onDismiss) {
    if (!handle) return;
    handle.style.touchAction = 'none';
    handle.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest('button, input, textarea, a, select') && handle !== panel.querySelector('.grab')) return;
      var y0 = e.clientY, t0 = Date.now(), dy = 0, moved = false;
      function mv(ev) {
        dy = Math.max(0, ev.clientY - y0);
        if (!moved && dy > 6) { moved = true; panel.style.transition = 'none'; }
        if (moved) panel.style.transform = 'translateY(' + dy + 'px)';
      }
      function up() {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!moved) return;
        var v = dy / Math.max(1, Date.now() - t0);
        panel.style.transition = '';
        if (dy > 90 || v > 0.7) { panel.style.transform = ''; onDismiss(); }
        else {
          panel.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
          panel.style.transform = '';
          setTimeout(function () { panel.style.transition = ''; }, 400);
        }
      }
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  }

  /** Confirm helper: resolves true/false. */
  ui.confirm = function (title, html, yes, no, danger) {
    return ui.dialog({ title: title, html: html, mood: danger ? 'worried' : 'thinking', dismissValue: false,
      buttons: [{ label: yes || 'Yes', value: true, cls: danger ? 'coral' : '' }, { label: no || 'Cancel', value: false, cls: 'ghost' }] });
  };

  /** Bottom sheet. opts: { title, html | el }. Returns { el, close }. */
  ui.sheet = function (opts) {
    var root = U.$('#overlay-root'), prevFocus = document.activeElement, id = U.uid('sh');
    var wrap = U.h('<div class="sheet-wrap"><div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
      '<div class="grab" aria-hidden="true"></div><h3><span id="' + id + '">' + U.esc(opts.title || '') + '</span><button class="xbtn" aria-label="Close">' + ui.icon('x') + '</button></h3>' +
      '<div class="sheet-body"></div></div></div>');
    var body = wrap.querySelector('.sheet-body');
    if (opts.el) body.appendChild(opts.el); else body.innerHTML = opts.html || '';
    root.appendChild(wrap);
    var sheet = wrap.querySelector('.sheet'), scrim = wrap.querySelector('.scrim');
    requestAnimationFrame(function () { scrim.classList.add('open'); sheet.classList.add('open'); });
    setTimeout(function () { scrim.classList.add('open'); sheet.classList.add('open'); }, 30);
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey, true);
      sheet.classList.remove('open'); scrim.classList.remove('open');
      setTimeout(function () { wrap.remove(); }, 420);
      try { if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } else trapFocus(sheet, e); }
    document.addEventListener('keydown', onKey, true);
    scrim.onclick = close;
    wrap.querySelector('.xbtn').onclick = close;
    swipeDown(sheet, sheet.querySelector('.grab'), close);
    swipeDown(sheet, sheet.querySelector('h3'), close);
    CH.audio.play('tap');
    setTimeout(function () { var f = sheet.querySelector('.sheet-body ' + FOCUSABLE) || wrap.querySelector('.xbtn'); if (f) f.focus({ preventScroll: true }); }, 80);
    return { el: wrap, body: body, close: close };
  };

  /* ======================================================================
     Celebration overlays (queued by CH.game; flushed at safe moments)
     ====================================================================== */
  var flushing = false;
  ui.flushCelebrations = function () {
    if (flushing) return Promise.resolve();
    flushing = true;
    function nextOne() {
      var item = CH.game.queue.shift();
      if (!item) { flushing = false; ui.renderHUD(); return Promise.resolve(); }
      var p;
      if (item.type === 'levelup') p = celebrate(levelHTML(item), 'lvl', function () { CH.audio.play('levelup'); });
      else if (item.type === 'achievement') p = celebrate(achHTML(item.def), 'ach', function () { CH.audio.play('unlock'); });
      else if (item.type === 'bug') p = celebrate(bugHTML(item.def), 'bugc', function () { CH.audio.play('unlock'); });
      else if (item.type === 'cosmetic') p = celebrate(cosHTML(item.def), 'cos', function () { CH.audio.play('unlock'); }, item.def);
      else if (item.type === 'tier') p = celebrate(tierHTML(item.tier), 'tierc', function () { CH.audio.play('shield'); });
      else if (item.type === 'evolve') p = CH.curlo.evolve(item.from, item.to);
      else p = Promise.resolve();
      return p.then(nextOne, nextOne);
    }
    return nextOne();
  };

  function levelHTML(item) {
    var cos = CH.game.LEVEL_COSMETICS[item.level], def = cos && CH.game.cosmeticDef(cos);
    return { t1: 'LEVEL UP!', big: String(item.level), mascot: true, mood: 'celebrate',
      text: 'You reached <b>level ' + item.level + '</b>!' + (def ? '<br>Unlocked: <b>' + U.esc(def.name) + '</b>' : ''), btn: 'Awesome!' };
  }
  function achHTML(def) {
    return { t1: 'ACHIEVEMENT!', art: '<div class="medal">' + ui.icon('trophy') + '</div>', text: '<b class="ach-name">' + U.esc(def.name) + '</b><br>' + U.esc(def.desc || ''), btn: 'Nice!' };
  }
  function bugHTML(def) {
    return { t1: 'BUG DEFEATED!', art: '<div class="bug-reveal">' + CH.art.beast(def.art || 'bug', { color: def.color }) + '</div>',
      text: '<b>' + U.esc(def.name) + '</b> joins your Bug Bestiary.' + (def.prevent ? '<br><span class="small">' + U.md(def.prevent) + '</span>' : ''), btn: 'Collect' };
  }
  function cosHTML(def) {
    return { t1: 'NEW GEAR!', mascot: true, mood: 'celebrate', hat: def.slot === 'hat' ? def.id : undefined,
      text: 'You unlocked <b>' + U.esc(def.name) + '</b>!', btn: def.slot === 'hat' ? 'Wear it!' : 'Nice!', btn2: def.slot === 'hat' ? 'Later' : null };
  }
  function tierHTML(t) {
    return { t1: 'SHIELD UPGRADE!', mascot: true, mood: 'bracing', tier: t,
      text: 'Your Defense stat grew! Shield: <b>' + CH.curlo.TIERS[t].name + '</b>', btn: 'Shields up!' };
  }

  /** Generic celebration overlay; tap anywhere to skip; resolves when closed. */
  function celebrate(c, kind, sfx, cosDef) {
    return new Promise(function (resolve) {
      var root = U.$('#overlay-root');
      var el = U.h('<div class="lvl ' + kind + ' open" role="dialog" aria-modal="true" aria-label="' + U.esc(c.t1) + '" tabindex="-1">' +
        '<div class="rays" aria-hidden="true"></div><div class="lvl-in">' +
        '<div class="t1">' + c.t1 + '</div>' + (c.big ? '<div class="big">' + c.big + '</div>' : '') +
        (c.mascot ? '<div class="lm"></div>' : '') + (c.art || '') +
        '<div class="t2">' + c.text + '</div>' +
        '<div class="row"><button class="pbtn" data-v="1">' + c.btn + '</button>' + (c.btn2 ? '<button class="pbtn ghost" data-v="0">' + c.btn2 + '</button>' : '') + '</div>' +
        '<div class="skip">Tap anywhere to continue</div></div></div>');
      root.appendChild(el);
      var m = null;
      if (c.mascot) m = CH.curlo.mount(el.querySelector('.lm'), { hat: c.hat, tier: c.tier, fixed: !!(c.hat || c.tier), mood: c.mood });
      el.focus();
      sfx && sfx();
      var inner = el.querySelector('.lvl-in');
      CH.fx.anim(inner, [{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: CH.fx.SPRING, rm: 'fade' });
      var big = el.querySelector('.big');
      if (big) CH.fx.anim(big, [{ transform: 'scale(0) rotate(-20deg)' }, { transform: 'scale(1.3) rotate(6deg)', offset: 0.6 }, { transform: 'scale(.92)', offset: 0.8 }, { transform: 'none' }], { duration: 800 });
      var art = el.querySelector('.medal, .bug-reveal');
      if (art) CH.fx.anim(art, [{ transform: 'scale(.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(8deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 150, fill: 'backwards', rm: 'fade' });
      setTimeout(function () { if (m) CH.curlo.react(m, c.mood || 'celebrate'); CH.fx.burstAt(art || m || inner, { n: 120 }); }, 250);
      var closed = false;
      function close(v) {
        if (closed) return; closed = true;
        document.removeEventListener('keydown', onKey, true);
        CH.fx.clearConfetti();
        if (cosDef && v) CH.game.equip('hat', cosDef.id);
        CH.fx.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, rm: 'keep', fill: 'forwards' }).then(function () { el.remove(); resolve(); });
        setTimeout(function () { if (el.parentNode) el.remove(); resolve(); }, 500);
      }
      function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(e.key !== 'Escape'); }
      }
      document.addEventListener('keydown', onKey, true);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]');
        close(b ? b.dataset.v === '1' : false);
      });
    });
  }

  /* ======================================================================
     Misc helpers used by several screens
     ====================================================================== */
  /** A Curlo + speech bubble header. Returns { el, curlo, bubble }. */
  ui.curloSays = function (html, mood, cls) {
    var el = U.h('<div class="qhead ' + (cls || '') + '"><div class="mini"></div><div class="bubble tail-l" aria-live="polite"></div></div>');
    var c = CH.curlo.mount(el.querySelector('.mini'), { mood: mood || 'happy' });
    if (html && html.nodeType) el.querySelector('.bubble').appendChild(html);
    else el.querySelector('.bubble').innerHTML = html;
    return { el: el, curlo: c, bubble: el.querySelector('.bubble') };
  };

  /**
   * 'Tell me more' expander (keyboard accessible, aria-expanded, springy open).
   * content: element or HTML string. Returns { el, body, open() }.
   */
  ui.expander = function (label, content, opts) {
    opts = opts || {};
    var id = U.uid('more');
    var el = U.h('<div class="more-wrap"><button type="button" class="more-btn" aria-expanded="false" aria-controls="' + id + '"><span>' + U.esc(label || 'Tell me more') + '</span>' + ui.icon('down', 'chev') + '</button><div class="more-body" id="' + id + '" hidden></div></div>');
    var body = el.querySelector('.more-body'), btn = el.querySelector('.more-btn');
    if (typeof content === 'string') body.innerHTML = content; else if (content) body.appendChild(content);
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('span').textContent = open ? (opts.lessLabel || 'Show less') : (label || 'Tell me more');
      body.hidden = !open;
      if (open) {
        CH.fx.anim(body, [{ opacity: 0, transform: 'translateY(-10px) scaleY(.96)' }, { opacity: 1, transform: 'translateY(2px) scaleY(1.01)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 380, easing: CH.fx.EASE_OUT, rm: 'fade' });
        if (opts.onOpen) opts.onOpen(body);
      }
    }
    btn.onclick = function () { CH.audio.play('tap'); set(btn.getAttribute('aria-expanded') !== 'true'); };
    return { el: el, body: body, open: function () { set(true); } };
  };

  /**
   * Long story text → first sentence (or two, if short) by default, the rest
   * in a native <details> "Tell me more" (keyboard accessible out of the box).
   */
  ui.storyHTML = function (text) {
    var t = String(text || '').trim();
    var parts = t.match(/[^.!?]+[.!?]+["\u201D')]*\s*|[^.!?]+$/g) || [t];
    var first = parts[0], k = 1;
    while (k < parts.length && (first + parts[k]).split(/\s+/).length <= 22) { first += parts[k]; k++; }
    var rest = parts.slice(k).join('').trim();
    return '<p class="story-short">' + U.md(first.trim()) + '</p>' +
      (rest ? '<details class="more-details"><summary>Tell me more</summary><p>' + U.md(rest) + '</p></details>' : '');
  };
  /**
   * Story text as an element. Accepts a string (short + "Tell me more") or an
   * ARRAY of short lines shown one bubble at a time (tap / Next to advance).
   */
  ui.story = function (text) {
    var arr = Array.isArray(text) ? text.filter(Boolean) : [text];
    if (arr.length <= 1) return U.h('<div class="story">' + ui.storyHTML(arr[0] || '') + '</div>');
    var el = U.h('<div class="story story-seq"><p class="story-line" aria-live="polite"></p>' +
      '<div class="story-nav"><span class="story-dots" aria-hidden="true">' + arr.map(function () { return '<i></i>'; }).join('') + '</span>' +
      '<button type="button" class="more-btn story-next"><span>Next</span>' + ui.icon('next', 'chev') + '</button></div></div>');
    var i = 0, line = el.querySelector('.story-line'), btn = el.querySelector('.story-next');
    function show() {
      line.innerHTML = U.md(arr[i]);
      U.$$('.story-dots i', el).forEach(function (d, k) { d.classList.toggle('on', k <= i); });
      btn.hidden = i >= arr.length - 1;
      CH.fx.anim(line, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: CH.fx.EASE_OUT, rm: 'fade' });
    }
    function next(e) { if (e) e.stopPropagation(); if (i < arr.length - 1) { i++; CH.audio.play('pop'); show(); } }
    btn.onclick = next;
    line.onclick = next;
    show();
    return el;
  };

  // Springy reveal for any <details> opening.
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    var body = d.querySelector(':scope > :not(summary)');
    if (body) CH.fx.anim(body, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: CH.fx.EASE_OUT, rm: 'fade' });
  }, true);

  /** Keep the HUD fresh when progress changes. */
  E.on('hearts', function () { if (!U.$('#app').classList.contains('immersive')) ui.renderHUD(); });
  E.on('quests', function () { if (!U.$('#app').classList.contains('immersive')) ui.renderHUD(); });
  E.on('xp', function () { if (!U.$('#app').classList.contains('immersive')) ui.animateXP(); });
})();
