/* ==========================================================================
   Cpp Hero — engine/arena.js  (CH.arena)
   The defense arena (from the design's "Defense drill"): Curlo on the left,
   a hostile input on the right and a strip of memory cells. Used by the
   project Stress Test and the boss Defense Phase.
     crash(): the input hits → glitch, scrambled memory, worried Curlo
     block(): shield up → the input bounces off with a shock ring + sparks
   All sequences resolve via timers (never only on animation events).
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;

  var HEX = '0123456789ABCDEF';
  function junk() { return HEX[U.rand(16)] + HEX[U.rand(16)]; }

  CH.arena = {
    /** opts: { cellsLabel } → controller */
    create: function (opts) {
      opts = opts || {};
      var el = U.h('<div class="arena' + (opts.bossArt ? ' has-boss' : '') + '" aria-hidden="true">' +
        '<div class="floor"></div><div class="dm"></div>' +
        '<div class="attack" hidden></div>' +
        (opts.bossArt ? '<div class="arena-boss">' + opts.bossArt + '</div>' : '') +
        '<div class="cells"' + (opts.bossArt ? ' hidden' : '') + '><span class="cl">' + U.esc(opts.cellsLabel || 'memory') + '</span></div></div>');
      var cells = el.querySelector('.cells');
      var BYTES = ['2A', '00', '00', '00'];
      BYTES.forEach(function (b) { cells.insertAdjacentHTML('beforeend', '<div class="cell">' + b + '</div>'); });
      var curlo = CH.curlo.mount(el.querySelector('.dm'), { mood: 'happy' });
      var atk = el.querySelector('.attack');
      var busy = false;

      function setCells(arr, cls) {
        U.$$('.cell', el).forEach(function (c, i) { c.textContent = arr[i]; c.className = 'cell' + (cls ? ' ' + cls : ''); });
      }
      function resetAtk() { CH.fx.cancel(atk); atk.style.opacity = 1; atk.style.transform = ''; }

      var api = {
        el: el, curlo: curlo,
        /** Show the incoming hostile input. */
        setAttack: function (text) {
          resetAtk();
          atk.hidden = false;
          atk.textContent = text === '' ? '""' : text;
          setCells(BYTES);
          CH.curlo.react(curlo, 'thinking');
          CH.fx.anim(atk, [{ transform: 'translateX(80px) scale(.6)', opacity: 0 }, { transform: 'translateX(-6px) scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
            { duration: 420, easing: 'ease-out', rm: 'fade' });
          CH.audio.play('whoosh');
        },
        /** Unsafe code: the input breaks through. */
        crash: function () {
          if (busy) return Promise.resolve();
          busy = true;
          var rm = CH.fx.reduced();
          var W = el.clientWidth;
          var fly = rm ? Promise.resolve() : CH.fx.anim(atk, [{ transform: 'none' }, { transform: 'translate(' + (-(W * 0.35)) + 'px,-24px) rotate(-20deg)', offset: 0.45 }, { transform: 'translate(' + (-(W * 0.55)) + 'px,40px) scale(.5)', opacity: 0 }],
            { duration: 520, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
          return fly.then(function () {
            atk.style.opacity = 0;
            CH.audio.play('crash');
            CH.curlo.react(curlo, 'worried');
            CH.fx.cssPulse(el, 'glitch', 1600);
            var k = 0, iv = setInterval(function () { setCells(BYTES.map(junk), 'bad'); if (++k > 12) clearInterval(iv); }, 60);
            return U.sleep(rm ? 200 : 760).then(function () {
              clearInterval(iv);
              setCells(['??', '▒▒', 'FF', '??'], 'bad');
              busy = false;
            });
          });
        },
        /** Hardened code: the shield deflects it. */
        block: function () {
          if (busy) return Promise.resolve();
          busy = true;
          var rm = CH.fx.reduced();
          CH.curlo.react(curlo, 'bracing');
          setCells(BYTES, 'safe');
          var W = el.clientWidth, dmW = el.querySelector('.dm').offsetWidth;
          var dx = -(W - 14 - atk.offsetWidth - 14 - dmW * 0.95);
          var p = rm ? U.sleep(150) : U.sleep(220).then(function () {
            return CH.fx.anim(atk, [{ transform: 'none' }, { transform: 'translate(' + dx + 'px,40px) rotate(-30deg)' }], { duration: 360, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' });
          });
          return p.then(function () {
            CH.audio.play('shield');
            var r = el.querySelector('.dm').getBoundingClientRect(), ar = el.getBoundingClientRect();
            CH.fx.shock(el, r.right - ar.left - 8, r.top - ar.top + r.height * 0.62);
            CH.fx.burstAt(el.querySelector('.dm'), { n: 36, colors: ['#FFC62E', '#0FA898', '#fff'], speed: 0.8 });
            var out = rm ? Promise.resolve() : CH.fx.anim(atk, [{ transform: 'translate(' + dx + 'px,40px) rotate(-30deg)' }, { transform: 'translate(' + (dx + 90) + 'px,-30px) rotate(200deg) scale(1.1)', offset: 0.45 }, { transform: 'translate(' + (dx + 170) + 'px,120px) rotate(420deg) scale(.6)', opacity: 0 }],
              { duration: 650, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' });
            return out;
          }).then(function () {
            atk.style.opacity = 0;
            CH.curlo.react(curlo, 'celebrate', 1200);
            busy = false;
          });
        },
        reset: function () { resetAtk(); atk.hidden = true; setCells(BYTES); CH.curlo.react(curlo, 'happy'); }
      };
      return api;
    }
  };
})();
