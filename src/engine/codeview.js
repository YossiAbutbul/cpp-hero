/* ==========================================================================
   Cpp Hero — engine/codeview.js  (CH.code)
   C++ syntax highlighter, code blocks (line numbers, UNSAFE badge, tappable
   lines, inline blanks, diff marks), typing effect, and the animated demo
   player: line-by-line execution with a live output console, variable boxes
   that fill/update, themed crash (glitch + corrupted console) and shield
   deflect visuals.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  var KW = new Set(('return if else for while do switch case default break continue const constexpr consteval constinit true false auto nullptr new delete ' +
    'class struct public private protected virtual override final template typename namespace using try catch throw noexcept static explicit ' +
    'this operator enum sizeof static_assert static_cast dynamic_cast reinterpret_cast const_cast inline friend mutable typedef goto volatile extern ' +
    'co_await co_return co_yield requires concept decltype alignas alignof thread_local export import module').split(' '));
  var TY = new Set('int bool char double float void long short unsigned signed size_t wchar_t char8_t char16_t char32_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t ptrdiff_t'.split(' '));

  /** Tokenize one line of C++ → [[type, text], ...]. */
  function tokLine(src) {
    var out = [];
    var re = /(\/\/.*$)|(\/\*.*?\*\/)|(#\s*\w+(?:\s*<[^>]*>)?)|("(?:\\.|[^"\\])*"?)|('(?:\\.|[^'\\])*'?)|(\b\d[\d']*\.?\d*(?:[eE][+-]?\d+)?[fFuUlL]*\b|\.\d+\b)|(___)|([A-Za-z_]\w*)|(\s+)|(.)/g;
    var m;
    while ((m = re.exec(src))) {
      var t;
      if (m[1] || m[2]) t = 'cm';
      else if (m[3]) t = 'pp';
      else if (m[4] || m[5]) t = 'st';
      else if (m[6]) t = 'nu';
      else if (m[7]) t = 'blank';
      else if (m[8]) {
        var w = m[8];
        t = KW.has(w) ? 'kw' : TY.has(w) ? 'ty' : w === 'std' ? 'ns' : 'id';
        if (t === 'id') {
          var n = out.length;
          if (n >= 3 && out[n - 1][1] === ':' && out[n - 2][1] === ':' && out[n - 3][0] === 'ns') t = 'lib';
        }
      }
      else if (m[9]) t = 'ws';
      else t = 'pu';
      out.push([t, m[0]]);
      if (m[0] === '') re.lastIndex++;
    }
    return out;
  }

  /** Highlight a line; optionally truncated to `limit` chars (typing effect). */
  var SHELL = /^\s*(\$\s|g\+\+\s|clang\+\+\s|c\+\+\s|\.\/|cmake\s|make\b)/;
  var BLANK_MARK = '\u0001';
  /**
   * Highlight a line. A "___" blank can appear anywhere (even inside a string
   * literal), so it is swapped for a marker char before tokenizing and turned
   * into the blank element afterwards.
   */
  function lineHTML(src, limit, blankHTML) {
    src = String(src);
    if (src.indexOf('___') < 0) return lineHTMLRaw(src, limit, blankHTML);
    var marked = src.replace(/___/g, BLANK_MARK);
    var lim = limit == null ? null : Math.max(0, limit - (src.slice(0, limit).split('___').length - 1) * 2);
    var html = lineHTMLRaw(marked, lim, blankHTML);
    var bh = blankHTML != null ? blankHTML : '<span class="blank" aria-label="blank">___</span>';
    return html.split(BLANK_MARK).join(bh);
  }
  function lineHTMLRaw(src, limit, blankHTML) {
    // Shell command lines (e.g. "g++ -Wall main.cpp") get a plain shell style.
    if (SHELL.test(src)) {
      var shown = limit == null ? src : src.slice(0, limit);
      var esc = U.esc(shown);
      if (/___/.test(shown)) esc = esc.replace('___', blankHTML != null ? blankHTML : '<span class="blank" aria-label="blank">___</span>');
      return '<span class="t-sh">' + esc + '</span>';
    }
    var toks = tokLine(src), body = '', left = limit == null ? Infinity : limit;
    for (var i = 0; i < toks.length; i++) {
      if (left <= 0) break;
      var t = toks[i][0], v = toks[i][1], part = v.slice(0, left);
      left -= part.length;
      if (t === 'blank') body += blankHTML != null ? blankHTML : '<span class="blank" aria-label="blank">___</span>';
      // Leading indentation is drawn with padding (hanging indent), so the
      // spaces themselves are kept in the DOM (copy/paste) but not rendered.
      else if (t === 'ws' && i === 0) body += '<span class="lead">' + U.esc(part) + '</span>';
      else if (t === 'ws' || t === 'id') body += U.esc(part);
      else body += '<span class="t-' + t + '">' + U.esc(part) + '</span>';
    }
    return body;
  }

  var code = (CH.code = { tokLine: tokLine, lineHTML: lineHTML });

  /**
   * Build a code block element.
   * opts: { unsafe, safe, label, tappable (lines become buttons), blankHTML,
   *         diffAgainst (other source: lines not in it get a "+" mark), caption }
   */
  code.block = function (src, opts) {
    opts = opts || {};
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    var lines = src.split('\n');
    var other = opts.diffAgainst != null ? String(opts.diffAgainst).split('\n').map(function (s) { return s.trim(); }) : null;
    var wrap = U.h('<div class="codewrap"></div>');
    if (opts.unsafe || opts.safe || opts.caption) {
      wrap.appendChild(U.h('<div class="dhead">' +
        (opts.unsafe ? '<span class="badge unsafe">' + CH.ui.icon('warn') + 'Unsafe \u2014 don\u2019t copy</span>' : '') +
        (opts.safe ? '<span class="badge safe">' + CH.ui.icon('shield') + 'Hardened</span>' : '') +
        (opts.caption ? '<span class="dcap">' + U.esc(opts.caption) + '</span>' : '') + '</div>'));
    }
    var el = U.h('<div class="code' + (opts.unsafe ? ' is-unsafe' : '') + (opts.tappable ? ' tappable' : '') + '" role="' + (opts.tappable ? 'group' : 'region') + '" aria-label="' + U.esc(opts.label || (opts.unsafe ? 'Unsafe C++ code' : 'C++ code')) + '"></div>');
    lines.forEach(function (ln, i) {
      var added = other && ln.trim() && other.indexOf(ln.trim()) < 0;
      // Wrapped lines get a hanging indent: continuation rows start 2ch past the line's own indentation.
      var ind = (/^[ \t]*/.exec(ln)[0] || '').replace(/\t/g, '    ').length;
      var inner = '<span class="no" aria-hidden="true">' + (i + 1) + '</span><span class="cd" style="--ind:' + ind + '">' + (lineHTML(ln, null, opts.blankHTML) || ' ') + '</span>' + (added ? '<span class="dmark" aria-label="changed line">+</span>' : '');
      var row = opts.tappable
        ? '<button type="button" class="ln" data-l="' + i + '" aria-pressed="false" aria-label="Line ' + (i + 1) + ': ' + U.esc(ln.trim() || 'blank line') + '">' + inner + '</button>'
        : '<div class="ln' + (added ? ' added' : '') + (/___/.test(ln) ? ' has-blank' : '') + '" data-l="' + i + '">' + inner + '</div>';
      el.insertAdjacentHTML('beforeend', row);
    });
    wrap.appendChild(el);
    wrap._code = el;
    return wrap;
  };

  /** Highlight line index `l` (or -1 for none) in a .code element. */
  code.hl = function (codeEl, l) {
    U.$$('.ln', codeEl).forEach(function (x) { x.classList.toggle('hl', +x.dataset.l === l); });
    var t = codeEl.querySelector('.ln.hl');
    if (t && t.scrollIntoView && codeEl.scrollHeight > codeEl.clientHeight) {
      try { t.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    }
  };

  /**
   * Typing effect into an existing .code element built by code.block().
   * Resolves when done; tapping the code skips to the end.
   */
  code.type = function (codeEl, src) {
    return new Promise(function (resolve) {
      var lines = String(src).split('\n');
      var rows = U.$$('.ln', codeEl);
      var total = lines.reduce(function (a, l) { return a + l.length; }, 0);
      function render(n) {
        var left = n, caretDone = false;
        rows.forEach(function (row, i) {
          var ln = lines[i] || '';
          var cd = row.querySelector('.cd');
          if (left <= 0 && i > 0 && !caretDone) { row.style.visibility = 'hidden'; return; }
          var show = Math.min(ln.length, left);
          left -= ln.length;
          cd.innerHTML = (lineHTML(ln, show) || ' ') + (!caretDone && left <= 0 ? '<span class="caret"></span>' : '');
          if (left <= 0) caretDone = true;
          row.style.visibility = '';
        });
      }
      function finish() {
        clearInterval(timer);
        codeEl.removeEventListener('click', finish);
        rows.forEach(function (row, i) { row.style.visibility = ''; row.querySelector('.cd').innerHTML = lineHTML(lines[i] || '') || ' '; });
        codeEl.classList.remove('typing');
        resolve();
      }
      if (CH.fx.reduced() || !total) { finish(); return; }
      codeEl.classList.add('typing');
      var n = 0, stepN = Math.max(2, Math.ceil(total / 60)), timer;
      render(0);
      timer = setInterval(function () {
        n += stepN;
        if (n >= total) { finish(); return; }
        render(n);
      }, 22);
      codeEl.addEventListener('click', finish);
    });
  };

  /* ======================================================================
     Demo player
     demo: { code, steps: [{ line, note, out, vars:{name:"val"}, crash, shield }] }
     ====================================================================== */
  code.demo = function (demo, opts) {
    opts = opts || {};
    var steps = (demo && demo.steps) || [];
    var varNames = [];
    steps.forEach(function (s) { Object.keys(s.vars || {}).forEach(function (k) { if (varNames.indexOf(k) < 0) varNames.push(k); }); });
    var hasDefense = steps.some(function (s) { return s.crash || s.shield; });

    var el = U.h('<div class="demo">' +
      '<div class="demo-code"></div>' +
      '<div class="demo-note"><div class="mini"></div><div class="stepnote bubble tail-l" aria-live="polite">Watch the code type itself, then run it.</div></div>' +
      '<div class="exec' + (varNames.length ? '' : ' novars') + '">' +
        '<div class="console" role="log" aria-label="Output console"><div class="ch"><i></i><i></i><i></i>&nbsp;Output</div><div class="out"><span class="dim">waiting to run\u2026</span></div></div>' +
        (varNames.length ? '<div class="vars" aria-label="Variables"></div>' : '') +
      '</div>' +
      '<div class="row demo-btns">' +
        '<button class="pbtn teal" data-a="run">' + CH.ui.icon('play') + 'Run it</button>' +
        '<button class="pbtn ghost" data-a="step">' + CH.ui.icon('step') + 'Step</button>' +
        '<button class="pbtn ghost" data-a="retype" aria-label="Retype the code">' + CH.ui.icon('retype') + 'Retype</button>' +
      '</div></div>');
    var block = code.block(demo.code, { label: 'Demo C++ code', unsafe: opts.unsafe });
    el.querySelector('.demo-code').appendChild(block);
    var codeEl = block._code;
    var mini = CH.curlo.mount(el.querySelector('.demo-note .mini'), { mood: 'happy' });
    var note = el.querySelector('.stepnote'), outEl = el.querySelector('.out'), varsEl = el.querySelector('.vars');
    var boxes = {};
    if (varsEl) varNames.forEach(function (n) {
      var b = U.h('<div class="varbox"><div class="vl">' + U.esc(n) + '</div><div class="vv" aria-live="polite">&nbsp;</div></div>');
      varsEl.appendChild(b); boxes[n] = b.querySelector('.vv');
    });

    var idx = -1, running = false, typed = false, buffer = '', stepsRun = 0;
    var ctl = { el: el, stepsRun: function () { return stepsRun; } };

    function reset() {
      idx = -1; running = false; buffer = '';
      code.hl(codeEl, -1);
      codeEl.classList.remove('glitch');
      outEl.innerHTML = '<span class="dim">waiting to run\u2026</span>';
      Object.keys(boxes).forEach(function (k) { boxes[k].innerHTML = '&nbsp;'; boxes[k].className = 'vv'; });
      note.textContent = 'Press Run, or Step through one line at a time.';
      CH.curlo.react(mini, 'happy');
      el.querySelector('[data-a=run]').disabled = false;
    }
    function writeOut(txt, cls) {
      if (idx === 0 && !cls) { /* first output clears prompt */ }
      var span = document.createElement('span');
      if (cls) span.className = cls;
      span.textContent = txt;
      outEl.appendChild(span);
      outEl.parentNode.scrollTop = outEl.parentNode.scrollHeight;
    }
    function doStep() {
      if (idx >= steps.length - 1) reset();
      if (idx === -1) { outEl.innerHTML = ''; writeOut('$ ./hero\n', 'dim'); }
      idx++;
      stepsRun++;
      var s = steps[idx];
      code.hl(codeEl, typeof s.line === 'number' ? s.line : -1);
      note.innerHTML = U.md(s.note || '');
      CH.audio.play('tap');
      if (s.vars) Object.keys(s.vars).forEach(function (k) {
        var b = boxes[k]; if (!b) return;
        var v = String(s.vars[k]), garbage = v === '?';
        b.textContent = v;
        b.className = 'vv ' + (garbage ? 'garbage' : 'full');
        b.setAttribute('aria-label', k + ' = ' + (garbage ? 'uninitialized (garbage)' : v));
        CH.fx.anim(b, [{ transform: 'scale(.4) rotate(-12deg)' }, { transform: 'scale(1.25) rotate(4deg)' }, { transform: 'scale(.94)' }, { transform: 'none' }], { duration: 560 });
        CH.curlo.react(mini, garbage ? 'worried' : 'happy', 700);
      });
      if (s.out != null && s.out !== '') { writeOut(String(s.out)); CH.audio.play('pop'); }
      if (s.crash) {
        CH.audio.play('crash');
        CH.curlo.react(mini, 'worried', 2200);
        CH.fx.cssPulse(codeEl, 'glitch', 1600);
        CH.fx.shake(el.querySelector('.console'), 6);
        var junk = '', G = '\u2592\u2593\u2591#@!?%&';
        for (var j = 0; j < 14; j++) junk += G[U.rand(G.length)];
        writeOut(junk + '\n', 'bad');
        writeOut('\u26A0 ' + s.crash + '\n', 'bad');
        Object.keys(boxes).forEach(function (k) { if (boxes[k].classList.contains('full')) { boxes[k].classList.add('scramble'); } });
        setTimeout(function () { Object.keys(boxes).forEach(function (k) { boxes[k].classList.remove('scramble'); }); }, 900);
      }
      if (s.shield) {
        CH.audio.play('shield');
        CH.curlo.react(mini, 'bracing', 1500);
        var r = mini.getBoundingClientRect(), hr = el.getBoundingClientRect();
        CH.fx.shock(el, r.left - hr.left + r.width * 0.8, r.top - hr.top + r.height * 0.6);
        CH.fx.burstAt(mini, { n: 30, colors: ['#0FA898', '#C4F1EA', '#FFC62E'] });
        writeOut('\uD83D\uDEE1 ' + s.shield + '\n', 'ok');
      }
      if (idx === steps.length - 1) {
        var crashed = steps.some(function (x) { return x.crash; }) && !steps.some(function (x) { return x.shield; });
        writeOut(crashed ? '[program misbehaved]\n' : '[exited with code 0]\n', crashed ? 'bad' : 'ok');
        if (!crashed) CH.curlo.react(mini, 'celebrate', 1100);
        el.dispatchEvent(new CustomEvent('demo-done'));
      }
      return idx < steps.length - 1;
    }
    function ensureTyped() {
      if (!typed) { typed = true; return typing.then(function () {}); }
      return typing;
    }
    function runAll() {
      if (running) return;
      ensureTyped().then(function () {
        reset();
        running = true;
        el.querySelector('[data-a=run]').disabled = true;
        (function loop() {
          if (!running) return;
          var more = doStep();
          if (!more) { running = false; el.querySelector('[data-a=run]').disabled = false; return; }
          setTimeout(loop, CH.fx.reduced() ? 600 : 950);
        })();
      });
    }
    var typing = Promise.resolve();
    function retype() {
      running = false;
      reset();
      note.textContent = 'Watch the code type itself, then run it.';
      typing = code.type(codeEl, demo.code);
      typed = true;
      return typing;
    }
    el.querySelector('[data-a=run]').onclick = runAll;
    el.querySelector('[data-a=step]').onclick = function () { ensureTyped().then(function () { running = false; el.querySelector('[data-a=run]').disabled = false; doStep(); }); };
    el.querySelector('[data-a=retype]').onclick = retype;
    if (!steps.length) { el.querySelector('[data-a=run]').hidden = true; el.querySelector('[data-a=step]').hidden = true; }
    ctl.start = retype;
    ctl.stop = function () { running = false; };
    ctl.hasDefense = hasDefense;
    return ctl;
  };

  /** Side-by-side (stacked on narrow) unsafe vs hardened comparison. */
  code.sideBySide = function (sb) {
    var el = U.h('<div class="sbs"><div class="sbs-title">' + CH.ui.icon('shieldO') + ' Unsafe vs. hardened</div><div class="sbs-grid"></div></div>');
    var g = el.querySelector('.sbs-grid');
    var a = code.block(sb.unsafe, { unsafe: true, label: 'Unsafe version' });
    var b = code.block(sb.hardened, { safe: true, label: 'Hardened version', diffAgainst: sb.unsafe, caption: '+ marks the fix' });
    g.appendChild(a); g.appendChild(b);
    return el;
  };

  /** UB reminder note. */
  code.ubNote = function () {
    return U.h('<div class="ubnote" role="note">' + CH.ui.icon('info') + '<span>Undefined behavior doesn\u2019t guarantee a crash. It can seem to work, then fail later or on another compiler.</span></div>');
  };
})();
