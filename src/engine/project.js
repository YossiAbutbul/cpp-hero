/* ==========================================================================
   Cpp Hero — engine/project.js
   Mini-project player: guided build in validated steps (the program grows on
   screen as you go; progress is saved per step), a "program complete" reveal,
   then the Stress Test: Curlo throws hostile input at your program, it
   crashes, and you harden it until the shield deflects the attack.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;
  function S() { return CH.store.state; }
  var icon = function (n, c) { return CH.ui.icon(n, c); };

  /** "Your program so far": reveal the first part of the final program. */
  function growing(program, frac) {
    if (!program) return null;
    var lines = program.split('\n'), n = Math.max(1, Math.round(lines.length * frac));
    var el = U.h('<details class="growing"' + (frac > 0 ? ' open' : '') + '><summary>' + icon('project') + ' Your program so far <span class="muted small">(' + Math.round(frac * 100) + '%)</span></summary></details>');
    var shown = lines.slice(0, n).join('\n');
    el.appendChild(CH.code.block(shown + (n < lines.length ? '\n// … more to build' : ''), { label: 'Program so far' }));
    return el;
  }

  function playProject(world) {
    var p = world.project, steps = p.steps || [];
    var attacks = (p.stress && p.stress.attacks) || [];
    var rec = S().projects[p.id] || { done: false, step: 0 };
    var startAt = rec.done ? 0 : U.clamp(rec.step || 0, 0, steps.length);
    var s = new CH.Session({ mode: 'project', title: p.title, noun: 'project',
      quitText: 'Your finished build steps are saved, so you can pick up where you left off.' });
    var total = steps.length + attacks.length + 2;
    var done = startAt;
    function prog() { s.setProgress(done / total); }
    prog();

    function intro() {
      var el = U.h('<div class="proj-intro"><div class="eyebrow">World ' + world.num + ' · Mini-project</div><h2>' + U.esc(p.title) + '</h2></div>');
      var cs = CH.ui.curloSays(CH.ui.story(p.intro || 'Let’s build something real!'), 'celebrate');
      el.appendChild(cs.el);
      var list = U.h('<ol class="proj-steps"></ol>');
      steps.forEach(function (st, i) {
        list.appendChild(U.h('<li class="' + (i < startAt ? 'done' : '') + '">' + icon(i < startAt ? 'ok' : 'project') + '<span>Step ' + (i + 1) + ': ' + U.esc(CH.challenges.TYPES[st.type] || 'Build') + '</span></li>'));
      });
      list.appendChild(U.h('<li class="stress">' + icon('swords') + '<span>Stress Test: ' + U.plural(attacks.length, 'attack') + '</span></li>'));
      el.appendChild(list);
      setTimeout(function () { CH.curlo.react(cs.curlo, 'celebrate', 900); }, 400);
      return s.card(el, startAt > 0 ? 'Resume at step ' + (startAt + 1) : 'Start building', 'teal');
    }

    function buildSteps() {
      var i = startAt;
      function next() {
        if (s.quit) return Promise.reject(new Error('quit'));
        if (i >= steps.length) return Promise.resolve();
        var ch = steps[i];
        var before = growing(p.program, i / steps.length);
        return s.challenge(ch, { eyebrow: 'Build step ' + (i + 1) + ' of ' + steps.length + ' · ' + (CH.challenges.TYPES[ch.type] || ''), before: before,
          continueLabel: 'Continue' }).then(function (res) {
          if (res.correct) {
            i++; done++; prog();
            S().projects[p.id] = { done: !!(S().projects[p.id] && S().projects[p.id].done), step: i };
            CH.store.save();
          } else {
            CH.fx.toast('Let’s fix this step before moving on.', { icon: icon('project') });
          }
          return next();
        });
      }
      return next();
    }

    function reveal() {
      var el = U.h('<div class="proj-done"><div class="eyebrow">' + icon('ok') + ' Build complete</div><h2>' + U.esc(p.title) + ' works!</h2><p class="muted">Here’s your whole program. Nice building!</p></div>');
      var blk = CH.code.block(p.program || '', { label: 'Your finished program' });
      el.appendChild(blk);
      var pr = s.card(el, attacks.length ? 'Start the Stress Test' : 'Finish project', attacks.length ? 'coral' : 'sun');
      setTimeout(function () { CH.code.type(blk._code, p.program || '').then(function () { CH.audio.play('correct'); CH.fx.burstAt(blk, { n: 80 }); }); }, CH.fx.reduced() ? 0 : 450);
      return pr.then(function () { done++; prog(); });
    }

    function stress() {
      if (!attacks.length) return Promise.resolve();
      var arena = CH.arena.create({ cellsLabel: 'your program' });
      var i = 0;
      function introCard() {
        var el = U.h('<div class="stress-intro"><div class="eyebrow">' + icon('swords') + ' Stress Test</div><h2>Break-in attempt!</h2></div>');
        var cs = CH.ui.curloSays(CH.ui.story(p.stress.intro || 'Curlo throws bad input at your program!'), 'bracing');
        el.appendChild(cs.el);
        el.appendChild(U.h('<p class="muted">Real users type anything. For each attack, watch what breaks, then harden the code so the shield holds.</p>'));
        return s.card(el, 'Bring it on!', 'coral');
      }
      function attack() {
        if (s.quit) return Promise.reject(new Error('quit'));
        if (i >= attacks.length) return Promise.resolve();
        var a = attacks[i];
        var head = U.h('<div class="attack-head"><div class="eyebrow">Attack ' + (i + 1) + ' of ' + attacks.length + '</div>' +
          '<div class="dhead"><span class="atk-label">' + icon('alert') + U.esc(a.label || 'Hostile input') + '</span><span class="hostile">' + U.esc(a.input === '' ? '""' : a.input) + '</span></div></div>');
        head.appendChild(arena.el);
        var runRow = U.h('<div class="row"><button class="pbtn coral">' + icon('play') + 'Run with this input</button></div>');
        head.appendChild(runRow);
        var pg = s.page(head);
        arena.reset();
        setTimeout(function () { arena.setAttack(a.input); }, 250);
        return new Promise(function (resolve) {
          var btn = runRow.querySelector('.pbtn');
          setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 300);
          btn.onclick = function () {
            btn.disabled = true;
            arena.crash().then(function () {
              runRow.innerHTML = '<p class="crash-note">' + icon('no') + ' <b>Crashed!</b> The program can’t handle <code class="i">' + U.esc(a.input === '' ? '""' : a.input) + '</code>. Fix it below.</p>';
              CH.curlo.react(arena.curlo, 'worried');
              resolve();
            });
          };
        }).then(function () {
          return fixLoop(a, pg);
        }).then(function () { i++; done++; prog(); return attack(); });
      }
      function fixLoop(a, pg) {
        var host = U.h('<div class="fix-host"></div>');
        pg.appendChild(host);
        return CH.challenges.render(a.challenge, host, {
          mode: 'project', eyebrow: 'Fix it · ' + (CH.challenges.TYPES[a.challenge.type] || ''),
          onHint: function (t, cost, b) { var d = CH.game.addXP(-cost, 'hint'); s.xp += d; if (d) CH.fx.floatText(b, d + ' XP', 'neg'); },
          onAnswer: function (res) {
            s.total++;
            CH.game.recordAnswer(a.challenge, res.correct, 'project', res.assisted, res.hints);
            s.updateCombo(!res.correct);
            var out = {};
            if (res.correct) {
              s.right++;
              if (!res.assisted) { var d = CH.game.addXP(Math.round(12 * CH.game.multiplier()), 'stress'); s.xp += d; out.xpText = '+' + d + ' XP'; }
              try { arena.el.scrollIntoView({ block: 'center', behavior: CH.fx.reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
              arena.setAttack(a.input);
              setTimeout(function () { arena.block(); }, 350);
            } else {
              arena.setAttack(a.input);
              setTimeout(function () { arena.crash(); }, 300);
            }
            s.bestCombo = Math.max(s.bestCombo, CH.game.combo);
            return out;
          }
        }).then(function (res) {
          if (res.correct) return;
          host.remove();
          CH.fx.toast('Still breakable! Try the fix again.', { icon: icon('warn') });
          return fixLoop(a, pg);
        });
      }
      return introCard().then(attack);
    }

    function finish() {
      var bonus = CH.game.addXP(30, 'project');
      s.xp += bonus;
      var r = CH.game.completeProject(world);
      var extra = U.h('<div><div class="stat-gain">' + icon('shield') + ' Stress Test passed: every attack blocked!</div>' +
        (r.first ? '<div class="stat-gain">' + icon('chart') + ' Defense stat up!</div>' : '') + '</div>');
      return s.results({ title: 'Project complete!', sub: 'The boss of World ' + world.num + ' is awake…', extraEl: extra }).then(function () {
        CH.screensUtil.returnToMap({ justDone: p.id });
      });
    }

    intro().then(buildSteps).then(reveal).then(stress).then(finish).catch(function (e) { if (e && e.message !== 'quit') console.error(e); });
    return s;
  }

  CH.project = { play: playProject };
})();
