/* ==========================================================================
   Cpp Hero — engine/progress.js  (CH.game)
   Content index + all progression rules: gating, XP/levels, combos,
   hearts (refill 1 per 30 min or per practice review), streak + freezes,
   daily quests, achievements (DSL), stats, cosmetics, bestiary, vault,
   Leitner SRS, time tracking. UI modules listen to CH.events.
   ========================================================================== */
(function () {
  'use strict';
  var CH = window.CH, U = CH.util, E = CH.events;

  function S() { return CH.store.state; }
  function save() { CH.store.save(); }

  var HEART_MS = 30 * 60 * 1000;
  var SRS_DAYS = [0, 1, 3, 7, 16];                 // Leitner boxes 1..5
  var DEFENSIVE = ['bug', 'breakit', 'harden', 'review', 'edge', 'safe'];
  var TIMED = ['speed', 'safe'];
  var SKILLS = ['logic', 'structure', 'memory', 'toolkit', 'defense'];

  var game = (CH.game = {
    DEFENSIVE: DEFENSIVE, TIMED: TIMED, SKILLS: SKILLS,
    combo: 0,               // in-session combo (not saved)
    queue: [],              // pending big celebrations (level-up, achievements, evolution, bugs)
    index: null
  });

  /* ======================================================================
     Content index
     ====================================================================== */
  game.buildIndex = function () {
    var C = CH.content;
    var worlds = C.worlds.filter(function (w) { return w && w.id && (CH.dev || w.id !== 'wdev'); })
      .slice().sort(function (a, b) { return (a.num || 0) - (b.num || 0); });
    var idx = { worlds: worlds, world: {}, lesson: {}, challenge: {}, byType: {}, vault: {}, tagSkill: {}, bugRefs: {} };
    function addCh(ch, meta) {
      if (!ch || !ch.id) return;
      if (idx.challenge[ch.id]) console.warn('[content] duplicate challenge id', ch.id);
      idx.challenge[ch.id] = { ch: ch, kind: meta.kind, world: meta.world, lesson: meta.lesson || null };
      (idx.byType[ch.type] = idx.byType[ch.type] || []).push(ch.id);
      if (meta.lesson) (ch.tags || []).forEach(function (t) { if (!idx.tagSkill[t]) idx.tagSkill[t] = meta.lesson.skill; });
      if (ch.bug) idx.bugRefs[ch.bug] = (idx.bugRefs[ch.bug] || 0) + 1;
      if (CH.challenges && CH.challenges.validate) CH.challenges.validate(ch);
    }
    worlds.forEach(function (w, wi) {
      w._i = wi;
      idx.world[w.id] = w;
      (w.lessons || []).forEach(function (l, li) {
        l._i = li; l._world = w;
        idx.lesson[l.id] = l;
        (l.challenges || []).forEach(function (ch) { addCh(ch, { kind: 'lesson', world: w, lesson: l }); });
        (l.vault || []).forEach(function (v) { idx.vault[v.id] = { card: v, world: w, lesson: l }; });
      });
      if (w.project) {
        (w.project.steps || []).forEach(function (ch) { addCh(ch, { kind: 'project', world: w }); });
        ((w.project.stress && w.project.stress.attacks) || []).forEach(function (a) { addCh(a.challenge, { kind: 'stress', world: w }); });
      }
      if (w.boss) {
        (w.boss.rounds || []).forEach(function (ch) { addCh(ch, { kind: 'boss', world: w }); });
        (w.boss.defense || []).forEach(function (d) { addCh(d.challenge, { kind: 'defense', world: w }); });
      }
    });
    game.index = idx;
    return idx;
  };

  game.worlds = function () { return game.index.worlds; };
  game.lessonsDone = function () { var L = S().lessons; return Object.keys(L).filter(function (k) { return L[k] && L[k].done; }); };

  /* ======================================================================
     Gating (lessons in order → project → boss → next world)
     ====================================================================== */
  game.worldUnlocked = function (w) {
    if (!w) return false;
    if (w.id === 'wdev') return true;
    return S().worldsUnlocked.indexOf(w.id) >= 0;
  };
  game.lessonDone = function (l) { var r = S().lessons[l.id]; return !!(r && r.done); };
  game.lessonUnlocked = function (w, i) {
    if (!game.worldUnlocked(w)) return false;
    return i === 0 || game.lessonDone(w.lessons[i - 1]);
  };
  game.allLessonsDone = function (w) { return (w.lessons || []).every(game.lessonDone); };
  game.projectDone = function (w) { var p = w.project && S().projects[w.project.id]; return !w.project || !!(p && p.done); };
  game.projectUnlocked = function (w) { return game.worldUnlocked(w) && game.allLessonsDone(w); };
  game.bossBeaten = function (w) { var b = w.boss && S().bosses[w.boss.id]; return !!(b && b.beaten); };
  game.bossUnlocked = function (w) { return game.projectUnlocked(w) && game.projectDone(w); };
  game.worldComplete = function (w) { return w.boss ? game.bossBeaten(w) : game.allLessonsDone(w) && game.projectDone(w); };

  /** Ordered map nodes for a world: lessons, project, boss. */
  game.nodes = function (w) {
    var out = [];
    (w.lessons || []).forEach(function (l, i) {
      out.push({ kind: 'lesson', id: l.id, world: w, lesson: l, i: i, done: game.lessonDone(l), open: game.lessonUnlocked(w, i) });
    });
    if (w.project) out.push({ kind: 'project', id: w.project.id, world: w, project: w.project, done: game.projectDone(w), open: game.projectUnlocked(w) });
    if (w.boss) out.push({ kind: 'boss', id: w.boss.id, world: w, boss: w.boss, done: game.bossBeaten(w), open: game.bossUnlocked(w) });
    return out;
  };

  /** The "you are here" node: first open & not-done node of the latest unlocked world that has one. */
  game.currentNode = function () {
    var ws = game.worlds().filter(game.worldUnlocked);
    for (var i = ws.length - 1; i >= 0; i--) {
      var n = game.nodes(ws[i]).filter(function (x) { return x.open && !x.done; })[0];
      if (n) return n;
    }
    return null;
  };

  /* ======================================================================
     XP, levels, combo
     ====================================================================== */
  game.xpToNext = function (level) { return 100 + (level - 1) * 50; };
  game.levelInfo = function (xp) {
    var lvl = 1, rest = Math.max(0, xp);
    while (rest >= game.xpToNext(lvl)) { rest -= game.xpToNext(lvl); lvl++; }
    return { level: lvl, into: rest, need: game.xpToNext(lvl) };
  };

  /** Add (or subtract) XP. Queues level-up celebrations. Returns the applied delta. */
  game.addXP = function (n, why) {
    var s = S(), before = s.xp;
    s.xp = Math.max(0, Math.round(s.xp + n));
    var delta = s.xp - before;
    var oldL = s.level, info = game.levelInfo(s.xp);
    s.level = info.level;
    if (delta > 0) questEvent('xp', delta);
    E.emit('xp', { delta: delta, xp: s.xp, why: why });
    if (info.level > oldL) {
      for (var L = oldL + 1; L <= info.level; L++) {
        game.queue.push({ type: 'levelup', level: L });
        var cos = LEVEL_COSMETICS[L];
        if (cos) game.grantCosmetic(cos, true);
      }
      E.emit('levelup', { level: info.level });
      game.checkAchievements();
    }
    save();
    return delta;
  };

  game.multiplier = function () { var c = game.combo; return c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1; };

  /* ======================================================================
     Hearts
     ====================================================================== */
  game.regenHearts = function () {
    var h = S().hearts, now = Date.now();
    var last = Date.parse(h.lastRefill) || now;
    if (h.n >= h.max) { h.lastRefill = new Date(now).toISOString(); return; }
    var k = Math.floor((now - last) / HEART_MS);
    if (k > 0) {
      h.n = Math.min(h.max, h.n + k);
      h.lastRefill = new Date(h.n >= h.max ? now : last + k * HEART_MS).toISOString();
      E.emit('hearts', { n: h.n, gained: k });
      save();
    }
  };
  /** Seconds until the next heart (0 when full). */
  game.nextHeartIn = function () {
    var h = S().hearts;
    if (h.n >= h.max) return 0;
    var last = Date.parse(h.lastRefill) || Date.now();
    return Math.max(0, (last + HEART_MS - Date.now()) / 1000);
  };
  game.loseHeart = function () {
    var h = S().hearts;
    if (h.n <= 0) return 0;
    if (h.n >= h.max) h.lastRefill = U.isoNow();
    h.n--;
    E.emit('hearts', { n: h.n, lost: 1 });
    save();
    return h.n;
  };
  game.gainHeart = function (k) {
    var h = S().hearts;
    var before = h.n;
    h.n = Math.min(h.max, h.n + (k || 1));
    if (h.n >= h.max) h.lastRefill = U.isoNow();
    if (h.n !== before) E.emit('hearts', { n: h.n, gained: h.n - before });
    save();
    return h.n - before;
  };

  /* ======================================================================
     Streak + freezes
     ====================================================================== */
  /** On boot: apply freezes for missed days, or break the streak. */
  game.checkStreak = function () {
    var st = S().streak, today = U.dayStr();
    if (!st.lastDay) return;
    var diff = U.dayDiff(st.lastDay, today);
    if (diff <= 1) return;
    var missed = diff - 1;
    if (st.days > 0 && st.freezes >= missed) {
      st.freezes -= missed;
      var y = new Date(); y.setDate(y.getDate() - 1);
      st.lastDay = U.dayStr(y);
      game.pendingNotes.push({ icon: 'freeze', msg: 'Streak freeze used! Your ' + st.days + '-day streak is safe.' });
    } else if (st.days > 0) {
      game.pendingNotes.push({ icon: 'flame', msg: 'Your streak reset. Start a new one today!' });
      st.days = 0;
    }
    save();
  };
  game.pendingNotes = [];

  /** Mark today as active (called when a lesson/review/practice/boss completes). */
  game.markActive = function () {
    var st = S().streak, today = U.dayStr();
    if (st.lastDay === today) return false;
    var diff = U.dayDiff(st.lastDay, today);
    st.days = diff === 1 ? st.days + 1 : 1;
    if (!st.lastDay) st.days = 1;
    st.lastDay = today;
    st.best = Math.max(st.best, st.days);
    if (st.days > 0 && st.days % 5 === 0 && st.freezes < 3) {
      st.freezes++;
      CH.fx.toast('Streak milestone! +1 streak freeze', { icon: CH.ui.icon('freeze') });
    }
    E.emit('streak', { days: st.days });
    game.checkAchievements();
    save();
    return true;
  };

  /* ======================================================================
     Daily quests
     ====================================================================== */
  var ALIASES = {
    'lesson.done': ['lesson.done', 'lesson', 'lessons', 'lesson.complete'],
    'correct': ['correct', 'challenge.correct', 'answer.correct', 'answer'],
    'boss.round': ['boss.round', 'boss.hit'],
    'hint.none': ['hint.none', 'nohint', 'no.hint'],
    'combo': ['combo', 'streak.combo', 'inarow', 'in-a-row'],
    'harden': ['harden', 'hardened', 'defense.correct', 'defensive.correct', 'defense', 'defend'],
    'review': ['review', 'review.done', 'srs.review', 'reviews', 'srs'],
    'boss.beaten': ['boss', 'boss.beaten', 'boss.win', 'boss.done'],
    'project.done': ['project', 'project.done', 'project.complete'],
    'practice.done': ['practice', 'practice.done', 'arena'],
    'xp': ['xp', 'xp.earned'],
    'minutes': ['minutes', 'time', 'goal'],
    'perfect': ['perfect', 'lesson.perfect'],
    'bug': ['bug', 'bestiary', 'bug.defeated']
  };
  var CANON = {};
  Object.keys(ALIASES).forEach(function (k) { ALIASES[k].forEach(function (a) { CANON[a] = k; }); });
  function canon(e) { return CANON[String(e || '').toLowerCase()] || String(e || ''); }

  var DEFAULT_QUESTS = [
    { id: 'q-lessons2', text: 'Complete 2 lessons', goal: 2, event: 'lesson.done', xp: 20 },
    { id: 'q-combo5', text: 'Get 5 correct in a row', goal: 5, event: 'combo', xp: 20 },
    { id: 'q-harden3', text: 'Harden 3 snippets', goal: 3, event: 'harden', xp: 25 },
    { id: 'q-review3', text: 'Review 3 old concepts', goal: 3, event: 'review', xp: 20 },
    { id: 'q-correct10', text: 'Answer 10 challenges correctly', goal: 10, event: 'correct', xp: 20 },
    { id: 'q-xp50', text: 'Earn 50 XP', goal: 50, event: 'xp', xp: 15 }
  ];
  game.questDefs = function () { return CH.content.quests.length ? CH.content.quests : DEFAULT_QUESTS; };
  game.questDef = function (id) { return game.questDefs().filter(function (q) { return q.id === id; })[0]; };

  game.ensureDaily = function () {
    var d = S().daily, today = U.dayStr();
    var defs = game.questDefs();
    var valid = d.quests.every(function (q) { return !!game.questDef(q.id); });
    if (d.day === today && d.quests.length && valid) return;
    var rng = U.seeded('quests-' + today);
    var picks = U.shuffle(defs, rng).slice(0, Math.min(3, defs.length));
    S().daily = { day: today, minutes: d.day === today ? d.minutes : 0, quests: picks.map(function (q) { return { id: q.id, progress: 0, done: false, claimed: false }; }) };
    save();
  };

  function questEvent(evt, value) {
    var d = S().daily;
    if (!d || d.day !== U.dayStr()) game.ensureDaily();
    d = S().daily;
    var c = canon(evt), changed = false;
    d.quests.forEach(function (q) {
      if (q.done) return;
      var def = game.questDef(q.id);
      if (!def || canon(def.event) !== c) return;
      var goal = def.goal || 1;
      if (c === 'combo' || def.mode === 'max') q.progress = Math.max(q.progress, value || 0);
      else q.progress += (value == null ? 1 : value);
      q.progress = Math.min(goal, q.progress);
      changed = true;
      if (q.progress >= goal) {
        q.done = true; q.claimed = true;
        CH.audio.play('coin');
        CH.fx.toast('Quest complete: ' + def.text + ' (+' + (def.xp || 20) + ' XP)', { icon: CH.ui.icon('quest') });
        setTimeout(function () { game.addXP(def.xp || 20, 'quest'); }, 10);
        if (d.quests.every(function (x) { return x.done; })) {
          var st = S().streak;
          if (st.freezes < 3) {
            st.freezes++;
            setTimeout(function () { CH.fx.toast('All daily quests done! +1 streak freeze', { icon: CH.ui.icon('freeze') }); }, 2800);
          }
        }
      }
    });
    if (changed) { E.emit('quests'); save(); }
  }
  game.questEvent = questEvent;

  /* ======================================================================
     Achievements (content DSL: "lessons:5", "combo:10", "streak:7",
     "bestiary:<id>", "hardened:3", "world:w3", "perfect:1", "reviews:10";
     extras: xp, level, correct, bosses, vault, projects)
     ====================================================================== */
  var warned = {};
  function testAch(test) {
    var s = S(), m = /^([a-z]+):(.+)$/.exec(String(test || '').trim());
    if (!m) return false;
    var k = m[1], a = m[2], n = +a;
    switch (k) {
      case 'lessons': return game.lessonsDone().length >= n;
      case 'combo': return s.counters.bestCombo >= n;
      case 'streak': return Math.max(s.streak.best, s.streak.days) >= n;
      case 'bestiary': return isNaN(n) ? s.bestiary.indexOf(a) >= 0 : s.bestiary.length >= n;
      case 'hardened': return s.counters.hardened >= n;
      case 'world': { var b = s.bosses[a + '.boss']; return !!(b && b.beaten); }
      case 'perfect': return Object.keys(s.lessons).filter(function (id) { return s.lessons[id].done && s.lessons[id].best >= 1; }).length >= n;
      case 'reviews': return s.counters.reviews >= n;
      case 'xp': return s.xp >= n;
      case 'level': return s.level >= n;
      case 'correct': return s.counters.correct >= n;
      case 'bosses': return Object.keys(s.bosses).filter(function (id) { return s.bosses[id].beaten; }).length >= n;
      case 'vault': return s.vault.length >= n;
      case 'projects': return Object.keys(s.projects).filter(function (id) { return s.projects[id].done; }).length >= n;
      default:
        if (!warned[k]) { warned[k] = 1; console.warn('[achievements] unknown test kind', test); }
        return false;
    }
  }
  game.testAchievement = testAch;

  var DEFAULT_ACH = [
    { id: 'a-first', name: 'Hello, Hero', desc: 'Finish your first lesson', test: 'lessons:1' },
    { id: 'a-combo5', name: 'Combo Starter', desc: 'Get 5 correct in a row', test: 'combo:5' },
    { id: 'a-harden3', name: 'Shield Apprentice', desc: 'Harden 3 snippets', test: 'hardened:3' }
  ];
  game.achDefs = function () { return CH.content.achievements.length ? CH.content.achievements : DEFAULT_ACH; };

  game.checkAchievements = function () {
    var s = S(), any = false;
    game.achDefs().forEach(function (def) {
      if (s.achievements[def.id]) return;
      if (testAch(def.test)) {
        s.achievements[def.id] = U.isoNow();
        game.queue.push({ type: 'achievement', def: def });
        if (def.cosmetic) game.grantCosmetic(def.cosmetic, true);
        any = true;
        E.emit('achievement', def);
      }
    });
    // Cosmetics earned through play (content `source` rules).
    game.cosmeticDefs().forEach(function (c) {
      if (s.cosmetics.owned.indexOf(c.id) >= 0) return;
      var t = cosmeticTest(c);
      if (t === 'start') { s.cosmetics.owned.push(c.id); any = true; }
      else if (t && testAch(t)) { game.grantCosmetic(c.id, true); any = true; }
    });
    if (any) save();
  };

  /* ======================================================================
     Cosmetics (hats from content + built-in level rewards; color variants)
     ====================================================================== */
  // Engine level-up rewards (ids chosen not to collide with content cosmetics).
  var LEVEL_COSMETICS = { 3: 'cap-sky', 5: 'bow-ribbon', 8: 'antenna-bobble', 12: 'tophat', 18: 'halo-ring' };
  var BUILTIN_COS = [
    { id: 'cap-sky', slot: 'hat', name: 'Sky Cap', source: 'Reach level 3' },
    { id: 'bow-ribbon', slot: 'hat', name: 'Bow Ribbon', source: 'Reach level 5' },
    { id: 'antenna-bobble', slot: 'hat', name: 'Antenna Bobble', source: 'Reach level 8' },
    { id: 'tophat', slot: 'hat', name: 'Top Hat', source: 'Reach level 12' },
    { id: 'halo-ring', slot: 'hat', name: 'Halo', source: 'Reach level 18' }
  ];
  // Starter looks offered during onboarding (the one you pick becomes owned).
  game.STARTER_COLORS = ['classic', 'berry', 'mint', 'sky'];

  /**
   * Content cosmetics only describe how they're earned in `source` (display
   * text). Translate the common phrasings into achievement-DSL tests so the
   * engine can award them automatically. Boss rewards are granted directly.
   */
  function cosmeticTest(def) {
    if (def.test) return def.test;
    var src = String(def.source || ''), m;
    if (/from the start/i.test(src)) return 'start';
    if ((m = /level (\d+)/i.exec(src))) return 'level:' + m[1];
    if ((m = /(\d+)\s*lessons?/i.exec(src))) return 'lessons:' + m[1];
    if ((m = /(\d+)-day streak/i.exec(src))) return 'streak:' + m[1];
    if ((m = /(\d+)-answer combo/i.exec(src))) return 'combo:' + m[1];
    if ((m = /(\d+)\s*reviews?/i.exec(src))) return 'reviews:' + m[1];
    if ((m = /harden (\d+)/i.exec(src))) return 'hardened:' + m[1];
    if (/final boss/i.test(src)) return 'world:w16';
    if ((m = /world (\d+)/i.exec(src))) return 'world:w' + m[1];
    return null;
  }
  game.cosmeticTest = cosmeticTest;
  game.LEVEL_COSMETICS = LEVEL_COSMETICS;
  game.cosmeticDefs = function () {
    var list = CH.content.cosmetics.slice();
    BUILTIN_COS.forEach(function (c) { if (!list.some(function (x) { return x.id === c.id; })) list.push(c); });
    return list;
  };
  game.cosmeticDef = function (id) { return game.cosmeticDefs().filter(function (c) { return c.id === id; })[0]; };
  game.grantCosmetic = function (id, quiet) {
    var o = S().cosmetics.owned;
    if (!id || o.indexOf(id) >= 0) return false;
    o.push(id);
    var def = game.cosmeticDef(id) || { id: id, name: id };
    if (!quiet) CH.fx.toast('New cosmetic: ' + def.name + '!', { icon: CH.ui.icon('gift') });
    else game.queue.push({ type: 'cosmetic', def: def });
    E.emit('cosmetic', def);
    save();
    return true;
  };
  game.equip = function (slot, id) {
    var eq = S().cosmetics.equipped;
    eq[slot] = id;
    if (slot === 'color') S().profile.variant = id || 'classic';
    save();
    CH.curlo.refreshAll();
    E.emit('equip', { slot: slot, id: id });
  };

  /* ======================================================================
     Stats (0..100)
     ====================================================================== */
  game.gainStat = function (skill, amt) {
    if (SKILLS.indexOf(skill) < 0) skill = 'structure';
    var st = S().stats, before = st[skill];
    st[skill] = U.clamp(Math.round((st[skill] + amt) * 10) / 10, 0, 100);
    if (skill === 'defense' && CH.curlo.tierFor(before) !== CH.curlo.tierFor(st[skill])) {
      game.queue.push({ type: 'tier', tier: CH.curlo.tierFor(st[skill]) });
    }
    E.emit('stats', { skill: skill });
    save();
  };

  /* ======================================================================
     Bestiary
     ====================================================================== */
  game.bugDef = function (id) { return CH.content.bestiary.filter(function (b) { return b.id === id; })[0]; };
  game.defeatBug = function (id) {
    var s = S();
    if (!id || s.bestiary.indexOf(id) >= 0) return false;
    s.bestiary.push(id);
    var def = game.bugDef(id) || { id: id, name: id, art: 'bug' };
    game.queue.push({ type: 'bug', def: def });
    questEvent('bug', 1);
    E.emit('bug', def);
    game.checkAchievements();
    save();
    return true;
  };

  /* ======================================================================
     Answer bookkeeping (counters, tags, SRS, bugs, quests)
     mode: lesson | boss | project | practice | review | placement
     ====================================================================== */
  game.recordAnswer = function (ch, correct, mode, assisted, hintsUsed) {
    var s = S(), c = s.counters;
    if (mode === 'placement') return;
    if (correct) c.correct++; else c.wrong++;
    (ch.tags || []).forEach(function (t) {
      var b = c.byTag[t] = c.byTag[t] || { r: 0, w: 0 };
      if (correct) b.r++; else b.w++;
    });
    game.srsRecord(ch.id, correct);
    if (correct && !assisted) {
      game.combo++;
      if (game.combo > c.bestCombo) c.bestCombo = game.combo;
      questEvent('correct', 1);
      questEvent('combo', game.combo);
      if (!hintsUsed) questEvent('hint.none', 1);
      if (mode === 'boss') questEvent('boss.round', 1);
      if (DEFENSIVE.indexOf(ch.type) >= 0) {
        c.hardened++;
        questEvent('harden', 1);
        if (mode !== 'practice' && mode !== 'review') game.gainStat('defense', 0.5);
      }
      if (ch.bug) {
        var key = 'bug:' + ch.bug, b2 = c.byTag[key] = c.byTag[key] || { r: 0, w: 0 };
        b2.r++;
        var need = Math.min(2, game.index.bugRefs[ch.bug] || 1);
        if (b2.r >= need) game.defeatBug(ch.bug);
      }
    } else if (!correct) {
      game.combo = 0;
    }
    if (mode === 'review' && correct) { c.reviews++; questEvent('review', 1); }
    E.emit('combo', { combo: game.combo });
    game.checkAchievements();
    save();
  };

  /* ======================================================================
     SRS (Leitner): wrong → box 1 due now; right → next box, due +interval.
     ====================================================================== */
  game.srsRecord = function (id, correct) {
    var srs = S().srs, e = srs[id], now = Date.now();
    if (!correct) {
      srs[id] = { box: 1, due: new Date(now).toISOString(), wrong: (e ? e.wrong : 0) + 1, right: e ? e.right : 0 };
    } else if (e) {
      e.right++;
      e.box = Math.min(5, e.box + 1);
      e.due = new Date(now + SRS_DAYS[e.box - 1] * 86400000).toISOString();
    }
  };
  /** Challenge ids due now (that still exist in content), oldest first. */
  game.srsDue = function () {
    var srs = S().srs, now = Date.now(), idx = game.index.challenge;
    return Object.keys(srs).filter(function (id) { return idx[id] && Date.parse(srs[id].due) <= now; })
      .sort(function (a, b) { return Date.parse(srs[a].due) - Date.parse(srs[b].due); });
  };

  /** Challenge ids the player has "met" (in completed lessons / projects / bosses). */
  game.seenChallengeIds = function () {
    var s = S(), idx = game.index, out = [];
    Object.keys(idx.challenge).forEach(function (id) {
      var m = idx.challenge[id];
      if (m.kind === 'lesson' && game.lessonDone(m.lesson)) out.push(id);
      else if ((m.kind === 'project' || m.kind === 'stress') && s.projects[m.world.project.id] && s.projects[m.world.project.id].done) out.push(id);
      else if ((m.kind === 'boss' || m.kind === 'defense') && game.bossBeaten(m.world)) out.push(id);
      else if (s.srs[id]) out.push(id);
    });
    return out;
  };

  /** Build a review set: due SRS first, then weak/older seen challenges. */
  game.reviewSet = function (n, excludeTimed) {
    n = n || 5;
    var idx = game.index.challenge;
    var ok = function (id) { return idx[id] && (!excludeTimed || TIMED.indexOf(idx[id].ch.type) < 0); };
    var due = game.srsDue().filter(ok);
    var out = due.slice(0, n);
    if (out.length < n) {
      var srs = S().srs;
      var seen = U.shuffle(game.seenChallengeIds().filter(function (id) { return ok(id) && out.indexOf(id) < 0; }));
      seen.sort(function (a, b) { return ((srs[b] && srs[b].wrong) || 0) - ((srs[a] && srs[a].wrong) || 0); });
      out = out.concat(seen.slice(0, n - out.length));
    }
    return out.map(function (id) { return idx[id].ch; });
  };

  /** 1–2 older challenges to interleave into a lesson, via its reviewTags. */
  game.interleaveFor = function (lesson) {
    var tags = lesson.reviewTags || [];
    if (!tags.length) return [];
    var idx = game.index.challenge, srs = S().srs, now = Date.now();
    var pool = Object.keys(idx).filter(function (id) {
      var m = idx[id];
      if (m.lesson === lesson || TIMED.indexOf(m.ch.type) >= 0) return false;
      if (m.kind !== 'lesson') return false;
      return (m.ch.tags || []).some(function (t) { return tags.indexOf(t) >= 0; });
    });
    if (!pool.length) return [];
    pool = U.shuffle(pool);
    pool.sort(function (a, b) {
      function score(id) {
        var e = srs[id], m = idx[id];
        if (e && Date.parse(e.due) <= now) return 0;             // due first
        if (m.lesson && game.lessonDone(m.lesson)) return 1;     // then seen
        return 2;
      }
      return score(a) - score(b);
    });
    var k = (lesson.challenges || []).length >= 5 ? 1 : 2;
    return pool.slice(0, k).map(function (id) { return idx[id].ch; });
  };

  /* ======================================================================
     Completion rules
     ====================================================================== */
  game.completeLesson = function (lesson, accuracy) {
    var s = S(), rec = s.lessons[lesson.id], first = !(rec && rec.done);
    var prevBest = rec ? rec.best || 0 : 0;
    s.lessons[lesson.id] = { done: true, best: Math.max(prevBest, accuracy), at: U.isoNow() };
    var skill = lesson.shield ? 'defense' : lesson.skill;
    if (first) game.gainStat(skill, Math.round(2 + 6 * accuracy));
    else if (accuracy > prevBest) game.gainStat(skill, 1);
    if (lesson.shield && lesson.skill && lesson.skill !== 'defense' && first) game.gainStat(lesson.skill, 2);
    var newCards = [];
    (lesson.vault || []).forEach(function (v) { if (s.vault.indexOf(v.id) < 0) { s.vault.push(v.id); newCards.push(v); } });
    questEvent('lesson.done', 1);
    if (accuracy >= 1) questEvent('perfect', 1);
    game.markActive();
    game.checkAchievements();
    E.emit('lesson.done', { lesson: lesson, accuracy: accuracy, first: first });
    save();
    return { first: first, newCards: newCards };
  };

  game.completeProject = function (world) {
    var s = S(), p = world.project, first = !(s.projects[p.id] && s.projects[p.id].done);
    s.projects[p.id] = { done: true, step: 0 };
    if (first) {
      game.gainStat('defense', 2);
      var sk = (world.lessons || []).map(function (l) { return l.skill; }).filter(function (k) { return k && k !== 'defense'; })[0];
      if (sk) game.gainStat(sk, 2);
    }
    questEvent('project.done', 1);
    game.markActive();
    game.checkAchievements();
    save();
    return { first: first };
  };

  /** Boss beaten: unlock the next world, rewards, evolution check. */
  game.beatBoss = function (world) {
    var s = S(), b = world.boss, first = !game.bossBeaten(world);
    var formBefore = CH.curlo.form();
    s.bosses[b.id] = { beaten: true, at: U.isoNow() };
    var res = { first: first, unlocked: null };
    if (first) {
      var ws = game.worlds(), next = ws[world._i + 1];
      if (next && s.worldsUnlocked.indexOf(next.id) < 0) { s.worldsUnlocked.push(next.id); res.unlocked = next; }
      var r = b.reward || {};
      if (r.xp) game.addXP(r.xp, 'boss');
      if (r.cosmetic) game.grantCosmetic(r.cosmetic, true);
      if (r.bug) game.defeatBug(r.bug);
      game.gainStat('defense', 3);
    }
    var formAfter = CH.curlo.form();
    if (formAfter > formBefore) game.queue.push({ type: 'evolve', from: formBefore, to: formAfter });
    questEvent('boss.beaten', 1);
    game.markActive();
    game.checkAchievements();
    save();
    return res;
  };

  /** Placement: unlock worlds up to and including `world` (+ the one after it). */
  game.placementUnlock = function (worldsPassed) {
    var s = S(), ws = game.worlds().filter(function (w) { return w.id !== 'wdev'; }), last = -1;
    worldsPassed.forEach(function (w) { last = Math.max(last, ws.indexOf(w)); });
    for (var i = 0; i <= last + 1 && i < ws.length; i++) {
      if (s.worldsUnlocked.indexOf(ws[i].id) < 0) s.worldsUnlocked.push(ws[i].id);
    }
    s.profile.placementDone = true;
    save();
    return ws[Math.min(last + 1, ws.length - 1)];
  };

  /* ======================================================================
     Time tracking (active & visible only) + daily goal
     ====================================================================== */
  var lastInput = Date.now();
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });
  game.startClock = function () {
    setInterval(function () {
      if (document.visibilityState !== 'visible' || Date.now() - lastInput > 90000) return;
      var s = S();
      if (!s.profile.onboarded) return;
      s.counters.secondsPlayed += 5;
      game.ensureDaily();
      var d = s.daily, goal = s.profile.dailyGoalMin || 10;
      var before = d.minutes;
      d.minutes = Math.round((d.minutes + 5 / 60) * 1000) / 1000;
      if (Math.floor(d.minutes) > Math.floor(before)) questEvent('minutes', 1);
      if (before < goal && d.minutes >= goal) {
        CH.audio.play('streak');
        CH.fx.toast('Daily goal reached: ' + goal + ' minutes! Great work!', { icon: CH.ui.icon('target') });
      }
      E.emit('clock');
      save();
      game.regenHearts();
    }, 5000);
  };
})();
