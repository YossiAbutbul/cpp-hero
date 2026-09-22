/* ==========================================================================
   Cpp Hero — engine/session.js  (CH.session)
   The immersive "session" shell shared by lessons, projects, bosses, reviews,
   practice and placement: quit button, progress bar, combo + hearts chips,
   card-slide pages, challenge scoring (XP × combo multiplier, hint costs,
   hearts), and the no-dead-end out-of-hearts refill round.
   Also: the Lesson player (concept → demo → challenges → recap → results)
   and simple review / practice runners.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util, G = function () { return CH.game; };
  function S() { return CH.store.state; }
  var icon = function (n, c) { return CH.ui.icon(n, c); };

  var BASE_XP = { lesson: 10, boss: 12, project: 8, practice: 15, review: 8, refill: 5, placement: 0 };
  var HEART_MODES = ['lesson', 'boss'];

  /* ======================================================================
     Session shell
     ====================================================================== */
  function Session(opts) {
    this.opts = opts;
    this.mode = opts.mode;
    this.xp = 0;           // XP earned this session (net)
    this.right = 0; this.total = 0;
    this.bestCombo = 0;
    this.t0 = Date.now();
    this.quit = false;
    var self = this;
    var el = U.h('<section class="session mode-' + opts.mode + '" aria-label="' + U.esc(opts.title || 'Session') + '">' +
      '<header class="sess-top">' +
        '<button class="xbtn sess-quit" aria-label="Quit">' + icon('x') + '</button>' +
        '<div class="sess-prog" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>' +
        '<div class="chip combo" aria-live="polite">' + icon('bolt') + '<span>x0</span></div>' +
        (HEART_MODES.indexOf(opts.mode) >= 0 ? '<div class="chip sess-hearts" aria-label="Hearts">' + icon('heart') + '<span></span></div>' : '') +
      '</header>' +
      '<div class="scroll sess-scroll"><div class="sess-stage"></div></div></section>');
    this.el = el;
    this.stage = el.querySelector('.sess-stage');
    this.scroller = el.querySelector('.sess-scroll');
    el.querySelector('.sess-quit').onclick = function () { self.askQuit(); };
    this._onKey = function (e) {
      if (e.key === 'Escape' && !U.$('#overlay-root').children.length) { e.preventDefault(); self.askQuit(); }
    };
    document.addEventListener('keydown', this._onKey);
    G().combo = 0;
    this.updateHearts();
    this.updateCombo(true);
  }

  Session.prototype.dispose = function () { document.removeEventListener('keydown', this._onKey); };

  Session.prototype.askQuit = function () {
    var self = this;
    if (this._asking) return;
    this._asking = true;
    CH.ui.confirm(this.opts.quitTitle || 'Leave this ' + (this.opts.noun || 'session') + '?',
      this.opts.quitText || 'Your progress in this ' + (this.opts.noun || 'session') + ' won’t be saved.', 'Leave', 'Keep going', true)
      .then(function (yes) {
        self._asking = false;
        if (!yes) return;
        self.quit = true;
        self.dispose();
        if (self.opts.onQuit) self.opts.onQuit();
        CH.router.go('map', {}, { dir: 'down', root: true });
      });
  };

  Session.prototype.setProgress = function (p) {
    var bar = this.el.querySelector('.sess-prog');
    p = U.clamp(p, 0, 1);
    bar.querySelector('i').style.transform = 'scaleX(' + p + ')';
    bar.setAttribute('aria-valuenow', Math.round(p * 100));
  };

  Session.prototype.updateHearts = function () {
    var h = this.el.querySelector('.sess-hearts span');
    if (h) { h.textContent = S().hearts.n; this.el.querySelector('.sess-hearts').setAttribute('aria-label', S().hearts.n + ' hearts'); }
  };

  Session.prototype.updateCombo = function (silent) {
    var c = this.el.querySelector('.combo'), n = G().combo, m = G().multiplier();
    c.querySelector('span').textContent = 'x' + n + (m > 1 ? ' · ' + m + '× XP' : '');
    c.classList.toggle('hot', n >= 3);
    c.classList.toggle('blaze', n >= 6);
    c.style.setProperty('--heat', Math.min(1, n / 10));
    if (!silent && n > 0) CH.fx.anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-6deg)' }, { transform: 'scale(1)' }], { duration: 450, easing: CH.fx.SPRING });
  };

  /** Replace the page with a card-slide transition. Returns the new page element. */
  Session.prototype.page = function (content) {
    var old = this.stage.querySelector('.sess-page:not(.leaving)');
    var pg = U.h('<div class="sess-page"></div>');
    if (content) pg.appendChild(content);
    this.stage.appendChild(pg);
    this.scroller.scrollTop = 0;
    if (old) {
      old.classList.add('leaving');
      var rm = CH.fx.reduced();
      CH.fx.anim(old, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-30%) scale(.92) rotate(-2deg)', opacity: 0 }],
        { duration: rm ? 120 : 240, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards', rm: 'keep' }).then(function () { old.remove(); });
      setTimeout(function () { old.remove(); }, 500);
      CH.fx.anim(pg, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateX(100%) rotate(3deg)', opacity: 0.5 }, { transform: 'translateX(-2%)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }],
        { duration: rm ? 140 : 520, easing: 'cubic-bezier(.22,.9,.3,1.05)', rm: 'keep' });
    }
    return pg;
  };

  /**
   * Run one challenge on a new page with full scoring.
   * extra: { eyebrow, base (XP), noHearts, onAnswer(res) }
   */
  Session.prototype.challenge = function (ch, extra) {
    extra = extra || {};
    var self = this, mode = extra.mode || this.mode;
    var pg = this.page();
    if (extra.before) pg.appendChild(extra.before);
    var usesHearts = HEART_MODES.indexOf(mode) >= 0 && !extra.noHearts;
    return CH.challenges.render(ch, pg, {
      mode: mode,
      eyebrow: extra.eyebrow,
      noHints: mode === 'placement' || extra.noHints,
      continueLabel: extra.continueLabel,
      onHint: function (tier, cost, btn) {
        var d = G().addXP(-cost, 'hint');
        self.xp += d;
        if (d) CH.fx.floatText(btn, d + ' XP', 'neg');
      },
      onAnswer: function (res, sh) {
        self.total++;
        var out = {};
        G().recordAnswer(ch, res.correct, mode === 'refill' ? 'review' : mode, res.assisted, res.hints);
        if (res.correct) {
          self.right++;
          if (!res.assisted) {
            var base = extra.base != null ? extra.base : BASE_XP[mode] || 10;
            if (res.score != null) base = Math.round(base * 1.5);
            var gain = Math.round(base * G().multiplier());
            if (gain > 0) {
              var d = G().addXP(gain, 'correct');
              self.xp += d;
              out.xpText = '+' + d + ' XP';
              setTimeout(function () { CH.fx.floatText(sh.el.querySelector('.rh') || sh.el, '+' + d + ' XP', 'pos'); }, 120);
            }
          }
        } else if (usesHearts) {
          G().loseHeart();
          var hc = self.el.querySelector('.sess-hearts');
          if (hc) { CH.audio.play('heart'); CH.fx.anim(hc, [{ transform: 'none' }, { transform: 'scale(1.35) rotate(-10deg)' }, { transform: 'none' }], { duration: 420, easing: CH.fx.SPRING }); CH.fx.floatText(hc, '−1 ♥', 'neg'); }
          out.xpText = '−1 heart';
        }
        self.bestCombo = Math.max(self.bestCombo, G().combo);
        self.updateCombo(!res.correct);
        self.updateHearts();
        if (extra.onAnswer) extra.onAnswer(res);
        return out;
      }
    }).then(function (res) {
      if (usesHearts && S().hearts.n <= 0 && !self.quit) return self.refill().then(function () { return res; });
      return res;
    });
  };

  /** Out of hearts mid-session: offer a quick review round (+1 heart) or quit. No dead end. */
  Session.prototype.refill = function () {
    var self = this;
    return CH.ui.dialog({
      title: 'Out of hearts!', mood: 'worried',
      html: '<p>' + CH.curlo.line('noHearts') + '</p><p class="muted small">Answer a quick 3-question review to earn a heart and keep going. No hearts are lost during the review.</p>',
      buttons: [{ label: icon('practice') + 'Earn a heart', value: 'refill', cls: 'teal' }, { label: 'Quit to map', value: 'quit', cls: 'ghost' }],
      dismissValue: 'refill'
    }).then(function (v) {
      if (v === 'quit') {
        self.quit = true; self.dispose();
        CH.router.go('map', {}, { dir: 'down', root: true });
        return Promise.reject(new Error('quit'));
      }
      var set = G().reviewSet(3, true);
      if (set.length < 3 && self.opts.fallbackPool) {
        U.shuffle(self.opts.fallbackPool).forEach(function (c) { if (set.length < 3 && set.indexOf(c) < 0 && G().TIMED.indexOf(c.type) < 0) set.push(c); });
      }
      if (!set.length) { G().gainHeart(1); self.updateHearts(); return; }
      var got = 0, i = 0;
      function next() {
        if (i >= set.length) {
          if (got > 0) {
            G().gainHeart(1); CH.audio.play('heal'); self.updateHearts();
            CH.fx.toast('+1 heart! Back to it!', { icon: icon('heart') });
            return;
          }
          return CH.ui.dialog({ title: 'So close!', mood: 'thinking', html: '<p>Get at least one right to earn the heart. Let’s try another round!</p>', buttons: [{ label: 'Try again', value: 1 }] })
            .then(function () { set = U.shuffle(set); i = 0; return next(); });
        }
        var ch = set[i++];
        return self.challenge(ch, { mode: 'refill', eyebrow: 'Heart refill · ' + i + ' of ' + set.length, noHearts: true })
          .then(function (r) { if (r.correct) got++; return next(); });
      }
      return next();
    });
  };

  /** Standard "results" page. opts: { title, sub, tiles:[{label, value, fmt}], extraEl, button, mood } */
  Session.prototype.results = function (o) {
    var self = this;
    var secs = Math.round((Date.now() - this.t0) / 1000);
    var el = U.h('<div class="results">' +
      '<div class="res-curlo"></div>' +
      '<h2 class="res-title">' + U.esc(o.title) + '</h2>' + (o.sub ? '<p class="res-sub">' + o.sub + '</p>' : '') +
      '<div class="tiles"></div><div class="res-extra"></div>' +
      '<button class="pbtn big" data-autofocus>' + U.esc(o.button || 'Continue') + icon('next') + '</button></div>');
    var c = CH.curlo.mount(el.querySelector('.res-curlo'), { mood: o.mood || 'celebrate' });
    var tiles = el.querySelector('.tiles');
    var list = o.tiles || [
      { label: 'XP earned', value: Math.max(0, this.xp), cls: 'sun', icon: 'bolt', fmt: function (n) { return '+' + n; } },
      { label: 'Accuracy', value: this.total ? Math.round(100 * this.right / this.total) : 100, cls: 'teal', icon: 'target', fmt: function (n) { return n + '%'; } },
      { label: 'Best combo', value: this.bestCombo, cls: 'tang', icon: 'flame', fmt: function (n) { return 'x' + n; } },
      { label: 'Time', value: secs, cls: 'sky', icon: 'clock', fmt: U.fmtDuration }
    ];
    list.forEach(function (t, i) {
      var tile = U.h('<div class="tile-stat ' + (t.cls || '') + '"><div class="ts-l">' + icon(t.icon || 'star') + U.esc(t.label) + '</div><div class="ts-v">0</div></div>');
      tiles.appendChild(tile);
      CH.fx.popIn(tile, 250 + i * 110);
      setTimeout(function () { CH.fx.countUp(tile.querySelector('.ts-v'), 0, t.value, 900, t.fmt); }, CH.fx.reduced() ? 0 : 350 + i * 110);
    });
    if (o.extraEl) el.querySelector('.res-extra').appendChild(o.extraEl);
    var pg = this.page(el);
    this.setProgress(1);
    setTimeout(function () { CH.curlo.react(c, o.mood || 'celebrate', 1500); if (o.mood !== 'worried') { CH.fx.burstAt(el.querySelector('.res-curlo'), { n: 140 }); CH.fx.rain(80); } CH.audio.play(o.mood === 'worried' ? 'wrong' : 'levelup'); }, CH.fx.reduced() ? 50 : 420);
    return new Promise(function (resolve) {
      var btn = el.querySelector('.pbtn.big');
      btn.onclick = function () { CH.audio.play('tap'); CH.fx.clearConfetti(); self.dispose(); resolve(); };
      setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 600);
      // Big overlays (level-up, achievements...) queue up and show over the results.
      setTimeout(function () { CH.ui.flushCelebrations(); }, CH.fx.reduced() ? 200 : 1500);
      pg.addEventListener('pointerdown', function () { CH.fx.clearConfetti(); }, { once: true });
    });
  };

  /** A simple "info card" page with a primary button; resolves on click. */
  Session.prototype.card = function (el, btnLabel, btnCls) {
    var pg = this.page(el);
    var btn = U.h('<button class="pbtn ' + (btnCls || '') + ' big page-next" data-autofocus>' + btnLabel + icon('next') + '</button>');
    pg.appendChild(btn);
    setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 300);
    return new Promise(function (resolve) { btn.onclick = function () { CH.audio.play('tap'); resolve(); }; });
  };

  CH.Session = Session;

  /* ======================================================================
     Lesson player
     ====================================================================== */
  function playLesson(lesson, world) {
    var s = new Session({ mode: 'lesson', title: lesson.title, noun: 'lesson', fallbackPool: lesson.challenges });
    var el = s.el;
    var chs = (lesson.challenges || []).slice();
    var inter = G().interleaveFor(lesson);
    // Interleave older topics: one in the middle, one before the end.
    var queue = chs.map(function (c) { return { ch: c, review: false }; });
    inter.forEach(function (c, k) {
      var pos = k === 0 ? Math.ceil(queue.length / 2) : queue.length - 1;
      queue.splice(Math.max(1, pos), 0, { ch: c, review: true });
    });
    var total = queue.length + 3;   // intro, demo, recap
    var done = 0, firstTry = {}, retried = {};
    function prog() { s.setProgress(done / total); }

    function intro() {
      var c = lesson.concept || {};
      // Short by default: 'short' (big) + one-line analogy from Curlo.
      // Body paragraphs + pitfall live behind a 'Tell me more' expander.
      var short = c.short || firstSentence((c.body || [])[0] || '');
      var el2 = U.h('<div class="lesson-intro">' +
        '<div class="eyebrow">World ' + world.num + ' · Lesson ' + (lesson._i + 1) + (lesson.shield ? ' <span class="badge shieldb">' + icon('shield') + 'Shield lesson</span>' : '') + '</div>' +
        '<h2>' + U.esc(lesson.title) + '</h2>' +
        (short ? '<p class="concept-short">' + U.md(short) + '</p>' : '') +
        (c.analogy ? '<div class="card analogy"><div class="mini"></div><div class="bubble tail-l">' + U.md(c.analogy) + '</div></div>' : '<div class="analogy" hidden><div class="mini"></div></div>') +
        '</div>');
      var moreEl = U.h('<div>' + ((c.body || []).length ? '<div class="card concept">' + c.body.map(function (p) { return '<p>' + U.md(p) + '</p>'; }).join('') + '</div>' : '') +
        (c.pitfall ? '<div class="pitfall" role="note">' + icon('warn') + '<div><b>Common mistake</b><p>' + U.md(c.pitfall) + '</p></div></div>' : '') + '</div>');
      if (moreEl.children.length) el2.appendChild(CH.ui.expander('Tell me more', moreEl).el);
      var m = CH.curlo.mount(el2.querySelector('.analogy .mini'), { mood: 'happy' });
      setTimeout(function () { CH.curlo.react(m, 'celebrate', 900); }, 500);
      return s.card(el2, lesson.demo ? 'Show me the code' : 'Let’s practice').then(function () { done++; prog(); });
    }
    function demo() {
      if (!lesson.demo || !lesson.demo.code) { done++; return Promise.resolve(); }
      var el2 = U.h('<div class="lesson-demo"><div class="eyebrow">Watch it run</div><h2>' + U.esc(lesson.title) + '</h2></div>');
      var d = CH.code.demo(lesson.demo, {});
      el2.appendChild(d.el);
      var p = s.card(el2, 'Let’s practice!', 'teal');
      setTimeout(function () { d.start(); }, CH.fx.reduced() ? 0 : 450);
      return p.then(function () { d.stop(); done++; prog(); });
    }
    function challenges() {
      var i = 0;
      function next() {
        if (s.quit) return Promise.reject(new Error('quit'));
        if (i >= queue.length) return Promise.resolve();
        var item = queue[i++];
        var n = chs.length;
        var label = (item.review ? 'Review · ' : '') + (CH.challenges.TYPES[item.ch.type] || 'Challenge') + (item.retry ? ' · Try again' : '');
        return s.challenge(item.ch, { eyebrow: label }).then(function (res) {
          if (!item.retry) {
            firstTry[item.ch.id] = res.correct && !res.assisted;
            done++;
          }
          // Missed first time: re-queue once at the end so it's practiced again.
          if (!res.correct && !item.retry && !retried[item.ch.id]) {
            retried[item.ch.id] = true;
            queue.push({ ch: item.ch, review: item.review, retry: true });
            total++;
          } else if (item.retry) done++;
          prog();
          return next();
        });
      }
      return next();
    }
    function recap() {
      var el2 = U.h('<div class="recap"><div class="eyebrow">Recap</div><h2>What you learned</h2>' +
        '<ul class="recap-list">' + (lesson.recap || []).map(function (r) { return '<li>' + icon('ok') + '<span>' + U.md(r) + '</span></li>'; }).join('') + '</ul></div>');
      var cards = (lesson.vault || []);
      if (cards.length) {
        var v = U.h('<div class="vault-new"><div class="eyebrow">' + icon('vault') + ' New in your Code Vault</div></div>');
        cards.forEach(function (card) { v.appendChild(CH.screensUtil.vaultCard(card)); });
        el2.appendChild(v);
      }
      U.$$('.recap-list li', el2).forEach(function (li, k) { CH.fx.slideUp(li, 120 + k * 90); });
      return s.card(el2, 'Finish lesson', 'sun').then(function () { done++; prog(); });
    }
    function finish() {
      var ids = Object.keys(firstTry);
      var acc = ids.length ? ids.filter(function (k) { return firstTry[k]; }).length / ids.length : 1;
      var bonus = G().addXP(10 + (acc >= 1 ? 10 : 0), 'lesson');
      s.xp += bonus;
      var r = G().completeLesson(lesson, acc);
      var extra = U.h('<div></div>');
      if (acc >= 1) extra.appendChild(U.h('<div class="perfect">' + icon('star') + ' Perfect lesson! +10 bonus XP</div>'));
      var sk = lesson.shield ? 'defense' : lesson.skill;
      if (r.first) extra.appendChild(U.h('<div class="stat-gain">' + icon('chart') + ' ' + U.esc(cap(sk)) + ' stat up!</div>'));
      if (r.newCards.length) extra.appendChild(U.h('<div class="stat-gain">' + icon('vault') + ' ' + U.plural(r.newCards.length, 'new Code Vault card') + '</div>'));
      s.total = ids.length; s.right = ids.filter(function (k) { return firstTry[k]; }).length;
      return s.results({ title: 'Lesson complete!', sub: CH.curlo.line('lessonDone'), extraEl: extra }).then(function () {
        CH.screensUtil.returnToMap({ justDone: lesson.id });
      });
    }
    CH.screens._session = { el: s.el };
    var p = intro().then(demo).then(challenges).then(recap).then(finish).catch(function (e) { if (e && e.message !== 'quit') console.error(e); });
    return s;
  }
  function firstSentence(t) { t = String(t || '').trim(); var m = /^(.+?[.!?])(\s|$)/.exec(t); return m ? m[1] : t; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  /* ======================================================================
     Generic challenge-list runner (review / practice / placement-less)
     opts: { mode, title, list, eyebrow(i,ch), onDone(session) }
     ====================================================================== */
  function playList(o) {
    var s = new Session({ mode: o.mode, title: o.title, noun: o.noun || 'practice', fallbackPool: o.list });
    var i = 0, n = o.list.length;
    function next() {
      if (s.quit) return;
      s.setProgress(i / n);
      if (i >= n) return o.onDone(s);
      var ch = o.list[i++];
      return s.challenge(ch, { eyebrow: o.eyebrow ? o.eyebrow(i, ch) : (CH.challenges.TYPES[ch.type] + ' · ' + i + ' of ' + n) }).then(next);
    }
    setTimeout(next, 0);
    return s;
  }

  CH.session = { Session: Session, playLesson: playLesson, playList: playList, BASE_XP: BASE_XP };
})();
