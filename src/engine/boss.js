/* ==========================================================================
   Cpp Hero — engine/boss.js
   Boss battle: dramatic entrance, HP bar that drops one segment per correct
   answer, taunts on mistakes (costs a heart), then the Defense Phase where
   the boss hurls hostile inputs (negatives, empty strings, huge values,
   nullptr, invalid text) at Curlo and you block them by hardening code, and
   finally a victory sequence with rewards and the next world unlocking.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util;
  var icon = function (n, c) { return CH.ui.icon(n, c); };

  function playBoss(world) {
    var b = world.boss, maxHp = Math.max(1, b.hp || (b.rounds || []).length || 1);
    var hp = maxHp;
    var s = new CH.Session({ mode: 'boss', title: b.name, noun: 'battle', fallbackPool: b.rounds,
      quitText: 'Retreat? The boss will be back at full health next time.' });
    s.el.classList.add('boss-session');
    var defense = b.defense || [];
    var total = maxHp + defense.length + 1;
    var done = 0;
    function prog() { s.setProgress(done / total); }

    /* ---- persistent boss header (sticky) ---- */
    var head = U.h('<div class="boss-head" hidden>' +
      '<div class="boss-art"></div>' +
      '<div class="boss-meta"><div class="boss-name">' + U.esc(b.name) + '</div>' +
        '<div class="hpbar" role="meter" aria-label="Boss health" aria-valuemin="0" aria-valuemax="' + maxHp + '" aria-valuenow="' + maxHp + '"></div>' +
        '<div class="boss-say" aria-live="polite"></div></div></div>');
    var hpbar = head.querySelector('.hpbar');
    for (var k = 0; k < maxHp; k++) hpbar.insertAdjacentHTML('beforeend', '<i class="seg"></i>');
    s.scroller.insertBefore(head, s.stage);
    var art = head.querySelector('.boss-art');
    function drawArt(hurt) { art.innerHTML = CH.art.boss(b.art || 'gremlin', { hurt: !!hurt }); }
    drawArt(false);
    var say = head.querySelector('.boss-say');
    function taunt(txt) {
      say.textContent = txt;
      CH.fx.anim(say, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: CH.fx.SPRING, rm: 'fade' });
    }
    function setHP(n) {
      U.$$('.seg', hpbar).forEach(function (seg, i) { seg.classList.toggle('gone', i >= n); });
      hpbar.setAttribute('aria-valuenow', n);
      hpbar.setAttribute('aria-valuetext', n + ' of ' + maxHp + ' health left');
    }

    /** Correct answer: the boss takes a hit. */
    function hit() {
      hp = Math.max(0, hp - 1);
      done++; prog();
      CH.audio.play('hit');
      var segs = U.$$('.seg', hpbar), seg = segs[hp];
      if (seg) CH.fx.anim(seg, [{ transform: 'none' }, { transform: 'scaleY(1.6) translateY(-4px)', opacity: 1 }, { transform: 'translateY(10px) scale(.4) rotate(20deg)', opacity: 0 }], { duration: 480, easing: 'ease-in' });
      setTimeout(function () { setHP(hp); }, CH.fx.reduced() ? 0 : 420);
      art.classList.remove('hurtflash'); void art.offsetWidth; art.classList.add('hurtflash');
      setTimeout(function () { art.classList.remove('hurtflash'); }, 600);
      CH.fx.shake(art, 12);
      CH.fx.floatText(art, '−1 HP', 'dmg');
      CH.fx.burstAt(art, { n: 30, colors: ['#FFC62E', '#fff', '#FF5A70'], speed: 0.8 });
      taunt(hp > 0 ? U.pick(['Ow! Lucky shot!', 'Grr… that stung!', 'Hmph. You’re better than I thought.', 'Not so fast!']) : 'No… NO! My HP!');
    }
    /** Wrong answer: the boss lunges and laughs. */
    function boast() {
      CH.fx.anim(art, [{ transform: 'none' }, { transform: 'translateY(8px) scale(1.12,.9)' }, { transform: 'translateY(-14px) scale(.95,1.08)' }, { transform: 'none' }], { duration: 520, easing: CH.fx.SPRING });
      taunt(U.pick(b.taunt && b.taunt.length ? b.taunt : ['Ha! Missed me!']));
    }

    /* ---- 1. entrance ---- */
    function entrance() {
      var el = U.h('<div class="boss-intro"><div class="boss-stage-in"><div class="boss-big"></div><div class="boss-banner"><small>Boss battle · World ' + world.num + '</small><b>' + U.esc(b.name) + '</b></div></div></div>');
      el.querySelector('.boss-big').innerHTML = CH.art.boss(b.art || 'gremlin');
      var cs = CH.ui.curloSays(CH.ui.story((world.story && world.story.bossIntro) || CH.curlo.line('boss')), 'bracing');
      el.appendChild(cs.el);
      if (b.intro) el.appendChild(U.h('<div class="bubble boss-bubble"><b>' + U.esc(b.name) + ':</b> ' + U.md([].concat(b.intro)[0]) + '</div>'));
      el.appendChild(U.h('<p class="muted small center">' + icon('heart') + ' Wrong answers cost a heart. Land ' + U.plural(maxHp, 'hit') + ', then survive the Defense Phase!</p>'));
      var pr = s.card(el, icon('swords') + ' Fight!', 'coral');
      CH.audio.play('boss');
      var big = el.querySelector('.boss-big'), banner = el.querySelector('.boss-banner');
      CH.fx.anim(big, [{ transform: 'translateY(-120%) scale(.7)', opacity: 0 }, { transform: 'translateY(6%) scale(1.1,.86)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-4%) scale(.96,1.05)', offset: 0.75 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'ease-out', rm: 'fade' })
        .then(function () { CH.fx.shake(s.el, 8); });
      CH.fx.anim(banner, [{ transform: 'scale(.3) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: 600, fill: 'backwards', rm: 'fade' });
      setTimeout(function () { CH.curlo.react(cs.curlo, 'bracing'); }, 700);
      return pr.then(function () { head.hidden = false; setHP(hp); taunt(U.pick(b.taunt && b.taunt.length ? b.taunt : ['Come at me!'])); CH.fx.slideUp(head); });
    }

    /* ---- 2. rounds ---- */
    function rounds() {
      var queue = (b.rounds || []).slice(), missed = [], i = 0;
      function next() {
        if (s.quit) return Promise.reject(new Error('quit'));
        if (hp <= 0) return Promise.resolve();
        if (i >= queue.length) {
          queue = U.shuffle(missed.length ? missed : (b.rounds || []));
          missed = []; i = 0;
          if (!queue.length) return Promise.resolve();
          CH.fx.toast('The boss is still standing! Round two!', { icon: icon('swords') });
        }
        var ch = queue[i++];
        return s.challenge(ch, {
          eyebrow: 'Round ' + (maxHp - hp + 1) + ' · ' + (CH.challenges.TYPES[ch.type] || ''),
          onAnswer: function (res) { if (res.correct && !res.assisted) setTimeout(hit, 200); else if (res.correct) setTimeout(hit, 200); else { missed.push(ch); setTimeout(boast, 200); } }
        }).then(next);
      }
      return next();
    }

    /* ---- 3. defense phase ---- */
    function defensePhase() {
      if (!defense.length) return Promise.resolve();
      var el = U.h('<div class="def-intro"><div class="phase-banner"><small>Phase 2</small><b>Defense!</b></div></div>');
      el.appendChild(CH.ui.curloSays('The boss is enraged and hurls <b>hostile inputs</b> at us! Harden the code so my shield can block them!', 'bracing').el);
      var pr = s.card(el, icon('shield') + ' Shields up!', 'teal');
      drawArt(false);
      taunt('Enough! Eat THIS input!');
      CH.audio.play('boss');
      CH.fx.anim(el.querySelector('.phase-banner'), [{ transform: 'scale(2.2) rotate(-6deg)', opacity: 0 }, { transform: 'scale(.95)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 600, rm: 'fade' });
      return pr.then(function () {
        var arena = CH.arena.create({ cellsLabel: 'Curlo’s code', bossArt: CH.art.boss(b.art || 'gremlin') });
        head.hidden = true;
        var i = 0;
        function attack() {
          if (s.quit) return Promise.reject(new Error('quit'));
          if (i >= defense.length) return Promise.resolve();
          var d = defense[i];
          var top = U.h('<div class="attack-head"><div class="dhead"><span class="atk-label">' + icon('alert') + U.esc(d.label || 'Hostile input!') + '</span><span class="hostile">' + U.esc(d.attack === '' ? '""' : d.attack) + '</span></div></div>');
          top.appendChild(arena.el);
          arena.reset();
          setTimeout(function () { arena.setAttack(d.attack); taunt(U.pick(['Take this: ' + (d.attack === '' ? '""' : d.attack) + '!', 'Incoming!', 'Try blocking THIS!'])); }, 300);
          return s.challenge(d.challenge, {
            before: top,
            eyebrow: 'Block attack ' + (i + 1) + ' of ' + defense.length + ' · ' + (CH.challenges.TYPES[d.challenge.type] || ''),
            onAnswer: function (res) {
              try { arena.el.scrollIntoView({ block: 'center', behavior: CH.fx.reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
              if (res.correct) setTimeout(function () { arena.block(); }, 250);
              else setTimeout(function () { arena.crash(); boast(); }, 250);
            }
          }).then(function (res) {
            if (res.correct) { i++; done++; prog(); }
            else CH.fx.toast('It got through! Block it this time.', { icon: icon('shield') });
            return attack();
          });
        }
        return attack();
      });
    }

    /* ---- 4. victory ---- */
    function victory() {
      drawArt(true);
      taunt('Nooo! I’ll be back in a patch release…');
      var el = U.h('<div class="victory"><div class="vic-boss"></div><div class="phase-banner win"><small>Victory!</small><b>' + U.esc(b.name) + ' defeated</b></div></div>');
      el.querySelector('.vic-boss').innerHTML = CH.art.boss(b.art || 'gremlin', { hurt: true });
      var cs = CH.ui.curloSays(CH.ui.story((world.story && world.story.victory) || b.victory || 'We did it!'), 'celebrate');
      el.appendChild(cs.el);
      if (b.victory && world.story && world.story.victory) el.appendChild(U.h('<div class="bubble boss-bubble"><b>' + U.esc(b.name) + ':</b> ' + U.md([].concat(b.victory)[0]) + '</div>'));
      var r = b.reward || {};
      var rw = U.h('<div class="rewards"><div class="eyebrow">Rewards</div></div>');
      if (r.xp) rw.appendChild(U.h('<div class="reward">' + icon('bolt') + '<b>+' + r.xp + ' XP</b></div>'));
      var cdef = r.cosmetic && CH.game.cosmeticDef(r.cosmetic);
      if (cdef) rw.appendChild(U.h('<div class="reward">' + icon('gift') + '<b>' + U.esc(cdef.name) + '</b><span class="muted">new gear</span></div>'));
      var bdef = r.bug && CH.game.bugDef(r.bug);
      if (bdef) rw.appendChild(U.h('<div class="reward">' + icon('bug') + '<b>' + U.esc(bdef.name) + '</b><span class="muted">bestiary</span></div>'));
      el.appendChild(rw);
      head.hidden = true;
      var pr = s.card(el, 'Claim rewards', 'sun');
      CH.audio.play('levelup');
      var vb = el.querySelector('.vic-boss');
      CH.fx.anim(vb, [{ transform: 'none', opacity: 1 }, { transform: 'rotate(-12deg) scale(1.1)', opacity: 1, offset: 0.3 }, { transform: 'rotate(380deg) scale(.1)', opacity: 0 }], { duration: 1200, delay: 500, easing: 'ease-in', fill: 'forwards', rm: 'skip' })
        .then(function () { CH.fx.burstAt(vb, { n: 160 }); CH.fx.rain(100); if (!CH.fx.reduced()) vb.style.opacity = 0; });
      setTimeout(function () { CH.curlo.react(cs.curlo, 'celebrate', 1500); }, 900);
      return pr.then(function () {
        var before = s.xp;
        var res = CH.game.beatBoss(world);
        if (r.xp && res.first) s.xp += r.xp;
        var extra = U.h('<div></div>');
        if (res.unlocked) extra.appendChild(U.h('<div class="stat-gain">' + icon('map') + ' World ' + res.unlocked.num + ' unlocked: <b>' + U.esc(res.unlocked.title) + '</b></div>'));
        else if (!res.first) extra.appendChild(U.h('<div class="stat-gain">' + icon('star') + ' Rematch won! Great practice.</div>'));
        void before;
        return s.results({ title: 'Boss defeated!', sub: U.esc(b.name) + ' won’t bug this world again.', extraEl: extra }).then(function () {
          CH.screensUtil.returnToMap({ justDone: b.id, unlocked: res.unlocked && res.unlocked.id });
        });
      });
    }

    entrance().then(rounds).then(defensePhase).then(victory).catch(function (e) { if (e && e.message !== 'quit') console.error(e); });
    return s;
  }

  CH.boss = { play: playBoss };
})();
