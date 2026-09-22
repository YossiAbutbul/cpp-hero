/* ==========================================================================
   Cpp Hero — engine/challenges.js  (CH.challenges)
   Renderers for every challenge type in the content schema:
     mcq, predict, fill, order, write, bug, breakit, harden, review, edge,
     safe (timed Safe/Unsafe), speed (timed mini-MCQs)
   Plus: validation, answer normalization, tiered hints, and the explanation
   panel shown after EVERY answer (per-option "why", side-by-side unsafe vs.
   hardened for defensive types). Right/wrong is never shown by color alone:
   every mark has an icon and a text label.

   render(ch, host, ctx) → Promise<{ correct, assisted, score, hints }>
     ctx: { mode, eyebrow, onAnswer(result) → { xpText }, onHint(tier, cost),
            noHints, continueLabel }
   The promise resolves when the learner presses Continue.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;
  var icon = function (n, c) { return CH.ui.icon(n, c); };

  var TYPES = {
    mcq: 'Concept check', predict: 'Predict the output', fill: 'Fill in the blank', order: 'Put the lines in order',
    write: 'Write a line', bug: 'Spot & fix the bug', breakit: 'Break it', harden: 'Harden it', review: 'Code review',
    edge: 'Edge case hunt', safe: 'Safe or unsafe?', speed: 'Speed round'
  };
  var DEFENSIVE = ['bug', 'breakit', 'harden', 'review', 'edge', 'safe'];
  var HINT_COST = [2, 3, 5];
  var KEYS = 'ABCDEFGH';

  /* ======================================================================
     Validation (dev aid: warns in the console, never throws)
     ====================================================================== */
  function validate(ch) {
    var p = [];
    function need(c, msg) { if (!c) p.push(msg); }
    need(ch.id, 'missing id');
    need(TYPES[ch.type], 'unknown type "' + ch.type + '"');
    need(ch.prompt || ch.type === 'safe' || ch.type === 'speed', 'missing prompt');
    var opts = ch.options || [];
    switch (ch.type) {
      case 'mcq': case 'predict': case 'breakit':
        need(opts.length >= 2, 'needs options'); need(ch.answer >= 0 && ch.answer < opts.length, 'answer out of range'); break;
      case 'harden':
        need(opts.length >= 2, 'needs options'); need(ch.answer >= 0 && ch.answer < opts.length, 'answer out of range');
        need(/___/.test(ch.code || ''), 'harden code needs ___'); break;
      case 'fill':
        need((String(ch.code || '').match(/___/g) || []).length === 1, 'fill code needs exactly one ___');
        need(Array.isArray(ch.accept) && ch.accept.length, 'fill needs accept[]'); break;
      case 'write': need((ch.accept && ch.accept.length) || (ch.acceptRe && ch.acceptRe.length), 'write needs accept/acceptRe'); break;
      case 'order': need(Array.isArray(ch.lines) && ch.lines.length >= 2, 'order needs lines'); break;
      case 'bug':
        need(ch.code, 'bug needs code'); need(typeof ch.bugLine === 'number', 'bug needs bugLine');
        need(opts.length >= 2 && ch.answer >= 0 && ch.answer < opts.length, 'bug needs options/answer'); break;
      case 'review': need(ch.code && Array.isArray(ch.dangerous) && ch.dangerous.length, 'review needs code + dangerous[]'); break;
      case 'edge': need(opts.length >= 2 && Array.isArray(ch.answers) && ch.answers.length, 'edge needs options + answers[]'); break;
      case 'safe': need(Array.isArray(ch.items) && ch.items.length, 'safe needs items'); break;
      case 'speed': need(Array.isArray(ch.items) && ch.items.length, 'speed needs items'); break;
    }
    if (DEFENSIVE.indexOf(ch.type) >= 0 && ch.type !== 'safe') need(ch.sideBySide && ch.sideBySide.unsafe && ch.sideBySide.hardened, 'defensive type needs sideBySide');
    if (p.length) console.warn('[content] challenge ' + (ch.id || '?') + ': ' + p.join('; '));
    return p;
  }

  /* ======================================================================
     Normalization for fill / write:
     trim, straighten smart quotes, collapse whitespace, drop spaces around
     punctuation (){}[];,<>=+-*\/&|!:
     ====================================================================== */
  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/[“”„″]/g, '"').replace(/[‘’′]/g, "'")
      .replace(/ /g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*([(){}\[\];,<>=+\-*\/&|!:])\s*/g, '$1');
  }
  function matches(input, ch) {
    var n = normalize(input);
    if (!n) return false;
    if ((ch.accept || []).some(function (a) { return normalize(a) === n; })) return true;
    return (ch.acceptRe || []).some(function (r) {
      try { return new RegExp(r).test(n); } catch (e) { console.warn('[content] bad acceptRe in', ch.id, r); return false; }
    });
  }

  function optText(o) { return typeof o === 'string' ? o : (o && o.t != null ? String(o.t) : ''); }
  function optWhy(o) { return o && typeof o === 'object' ? o.why : ''; }

  /** Tier-3 hint text: the answer itself. */
  function answerText(ch) {
    var o = ch.options || [];
    switch (ch.type) {
      case 'mcq': return '<b>' + U.md(optText(o[ch.answer])) + '</b>';
      case 'breakit': case 'harden': return '<code class="i">' + U.esc(optText(o[ch.answer])) + '</code>';
      case 'predict': return '<span class="mono">' + U.visibleWS(optText(o[ch.answer])) + '</span>';
      case 'fill': case 'write': return '<code class="i">' + U.esc((ch.accept && ch.accept[0]) || '') + '</code>';
      case 'order': return '<ol class="ans-lines">' + ch.lines.map(function (l) { return '<li><code class="i">' + U.esc(l.trim()) + '</code></li>'; }).join('') + '</ol>';
      case 'bug': return 'Line ' + (ch.bugLine + 1) + ' is the bug. Fix: <code class="i">' + U.esc(optText(o[ch.answer])) + '</code>';
      case 'review': return 'Dangerous line' + (ch.dangerous.length > 1 ? 's' : '') + ': ' + ch.dangerous.map(function (i) { return i + 1; }).join(', ');
      case 'edge': return (ch.answers || []).map(function (i) { return '<code class="i">' + U.esc(optText(o[i])) + '</code>'; }).join(' ');
      default: return '';
    }
  }

  /* ======================================================================
     Shared building blocks
     ====================================================================== */
  function shell(ch, ctx) {
    var el = U.h('<div class="chal" data-type="' + U.esc(ch.type) + '">' +
      '<div class="eyebrow">' + U.esc(ctx.eyebrow || TYPES[ch.type] || 'Challenge') + '</div></div>');
    var head = CH.ui.curloSays('<div class="react-line" hidden></div><div class="prompt">' + U.md(ch.prompt || defaultPrompt(ch)) + '</div>', 'thinking');
    el.appendChild(head.el);
    var body = U.h('<div class="chal-body"></div>');
    el.appendChild(body);
    var actions = U.h('<div class="chal-actions"></div>');
    el.appendChild(actions);
    var hintbox = U.h('<div class="hintbox" aria-live="polite" hidden></div>');
    el.appendChild(hintbox);
    var result = U.h('<div class="result" aria-live="polite"></div>');
    el.appendChild(result);
    return { el: el, head: head, body: body, actions: actions, hintbox: hintbox, result: result };
  }
  function defaultPrompt(ch) { return ch.type === 'safe' ? 'Safe or unsafe? Decide fast!' : ch.type === 'speed' ? 'Answer as many as you can!' : ''; }

  function codeFor(ch, opts) {
    if (!ch.code) return null;
    return CH.code.block(ch.code, Object.assign({ unsafe: !!ch.unsafe }, opts || {}));
  }

  /** Big 3D "Check" button. */
  function checkBtn(label) {
    return U.h('<button class="pbtn check-btn" disabled>' + (label || 'Check') + '</button>');
  }

  /** Tiered hint button wiring. */
  function hints(ch, ctx, sh, state) {
    if (ctx.noHints) return;
    var list = (ch.hints || []).slice(0, 2);
    var tiers = list.length + 1;           // + answer tier
    var btn = U.h('<button class="pbtn ghost hint-btn" aria-describedby="">' + icon('bulb') + '<span>Hint</span><small>−' + HINT_COST[0] + ' XP</small></button>');
    sh.actions.insertBefore(btn, sh.actions.firstChild);
    btn.onclick = function () {
      if (state.answered) return;
      var t = state.hints;                 // 0-based tier to reveal
      if (t >= tiers) return;
      var cost = HINT_COST[Math.min(t, 2)];
      state.hints++;
      var isAnswer = t === tiers - 1;
      if (isAnswer) state.assisted = true;
      var html = isAnswer
        ? '<div class="hint answer"><b>' + icon('bulb') + ' Answer:</b> ' + answerText(ch) + (ch.explain ? '<div class="hx">' + U.md(ch.explain) + '</div>' : '') + '</div>'
        : '<div class="hint"><b>' + icon('bulb') + ' Hint ' + (t + 1) + ':</b> ' + U.md(list[t]) + '</div>';
      sh.hintbox.hidden = false;
      var h = U.h(html);
      sh.hintbox.appendChild(h);
      CH.fx.slideUp(h);
      if (ctx.onHint) ctx.onHint(t + 1, cost, btn);
      CH.audio.play('pop');
      CH.curlo.react(sh.head.curlo, 'thinking');
      var rl = sh.el.querySelector('.react-line');
      rl.hidden = false;
      rl.innerHTML = ['Here’s a little nudge…', 'Okay, a bigger clue…', 'Here’s the full answer. Let’s understand it!'][isAnswer ? 2 : Math.min(t, 1)];
      if (state.hints >= tiers) { btn.disabled = true; btn.querySelector('span').textContent = 'No more hints'; btn.querySelector('small').textContent = ''; }
      else {
        var nextIsAnswer = state.hints === tiers - 1;
        btn.querySelector('span').textContent = nextIsAnswer ? 'Show answer' : 'Bigger hint';
        btn.querySelector('small').textContent = '−' + HINT_COST[Math.min(state.hints, 2)] + ' XP';
      }
    };
    state.hintBtn = btn;
  }

  /** Option buttons (mcq-like). Returns { el, buttons }. */
  function optionGrid(options, o) {
    o = o || {};
    var texts = options.map(optText);
    var short = texts.every(function (t) { return t.length <= 14 && t.indexOf('\n') < 0; });
    var grid = U.h('<div class="opts' + (short && !o.single ? '' : ' single') + (o.mono ? ' mono' : '') + '" role="group" aria-label="Answer options"></div>');
    var buttons = texts.map(function (t, i) {
      var inner = o.ws ? '<span class="otxt ws-out">' + (t === '' ? '<span class="ws">(nothing)</span>' : U.visibleWS(t)) + '</span>'
        : o.mono ? '<span class="otxt">' + U.esc(t) + '</span>' : '<span class="otxt">' + U.md(t) + '</span>';
      var b = U.h('<button class="opt" data-i="' + i + '"' + (o.toggle ? ' aria-pressed="false"' : '') + '><span class="key" aria-hidden="true">' + KEYS[i] + '</span>' +
        '<span class="tag"></span>' + icon('ok', 'mark ok') + icon('no', 'mark no') + (o.toggle ? '<span class="tick" aria-hidden="true">' + icon('check') + '</span>' : '') + inner + '</button>');
      b.setAttribute('aria-label', 'Option ' + KEYS[i] + ': ' + (t === '' ? 'nothing' : t.replace(/\n/g, ' newline ')));
      grid.appendChild(b);
      return b;
    });
    return { el: grid, buttons: buttons };
  }

  /** Mark option buttons after answering. rightSet: indexes that are correct; picked: indexes chosen. */
  function markOptions(buttons, rightSet, picked) {
    buttons.forEach(function (b, k) {
      b.disabled = true;
      var isRight = rightSet.indexOf(k) >= 0, isPicked = picked.indexOf(k) >= 0;
      if (isRight) { b.classList.add('right'); b.querySelector('.tag').textContent = isPicked ? 'Correct' : 'Answer'; }
      else if (isPicked) { b.classList.add('wrong'); b.querySelector('.tag').textContent = 'Your pick'; }
      else b.classList.add('dim');
    });
  }

  /** Per-option "why" list for the explanation panel. */
  function whyList(options, rightSet, picked, o) {
    o = o || {};
    var html = '<ul class="why">';
    options.forEach(function (op, i) {
      var t = optText(op), w = optWhy(op), isRight = rightSet.indexOf(i) >= 0;
      var disp = o.ws ? '<code class="ws-out">' + (t === '' ? '(nothing)' : U.visibleWS(t)) + '</code>' : o.mono ? '<code>' + U.esc(t) + '</code>' : '<b class="wopt">' + U.md(t) + '</b>';
      html += '<li class="' + (isRight ? 'yes' : 'nope') + '">' + icon(isRight ? 'ok' : 'no') + '<div>' + disp +
        '<span class="wl">' + (isRight ? '<b>' + (o.rightLabel || 'Right answer.') + '</b> ' : (picked.indexOf(i) >= 0 ? '<b>Your pick.</b> ' : '')) + U.md(w || (isRight ? '' : 'Not this one.')) + '</span></div></li>';
    });
    return html + '</ul>';
  }

  /** First sentence of a text (fallback when `short` is missing). */
  function firstSentence(t) {
    t = String(t || '').trim();
    var m = /^(.+?[.!?])(\s|$)/.exec(t);
    return m ? m[1] : t;
  }

  /**
   * Show the feedback panel. Default view is SHORT: verdict + `short` (or the
   * first sentence of `explain`) + the "why" of the option the learner picked.
   * Everything longer (full explain, per-option whys, details, side-by-side
   * when it doesn't fit compactly, UB note) sits behind "Tell me more".
   * o: { pickedWhy, visible (html shown by default) }
   * Resolves on Continue.
   */
  function showResult(ch, ctx, sh, state, res, detailHTML, o) {
    o = o || {};
    return new Promise(function (resolve) {
      state.answered = true;
      if (state.hintBtn) state.hintBtn.hidden = true;
      U.$$('.check-btn', sh.actions).forEach(function (b) { b.hidden = true; });
      var info = o.info || (ctx.onAnswer && ctx.onAnswer(res, sh)) || {};
      var good = res.correct;
      var r = sh.result;
      r.className = 'result show ' + (good ? 'good' : 'bad');
      var hdr = good ? (res.retried ? 'Got it on try two!' : res.assisted ? 'Correct (with help)' : 'Correct!') : (res.score != null && res.score > 0 ? 'Almost!' : 'Not quite');
      var short = ch.short || firstSentence(ch.explain);
      r.innerHTML = '<div class="rh">' + icon(good ? 'ok' : 'no') + '<span>' + hdr + '</span>' + (info.xpText ? '<span class="rxp">' + U.esc(info.xpText) + '</span>' : '') + '</div>' +
        (res.score != null && res.total ? '<div class="rscore">' + res.right + ' of ' + res.total + ' right</div>' : '') +
        (short ? '<div class="rshort">' + U.md(short) + '</div>' : '') +
        (o.pickedWhy ? '<div class="rpick">' + icon(good ? 'ok' : 'no') + '<span>' + U.md(o.pickedWhy) + '</span></div>' : '') +
        (o.visible || '');
      // "Tell me more" content.
      var more = U.h('<div class="more-inner"></div>');
      if (ch.explain && ch.explain !== short) more.insertAdjacentHTML('beforeend', '<div class="rexp">' + U.md(ch.explain) + '</div>');
      if (detailHTML) more.insertAdjacentHTML('beforeend', detailHTML);
      var isDef = DEFENSIVE.indexOf(ch.type) >= 0 && ch.sideBySide && ch.sideBySide.unsafe;
      if (isDef) {
        var sbs = CH.code.sideBySide(ch.sideBySide);
        var lines = Math.max(String(ch.sideBySide.unsafe).split('\n').length, String(ch.sideBySide.hardened).split('\n').length);
        if (lines <= 6) { sbs.classList.add('compact'); r.appendChild(sbs); } else more.appendChild(sbs);
      }
      if (ch.unsafe || isDef) more.appendChild(CH.code.ubNote());
      if (more.children.length) r.appendChild(CH.ui.expander('Tell me more', more).el);
      var cont = U.h('<button class="pbtn ' + (good ? 'teal' : 'coral') + ' cont-btn" data-autofocus>' + (ctx.continueLabel || 'Continue') + icon('next') + '</button>');
      r.appendChild(cont);
      // Curlo reacts (one short line).
      var rl = sh.el.querySelector('.react-line');
      rl.hidden = false;
      rl.innerHTML = good ? (CH.game.combo >= 3 && !res.assisted ? CH.curlo.line('combo', { n: CH.game.combo }) : CH.curlo.line('correct')) : CH.curlo.line('wrong');
      CH.curlo.react(sh.head.curlo, good ? 'celebrate' : 'worried', good ? 1400 : 1800);
      CH.fx.slideUp(r);
      setTimeout(function () {
        try { r.scrollIntoView({ block: 'nearest', behavior: CH.fx.reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
        try { cont.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }, 260);
      var done = false;
      function go() {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey);
        CH.audio.play('tap');
        resolve(res);
      }
      function onKey(e) {
        if (e.key === 'Enter' && !e.repeat && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && !state.answered)) {
          if (e.target && e.target.tagName === 'BUTTON' && e.target !== cont) return; // let focused buttons act
          e.preventDefault(); go();
        }
      }
      // Delay the Enter shortcut a little so the key that answered doesn't also continue.
      setTimeout(function () { if (!done) document.addEventListener('keydown', onKey); }, 350);
      cont.onclick = go;
    });
  }

  /* ======================================================================
     Retry flow (lessons / projects / practice / reviews; never timed rounds
     or boss rounds). First wrong answer → "Not quite" + feedback on the
     picked option WITHOUT revealing the answer, with [Try again] and
     [Show answer]. The heart is lost only on that first wrong answer; a
     correct retry is "assisted" (small consolation XP, combo stays broken).
     o: { reveal(), soft(), reset(), pickedWhy, softMsg, visible }
     ====================================================================== */
  function retryAllowed(ch, ctx, state) {
    return !!ctx.allowRetry && !state.retried && ch.type !== 'safe' && ch.type !== 'speed';
  }

  function conclude(ch, ctx, sh, state, res, detailHTML, o) {
    o = o || {};
    if (!res.correct && o.reset && retryAllowed(ch, ctx, state)) return softResult(ch, ctx, sh, state, res, detailHTML, o);
    if (o.reveal) o.reveal();
    if (state.retried) {
      var fin = { correct: res.correct, assisted: true, retried: true, hints: state.hints };
      var info = (ctx.onAnswer && ctx.onAnswer({ correct: res.correct, assisted: true, retried: true, retry: true, hints: state.hints }, sh)) || {};
      return showResult(ch, ctx, sh, state, fin, detailHTML, Object.assign({}, o, { info: info }));
    }
    return showResult(ch, ctx, sh, state, res, detailHTML, o);
  }

  function softResult(ch, ctx, sh, state, res, detailHTML, o) {
    return new Promise(function (resolve) {
      state.answered = true;
      state.retried = true;
      if (state.hintBtn) state.hintBtn.hidden = true;
      U.$$('.check-btn', sh.actions).forEach(function (b) { b.hidden = true; });
      var info = (ctx.onAnswer && ctx.onAnswer(res, sh)) || {};
      if (o.soft) o.soft();
      var nudge = !o.pickedWhy && !o.softMsg && state.hints === 0 && ch.hints && ch.hints[0] ? ch.hints[0] : '';
      var r = sh.result;
      r.className = 'result show bad soft';
      r.innerHTML = '<div class="rh">' + icon('no') + '<span>Not quite</span>' + (info.xpText ? '<span class="rxp">' + U.esc(info.xpText) + '</span>' : '') + '</div>' +
        (o.pickedWhy ? '<div class="rpick">' + icon('no') + '<span>' + U.md(o.pickedWhy) + '</span></div>' : '') +
        (o.softMsg ? '<div class="rpick">' + icon('info') + '<span>' + U.md(o.softMsg) + '</span></div>' : '') +
        (nudge ? '<div class="rpick">' + icon('bulb') + '<span>' + U.md(nudge) + '</span></div>' : '') +
        '<div class="soft-btns"><button class="pbtn sun try-btn">' + icon('retype') + 'Try again</button><button class="pbtn ghost show-btn">Show answer</button></div>';
      var rl = sh.el.querySelector('.react-line');
      rl.hidden = false;
      rl.textContent = 'Not quite. Give it another go!';
      CH.curlo.react(sh.head.curlo, 'worried', 1400);
      CH.fx.slideUp(r);
      var tryBtn = r.querySelector('.try-btn'), showBtn = r.querySelector('.show-btn');
      setTimeout(function () {
        try { r.scrollIntoView({ block: 'nearest', behavior: CH.fx.reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
        try { tryBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }, 260);
      tryBtn.onclick = function () {
        CH.audio.play('pop');
        tryBtn.disabled = showBtn.disabled = true;
        CH.fx.anim(r, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) scale(.96)' }], { duration: 180, fill: 'forwards', rm: 'keep' }).then(function () {
          CH.fx.cancel(r);
          r.className = 'result'; r.innerHTML = '';
          state.answered = false;
          if (state.hintBtn && !state.hintBtn.disabled) state.hintBtn.hidden = false;
          U.$$('.check-btn', sh.actions).forEach(function (b) { b.hidden = false; });
          rl.textContent = 'Try again! No heart lost this time.';
          CH.curlo.react(sh.head.curlo, 'thinking');
          o.reset();
          CH.fx.bounce(sh.body);
        });
      };
      showBtn.onclick = function () {
        CH.audio.play('tap');
        if (o.reveal) o.reveal();
        showResult(ch, ctx, sh, state, { correct: false, assisted: state.assisted, hints: state.hints, shown: true }, detailHTML, Object.assign({}, o, { info: info })).then(resolve);
      };
    });
  }

  /** Feedback FX at answer time. */
  function feedback(sh, good, anchor) {
    if (good) {
      CH.audio.play('correct');
      CH.fx.burstAt(anchor || sh.el, { n: 90 });
    } else {
      CH.audio.play('wrong');
      CH.fx.shake(sh.el, 9);
      if (anchor) CH.fx.anim(anchor, [{ transform: 'none' }, { transform: 'translateX(-6px) rotate(-2deg)' }, { transform: 'translateX(6px) rotate(2deg)' }, { transform: 'none' }], { duration: 360 });
      CH.fx.flash();
    }
  }

  /** Keyboard shortcuts for option grids (A–H / 1–8). Returns remover. */
  function optionKeys(buttons, onPick, isActive) {
    function k(e) {
      if (!isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      var i = -1, key = e.key.toUpperCase();
      if (/^[1-8]$/.test(key)) i = +key - 1;
      else if (KEYS.indexOf(key) >= 0 && key.length === 1) i = KEYS.indexOf(key);
      if (i >= 0 && i < buttons.length && !buttons[i].disabled) { e.preventDefault(); onPick(i); }
    }
    document.addEventListener('keydown', k);
    return function () { document.removeEventListener('keydown', k); };
  }

  /* ======================================================================
     Type renderers. Each returns a Promise (resolved on Continue).
     ====================================================================== */
  var R = {};

  /* ---- mcq / predict / breakit / harden: tap an option to answer ---- */
  function choice(ch, ctx, sh, state) {
    var isPredict = ch.type === 'predict', isHarden = ch.type === 'harden';
    var codeWrap = null, blank = null;
    if (ch.code) {
      codeWrap = codeFor(ch, isHarden ? { blankHTML: '<span class="blank slot" aria-label="missing check">&nbsp;?&nbsp;</span>' } : {});
      sh.body.appendChild(codeWrap);
      blank = codeWrap.querySelector('.blank');
    }
    if (ch.type === 'breakit') sh.body.appendChild(U.h('<p class="subprompt">' + icon('swords') + ' Pick the input that breaks it.</p>'));
    var mono = isPredict || isHarden || ch.type === 'breakit' || (ch.options || []).every(function (o) { return /[;(){}<>=\[\]]/.test(optText(o)); });
    var g = optionGrid(ch.options, { ws: isPredict, mono: mono, single: isHarden });
    sh.body.appendChild(g.el);
    return new Promise(function (resolve) {
      var tried = [];
      var off = optionKeys(g.buttons, pick, function () { return !state.answered; });
      g.buttons.forEach(function (b, i) { b.onclick = function () { pick(i); }; });
      function pick(i) {
        if (state.answered || tried.indexOf(i) >= 0) return;
        off();
        var good = i === ch.answer;
        feedback(sh, good, g.buttons[i]);
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints },
          whyList(ch.options, [ch.answer], [i], { ws: isPredict, mono: mono }), {
            pickedWhy: optWhy(ch.options[i]),
            reveal: function () {
              markOptions(g.buttons, [ch.answer], [i]);
              if (blank) { blank.textContent = optText(ch.options[ch.answer]); blank.classList.add(good ? 'ok' : 'fixed'); }
            },
            soft: function () {
              g.buttons.forEach(function (b) { b.disabled = true; });
              g.buttons[i].classList.add('wrong');
              g.buttons[i].querySelector('.tag').textContent = 'Not quite';
            },
            reset: function () {
              tried.push(i);
              g.buttons.forEach(function (b, k) {
                var t = tried.indexOf(k) >= 0;
                b.classList.remove('wrong', 'right', 'dim');
                b.classList.toggle('tried', t);
                b.querySelector('.tag').textContent = t ? 'Tried' : '';
                b.disabled = t;
                if (t) b.setAttribute('aria-label', (b.getAttribute('aria-label') || '').replace(/ \(already tried\)$/, '') + ' (already tried)');
              });
              off = optionKeys(g.buttons, pick, function () { return !state.answered; });
              var f = g.buttons.filter(function (b) { return !b.disabled; })[0];
              if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
            }
          }).then(resolve);
      }
    });
  }
  R.mcq = R.predict = R.breakit = R.harden = choice;

  /* ---- fill: one inline blank in the code ---- */
  R.fill = function (ch, ctx, sh, state) {
    var inputId = U.uid('fill');
    var codeWrap = CH.code.block(ch.code, { unsafe: !!ch.unsafe, blankHTML: '<span class="blank-in"><textarea id="' + inputId + '" class="fill-in" rows="1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Fill in the blank"></textarea></span>' });
    sh.body.appendChild(codeWrap);
    var input = codeWrap.querySelector('textarea.fill-in');
    if (!input) {
      // Safety net: blank not found in the code → offer a separate input.
      var fb = U.h('<div class="write-box"><label for="' + inputId + '" class="sr">Fill in the blank</label><span class="write-prompt" aria-hidden="true">___</span><span class="blank-in"><textarea id="' + inputId + '" class="write-in fill-in" rows="1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea></span></div>');
      sh.body.appendChild(fb);
      input = fb.querySelector('textarea');
    }
    input.placeholder = ch.placeholder || '???';
    var size = autoWidth(input);
    var grow = autoGrow(input);
    sh.body.appendChild(U.h('<p class="subprompt small muted">Type in the blank, then Check (or Enter).</p>'));
    var btn = checkBtn();
    sh.actions.appendChild(btn);
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 400);
    return new Promise(function (resolve) {
      input.addEventListener('input', function () {
        if (/\n/.test(input.value)) input.value = input.value.replace(/\n/g, ' ');
        size(); grow(); btn.disabled = !input.value.trim();
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!btn.disabled && !state.answered) submit(); } });
      btn.onclick = submit;
      function mark(ok) {
        input.readOnly = true;
        input.parentNode.classList.remove('ok', 'bad');
        input.parentNode.classList.add(ok ? 'ok' : 'bad');
        var m = input.parentNode.querySelector('.in-mark'); if (m) m.remove();
        input.parentNode.insertAdjacentHTML('beforeend', icon(ok ? 'ok' : 'no', 'in-mark'));
      }
      function submit() {
        if (state.answered) return;
        var good = matches(input.value, ch);
        feedback(sh, good, input);
        var det = '<div class="accepted"><b>' + (good ? 'Your answer:' : 'You typed:') + '</b> <code class="i">' + U.esc(input.value) + '</code>' +
          (good ? '' : '<br><b>Correct:</b> <code class="i">' + U.esc(ch.accept[0]) + '</code>') +
          (ch.accept.length > 1 ? '<br><span class="muted small">Also accepted: ' + ch.accept.slice(1).map(function (a) { return '<code class="i">' + U.esc(a) + '</code>'; }).join(' ') + '</span>' : '') + '</div>';
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints }, det, {
          visible: good ? '' : '<div class="rpick">' + icon('ok') + '<span>Correct: <code class="i">' + U.esc(ch.accept[0]) + '</code></span></div>',
          softMsg: 'Close! Check spelling, symbols and semicolons.',
          reveal: function () { mark(good); },
          soft: function () { mark(false); },
          reset: function () {
            input.readOnly = false;
            input.parentNode.classList.remove('bad');
            var m = input.parentNode.querySelector('.in-mark'); if (m) m.remove();
            btn.disabled = !input.value.trim();
            try { input.focus({ preventScroll: true }); input.select(); } catch (e) { /* ignore */ }
          }
        }).then(resolve);
      }
    });
  };

  /**
   * Make an <input> fit the longer of its value and placeholder. Uses CSS
   * `field-sizing: content` where supported; otherwise sets an explicit width
   * that includes padding + border (the font is monospace, so ch is exact).
   */
  var FIELD_SIZING = !!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'));
  function autoWidth(input) {
    function size() {
      if (FIELD_SIZING) return;
      var n = Math.max((input.value || '').length, (input.placeholder || '').length, 3) + 1;
      var cs = getComputedStyle(input);
      var extra = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
      input.style.width = 'calc(' + n + 'ch + ' + Math.ceil(extra) + 'px)';
    }
    function minW() {
      var cs = getComputedStyle(input);
      var extra = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
      input.style.minWidth = 'min(100%, calc(' + (Math.max((input.placeholder || '').length, 3) + 1) + 'ch + ' + Math.ceil(extra) + 'px))';
    }
    minW();
    size();
    setTimeout(size, 0);
    return size;
  }

  /** Auto-grow a single-line textarea in height (wraps instead of scrolling sideways). */
  function autoGrow(ta) {
    function grow() {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
    ta.addEventListener('input', grow);
    setTimeout(grow, 0);
    return grow;
  }

  /* ---- write: type a whole line ---- */
  R.write = function (ch, ctx, sh, state) {
    var cw = codeFor(ch); if (cw) sh.body.appendChild(cw);
    var id = U.uid('write');
    var box = U.h('<div class="write-box"><label for="' + id + '" class="sr">Your line of C++</label>' +
      '<span class="write-prompt" aria-hidden="true">&gt;</span><textarea id="' + id + '" class="write-in" rows="1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea></div>');
    var input = box.querySelector('textarea');
    input.placeholder = ch.placeholder || 'Type your C++ here';
    sh.body.appendChild(box);
    autoGrow(input);
    sh.body.appendChild(U.h('<p class="subprompt small muted">Spacing doesn’t matter. Press Enter or Check.</p>'));
    var btn = checkBtn();
    sh.actions.appendChild(btn);
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 400);
    return new Promise(function (resolve) {
      input.addEventListener('input', function () {
        if (/\n/.test(input.value)) input.value = input.value.replace(/\n/g, ' ');   // one logical line
        btn.disabled = !input.value.trim();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (!btn.disabled && !state.answered) submit(); }
      });
      btn.onclick = submit;
      function mark(ok) {
        input.readOnly = true;
        box.classList.remove('ok', 'bad');
        box.classList.add(ok ? 'ok' : 'bad');
        var m = box.querySelector('.in-mark'); if (m) m.remove();
        box.insertAdjacentHTML('beforeend', icon(ok ? 'ok' : 'no', 'in-mark'));
      }
      function submit() {
        if (state.answered) return;
        var good = matches(input.value, ch);
        feedback(sh, good, box);
        var sample = (ch.accept && ch.accept[0]) || '';
        var det = '<div class="accepted"><b>You wrote:</b> <code class="i">' + U.esc(input.value) + '</code>' +
          (sample ? '<br><b>' + (good ? 'Model answer:' : 'One correct answer:') + '</b> <code class="i">' + U.esc(sample) + '</code>' : '') + '</div>';
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints }, det, {
          visible: good || !sample ? '' : '<div class="rpick">' + icon('ok') + '<span>One answer: <code class="i">' + U.esc(sample) + '</code></span></div>',
          softMsg: 'Almost! Check names, symbols and the semicolon.',
          reveal: function () { mark(good); },
          soft: function () { mark(false); },
          reset: function () {
            input.readOnly = false;
            box.classList.remove('bad');
            var m = box.querySelector('.in-mark'); if (m) m.remove();
            btn.disabled = !input.value.trim();
            try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
          }
        }).then(resolve);
      }
    });
  };

  /* ---- order: drag & drop with lift shadow + snap bounce, plus tap/keyboard ---- */
  R.order = function (ch, ctx, sh, state) {
    var cw = codeFor(ch); if (cw) sh.body.appendChild(cw);
    var hasBank = (ch.distractors || []).length > 0;
    var all = ch.lines.map(function (t) { return { t: t, real: true }; }).concat((ch.distractors || []).map(function (t) { return { t: t, real: false }; }));
    var shuffled = U.shuffle(all);
    if (!hasBank && shuffled.every(function (x, i) { return x.t === ch.lines[i]; }) && shuffled.length > 1) shuffled.push(shuffled.shift());
    var help = hasBank ? 'Tap lines to add them to your program in order (tap again to remove). Drag to reorder. Not every line belongs!'
      : 'Drag lines to reorder them, or tap two lines to swap. Keyboard: arrow keys move the focused line.';
    var wrap = U.h('<div class="order">' +
      '<div class="zone-label">Your program</div>' +
      '<ol class="zone prog" aria-label="Your program (ordered)"></ol>' +
      (hasBank ? '<div class="zone-label">Line bank</div><div class="zone bank" role="list" aria-label="Line bank"></div>' : '') +
      '<p class="subprompt small muted" id="' + U.uid('oh') + '">' + help + '</p><div class="sr" aria-live="assertive"></div></div>');
    sh.body.appendChild(wrap);
    var prog = wrap.querySelector('.prog'), bank = wrap.querySelector('.bank'), live = wrap.querySelector('.sr');
    var btn = checkBtn();
    sh.actions.appendChild(btn);

    function tileEl(item) {
      var b = U.h('<li class="tile" tabindex="0" role="listitem"><span class="grip" aria-hidden="true">' + icon('grip') + '</span><span class="tcode">' + (CH.code.lineHTML(item.t) || ' ') + '</span><span class="tmark"></span></li>');
      b._item = item;
      b.setAttribute('aria-label', item.t.trim());
      return b;
    }
    shuffled.forEach(function (it) { (hasBank ? bank : prog).appendChild(tileEl(it)); });
    function tiles(zone) { return zone ? U.$$('.tile', zone) : []; }
    function update() {
      btn.disabled = state.answered || tiles(prog).length === 0;
      if (hasBank && !tiles(prog).length) prog.classList.add('empty'); else prog.classList.remove('empty');
    }
    update();

    /* FLIP helper: animate tiles from old positions after a DOM change. */
    function flip(change) {
      var ts = U.$$('.tile', wrap), before = new Map();
      ts.forEach(function (t) { before.set(t, t.getBoundingClientRect()); });
      change();
      if (CH.fx.reduced()) return;
      U.$$('.tile', wrap).forEach(function (t) {
        var a = before.get(t); if (!a || t.classList.contains('drag-src')) return;
        var b = t.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) CH.fx.anim(t, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 260, easing: CH.fx.SPRING });
      });
    }
    function snap(t) {
      CH.audio.play('pop');
      CH.fx.anim(t, [{ transform: 'scale(.94)' }, { transform: 'scale(1.05)' }, { transform: 'none' }], { duration: 300, easing: CH.fx.SPRING });
    }
    function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function posOf(t) { return tiles(prog).indexOf(t) + 1; }

    /* Tap behavior */
    var selected = null;
    function tapTile(t) {
      if (state.answered) return;
      CH.audio.play('select');
      if (hasBank) {
        flip(function () { if (t.parentNode === bank) prog.appendChild(t); else bank.appendChild(t); });
        snap(t);
        announce(t.parentNode === prog ? 'Added at position ' + posOf(t) : 'Returned to the bank');
      } else {
        if (!selected) { selected = t; t.classList.add('sel'); announce('Selected. Tap another line to swap.'); return; }
        if (selected === t) { t.classList.remove('sel'); selected = null; return; }
        var a = selected, b = t;
        a.classList.remove('sel'); selected = null;
        flip(function () {
          var marker = document.createElement('li');
          prog.insertBefore(marker, a); prog.insertBefore(a, b); prog.insertBefore(b, marker); marker.remove();
        });
        snap(a); snap(b);
        announce('Swapped.');
      }
      update();
    }

    /* Keyboard: Enter/Space = tap; ArrowUp/Down moves within program */
    wrap.addEventListener('keydown', function (e) {
      var t = e.target.closest && e.target.closest('.tile');
      if (!t || state.answered) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapTile(t); t.focus(); }
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && t.parentNode === prog) {
        e.preventDefault();
        var list = tiles(prog), i = list.indexOf(t), j = e.key === 'ArrowUp' ? i - 1 : i + 1;
        if (j < 0 || j >= list.length) return;
        flip(function () { if (j < i) prog.insertBefore(t, list[j]); else prog.insertBefore(t, list[j].nextSibling); });
        snap(t); t.focus();
        announce('Moved to position ' + posOf(t));
      }
    });

    /* Pointer drag & drop */
    var drag = null;
    wrap.addEventListener('pointerdown', function (e) {
      var t = e.target.closest && e.target.closest('.tile');
      if (!t || state.answered || (e.button != null && e.button !== 0)) return;
      drag = { t: t, x0: e.clientX, y0: e.clientY, started: false, id: e.pointerId };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onCancel);
    });
    function begin(e) {
      var t = drag.t, r = t.getBoundingClientRect();
      drag.started = true;
      drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
      var ghost = t.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = r.width + 'px'; ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      t.classList.add('drag-src');
      if (selected) { selected.classList.remove('sel'); selected = null; }
      CH.audio.play('select');
    }
    function onMove(e) {
      if (!drag) return;
      if (!drag.started) {
        if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 7) return;
        begin(e);
      }
      e.preventDefault();
      var g = drag.ghost;
      g.style.left = (e.clientX - drag.dx) + 'px'; g.style.top = (e.clientY - drag.dy) + 'px';
      // Where are we? program zone (insert by midpoint), or bank.
      var pr = prog.getBoundingClientRect(), br = bank ? bank.getBoundingClientRect() : null;
      var inBank = br && e.clientY > br.top - 10 && e.clientY < br.bottom + 30 && e.clientX > br.left - 30 && e.clientX < br.right + 30;
      var t = drag.t;
      if (inBank) {
        if (t.parentNode !== bank) flip(function () { bank.appendChild(t); });
        return;
      }
      var list = tiles(prog).filter(function (x) { return x !== t; });
      var before = null;
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { before = list[i]; break; }
      }
      if (e.clientY < pr.bottom + 60 || !bank) {
        if ((before && t.nextSibling !== before) || (!before && (t.parentNode !== prog || t !== prog.lastElementChild)) || t.parentNode !== prog) {
          flip(function () { if (before) prog.insertBefore(t, before); else prog.appendChild(t); });
        }
      }
    }
    function end(cancelled) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      var d = drag; drag = null;
      if (!d) return;
      if (!d.started) { if (!cancelled) tapTile(d.t); return; }
      var t = d.t, g = d.ghost, r = t.getBoundingClientRect();
      g.style.transition = 'left .18s cubic-bezier(.34,1.56,.64,1), top .18s cubic-bezier(.34,1.56,.64,1), transform .18s';
      g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.transform = 'none';
      setTimeout(function () { g.remove(); t.classList.remove('drag-src'); snap(t); update(); announce(t.parentNode === prog ? 'Dropped at position ' + posOf(t) : 'Returned to the bank'); }, CH.fx.reduced() ? 0 : 190);
    }
    function onUp() { end(false); }
    function onCancel() { end(true); }

    return new Promise(function (resolve) {
      btn.onclick = function () {
        if (state.answered) return;
        var got = tiles(prog).map(function (t) { return t._item.t; });
        var good = got.length === ch.lines.length && got.every(function (t, i) { return t.trim() === ch.lines[i].trim(); });
        var inPlace = tiles(prog).filter(function (t, i) { return ch.lines[i] != null && t._item.t.trim() === ch.lines[i].trim(); }).length;
        U.$$('.tile', wrap).forEach(function (t) { t.tabIndex = -1; });
        feedback(sh, good, prog);
        var det = '<div class="accepted"><b>Correct order:</b><ol class="ans-lines">' + ch.lines.map(function (l) { return '<li><code class="i">' + U.esc(l.trim()) + '</code></li>'; }).join('') + '</ol>' +
          (hasBank ? '<span class="muted small">Not needed: ' + ch.distractors.map(function (d) { return '<code class="i">' + U.esc(d.trim()) + '</code>'; }).join(' ') + '</span>' : '') + '</div>';
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints }, det, {
          softMsg: inPlace + ' of ' + ch.lines.length + ' lines are in the right spot' + (hasBank && got.length !== ch.lines.length ? ', and the line count is off.' : '.'),
          reveal: function () {
            tiles(prog).forEach(function (t, i) {
              var ok = ch.lines[i] != null && t._item.t.trim() === ch.lines[i].trim();
              t.classList.add(ok ? 'ok' : 'bad');
              t.querySelector('.tmark').innerHTML = icon(ok ? 'ok' : 'no');
              t.setAttribute('aria-label', t._item.t.trim() + (ok ? ' (correct position)' : ' (wrong position)'));
            });
          },
          reset: function () {
            U.$$('.tile', wrap).forEach(function (t) { t.tabIndex = 0; });
            update();
            var f = wrap.querySelector('.tile'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
          }
        }).then(resolve);
      };
    });
  };

  /* ---- bug: tap the buggy line, then choose the fix ---- */
  R.bug = function (ch, ctx, sh, state) {
    var cw = CH.code.block(ch.code, { unsafe: !!ch.unsafe, tappable: true, label: 'Code: tap the buggy line' });
    sh.body.appendChild(cw);
    var step = U.h('<p class="subprompt">' + icon('bug') + ' <b>Step 1:</b> tap the line with the bug.</p>');
    sh.body.appendChild(step);
    var lineWrong = false;
    return new Promise(function (resolve) {
      var lines = U.$$('.ln', cw);
      var target = lines[ch.bugLine];
      function flagTarget() {
        if (target && !target.classList.contains('flag-ok')) { target.classList.add('flag-ok'); target.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('bug') + '<b>Bug here</b></span>'); }
      }
      function clearMarks(ln) { ln.classList.remove('flag-bad', 'flag-ok'); var m = ln.querySelector('.lmark'); if (m) m.remove(); }
      lines.forEach(function (ln) {
        ln.onclick = function () {
          if (state.answered || state.lineChosen) return;
          state.lineChosen = true;
          var i = +ln.dataset.l, ok = i === ch.bugLine;
          lines.forEach(function (x) { x.disabled = true; });
          if (ok) {
            ln.classList.add('flag-ok');
            ln.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('ok') + '<b>Found it!</b></span>');
            CH.audio.play('select'); CH.fx.bounce(ln);
            fixStep();
            return;
          }
          ln.classList.add('flag-bad');
          ln.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('no') + '<b>Not this one</b></span>');
          if (retryAllowed(ch, ctx, state)) {
            // Wrong line: a retryable miss (don't reveal where the bug is yet).
            feedback(sh, false, ln);
            conclude(ch, ctx, sh, state, { correct: false, assisted: state.assisted, hints: state.hints },
              '<div class="accepted">' + icon('bug') + ' The bug was on <b>line ' + (ch.bugLine + 1) + '</b>.</div>' + whyList(ch.options, [ch.answer], [], { rightLabel: 'The fix.', mono: true }), {
                softMsg: 'That line is fine. Look for what could break.',
                reveal: flagTarget,
                reset: function () {
                  clearMarks(ln);
                  lines.forEach(function (x) { x.disabled = false; });
                  state.lineChosen = false;
                  try { lines[0].focus({ preventScroll: true }); } catch (e) { /* ignore */ }
                }
              }).then(resolve);
            return;
          }
          lineWrong = true;
          flagTarget();
          CH.audio.play('wrong'); CH.fx.shake(ln, 6);
          fixStep();
        };
      });
      function fixStep() {
        step.innerHTML = icon('wand') + ' <b>Step 2:</b> choose the fix for line ' + (ch.bugLine + 1) + '.';
        var g = optionGrid(ch.options, { mono: true, single: true });
        sh.body.appendChild(g.el);
        CH.fx.slideUp(g.el);
        var tried = [];
        var off = optionKeys(g.buttons, pick, function () { return !state.answered; });
        g.buttons.forEach(function (b, k) { b.onclick = function () { pick(k); }; });
        setTimeout(function () { try { g.buttons[0].focus({ preventScroll: true }); g.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ } }, 200);
        function pick(k) {
          if (state.answered || tried.indexOf(k) >= 0) return;
          off();
          var fixOK = k === ch.answer, good = fixOK && !lineWrong;
          feedback(sh, good, g.buttons[k]);
          var det = (lineWrong ? '<div class="accepted">' + icon('bug') + ' The bug was on <b>line ' + (ch.bugLine + 1) + '</b>.' + (fixOK ? ' You picked the right fix, though!' : '') + '</div>' : '') +
            whyList(ch.options, [ch.answer], [k], { rightLabel: 'The fix.', mono: true });
          conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints }, det, {
            pickedWhy: optWhy(ch.options[k]),
            visible: lineWrong ? '<div class="rpick">' + icon('bug') + '<span>The bug was on <b>line ' + (ch.bugLine + 1) + '</b>.</span></div>' : '',
            reveal: function () { markOptions(g.buttons, [ch.answer], [k]); },
            soft: function () { g.buttons.forEach(function (b) { b.disabled = true; }); g.buttons[k].classList.add('wrong'); g.buttons[k].querySelector('.tag').textContent = 'Not quite'; },
            reset: lineWrong ? null : function () {
              tried.push(k);
              g.buttons.forEach(function (b, j) {
                var t = tried.indexOf(j) >= 0;
                b.classList.remove('wrong'); b.classList.toggle('tried', t);
                b.querySelector('.tag').textContent = t ? 'Tried' : '';
                b.disabled = t;
              });
              off = optionKeys(g.buttons, pick, function () { return !state.answered; });
              var f = g.buttons.filter(function (b) { return !b.disabled; })[0];
              if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
            }
          }).then(resolve);
        }
      }
    });
  };

  /* ---- review: tap ALL dangerous lines, then submit ---- */
  R.review = function (ch, ctx, sh, state) {
    var cw = CH.code.block(ch.code, { unsafe: !!ch.unsafe, tappable: true, label: 'Code review: tap every dangerous line' });
    sh.body.appendChild(cw);
    sh.body.appendChild(U.h('<p class="subprompt">' + icon('alert') + ' Tap every dangerous line to flag it, then submit your review.</p>'));
    var btn = checkBtn('Submit review');
    btn.disabled = false;
    sh.actions.appendChild(btn);
    var flagged = [];
    var lines = U.$$('.ln', cw);
    lines.forEach(function (ln) {
      ln.onclick = function () {
        if (state.answered) return;
        var i = +ln.dataset.l, k = flagged.indexOf(i);
        if (k >= 0) flagged.splice(k, 1); else flagged.push(i);
        var on = k < 0;
        ln.classList.toggle('flagged', on);
        ln.setAttribute('aria-pressed', String(on));
        var m = ln.querySelector('.lmark');
        if (on && !m) ln.insertAdjacentHTML('beforeend', '<span class="lmark flagm">' + icon('alert') + '</span>');
        if (!on && m) m.remove();
        CH.audio.play(on ? 'select' : 'tap');
        if (on) CH.fx.bounce(ln);
      };
    });
    return new Promise(function (resolve) {
      btn.onclick = function () {
        if (state.answered) return;
        var D = ch.dangerous || [];
        var good = flagged.length === D.length && D.every(function (i) { return flagged.indexOf(i) >= 0; });
        var caught = D.filter(function (i) { return flagged.indexOf(i) >= 0; }).length;
        var falseFlags = flagged.filter(function (i) { return D.indexOf(i) < 0; }).length;
        lines.forEach(function (ln) { ln.disabled = true; });
        function reveal() {
          lines.forEach(function (ln) {
            var i = +ln.dataset.l, isD = D.indexOf(i) >= 0, isF = flagged.indexOf(i) >= 0;
            var m = ln.querySelector('.lmark'); if (m) m.remove();
            if (isD && isF) { ln.classList.add('flag-ok'); ln.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('ok') + '<b>Caught</b></span>'); }
            else if (isD) { ln.classList.add('flag-miss'); ln.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('alert') + '<b>Missed</b></span>'); }
            else if (isF) { ln.classList.add('flag-bad'); ln.insertAdjacentHTML('beforeend', '<span class="lmark">' + icon('no') + '<b>Safe</b></span>'); }
          });
        }
        feedback(sh, good, cw);
        var notes = ch.lineNotes || {};
        var keys = Object.keys(notes).map(Number).sort(function (a, b) { return a - b; });
        var det = '<ul class="why">' + keys.map(function (i) {
          var isD = D.indexOf(i) >= 0;
          return '<li class="' + (isD ? 'nope' : 'yes') + '">' + icon(isD ? 'alert' : 'ok') + '<div><code>Line ' + (i + 1) + '</code><span class="wl"><b>' + (isD ? 'Dangerous.' : 'Fine.') + '</b> ' + U.md(notes[i]) + '</span></div></li>';
        }).join('') + '</ul>';
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints }, det, {
          softMsg: 'You caught ' + caught + ' of ' + D.length + ' dangerous lines' + (falseFlags ? ' and flagged ' + U.plural(falseFlags, 'safe line') + '.' : '.'),
          reveal: reveal,
          reset: function () { lines.forEach(function (ln) { ln.disabled = false; }); try { lines[0].focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        }).then(resolve);
      };
    });
  };

  /* ---- edge: multi-select test inputs that expose the bug ---- */
  R.edge = function (ch, ctx, sh, state) {
    var cw = codeFor(ch); if (cw) sh.body.appendChild(cw);
    sh.body.appendChild(U.h('<p class="subprompt">' + icon('target') + ' Select <b>every</b> input that exposes the bug.</p>'));
    var g = optionGrid(ch.options, { mono: true, toggle: true });
    sh.body.appendChild(g.el);
    var btn = checkBtn();
    sh.actions.appendChild(btn);
    var picked = [];
    function toggle(i) {
      if (state.answered) return;
      var k = picked.indexOf(i);
      if (k >= 0) picked.splice(k, 1); else picked.push(i);
      g.buttons[i].classList.toggle('on', k < 0);
      g.buttons[i].setAttribute('aria-pressed', String(k < 0));
      btn.disabled = !picked.length;
      CH.audio.play('select');
      CH.fx.bounce(g.buttons[i]);
    }
    return new Promise(function (resolve) {
      var off = optionKeys(g.buttons, toggle, function () { return !state.answered; });
      g.buttons.forEach(function (b, i) { b.onclick = function () { toggle(i); }; });
      btn.onclick = function () {
        if (state.answered) return;
        off();
        var A = ch.answers || [];
        var good = picked.length === A.length && A.every(function (i) { return picked.indexOf(i) >= 0; });
        var snapshot = picked.slice();
        feedback(sh, good, g.el);
        g.buttons.forEach(function (b) { b.disabled = true; });
        conclude(ch, ctx, sh, state, { correct: good, assisted: state.assisted, hints: state.hints },
          whyList(ch.options, A, snapshot, { rightLabel: 'Exposes the bug.', mono: true }), {
            softMsg: 'Not quite: a pick is off, or one is missing.',
            reveal: function () { g.buttons.forEach(function (b) { b.classList.remove('on'); }); markOptions(g.buttons, A, snapshot); },
            reset: function () {
              g.buttons.forEach(function (b) { b.disabled = false; });
              off = optionKeys(g.buttons, toggle, function () { return !state.answered; });
              btn.disabled = !picked.length;
              try { g.buttons[0].focus({ preventScroll: true }); } catch (e) { /* ignore */ }
            }
          }).then(resolve);
      };
    });
  };

  /* ---- timed shell shared by safe + speed ---- */
  function timed(ch, ctx, sh, state, cfg) {
    var items = ch.items || [], secs = ch.seconds || cfg.seconds;
    var el = U.h('<div class="timed">' +
      '<div class="timer" role="timer" aria-label="Time left"><div class="tfill"></div><span class="tnum">' + secs + 's</span></div>' +
      '<div class="tcount" aria-live="polite">0 / ' + items.length + '</div>' +
      '<div class="tcard-wrap"><div class="tstart"><p><b>' + items.length + ' quick questions, ' + secs + ' seconds.</b><br>' + cfg.help + '</p><button class="pbtn sun" data-autofocus>' + icon('bolt') + 'Start!</button></div></div>' +
      '</div>');
    sh.body.appendChild(el);
    var fill = el.querySelector('.tfill'), tnum = el.querySelector('.tnum'), count = el.querySelector('.tcount'), cardWrap = el.querySelector('.tcard-wrap');
    var answers = [], i = 0, left = secs * 1000, last = 0, timer = 0, over = false, paused = false;
    return new Promise(function (resolve) {
      el.querySelector('.tstart .pbtn').onclick = function () {
        CH.audio.play('streak');
        last = Date.now();
        timer = setInterval(tick, 100);
        document.addEventListener('visibilitychange', vis);
        document.addEventListener('keydown', keys);
        next();
      };
      function vis() { paused = document.visibilityState === 'hidden'; last = Date.now(); }
      function tick() {
        if (over || paused) return;
        var now = Date.now(); left -= now - last; last = now;
        var p = Math.max(0, left / (secs * 1000));
        fill.style.transform = 'scaleX(' + p + ')';
        el.querySelector('.timer').classList.toggle('low', p < 0.25);
        var s = Math.ceil(left / 1000);
        if (tnum.textContent !== s + 's') { tnum.textContent = Math.max(0, s) + 's'; if (s <= 5 && s > 0) CH.audio.play('tick'); }
        if (left <= 0) finish(true);
      }
      function keys(e) {
        if (over || !cardWrap.querySelector('.tcard')) return;
        var k = cfg.key(e);
        if (k != null) { e.preventDefault(); choose(k); }
      }
      function next() {
        if (i >= items.length) { finish(false); return; }
        var card = cfg.card(items[i], i);
        card.classList.add('tcard');
        cardWrap.innerHTML = '';
        cardWrap.appendChild(card);
        CH.fx.anim(card, [{ transform: 'translateX(60px) rotate(3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: CH.fx.EASE_OUT, rm: 'fade' });
        U.$$('[data-k]', card).forEach(function (b) { b.onclick = function () { choose(+b.dataset.k); }; });
        var f = card.querySelector('[data-k]'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        count.textContent = i + ' / ' + items.length;
      }
      var locked = false;
      function choose(k) {
        if (over || locked) return;
        locked = true;
        var good = cfg.isRight(items[i], k);
        answers[i] = { k: k, good: good };
        var card = cardWrap.querySelector('.tcard');
        var stamp = U.h('<div class="stamp ' + (good ? 'ok' : 'bad') + '">' + icon(good ? 'ok' : 'no') + '<span>' + (good ? 'Right' : 'Wrong') + '</span></div>');
        card.appendChild(stamp);
        CH.audio.play(good ? 'coin' : 'wrong');
        if (good) CH.fx.burstAt(stamp, { n: 24 }); else CH.fx.shake(card, 6);
        CH.fx.popIn(stamp);
        setTimeout(function () { locked = false; i++; count.textContent = i + ' / ' + items.length; next(); }, CH.fx.reduced() ? 250 : 480);
      }
      function finish(timeout) {
        if (over) return;
        over = true;
        clearInterval(timer);
        document.removeEventListener('visibilitychange', vis);
        document.removeEventListener('keydown', keys);
        var right = answers.filter(function (a) { return a && a.good; }).length, total = items.length;
        var pass = right >= Math.ceil(total * 2 / 3);
        cardWrap.innerHTML = '<div class="tdone">' + icon(timeout ? 'clock' : 'bolt') + '<b>' + (timeout ? 'Time!' : 'Done!') + '</b> ' + right + ' / ' + total + ' right</div>';
        count.textContent = right + ' / ' + total + ' right';
        feedback(sh, pass, cardWrap);
        var det = '<ul class="why">' + items.map(function (it, k) {
          var a = answers[k], ok = a && a.good;
          return '<li class="' + (ok ? 'yes' : 'nope') + '">' + icon(ok ? 'ok' : 'no') + '<div>' + cfg.recap(it, a) + '</div></li>';
        }).join('') + '</ul>' + (pass ? '' : '<p class="small muted">Get at least ' + Math.ceil(total * 2 / 3) + ' right to pass the round.</p>');
        showResult(ch, ctx, sh, state, { correct: pass, assisted: false, score: right / total, right: right, total: total, hints: 0 }, det).then(resolve);
      }
    });
  }

  R.safe = function (ch, ctx, sh, state) {
    return timed(ch, ctx, sh, state, {
      seconds: 30,
      help: 'Is each snippet safe or unsafe? Keys: S = safe, U = unsafe.',
      key: function (e) { var k = e.key.toLowerCase(); return k === 's' || k === 'arrowleft' ? 1 : k === 'u' || k === 'arrowright' ? 0 : null; },
      card: function (it) {
        var c = U.h('<div><div class="tcode-wrap"></div><div class="su-btns">' +
          '<button class="pbtn teal" data-k="1">' + icon('shield') + 'Safe <kbd>S</kbd></button>' +
          '<button class="pbtn coral" data-k="0">' + icon('alert') + 'Unsafe <kbd>U</kbd></button></div></div>');
        c.querySelector('.tcode-wrap').appendChild(CH.code.block(it.code, { label: 'Snippet' }));
        return c;
      },
      isRight: function (it, k) { return (k === 1) === !!it.safe; },
      recap: function (it, a) {
        return '<code class="snip">' + U.esc(String(it.code).split('\n').map(function (s) { return s.trim(); }).join(' ')) + '</code><span class="wl"><b>' + (it.safe ? 'Safe.' : 'Unsafe.') + '</b> ' +
          (a ? '' : '<i>(no answer)</i> ') + U.md(it.why || '') + '</span>';
      }
    });
  };

  R.speed = function (ch, ctx, sh, state) {
    return timed(ch, ctx, sh, state, {
      seconds: 45,
      help: 'Tap an answer (or press 1–4). Go go go!',
      key: function (e) { return /^[1-8]$/.test(e.key) ? +e.key - 1 : null; },
      card: function (it) {
        var c = U.h('<div><div class="tq">' + U.md(it.q || '') + '</div><div class="tcode-wrap"></div><div class="opts single tight"></div></div>');
        if (it.code) c.querySelector('.tcode-wrap').appendChild(CH.code.block(it.code, { label: 'Snippet' }));
        var o = c.querySelector('.opts');
        (it.options || []).forEach(function (op, k) {
          o.insertAdjacentHTML('beforeend', '<button class="opt" data-k="' + k + '"><span class="key" aria-hidden="true">' + (k + 1) + '</span><span class="otxt mono">' + U.esc(optText(op)) + '</span></button>');
        });
        return c;
      },
      isRight: function (it, k) { return k === it.answer; },
      recap: function (it, a) {
        var right = optText((it.options || [])[it.answer]);
        return '<span class="wl"><b>' + U.md(it.q || '') + '</b> Answer: <code class="i">' + U.esc(right) + '</code>' +
          (a && !a.good ? ' <span class="muted">(you: ' + U.esc(optText(it.options[a.k])) + ')</span>' : '') + (a ? '' : ' <i>(no answer)</i>') + '</span>';
      }
    });
  };

  /* ======================================================================
     Public entry
     ====================================================================== */
  function render(ch, host, ctx) {
    ctx = ctx || {};
    var sh = shell(ch, ctx);
    host.appendChild(sh.el);
    var state = { answered: false, hints: 0, assisted: false };
    if (CH.dev) CH._cur = { ch: ch, el: sh.el };   // dev/test hook
    var fn = R[ch.type];
    if (!fn) {
      sh.body.innerHTML = '<p>Unknown challenge type: ' + U.esc(ch.type) + '</p>';
      var b = U.h('<button class="pbtn">Skip</button>'); sh.actions.appendChild(b);
      return new Promise(function (res) { b.onclick = function () { res({ correct: true, assisted: true, skipped: true }); }; });
    }
    if (ch.type !== 'safe' && ch.type !== 'speed') hints(ch, ctx, sh, state);
    CH.fx.slideUp(sh.el);
    return fn(ch, ctx, sh, state);
  }

  CH.challenges = {
    TYPES: TYPES,
    DEFENSIVE: DEFENSIVE,
    HINT_COST: HINT_COST,
    validate: validate,
    normalize: normalize,
    matches: matches,
    answerText: answerText,
    render: render
  };
})();
