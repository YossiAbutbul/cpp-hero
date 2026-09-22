/* ==========================================================================
   Cpp Hero — engine/onboarding.js
   First-run flow: animated intro (Curlo introduces itself + the story),
   name + starting look, daily goal (5/10/20 min), and an optional placement
   quiz that can unlock later worlds (a few questions per world, pulled from
   content; pass 2 of 3 to test out of a world).
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util, G = function () { return CH.game; };
  function S() { return CH.store.state; }
  var icon = function (n, c) { return CH.ui.icon(n, c); };

  var STORY = [
    'Hi hi hi! I’m <b>Curlo</b>, a brace-bean: half curly brace <b>{ }</b>, all heart!',
    'I live in the <b>Codebase</b>. It used to be tidy… but <b>bugs</b> keep sneaking in through sloppy code: gremlins, blobs, golems, and worse.',
    'Here’s the deal: you learn <b>C++</b> with me, and we write code so solid that no bug can break it. Every boss we beat makes the Codebase safer.',
    'I’ll explain, cheer, and maybe tell a few terrible jokes. Ready to become a <b>Cpp Hero</b>?'
  ];

  function screen() {
    var el = U.h('<section class="screen onboarding" aria-label="Welcome to Cpp Hero"><div class="scroll ob-scroll"><div class="ob-stage"></div></div></section>');
    var stage = el.querySelector('.ob-stage');
    var st = { name: S().profile.name || 'Curlo', variant: S().profile.variant || 'classic', goal: S().profile.dailyGoalMin || 10 };

    function page(html) {
      var old = stage.firstElementChild;
      var pg = U.h('<div class="ob-page">' + html + '</div>');
      stage.appendChild(pg);
      if (old) {
        CH.fx.anim(old, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-30%) scale(.92)', opacity: 0 }], { duration: 240, fill: 'forwards', rm: 'keep' }).then(function () { old.remove(); });
        setTimeout(function () { old.remove(); }, 450);
        CH.fx.anim(pg, [{ transform: 'translateX(100%) rotate(3deg)', opacity: 0.5 }, { transform: 'translateX(-2%)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: CH.fx.EASE_OUT, rm: 'fade' });
      }
      el.querySelector('.ob-scroll').scrollTop = 0;
      var f = pg.querySelector('[data-autofocus]');
      setTimeout(function () { if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 300);
      return pg;
    }

    /* ---- 1. story intro ---- */
    function intro() {
      var i = 0;
      var pg = page('<div class="ob-brand"><span class="ob-logo">Cpp Hero</span></div>' +
        '<div class="ob-hero"><div class="halo big"><span class="spark" style="left:18px;top:40px"></span><span class="spark" style="right:22px;top:24px;animation-delay:-.8s"></span><span class="spark" style="right:10px;bottom:52px;animation-delay:-1.6s"></span><div class="ob-curlo"></div></div></div>' +
        '<div class="bubble tail-b ob-say" aria-live="polite"></div>' +
        '<div class="ob-dots" aria-hidden="true">' + STORY.map(function () { return '<i></i>'; }).join('') + '</div>' +
        '<div class="row"><button class="pbtn big" data-autofocus>Next' + icon('next') + '</button></div>' +
        '<button class="linkbtn ob-skip">Skip intro</button>');
      var c = CH.curlo.mount(pg.querySelector('.ob-curlo'), { mood: 'happy' });
      var say = pg.querySelector('.ob-say'), btn = pg.querySelector('.pbtn');
      var hc = pg.querySelector('.ob-curlo');
      CH.fx.anim(hc, [{ transform: 'translateY(-160%) scale(.8)', opacity: 0 }, { transform: 'translateY(8%) scale(1.14,.84)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-6%) scale(.95,1.06)', offset: 0.75 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 200, fill: 'backwards', rm: 'fade' })
        .then(function () { CH.fx.burstAt(hc, { n: 60 }); });
      function show() {
        CH.curlo.say(say, STORY[i]);
        U.$$('.ob-dots i', pg).forEach(function (d, k) { d.classList.toggle('on', k <= i); });
        CH.curlo.react(c, ['celebrate', 'worried', 'bracing', 'celebrate'][i] || 'happy', 1200);
        btn.innerHTML = (i === STORY.length - 1 ? 'Let’s do this!' : 'Next') + icon('next');
      }
      setTimeout(show, CH.fx.reduced() ? 0 : 700);
      return new Promise(function (resolve) {
        btn.onclick = function () {
          CH.audio.play('pop');
          if (i < STORY.length - 1) { i++; show(); } else resolve();
        };
        pg.querySelector('.ob-skip').onclick = function () { CH.audio.play('tap'); resolve(); };
        hc.onclick = function () { CH.fx.springPoke(hc); CH.audio.play('pop'); CH.curlo.react(c, 'celebrate', 900); };
      });
    }

    /* ---- 2. name + look ---- */
    function nameLook() {
      var id = U.uid('nm');
      var pg = page('<div class="eyebrow">Step 1 of 3</div><h2>Name your companion</h2>' +
        '<p class="muted">Keep <b>Curlo</b> or pick your own name, then choose a starting look.</p>' +
        '<div class="ob-preview"><div class="ob-curlo"></div></div>' +
        '<label for="' + id + '" class="lbl">Name</label><input id="' + id + '" class="text-in" maxlength="16" autocomplete="off" value="' + U.esc(st.name) + '">' +
        '<div class="lbl">Look</div><div class="variant-grid" role="radiogroup" aria-label="Starting look"></div>' +
        '<div class="row"><button class="pbtn big">Continue' + icon('next') + '</button></div>');
      var prev = CH.curlo.mount(pg.querySelector('.ob-curlo'), { variant: st.variant, fixed: true, mood: 'celebrate' });
      var grid = pg.querySelector('.variant-grid');
      G().STARTER_COLORS.forEach(function (v) {
        var def = G().cosmeticDef(v) || { name: v };
        var b = U.h('<button role="radio" class="variant' + (v === st.variant ? ' on' : '') + '" aria-checked="' + (v === st.variant) + '" data-v="' + v + '"><span class="vsw" style="background:' + CH.curlo.variantColor(v) + '"></span><small>' + U.esc(def.name) + '</small></button>');
        b.onclick = function () {
          st.variant = v;
          U.$$('.variant', grid).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
          prev = CH.curlo.mount(pg.querySelector('.ob-curlo'), { variant: v, fixed: true, mood: 'celebrate' });
          CH.curlo.react(prev, 'celebrate', 900);
          CH.audio.play('select');
          CH.fx.bounce(b);
        };
        grid.appendChild(b);
      });
      var input = pg.querySelector('input');
      setTimeout(function () { try { input.focus({ preventScroll: true }); input.select(); } catch (e) { /* ignore */ } }, 350);
      return new Promise(function (resolve) {
        function go() { st.name = (input.value || '').trim().slice(0, 16) || 'Curlo'; CH.audio.play('pop'); resolve(); }
        pg.querySelector('.pbtn.big').onclick = go;
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      });
    }

    /* ---- 3. daily goal ---- */
    function goal() {
      var pg = page('<div class="eyebrow">Step 2 of 3</div><h2>Pick a daily goal</h2><p class="muted">A little every day beats a lot once a week. You can change this later.</p>' +
        '<div class="goal-grid" role="radiogroup" aria-label="Daily goal"></div><div class="row"><button class="pbtn big">Continue' + icon('next') + '</button></div>');
      var grid = pg.querySelector('.goal-grid');
      [[5, 'Casual', 'A quick lesson a day'], [10, 'Regular', 'Two lessons a day'], [20, 'Serious', 'Level up fast']].forEach(function (g) {
        var b = U.h('<button role="radio" class="goal-card' + (st.goal === g[0] ? ' on' : '') + '" aria-checked="' + (st.goal === g[0]) + '"><b>' + g[0] + ' min</b><span>' + g[1] + '</span><small>' + g[2] + '</small></button>');
        b.onclick = function () {
          st.goal = g[0];
          U.$$('.goal-card', grid).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
          CH.audio.play('select'); CH.fx.bounce(b);
        };
        grid.appendChild(b);
      });
      setTimeout(function () { var f = grid.querySelector('.on'); if (f) f.focus({ preventScroll: true }); }, 350);
      return new Promise(function (resolve) { pg.querySelector('.pbtn.big').onclick = function () { CH.audio.play('pop'); resolve(); }; });
    }

    /* ---- 4. placement offer ---- */
    function offer() {
      var worlds = G().worlds().filter(function (w) { return w.id !== 'wdev'; });
      var canPlace = worlds.length > 1;
      var pg = page('<div class="eyebrow">Step 3 of 3</div><h2>Know some C++ already?</h2>' +
        '<div class="ob-preview small"><div class="ob-curlo"></div></div>' +
        '<p class="muted">' + (canPlace ? 'Take a short placement quiz (3 questions per world) to skip worlds you already know. No hearts, no pressure.' : 'Start from the beginning. Placement unlocks once more worlds arrive.') + '</p>' +
        '<div class="row col"><button class="pbtn big" data-v="scratch" data-autofocus>' + icon('play') + 'Start from scratch</button>' +
        (canPlace ? '<button class="pbtn ghost big" data-v="place">' + icon('target') + 'Take the placement quiz</button>' : '') + '</div>');
      CH.curlo.mount(pg.querySelector('.ob-curlo'), { variant: st.variant, fixed: true, mood: 'thinking' });
      return new Promise(function (resolve) {
        U.$$('[data-v]', pg).forEach(function (b) { b.onclick = function () { CH.audio.play('pop'); resolve(b.dataset.v); }; });
      });
    }

    function commit() {
      var s = S();
      s.profile.name = st.name;
      s.profile.variant = st.variant;
      s.profile.dailyGoalMin = st.goal;
      if (s.cosmetics.owned.indexOf(st.variant) < 0) s.cosmetics.owned.push(st.variant);
      s.cosmetics.equipped.color = st.variant;
      s.profile.onboarded = true;
      CH.store.saveNow();
      CH.curlo.refreshAll();
    }

    function finish(placed) {
      commit();
      CH.router.go('map', { justDone: placed ? 'placement' : null }, { root: true, dir: 'up' });
      setTimeout(function () {
        CH.fx.toast(placed ? 'Placement done! Your worlds are unlocked.' : 'Welcome, hero! Tap START to begin.', { icon: icon('sparkle') });
      }, 800);
    }

    intro().then(nameLook).then(goal).then(offer).then(function (v) {
      if (v === 'place') { commit(); placement(); }
      else finish(false);
    });
    return el;
  }

  /* ---- 5. placement quiz (runs as a session) ---- */
  function placement() {
    var worlds = G().worlds().filter(function (w) { return w.id !== 'wdev'; });
    var testable = worlds.slice(0, Math.max(0, worlds.length - 1));   // passing world N unlocks N+1
    var s = new CH.Session({ mode: 'placement', title: 'Placement quiz', noun: 'placement quiz', quitText: 'You can start from World 1 and play normally.' });
    var passed = [], wi = 0;
    var totalQ = testable.length * 3, asked = 0;
    function pickFor(w) {
      var pool = [];
      (w.lessons || []).forEach(function (l) {
        (l.challenges || []).forEach(function (c) { if (['mcq', 'predict', 'fill', 'breakit', 'harden'].indexOf(c.type) >= 0) pool.push(c); });
      });
      return U.shuffle(pool).slice(0, 3);
    }
    function nextWorld() {
      if (s.quit) return;
      if (wi >= testable.length) return done();
      var w = testable[wi++], qs = pickFor(w), right = 0, qi = 0;
      if (!qs.length) { passed.push(w); return nextWorld(); }
      var intro = U.h('<div class="place-intro"><div class="eyebrow">Placement</div><h2>World ' + w.num + ': ' + U.esc(w.title) + '</h2><div class="unit-ic big" aria-hidden="true">' + CH.art.icon(w.icon || 'star') + '</div><p class="muted">' + U.md(w.blurb || '') + '</p><p>Get <b>2 of ' + qs.length + '</b> right to test out of this world.</p></div>');
      return s.card(intro, 'Start', 'teal').then(function ask() {
        if (qi >= qs.length) {
          var ok = right >= Math.min(2, qs.length);
          if (ok) passed.push(w);
          var res = U.h('<div class="place-res center"><div class="pr-ic">' + icon(ok ? 'ok' : 'no') + '</div><h2>' + (ok ? 'Tested out of World ' + w.num + '!' : 'World ' + w.num + ' is a good place to start') + '</h2><p class="muted">' + right + ' of ' + qs.length + ' right.</p></div>');
          if (ok) setTimeout(function () { CH.fx.burstAt(res, { n: 80 }); CH.audio.play('unlock'); }, 300);
          return s.card(res, ok && wi < testable.length ? 'Next world' : 'See my map', ok ? 'teal' : '').then(function () { if (ok) return nextWorld(); return done(); });
        }
        var ch = qs[qi++];
        asked++;
        s.setProgress(asked / Math.max(1, totalQ));
        return s.challenge(ch, { mode: 'placement', eyebrow: 'Placement · World ' + w.num + ' · ' + qi + ' of ' + qs.length }).then(function (r) { if (r.correct) right++; return ask(); });
      });
    }
    function done() {
      s.dispose();
      var start = passed.length ? G().placementUnlock(passed) : null;
      if (!passed.length) { S().profile.placementDone = true; CH.store.save(); }
      CH.router.go('map', { justDone: 'placement', unlocked: start && start.id }, { root: true, dir: 'down' });
      setTimeout(function () {
        CH.fx.toast(passed.length ? 'You start in World ' + start.num + ': ' + start.title + '!' : 'Starting at World 1. Let’s go!', { icon: icon('map') });
      }, 800);
    }
    CH.router.go('run', { session: s }, { dir: 'up', root: true });
    setTimeout(nextWorld, 0);
  }

  CH.screens.onboarding = { chrome: 'immersive', render: function () { return screen(); } };
  CH.onboarding = { placement: placement };
})();
