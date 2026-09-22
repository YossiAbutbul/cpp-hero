/* ==========================================================================
   Cpp Hero — engine/screens.js
   Tabbed screens: World Map, Curlo (stats, gear, evolution, wardrobe),
   Practice (SRS review + Practice Arena), Code Vault (+ Defense Rules),
   Bug Bestiary, Stats (+ achievements), Settings. Plus the session screen
   wrappers (lesson / project / boss / practice runs) and shared helpers.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util, G = function () { return CH.game; };
  function S() { return CH.store.state; }
  var icon = function (n, c) { return CH.ui.icon(n, c); };
  var screens = (CH.screens = CH.screens || {});
  var SKILL_COLORS = { logic: 'var(--sky)', structure: 'var(--teal)', memory: 'var(--sun)', toolkit: 'var(--tang)', defense: 'var(--coral)' };
  var SKILL_NAMES = { logic: 'Logic', structure: 'Structure', memory: 'Memory', toolkit: 'Toolkit', defense: 'Defense' };

  /* ======================================================================
     Shared helpers
     ====================================================================== */
  var SU = (CH.screensUtil = {});

  SU.vaultCard = function (v) {
    var el = U.h('<article class="vcard' + (v.defense ? ' def' : '') + '"><header>' + (v.defense ? '<span class="badge safe">' + icon('shield') + 'Defense rule</span>' : '') +
      '<h3>' + U.esc(v.title) + '</h3></header></article>');
    if (v.code) el.appendChild(CH.code.block(v.code, { label: v.title }));
    if (v.note) el.appendChild(U.h('<p class="vnote">' + U.md(v.note) + '</p>'));
    return el;
  };

  SU.returnToMap = function (params) {
    CH.router.go('map', params || {}, { dir: 'down', root: true });
  };

  /** Start a map node (with hearts check + world story intro). */
  SU.startNode = function (node) {
    var s = S();
    if ((node.kind === 'lesson' || node.kind === 'boss') && s.hearts.n <= 0) {
      return CH.ui.dialog({
        title: 'Out of hearts', mood: 'worried',
        html: '<p>' + CH.curlo.line('noHearts') + '</p><p class="muted">Next free heart in <b>' + U.fmtClock(G().nextHeartIn()) + '</b>.</p>',
        buttons: [{ label: icon('practice') + 'Practice to refill', value: 'p', cls: 'teal' }, { label: 'Later', value: 0, cls: 'ghost' }]
      }).then(function (v) { if (v === 'p') CH.router.go('practice', { autoReview: true }); });
    }
    var w = node.world;
    function go() {
      if (node.kind === 'lesson') CH.router.go('lesson', { id: node.id }, { dir: 'up' });
      else if (node.kind === 'project') CH.router.go('project', { world: w.id }, { dir: 'up' });
      else if (node.kind === 'boss') CH.router.go('boss', { world: w.id }, { dir: 'up' });
    }
    if (node.kind === 'lesson' && node.i === 0 && !node.done && w.story && w.story.intro) {
      return CH.ui.dialog({ title: 'World ' + w.num + ': ' + w.title, mood: 'celebrate', el: CH.ui.story(w.story.intro), buttons: [{ label: 'Let’s go!', value: 1 }], dismissValue: 0 })
        .then(function (v) { if (v) go(); });
    }
    go();
  };

  /* ======================================================================
     MAP
     ====================================================================== */
  var OFFS = [0, -0.72, -0.12, 0.68, 0.82, 0.08, -0.55, -0.8, 0.2];
  var NODE_ICON = {
    done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cur: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="#fff"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="#A89C8C"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#A89C8C" stroke-width="2.6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#fff"/><path d="M9 7.5Q7 7.5 7.3 10Q7.3 11.3 6 11.8Q7.3 12.3 7.3 13.6Q7 16.2 9 16.2M15 7.5Q17 7.5 16.7 10Q16.7 11.3 18 11.8Q16.7 12.3 16.7 13.6Q17 16.2 15 16.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    project: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l3-8 5-5 6 6-5 5z" fill="#FFC62E" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M14 4l6 6" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>'
  };

  function nodeLabel(n) {
    if (n.kind === 'lesson') return n.lesson.title;
    if (n.kind === 'project') return n.project.title || 'Mini-project';
    return n.boss.name;
  }
  function nodeKindLabel(n) {
    if (n.kind === 'lesson') return (n.lesson.shield ? 'Shield lesson ' : 'Lesson ') + (n.i + 1);
    return n.kind === 'project' ? 'Project' : 'Boss';
  }

  screens.map = {
    tab: 'map',
    render: function (params) {
      var s = S();
      var el = U.h('<section class="screen" aria-label="World map"><div class="scroll map-scroll">' +
        '<div class="para p1" aria-hidden="true"><div class="blob" style="left:-40px;top:360px;width:120px;height:120px;background:var(--sun-l)"></div><div class="blob" style="right:-30px;top:720px;width:150px;height:150px;background:var(--teal-l);animation-delay:-3s"></div><div class="blob" style="left:20px;top:1260px;width:90px;height:90px;background:var(--coral-l);animation-delay:-5s"></div><div class="blob" style="right:10px;top:1800px;width:110px;height:110px;background:var(--sun-l);animation-delay:-2s"></div></div>' +
        '<div class="para p2" aria-hidden="true"><span class="glyph" style="right:18px;top:300px">{ }</span><span class="glyph" style="left:12px;top:800px;animation-delay:-4s">;</span><span class="glyph" style="right:30px;top:1340px;animation-delay:-2s">&lt;&gt;</span><span class="glyph" style="left:24px;top:1900px;animation-delay:-6s">::</span></div>' +
        '<div class="map-inner"></div></div></section>');
      var inner = el.querySelector('.map-inner');

      /* greeting card */
      CH.game.ensureDaily();
      var goal = s.profile.dailyGoalMin || 10, mins = Math.floor(s.daily.minutes);
      var due = G().srsDue().length;
      var intro = U.h('<div class="card intro">' +
        '<div class="eyebrow">' + (s.streak.days ? U.plural(s.streak.days, 'day') + ' streak' : 'Welcome back') + '</div>' +
        '<h1>Hi, hero!</h1><p class="greet"></p>' +
        '<div class="goalbar" role="progressbar" aria-label="Daily goal" aria-valuemin="0" aria-valuemax="' + goal + '" aria-valuenow="' + Math.min(mins, goal) + '"><i style="--p:' + Math.min(1, s.daily.minutes / goal) + '"></i><span>' + Math.min(mins, goal) + ' / ' + goal + ' min today</span></div>' +
        (due ? '<button class="pbtn sun small review-btn">' + icon('practice') + 'Review ' + U.plural(due, 'concept') + '</button>' : '') +
        '<button class="mini poke" aria-label="Poke ' + U.esc(s.profile.name) + '"></button></div>');
      intro.querySelector('.greet').innerHTML = U.esc(s.profile.name) + ': ' + CH.curlo.line('greet');
      var mini = CH.curlo.mount(intro.querySelector('.mini'));
      intro.querySelector('.mini').onclick = function () {
        CH.audio.play('pop'); CH.fx.springPoke(intro.querySelector('.mini'));
        CH.curlo.react(mini, U.pick(['celebrate', 'worried', 'thinking', 'bracing']), 1100);
        CH.curlo.say(intro.querySelector('.greet'), U.esc(s.profile.name) + ': ' + CH.curlo.line('poke'));
      };
      var rb = intro.querySelector('.review-btn');
      if (rb) rb.onclick = function () { CH.router.go('practice', { autoReview: true }); };
      inner.appendChild(intro);

      /* worlds */
      var cur = G().currentNode();
      var ws = G().worlds();
      ws.forEach(function (w) {
        var nodes = G().nodes(w), unlocked = G().worldUnlocked(w);
        var doneN = nodes.filter(function (n) { return n.done; }).length;
        var banner = U.h('<div class="unit' + (unlocked ? '' : ' locked') + '" id="world-' + U.esc(w.id) + '">' +
          '<div class="unit-ic" aria-hidden="true">' + CH.art.icon(w.icon || 'star') + '</div>' +
          '<div class="unit-t"><small>WORLD ' + w.num + '</small><b>' + U.esc(w.title) + '</b></div>' +
          '<span>' + (unlocked ? doneN + ' / ' + nodes.length : icon('lock') + ' Locked') + '</span></div>');
        banner.title = w.blurb || '';
        inner.appendChild(banner);
        if (w.blurb && unlocked) inner.appendChild(U.h('<p class="unit-blurb">' + U.md(w.blurb) + '</p>'));
        var path = U.h('<div class="path" data-world="' + U.esc(w.id) + '"></div>');
        inner.appendChild(path);
        path._nodes = nodes; path._cur = cur;
      });
      if (ws.length < 16) {
        inner.appendChild(U.h('<div class="card more-card"><div class="more-ic" aria-hidden="true">' + CH.art.icon('castle', { color: '#A89C8C' }) + '</div><div><b>More worlds on the way</b><p class="muted">Worlds ' + (ws.length + 1) + '–16 are being forged: decisions, loops, functions, memory, classes, templates and the STL. Beat every boss to be ready!</p></div></div>'));
      }
      el._params = params;
      return el;
    },
    onShow: function (el, params) {
      buildPaths(el);
      var sc = el.querySelector('.map-scroll');
      sc.addEventListener('scroll', function () {
        if (CH.fx.reduced()) return;
        var y = sc.scrollTop;
        el.querySelector('.p1').style.transform = 'translateY(' + (y * 0.35) + 'px)';
        el.querySelector('.p2').style.transform = 'translateY(' + (y * 0.6) + 'px)';
      }, { passive: true });
      // Scroll the current node into view (centered), then celebrate.
      var curEl = el.querySelector('.node.cur');
      if (curEl) {
        var target = curEl.offsetTop + curEl.closest('.path').offsetTop - sc.clientHeight / 2 + 40;
        sc.scrollTop = Math.max(0, target - (params.justDone ? 160 : 0));
        if (params.justDone && !CH.fx.reduced()) {
          setTimeout(function () { try { sc.scrollTo({ top: Math.max(0, target), behavior: 'smooth' }); } catch (e) { sc.scrollTop = target; } }, 500);
          curEl.style.opacity = 0;
          setTimeout(function () {
            curEl.style.opacity = '';
            CH.fx.anim(curEl, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: 0.6 }, { transform: 'scale(.92)', offset: 0.8 }, { transform: 'none', opacity: 1 }], { duration: 700 });
            CH.audio.play('unlock');
            CH.fx.burstAt(curEl, { n: 60 });
          }, 1100);
        }
      }
      if (params.unlocked) {
        var b = el.querySelector('#world-' + params.unlocked);
        if (b) setTimeout(function () { CH.fx.toast('New world unlocked!', { icon: icon('map') }); CH.fx.bounce(b); }, 1500);
      }
      // Pending notices (streak freeze used, storage notice...).
      setTimeout(function () {
        var n = G().pendingNotes.shift();
        if (n) CH.fx.toast(n.msg, { icon: icon(n.icon) });
      }, 900);
      setTimeout(function () { CH.ui.flushCelebrations(); }, params.justDone ? 1900 : 500);
      clearTimeout(resizeT);
      window.removeEventListener('resize', onResize);
      window.addEventListener('resize', onResize);
    },
    onHide: function () { window.removeEventListener('resize', onResize); }
  };
  var resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var cur = CH.router.current;
      if (cur && cur.name === 'map') buildPaths(cur.el);
    }, 150);
  }

  /** Lay out the winding paths (needs real widths, so runs after insertion). */
  function buildPaths(el) {
    U.$$('.path', el).forEach(function (wrap) {
      var nodes = wrap._nodes || [], cur = wrap._cur;
      var W = wrap.clientWidth || 340, cx = W / 2, amp = Math.min(96, W * 0.27);
      var pts = nodes.map(function (n, i) {
        var o = n.kind === 'boss' ? 0 : OFFS[i % OFFS.length];
        return { x: cx + o * amp, y: 84 + i * 118, o: o };
      });
      var H = (pts.length ? pts[pts.length - 1].y : 0) + 86;
      wrap.style.height = H + 'px';
      function seg(list) {
        return list.map(function (p, i) {
          if (!i) return 'M' + p.x + ' ' + p.y;
          var q = list[i - 1], dy = (p.y - q.y) / 2;
          return 'C' + q.x + ' ' + (q.y + dy) + ' ' + p.x + ' ' + (p.y - dy) + ' ' + p.x + ' ' + p.y;
        }).join(' ');
      }
      var lastLit = -1;
      nodes.forEach(function (n, i) { if (n.done || (cur && cur.id === n.id)) lastLit = i; });
      var html = '<svg class="lines" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path class="dots" d="' + seg(pts) + '"/>' +
        (lastLit > 0 ? '<path class="path-glow" d="' + seg(pts.slice(0, lastLit + 1)) + '"/><path class="path-prog" d="' + seg(pts.slice(0, lastLit + 1)) + '"/>' : '') + '</svg>';
      var s = S();
      nodes.forEach(function (n, i) {
        var p = pts[i], isCur = cur && cur.id === n.id;
        var st = n.done ? 'done' : isCur ? 'cur' : n.open ? 'open' : 'lock';
        var cls = 'node ' + st + (n.kind === 'boss' ? ' boss' : '') + (n.kind === 'project' ? ' proj' : '') + (n.lesson && n.lesson.shield ? ' shield' : '');
        var ic;
        if (n.kind === 'boss') ic = '<span class="boss-mini">' + CH.art.boss(n.boss.art || 'gremlin') + '</span>' + (st === 'lock' ? '<span class="lock-badge">' + NODE_ICON.lock + '</span>' : st === 'done' ? '<span class="lock-badge ok">' + NODE_ICON.done + '</span>' : '');
        else if (st === 'lock') ic = NODE_ICON.lock;
        else if (n.kind === 'project') ic = NODE_ICON.project;
        else if (st === 'done') ic = NODE_ICON.done;
        else if (n.lesson && n.lesson.shield) ic = NODE_ICON.shield;
        else ic = NODE_ICON.cur;
        var stateTxt = st === 'done' ? 'complete' : st === 'cur' ? 'you are here' : st === 'open' ? 'open' : 'locked';
        var best = n.kind === 'lesson' && s.lessons[n.id] ? ', best ' + Math.round((s.lessons[n.id].best || 0) * 100) + '%' : '';
        html += '<button class="' + cls + '" style="left:' + p.x + 'px;top:' + p.y + 'px" data-i="' + i + '" aria-label="' + U.esc(nodeKindLabel(n) + ': ' + nodeLabel(n) + ', ' + stateTxt + best) + '">' + ic + '</button>';
        var right = p.o <= 0.05, off = n.kind === 'boss' ? 62 : isCur ? 54 : 48;
        html += '<div class="nlabel ' + st + '" style="top:' + p.y + 'px;' + (right ? 'left:' + (p.x + off) + 'px' : 'right:' + (W - p.x + off) + 'px') + '" aria-hidden="true"><small>' + U.esc(nodeKindLabel(n)) + (n.done ? ' · ' + (n.kind === 'lesson' ? Math.round((s.lessons[n.id].best || 0) * 100) + '%' : 'done') : '') + '</small>' + U.esc(nodeLabel(n)) + '</div>';
        if (isCur) html += '<div class="start-tip" style="left:' + p.x + 'px;top:' + (p.y - (n.kind === 'boss' ? 62 : 52)) + 'px" aria-hidden="true">' + (n.kind === 'boss' ? 'FIGHT!' : 'START') + '</div>';
      });
      wrap.innerHTML = html;
      U.$$('.node', wrap).forEach(function (b) {
        b.onclick = function () { onNode(nodes[+b.dataset.i], b); };
      });
      var pp = wrap.querySelector('.path-prog');
      if (pp && !CH.fx.reduced() && pp.getTotalLength) {
        try {
          var L = pp.getTotalLength();
          pp.style.strokeDasharray = L;
          CH.fx.anim(pp, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1400, easing: 'cubic-bezier(.3,1.2,.5,1)', delay: 300, fill: 'backwards' });
        } catch (e) { /* ignore */ }
      }
    });
  }

  function onNode(n, btn) {
    if (!n.open) {
      CH.audio.play('tap');
      CH.fx.wiggle(btn);
      var w = n.world, msg;
      if (!G().worldUnlocked(w)) msg = 'Beat the previous world’s boss to unlock World ' + w.num + '.';
      else if (n.kind === 'project') msg = 'Finish every lesson in World ' + w.num + ' to unlock the project.';
      else if (n.kind === 'boss') msg = 'Complete the mini-project to face ' + n.boss.name + '.';
      else msg = 'Finish the previous lesson first.';
      CH.fx.toast(msg, { icon: icon('lock') });
      return;
    }
    CH.audio.play('pop');
    var s = S();
    var body = '';
    if (n.kind === 'lesson') {
      var l = n.lesson, rec = s.lessons[l.id];
      body = '<div class="node-sheet"><div class="ns-tags"><span class="pill" style="--c:' + (SKILL_COLORS[l.shield ? 'defense' : l.skill] || 'var(--teal)') + '">' + U.esc(SKILL_NAMES[l.shield ? 'defense' : l.skill] || l.skill) + '</span>' + (l.shield ? '<span class="badge safe">' + icon('shield') + 'Shield lesson</span>' : '') + '</div>' +
        '<p>' + U.md((l.concept && l.concept.analogy) || '') + '</p>' +
        '<p class="muted small">' + U.plural((l.challenges || []).length, 'challenge') + ' · about 4 minutes' + (rec ? ' · best ' + Math.round(rec.best * 100) + '%' : '') + '</p></div>';
    } else if (n.kind === 'project') {
      body = '<div class="node-sheet"><p>' + U.md([].concat(n.project.intro || '')[0]) + '</p><p class="muted small">' + U.plural((n.project.steps || []).length, 'build step') + ' + a Stress Test</p></div>';
    } else {
      body = '<div class="node-sheet boss-sheet"><div class="bs-art">' + CH.art.boss(n.boss.art || 'gremlin') + '</div><p>' + U.md([].concat(n.boss.intro || '')[0]) + '</p><p class="muted small">' + (n.boss.hp || 1) + ' HP · Defense Phase · wrong answers cost hearts</p></div>';
    }
    var el = U.h('<div>' + body + '<div class="row"><button class="pbtn ' + (n.kind === 'boss' ? 'coral' : n.done ? 'ghost' : '') + '" data-autofocus>' +
      (n.kind === 'boss' ? icon('swords') + (n.done ? 'Rematch' : 'Fight!') : n.done ? icon('retype') + 'Practice again' : icon('play') + 'Start') + '</button></div></div>');
    var sh = CH.ui.sheet({ title: nodeLabel(n), el: el });
    el.querySelector('.pbtn').onclick = function () { sh.close(); setTimeout(function () { SU.startNode(n); }, 120); };
  }

  /* ======================================================================
     Session screen wrappers
     ====================================================================== */
  screens.lesson = { chrome: 'immersive', render: function (p) {
    var l = G().index.lesson[p.id];
    if (!l) throw new Error('Lesson not found: ' + p.id);
    return CH.session.playLesson(l, l._world).el;
  } };
  screens.project = { chrome: 'immersive', render: function (p) { return CH.project.play(G().index.world[p.world]).el; } };
  screens.boss = { chrome: 'immersive', render: function (p) { return CH.boss.play(G().index.world[p.world]).el; } };
  screens.run = { chrome: 'immersive', render: function (p) { return p.session.el; } };

  /* ======================================================================
     CURLO (buddy): stats, gear, evolution, wardrobe
     ====================================================================== */
  screens.buddy = {
    tab: 'buddy',
    render: function () {
      var s = S(), tier = CH.curlo.tier(), form = CH.curlo.form(), T = CH.curlo.TIERS[tier], F = CH.curlo.FORMS[form];
      var el = U.h('<section class="screen" aria-label="' + U.esc(s.profile.name) + '"><div class="scroll">' +
        '<div class="hero"><div class="halo"><span class="spark" style="left:18px;top:40px"></span><span class="spark" style="right:22px;top:24px;animation-delay:-.8s"></span><span class="spark" style="right:10px;bottom:52px;animation-delay:-1.6s"></span>' +
        '<button class="poke" aria-label="Poke ' + U.esc(s.profile.name) + '"></button></div>' +
        '<div class="nameplate"><h2>' + U.esc(s.profile.name) + '</h2><span class="lvl-badge">Lv ' + s.level + '</span><button class="ibtn small rename" aria-label="Rename">' + icon('wand') + '</button></div>' +
        '<div class="bubble tail-b buddy-say" aria-live="polite">' + CH.curlo.line('idle') + '</div></div>' +
        '<div class="row" style="margin:18px 0 14px"><button class="pbtn sun talk">Chat with ' + U.esc(s.profile.name) + '</button></div>' +
        '<div class="card"><h3>Hero stats</h3><div class="stats"></div></div>' +
        '<div class="card gear"><div class="gsvg"></div><div><div class="eyebrow" style="color:var(--teal-d)">Defense gear</div><h3>' + T.name + '</h3>' +
          '<p class="muted small">Tier ' + tier + ' of 3. Levels up with your Defense stat (' + Math.round(s.stats.defense) + '). ' + (tier < 3 ? 'Next: ' + T.next + '.' : T.next) + '</p>' +
          '<div class="tierdots" aria-hidden="true"><i class="' + (tier >= 1 ? 'on' : '') + '"></i><i class="' + (tier >= 2 ? 'on' : '') + '"></i><i class="' + (tier >= 3 ? 'on' : '') + '"></i></div></div></div>' +
        '<div class="card evo-card"><div class="eyebrow">Evolution</div><h3>Form ' + form + ': ' + F.name + '</h3><p class="muted small">' + U.esc(F.gear) + '. ' +
          (form < 3 ? 'Next form after beating World ' + CH.curlo.FORMS[form + 1].after + '’s boss.' : 'Final form reached!') + '</p><div class="evo-row"></div></div>' +
        '<div class="card wardrobe"><h3>Wardrobe</h3><div class="wr-sec" data-slot="hat"><div class="eyebrow">Hats</div><div class="wr-grid"></div></div>' +
          '<div class="wr-sec" data-slot="color"><div class="eyebrow">Colors</div><div class="wr-grid"></div></div>' +
          '<div class="wr-sec" data-slot="shield"><div class="eyebrow">Shield skins</div><div class="wr-grid"></div></div></div>' +
        '</div></section>');
      var buddy = CH.curlo.mount(el.querySelector('.poke'));
      CH.curlo.mount(el.querySelector('.gsvg'), { mood: 'bracing' });
      var evoRow = el.querySelector('.evo-row');
      [1, 2, 3].forEach(function (f) {
        var d = U.h('<div class="evo-f' + (f === form ? ' on' : '') + (f > form ? ' locked' : '') + '"><div class="evo-m"></div><small>' + CH.curlo.FORMS[f].name + '</small></div>');
        CH.curlo.mount(d.querySelector('.evo-m'), { form: f, fixed: true, hat: null });
        evoRow.appendChild(d);
      });
      var gsvg = el.querySelector('.gsvg svg'); if (gsvg) gsvg.classList.add('shield-up');
      el.querySelector('.poke').onclick = function () {
        CH.audio.play('pop'); CH.fx.springPoke(el.querySelector('.poke'));
        CH.curlo.react(buddy, U.pick(['celebrate', 'worried', 'thinking', 'bracing']), 1100);
        CH.curlo.say(el.querySelector('.buddy-say'), CH.curlo.line('poke'));
      };
      el.querySelector('.talk').onclick = function () {
        CH.audio.play('pop');
        var st = S().streak.days;
        var txt = st >= 2 && Math.random() < 0.3 ? CH.curlo.line('streak', { n: st }) : CH.curlo.line('idle');
        CH.curlo.say(el.querySelector('.buddy-say'), txt);
        CH.curlo.react(buddy, Math.random() < 0.5 ? 'celebrate' : 'thinking', 1000);
      };
      el.querySelector('.rename').onclick = renameDialog;
      // stats bars
      var stats = el.querySelector('.stats');
      G().SKILLS.forEach(function (k, i) {
        var v = Math.round(s.stats[k]);
        stats.appendChild(U.h('<div class="stat"><span>' + SKILL_NAMES[k] + '</span><div class="sbar" role="meter" aria-label="' + SKILL_NAMES[k] + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '"><div class="sfill" style="--c:' + SKILL_COLORS[k] + ';transition-delay:' + (i * 90) + 'ms"></div></div><span class="snum">0</span></div>'));
      });
      // wardrobe
      var owned = s.cosmetics.owned, eq = s.cosmetics.equipped;
      var defs = G().cosmeticDefs();
      ['hat', 'color', 'shield'].forEach(function (slot) {
        var grid = el.querySelector('.wr-sec[data-slot=' + slot + '] .wr-grid');
        var list = defs.filter(function (c) { return (c.slot || 'hat') === slot; });
        if (slot === 'hat') list.unshift({ id: null, slot: 'hat', name: 'No hat' });
        if (slot === 'shield') list.unshift({ id: null, slot: 'shield', name: 'Tier shield' });
        if (slot === 'color' && !list.some(function (c) { return c.id === 'classic'; })) list.unshift({ id: 'classic', slot: 'color', name: 'Classic Tangerine' });
        list.forEach(function (c) {
          var have = c.id === null || owned.indexOf(c.id) >= 0;
          var on = (eq[slot] || null) === c.id || (slot === 'color' && !eq.color && c.id === 'classic');
          var b = U.h('<button class="wr-item' + (on ? ' on' : '') + (have ? '' : ' locked') + '" aria-pressed="' + on + '"><div class="wr-prev"></div><small>' + U.esc(c.name) + '</small>' +
            (have ? '' : '<span class="wr-lock">' + icon('lock') + '</span>') + '</button>');
          b.setAttribute('aria-label', c.name + (have ? (on ? ', equipped' : ', tap to equip') : ', locked: ' + (c.source || c.how || 'keep playing')));
          var o = { fixed: true, mood: 'happy', hat: slot === 'hat' ? c.id : null };
          if (slot === 'color') o.variant = c.id;
          if (slot === 'shield') o.shield = c.id || '';
          CH.curlo.mount(b.querySelector('.wr-prev'), o);
          if (!have) b.querySelector('.wr-prev svg').classList.add('silhouette');
          b.onclick = function () {
            if (!have) { CH.audio.play('tap'); CH.fx.wiggle(b); CH.fx.toast('Locked: ' + (c.source || c.how || 'keep playing to unlock'), { icon: icon('lock') }); return; }
            CH.audio.play('select');
            G().equip(slot, c.id);
            U.$$('.wr-item', grid).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
            b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
            CH.fx.bounce(b);
            CH.curlo.react(buddy, 'celebrate', 900);
          };
          grid.appendChild(b);
        });
      });
      return el;
    },
    onShow: function (el) {
      var s = S();
      var rows = U.$$('.stat', el);
      rows.forEach(function (r, i) {
        var k = G().SKILLS[i], v = Math.round(s.stats[k]);
        setTimeout(function () {
          r.querySelector('.sfill').style.transform = 'scaleX(' + v / 100 + ')';
          CH.fx.countUp(r.querySelector('.snum'), 0, v, 900);
        }, CH.fx.reduced() ? 0 : 260 + i * 90);
      });
      setTimeout(function () { CH.curlo.react(el.querySelector('.poke svg'), 'celebrate', 900); }, 350);
    }
  };

  function renameDialog() {
    var id = U.uid('nm');
    CH.ui.dialog({
      title: 'Rename your companion', mood: 'thinking',
      html: '<label for="' + id + '" class="lbl">Name</label><input id="' + id + '" class="text-in" maxlength="16" value="' + U.esc(S().profile.name) + '">',
      buttons: [{ label: 'Save', value: 'save' }, { label: 'Cancel', value: 0, cls: 'ghost' }],
      onMount: function (el) { var i = el.querySelector('input'); setTimeout(function () { i.focus(); i.select(); }, 80); el._in = i; i.addEventListener('keydown', function (e) { if (e.key === 'Enter') el.querySelector('.dlg-btns .pbtn').click(); }); }
    }).then(function (v) {
      var inp = document.getElementById(id);
      var val = inp ? inp.value : '';
      if (v === 'save') {
        var name = String(val || '').trim().slice(0, 16) || 'Curlo';
        S().profile.name = name; CH.store.save();
        CH.router.refresh();
      }
    });
  }


  /* ======================================================================
     PRACTICE: SRS review + Practice Arena
     ====================================================================== */
  function startReview() {
    var list = G().reviewSet(5);
    if (!list.length) { CH.fx.toast('Finish a lesson first. Then there’s something to review!', { icon: icon('practice') }); return; }
    var s = CH.session.playList({
      mode: 'review', title: 'Review', noun: 'review', list: list,
      eyebrow: function (i, ch) { return 'Review · ' + i + ' of ' + list.length + ' · ' + (CH.challenges.TYPES[ch.type] || ''); },
      onDone: function (sess) {
        var gained = G().gainHeart(1);
        G().questEvent('practice.done', 1);
        G().markActive();
        var extra = U.h('<div class="stat-gain">' + icon('heart') + (gained ? ' +1 heart for reviewing!' : ' Hearts are full. Nice upkeep!') + '</div>');
        return sess.results({ title: 'Review complete!', sub: 'Spaced repetition keeps concepts fresh.', extraEl: extra }).then(function () { SU.returnToMap(); });
      }
    });
    CH.router.go('run', { session: s }, { dir: 'up' });
  }
  function startPractice(type) {
    var idx = G().index.challenge;
    var seen = G().seenChallengeIds().filter(function (id) { return idx[id].ch.type === type; });
    var list = U.shuffle(seen).slice(0, 5).map(function (id) { return idx[id].ch; });
    if (!list.length) return;
    var s = CH.session.playList({
      mode: 'practice', title: 'Practice: ' + CH.challenges.TYPES[type], noun: 'practice run', list: list,
      eyebrow: function (i) { return 'Practice Arena · ' + CH.challenges.TYPES[type] + ' · ' + i + ' of ' + list.length + ' · bonus XP'; },
      onDone: function (sess) {
        G().questEvent('practice.done', 1);
        G().markActive();
        return sess.results({ title: 'Practice complete!', sub: 'Bonus XP earned in the Arena.' }).then(function () { CH.router.go('practice', {}, { dir: 'down', root: true }); });
      }
    });
    CH.router.go('run', { session: s }, { dir: 'up' });
  }
  var TYPE_ICON = { mcq: 'star', predict: 'play', fill: 'wand', order: 'grip', write: 'text', bug: 'bug', breakit: 'swords', harden: 'shield', review: 'warn', edge: 'target', safe: 'shieldO', speed: 'bolt' };

  screens.practice = {
    tab: 'practice',
    render: function (p) {
      var due = G().srsDue().length, seen = G().seenChallengeIds(), idx = G().index.challenge;
      var s = S();
      var el = U.h('<section class="screen" aria-label="Practice"><div class="scroll">' +
        '<div class="eyebrow">Practice</div><h2 class="scr-title">Train your brain</h2>' +
        '<div class="card review-card"><div class="rc-ic" aria-hidden="true"></div><div class="rc-b"><h3>Spaced review</h3><p class="muted small">' +
          (due ? U.plural(due, 'concept') + ' due for review.' : seen.length ? 'Nothing due right now. Review anyway to stay sharp!' : 'Finish your first lesson to unlock reviews.') +
          ' Each review earns <b>+1 heart</b>.</p></div><button class="pbtn teal" ' + (seen.length || due ? '' : 'disabled') + '>' + icon('practice') + 'Review</button></div>' +
        '<h3 class="sec-h">Practice Arena <span class="muted small">bonus XP, no hearts lost</span></h3><div class="arena-grid"></div></div></section>');
      CH.curlo.mount(el.querySelector('.rc-ic'), { mood: due ? 'thinking' : 'happy' });
      el.querySelector('.review-card .pbtn').onclick = startReview;
      var grid = el.querySelector('.arena-grid');
      Object.keys(CH.challenges.TYPES).forEach(function (t) {
        var n = seen.filter(function (id) { return idx[id].ch.type === t; }).length;
        var b = U.h('<button class="type-card' + (n ? '' : ' locked') + '"><span class="tc-ic">' + icon(n ? TYPE_ICON[t] : 'lock') + '</span><b>' + CH.challenges.TYPES[t] + '</b><small>' + (n ? U.plural(n, 'challenge') : 'Not unlocked yet') + '</small></button>');
        b.setAttribute('aria-label', CH.challenges.TYPES[t] + (n ? ', ' + n + ' challenges' : ', locked'));
        b.onclick = function () {
          if (!n) { CH.audio.play('tap'); CH.fx.wiggle(b); CH.fx.toast('Meet this challenge type in a lesson to unlock it here.', { icon: icon('lock') }); return; }
          CH.audio.play('pop'); startPractice(t);
        };
        grid.appendChild(b);
      });
      void s;
      return el;
    },
    onShow: function (el, p) { if (p.autoReview) setTimeout(startReview, 350); }
  };

  /* ======================================================================
     CODE VAULT (Cheat Sheet + Defense Rules)
     ====================================================================== */
  screens.vault = {
    tab: 'vault',
    render: function (p) {
      var s = S(), idx = G().index.vault;
      var all = Object.keys(idx).map(function (id) { return idx[id]; });
      var tab = p.tab || 'sheet';
      var el = U.h('<section class="screen" aria-label="Code Vault"><div class="scroll">' +
        '<div class="eyebrow">Code Vault</div><h2 class="scr-title">Your cheat sheet</h2>' +
        '<div class="seg" role="tablist" aria-label="Vault sections">' +
          '<button role="tab" id="vt-sheet" aria-controls="vp" aria-selected="' + (tab === 'sheet') + '" data-t="sheet">' + icon('vault') + 'Cheat Sheet</button>' +
          '<button role="tab" id="vt-def" aria-controls="vp" aria-selected="' + (tab === 'def') + '" data-t="def">' + icon('shieldO') + 'Defense Rules</button></div>' +
        '<div id="vp" role="tabpanel" class="vault-panel"></div></div></section>');
      var panel = el.querySelector('.vault-panel');
      function draw(t) {
        panel.innerHTML = '';
        panel.setAttribute('aria-labelledby', 'vt-' + t);
        var list = all.filter(function (v) { return !!v.card.defense === (t === 'def'); });
        var have = list.filter(function (v) { return s.vault.indexOf(v.card.id) >= 0; });
        if (!have.length) {
          panel.appendChild(U.h('<div class="empty-state"><div class="es-c"></div><p><b>' + (t === 'def' ? 'No defense rules yet.' : 'Your vault is empty.') + '</b><br>Finish lessons to collect cards here' + (t === 'def' ? ', especially Shield Lessons.' : '.') + '</p></div>'));
          CH.curlo.mount(panel.querySelector('.es-c'), { mood: 'thinking' });
        }
        var byW = {};
        have.forEach(function (v) { (byW[v.world.id] = byW[v.world.id] || { w: v.world, list: [] }).list.push(v.card); });
        G().worlds().forEach(function (w) {
          if (!byW[w.id]) return;
          panel.appendChild(U.h('<div class="vault-w">World ' + w.num + ' · ' + U.esc(w.title) + '</div>'));
          byW[w.id].list.forEach(function (c, i) { var vc = SU.vaultCard(c); panel.appendChild(vc); CH.fx.slideUp(vc, i * 60); });
        });
        var locked = list.length - have.length;
        if (locked > 0) panel.appendChild(U.h('<p class="more">' + icon('lock') + ' ' + U.plural(locked, 'more card') + ' to discover.</p>'));
      }
      U.$$('[role=tab]', el).forEach(function (b) {
        b.onclick = function () {
          U.$$('[role=tab]', el).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
          CH.audio.play('tap');
          draw(b.dataset.t);
        };
        b.onkeydown = function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = U.$$('[role=tab]', el).filter(function (x) { return x !== b; })[0]; o.focus(); o.click(); }
        };
      });
      draw(tab);
      return el;
    }
  };

  /* ======================================================================
     BUG BESTIARY
     ====================================================================== */
  screens.bestiary = {
    tab: 'bestiary',
    render: function () {
      var s = S(), list = CH.content.bestiary.filter(function (b) { return CH.dev || !/^dev-/.test(b.id); });
      var got = list.filter(function (b) { return s.bestiary.indexOf(b.id) >= 0; }).length;
      var el = U.h('<section class="screen" aria-label="Bug Bestiary"><div class="scroll">' +
        '<div class="eyebrow">Bug Bestiary</div><h2 class="scr-title">Bugs defeated: ' + got + ' / ' + list.length + '</h2>' +
        '<div class="bprog" role="progressbar" aria-valuemin="0" aria-valuemax="' + list.length + '" aria-valuenow="' + got + '"><i style="--p:' + (list.length ? got / list.length : 0) + '"></i></div>' +
        '<div class="beast-grid"></div></div></section>');
      var grid = el.querySelector('.beast-grid');
      list.forEach(function (b, i) {
        var have = s.bestiary.indexOf(b.id) >= 0;
        var w = G().index.world[b.world];
        var c = U.h('<button class="beast' + (have ? '' : ' locked') + '"><div class="b-art">' + CH.art.beast(b.art || 'bug', { color: b.color, locked: !have }) + (have ? '' : '<span class="q" aria-hidden="true">?</span>') + '</div>' +
          '<b>' + (have ? U.esc(b.name) : '???') + '</b><small>' + (w ? 'World ' + w.num : (b.world ? 'World ' + String(b.world).replace(/^w/, '') : '')) + '</small></button>');
        c.setAttribute('aria-label', have ? b.name + ', defeated. Tap for details.' : 'Undiscovered bug' + (b.world ? ' from world ' + String(b.world).replace(/^w/, '') : ''));
        c.onclick = function () {
          CH.audio.play(have ? 'pop' : 'tap');
          if (!have) { CH.fx.wiggle(c); CH.fx.toast('Defeat this bug in ' + (b.world ? 'World ' + String(b.world).replace(/^w/, '') : 'a later world') + ' to reveal it.', { icon: icon('bug') }); return; }
          CH.ui.sheet({ title: b.name, html: '<div class="beast-detail"><div class="bd-art">' + CH.art.beast(b.art || 'bug', { color: b.color }) + '</div>' +
            '<h4>' + icon('alert') + ' How it happens</h4><p>' + U.md(b.how || '') + '</p><h4>' + icon('shield') + ' How to prevent it</h4><p>' + U.md(b.prevent || '') + '</p></div>' });
        };
        grid.appendChild(c);
        CH.fx.popIn(c, Math.min(i, 12) * 40);
      });
      return el;
    }
  };

  /* ======================================================================
     STATS (+ achievements)
     ====================================================================== */
  screens.stats = {
    tab: 'more',
    render: function () {
      var s = S(), c = s.counters;
      var acc = c.correct + c.wrong ? Math.round(100 * c.correct / (c.correct + c.wrong)) : 0;
      // accuracy per skill via tag → skill
      var perSkill = {};
      Object.keys(c.byTag).forEach(function (t) {
        if (/^bug:/.test(t)) return;
        var sk = G().index.tagSkill[t] || 'structure';
        var p = perSkill[sk] = perSkill[sk] || { r: 0, w: 0 };
        p.r += c.byTag[t].r; p.w += c.byTag[t].w;
      });
      var ranked = Object.keys(perSkill).filter(function (k) { return perSkill[k].r + perSkill[k].w >= 3; })
        .map(function (k) { return { k: k, a: perSkill[k].r / (perSkill[k].r + perSkill[k].w) }; }).sort(function (a, b) { return b.a - a.a; });
      var el = U.h('<section class="screen" aria-label="Stats"><div class="scroll">' +
        '<div class="eyebrow">Stats</div><h2 class="scr-title">Your journey</h2><div class="tiles stat-tiles"></div>' +
        '<div class="card"><h3>Accuracy by skill</h3><div class="skill-acc"></div>' +
          (ranked.length >= 2 ? '<p class="small"><b>Strongest:</b> ' + SKILL_NAMES[ranked[0].k] + ' · <b>Needs practice:</b> ' + SKILL_NAMES[ranked[ranked.length - 1].k] + '</p>' : '<p class="muted small">Answer more challenges to see your strongest and weakest skills.</p>') + '</div>' +
        '<div class="card"><h3>World progress</h3><div class="wprog"></div></div>' +
        '<div class="card"><h3>Achievements</h3><div class="ach-grid"></div></div></div></section>');
      var tiles = el.querySelector('.stat-tiles');
      [
        { l: 'Time spent', v: U.fmtDuration(c.secondsPlayed), i: 'clock', cls: 'sky' },
        { l: 'Lessons done', v: G().lessonsDone().length, i: 'vault', cls: 'teal' },
        { l: 'Accuracy', v: acc + '%', i: 'target', cls: 'coral' },
        { l: 'Bugs defeated', v: s.bestiary.length, i: 'bug', cls: 'tang' },
        { l: 'Best combo', v: 'x' + c.bestCombo, i: 'bolt', cls: 'sun' },
        { l: 'Best streak', v: U.plural(s.streak.best, 'day'), i: 'flame', cls: 'tang' },
        { l: 'Snippets hardened', v: c.hardened, i: 'shield', cls: 'teal' },
        { l: 'Reviews', v: c.reviews, i: 'practice', cls: 'sky' }
      ].forEach(function (t, i) {
        var tile = U.h('<div class="tile-stat ' + t.cls + '"><div class="ts-l">' + icon(t.i) + U.esc(t.l) + '</div><div class="ts-v">' + U.esc(t.v) + '</div></div>');
        tiles.appendChild(tile); CH.fx.popIn(tile, i * 50);
      });
      var sa = el.querySelector('.skill-acc');
      G().SKILLS.forEach(function (k) {
        var p = perSkill[k], n = p ? p.r + p.w : 0, a = n ? Math.round(100 * p.r / n) : 0;
        sa.appendChild(U.h('<div class="stat"><span>' + SKILL_NAMES[k] + '</span><div class="sbar" role="meter" aria-label="' + SKILL_NAMES[k] + ' accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + a + '"><div class="sfill" style="--c:' + SKILL_COLORS[k] + ';transform:scaleX(' + a / 100 + ')"></div></div><span class="snum">' + (n ? a + '%' : '–') + '</span></div>'));
      });
      var wp = el.querySelector('.wprog');
      G().worlds().forEach(function (w) {
        var nodes = G().nodes(w), d = nodes.filter(function (n) { return n.done; }).length;
        wp.appendChild(U.h('<div class="stat"><span>W' + w.num + '</span><div class="sbar" role="meter" aria-label="World ' + w.num + ' progress" aria-valuemin="0" aria-valuemax="' + nodes.length + '" aria-valuenow="' + d + '"><div class="sfill" style="--c:var(--tang);transform:scaleX(' + (nodes.length ? d / nodes.length : 0) + ')"></div></div><span class="snum">' + d + '/' + nodes.length + '</span></div>'));
      });
      var ag = el.querySelector('.ach-grid');
      G().achDefs().forEach(function (a) {
        var at = s.achievements[a.id];
        ag.appendChild(U.h('<div class="ach-item' + (at ? ' got' : '') + '"><span class="ach-ic">' + icon(at ? 'trophy' : 'lock') + '</span><div><b>' + U.esc(a.name) + '</b><small>' + U.esc(a.desc || '') + (at ? ' · ' + new Date(at).toLocaleDateString() : '') + '</small></div></div>'));
      });
      return el;
    }
  };

  /* ======================================================================
     SETTINGS
     ====================================================================== */
  screens.settings = {
    tab: 'more',
    render: function () {
      var s = S(), st = s.settings;
      function toggle(key, label, ic, desc) {
        return '<div class="set-row"><span class="set-ic">' + icon(ic) + '</span><div class="set-t"><b id="lb-' + key + '">' + label + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</div>' +
          '<button class="switch" role="switch" aria-checked="' + !!st[key] + '" aria-labelledby="lb-' + key + '" data-k="' + key + '"><i></i></button></div>';
      }
      var el = U.h('<section class="screen" aria-label="Settings"><div class="scroll">' +
        '<div class="eyebrow">Settings</div><h2 class="scr-title">Make it yours</h2>' +
        (CH.store.persistent ? '' : '<div class="notice" role="note">' + icon('info') + '<span>Progress can’t be saved on this device (storage is blocked). Use Export to keep a copy.</span></div>') +
        '<div class="card">' +
          toggle('sound', 'Sound effects', 'sound') + toggle('music', 'Music', 'music', 'Gentle generated ambient loop') +
          toggle('reduceMotion', 'Reduce motion', 'motion', 'Fades instead of bounces; no confetti') +
          '<div class="set-row"><span class="set-ic">' + icon('text') + '</span><div class="set-t"><b id="lb-ts">Text size</b></div><div class="seg small" role="radiogroup" aria-labelledby="lb-ts">' +
            ['s', 'm', 'l'].map(function (z) { return '<button role="radio" aria-checked="' + (st.textSize === z) + '" data-ts="' + z + '">' + z.toUpperCase() + '</button>'; }).join('') + '</div></div>' +
          '<div class="set-row"><span class="set-ic">' + icon('target') + '</span><div class="set-t"><b id="lb-goal">Daily goal</b></div><div class="seg small" role="radiogroup" aria-labelledby="lb-goal">' +
            [5, 10, 20].map(function (g) { return '<button role="radio" aria-checked="' + (s.profile.dailyGoalMin === g) + '" data-goal="' + g + '">' + g + 'm</button>'; }).join('') + '</div></div>' +
        '</div>' +
        '<div class="card"><h3>Your progress</h3><p class="muted small">Back up your save as a file, or move it to another device.</p>' +
          '<div class="row"><button class="pbtn teal" data-a="export">' + icon('download') + 'Export</button>' +
          '<button class="pbtn ghost" data-a="import">' + icon('upload') + 'Import</button></div>' +
          '<input type="file" accept="application/json,.json" class="sr" tabindex="-1" aria-hidden="true">' +
          '<div class="row" style="margin-top:12px"><button class="pbtn coral" data-a="reset">' + icon('trash') + 'Reset progress</button></div></div>' +
        '<div class="card about"><div class="about-c"></div><div><b>Cpp Hero</b><p class="muted small">Learn C++ from zero. Defend your code.<br>Build ' + U.esc(CH.VERSION) + '</p></div></div>' +
        (CH.dev ? '<div class="card dev"><h3>Developer tools</h3><div class="sgrid">' +
          '<button class="pbtn ghost" data-dev="xp">+150 XP</button><button class="pbtn ghost" data-dev="hearts">Hearts 0 / refill</button>' +
          '<button class="pbtn ghost" data-dev="unlock">Unlock all worlds</button><button class="pbtn ghost" data-dev="evolve">Evolution sequence</button>' +
          '<button class="pbtn ghost" data-dev="defense">Defense +20</button><button class="pbtn ghost" data-dev="ach">Achievement pop</button>' +
          '<button class="pbtn ghost" data-dev="srs">Make 3 reviews due</button><button class="pbtn ghost" data-dev="onboard">Replay onboarding</button></div></div>' : '') +
        '</div></section>');
      CH.curlo.mount(el.querySelector('.about-c'));
      U.$$('.switch', el).forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.k; st[k] = !st[k];
          b.setAttribute('aria-checked', String(st[k]));
          CH.store.save();
          if (k === 'reduceMotion') { CH.fx.syncReduced(); CH.fx.toast(st[k] ? 'Reduce motion on: fades only.' : 'Full springy motion is back!'); }
          if (k === 'sound' && st[k]) { CH.audio.unlock(); CH.audio.play('pop'); }
          if (k === 'music') CH.audio.sync();
          CH.audio.play('tap');
        };
      });
      U.$$('[data-ts]', el).forEach(function (b) {
        b.onclick = function () {
          st.textSize = b.dataset.ts; CH.store.save(); applyTextSize();
          U.$$('[data-ts]', el).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
          CH.audio.play('tap');
        };
      });
      U.$$('[data-goal]', el).forEach(function (b) {
        b.onclick = function () {
          s.profile.dailyGoalMin = +b.dataset.goal; CH.store.save();
          U.$$('[data-goal]', el).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
          CH.audio.play('tap');
        };
      });
      var file = el.querySelector('input[type=file]');
      el.querySelector('[data-a=export]').onclick = function () {
        CH.audio.play('tap');
        CH.store.exportFile().then(function (ok) {
          if (ok === 'declined') return;
          if (ok) CH.fx.toast('Save exported. Keep it somewhere safe!', { icon: icon('download') });
          else CH.fx.toast('Export failed on this device.', { icon: icon('warn') });
        });
      };
      el.querySelector('[data-a=import]').onclick = function () { CH.audio.play('tap'); file.value = ''; file.click(); };
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (!f) return;
        CH.store.readImport(f).then(function (data) {
          var lessons = Object.keys(data.lessons || {}).length;
          return CH.ui.confirm('Import this save?', '<p>This replaces your current progress with the file’s: <b>level ' + data.level + '</b>, ' + U.plural(lessons, 'lesson') + ' done, ' + data.xp + ' XP.</p><p class="muted small">Tip: export your current save first if you might want it back.</p>', 'Import', 'Cancel', true)
            .then(function (yes) {
              if (!yes) return;
              CH.store.replace(data);
              CH.fx.toast('Progress imported!', { icon: icon('upload') });
            });
        }).catch(function (e) {
          CH.ui.dialog({ title: 'Couldn’t import', mood: 'worried', html: '<p>' + U.esc(e.message || 'That file didn’t work.') + '</p>', buttons: [{ label: 'OK', value: 1 }] });
        });
      };
      el.querySelector('[data-a=reset]').onclick = function () {
        CH.ui.confirm('Reset all progress?', '<p>This erases your XP, lessons, streak, collection and settings on this device. <b>It can’t be undone.</b></p>', 'Reset everything', 'Keep my progress', true)
          .then(function (yes) {
            if (!yes) return;
            return CH.ui.confirm('Are you really sure?', '<p>Last chance! Curlo will forget everything.</p>', 'Yes, reset', 'No, wait', true);
          }).then(function (yes2) {
            if (!yes2) return;
            CH.store.reset();
            CH.fx.toast('Progress reset. Fresh start!');
          });
      };
      U.$$('[data-dev]', el).forEach(function (b) {
        b.onclick = function () {
          var k = b.dataset.dev;
          if (k === 'xp') { G().addXP(150, 'dev'); CH.ui.flushCelebrations(); }
          if (k === 'hearts') { if (s.hearts.n > 0) { s.hearts.n = 0; } else { s.hearts.n = s.hearts.max; } CH.store.save(); CH.ui.renderHUD(); CH.fx.toast('Hearts: ' + s.hearts.n); }
          if (k === 'unlock') { G().worlds().forEach(function (w) { if (s.worldsUnlocked.indexOf(w.id) < 0) s.worldsUnlocked.push(w.id); }); CH.store.save(); CH.fx.toast('All worlds unlocked'); }
          if (k === 'evolve') { var f = CH.curlo.form(); CH.curlo.evolve(f, f >= 3 ? 1 : f + 1).then(function () { CH.curlo.devForm = f >= 3 ? 1 : f + 1; CH.curlo.refreshAll(); }); }
          if (k === 'defense') { G().gainStat('defense', 20); CH.ui.flushCelebrations(); CH.curlo.refreshAll(); }
          if (k === 'ach') { G().queue.push({ type: 'achievement', def: { name: 'Null and Void', desc: 'Test achievement popup' } }); G().queue.push({ type: 'bug', def: CH.content.bestiary[0] || { name: 'Bug', art: 'bug' } }); CH.ui.flushCelebrations(); }
          if (k === 'srs') { G().seenChallengeIds().concat(Object.keys(G().index.challenge)).slice(0, 3).forEach(function (id) { G().srsRecord(id, false); }); CH.store.save(); CH.fx.toast('3 reviews due'); }
          if (k === 'onboard') { s.profile.onboarded = false; CH.store.save(); CH.router.go('onboarding', {}, { root: true }); }
        };
      });
      return el;
    }
  };

  /** Apply text size S/M/L to the root. */
  function applyTextSize() {
    var z = (S().settings.textSize || 'm');
    document.documentElement.setAttribute('data-ts', z);
  }
  SU.applyTextSize = applyTextSize;

  /** "More" = small hub (tab) for Stats + Settings. */
  screens.more = {
    tab: 'more',
    render: function () {
      var el = U.h('<section class="screen" aria-label="More"><div class="scroll"><div class="eyebrow">More</div><h2 class="scr-title">Menu</h2>' +
        '<div class="menu-list">' +
        '<button class="menu-item" data-go="stats">' + icon('chart') + '<span><b>Stats</b><small>Time, accuracy, strengths, achievements</small></span>' + icon('next') + '</button>' +
        '<button class="menu-item" data-go="settings">' + icon('gear') + '<span><b>Settings</b><small>Sound, motion, text size, backup</small></span>' + icon('next') + '</button>' +
        '</div></div></section>');
      U.$$('[data-go]', el).forEach(function (b) { b.onclick = function () { CH.router.go(b.dataset.go); }; });
      return el;
    }
  };
})();
