/**
 * The game rules, wired together (TypeScript port of legacy engine/progress.js
 * plus the scoring rules from session.js / project.js). No React, no DOM.
 *
 *   const store = createStore(); store.load();
 *   const game = createGame({ content, store });
 *   game.boot();                               // streak, quests, achievements
 *   const r = game.answer(ch, { correct, assisted, hints, retry }, { mode: 'lesson' });
 *   game.finishLesson(lesson, firstTryResults);
 *   game.drainCelebrations();                  // level-ups, achievements, bugs... for the UI
 *
 * Every mutation goes to store.state and calls store.save() (debounced).
 * UI feedback that the legacy engine showed directly (toasts) is emitted as
 * events instead: game.events.on('toast', ...).
 */
import type {
  Achievement,
  Bug,
  Challenge,
  Content,
  Cosmetic,
  Lesson,
  Quest,
  Skill,
  World,
} from '../content/schema';
import { testAchievement } from './achievements';
import {
  BASE_XP,
  DEFENSIVE_TYPES,
  HINT_COST,
  LESSON_BONUS_XP,
  LEVEL_COSMETICS,
  PERFECT_LESSON_BONUS_XP,
  PROJECT_BONUS_XP,
  RETRY_XP,
  STRESS_XP,
  TIMED_TYPES,
  shieldTier,
  type SessionMode,
} from './config';
import { buildIndex, type ContentIndex } from './contentIndex';
import { allCosmetics, cosmeticTest } from './cosmetics';
import { Emitter } from './events';
import { costsHeart } from './hearts';
import { applyXp, comboMultiplier, levelInfo } from './progress';
import { DEFAULT_QUESTS, ensureDaily, questEvent, questXp } from './quests';
import type { SaveV1 } from './save';
import { srsDue, srsRecord } from './srs';
import type { Store } from './store';
import { checkStreak, markActive, type StreakNote } from './streak';
import { clamp, shuffle, type Rng } from './util';

export const SKILLS: readonly Skill[] = ['logic', 'structure', 'memory', 'toolkit', 'defense'];

/** Big moments the UI shows one after another (overlays). */
export type Celebration =
  | { type: 'levelup'; level: number }
  | { type: 'achievement'; def: Achievement }
  | { type: 'cosmetic'; def: Cosmetic }
  | { type: 'bug'; def: Bug }
  | { type: 'tier'; tier: 1 | 2 | 3 }
  | { type: 'evolve'; from: CurloForm; to: CurloForm };

/** Curlo's evolution: 1 Sprout; 2 Trailblazer after World 4's boss; 3 Champion after World 8's. */
export type CurloForm = 1 | 2 | 3;

export interface GameEvents {
  xp: { delta: number; xp: number; why: string };
  levelup: { level: number };
  streak: { days: number };
  quests: undefined;
  achievement: Achievement;
  cosmetic: Cosmetic;
  bug: Bug;
  stats: { skill: Skill };
  combo: { combo: number };
  equip: { slot: Cosmetic['slot']; id: string | null };
  'lesson.done': { lesson: Lesson; accuracy: number; first: boolean };
  /** Short messages the legacy engine showed as toasts. icon = legacy icon key. */
  toast: { msg: string; icon: 'quest' | 'freeze' | 'gift' | 'target' | 'flame' };
}

export type MapNode =
  | { kind: 'lesson'; id: string; world: World; lesson: Lesson; i: number; done: boolean; open: boolean }
  | { kind: 'project'; id: string; world: World; done: boolean; open: boolean }
  | { kind: 'boss'; id: string; world: World; done: boolean; open: boolean };

/** What the challenge UI reports after the learner answers. */
export interface AnswerResult {
  correct: boolean;
  /** tier-3 hint (the answer) was shown: counts as not earned */
  assisted?: boolean;
  /** number of hint tiers opened */
  hints?: number;
  /** second try after a miss */
  retry?: boolean;
  /** timed rounds report a score; they earn 1.5× base XP */
  score?: number;
}

export interface AnswerContext {
  mode: SessionMode;
  /** override base XP (e.g. stress attacks use STRESS_XP) */
  base?: number;
}

export interface AnswerOutcome {
  xp: number;
  /** a boss fight heart was lost (the fight keeps its own count) */
  heartLost: boolean;
  combo: number;
  multiplier: number;
}

export interface GameOptions {
  content: Content;
  store: Pick<Store, 'state' | 'save'>;
  /** Clock (ms). Defaults to Date.now. */
  now?: () => number;
  /** Randomness for review sets / interleaving (quests use a date seed). */
  rng?: Rng;
}

export type Game = ReturnType<typeof createGame>;

export function createGame(opts: GameOptions) {
  const { store } = opts;
  const now = opts.now ?? Date.now;
  const rng = opts.rng ?? Math.random;
  const S = (): SaveV1 => store.state;
  const save = () => store.save();
  const today = () => new Date(now());
  const iso = () => new Date(now()).toISOString();

  let content = opts.content;
  let index: ContentIndex = buildIndex(content);
  const events = new Emitter<GameEvents>();
  const queue: Celebration[] = [];
  const pendingNotes: StreakNote[] = [];
  let combo = 0;

  /* ================= content ================= */
  const questDefs = (): readonly Quest[] => (content.quests.length ? content.quests : DEFAULT_QUESTS);
  const cosmeticDefs = () => allCosmetics(content.cosmetics);
  const cosmeticDef = (id: string) => cosmeticDefs().find((c) => c.id === id);
  const bugDef = (id: string): Bug =>
    content.bestiary.find((b) => b.id === id) ?? {
      id,
      name: id,
      world: 'w1',
      art: 'bug',
      color: '#F2641B',
      how: '',
      prevent: '',
    };

  /* ================= gating ================= */
  const worldUnlocked = (w: World) => S().worldsUnlocked.includes(w.id);
  const lessonDone = (l: Lesson) => !!S().lessons[l.id]?.done;
  const lessonUnlocked = (w: World, i: number) =>
    worldUnlocked(w) && (i === 0 || lessonDone(w.lessons[i - 1]!));
  const allLessonsDone = (w: World) => w.lessons.every(lessonDone);
  const projectDone = (w: World) => !!S().projects[w.project.id]?.done;
  const projectUnlocked = (w: World) => worldUnlocked(w) && allLessonsDone(w);
  const bossBeaten = (w: World) => !!S().bosses[w.boss.id]?.beaten;
  const bossUnlocked = (w: World) => projectUnlocked(w) && projectDone(w);
  const lessonsDone = () => Object.keys(S().lessons).filter((k) => S().lessons[k]?.done);

  /** Ordered map nodes for a world: lessons, project, boss. */
  const nodes = (w: World): MapNode[] => [
    ...w.lessons.map((l, i): MapNode => ({
      kind: 'lesson',
      id: l.id,
      world: w,
      lesson: l,
      i,
      done: lessonDone(l),
      open: lessonUnlocked(w, i),
    })),
    { kind: 'project', id: w.project.id, world: w, done: projectDone(w), open: projectUnlocked(w) },
    { kind: 'boss', id: w.boss.id, world: w, done: bossBeaten(w), open: bossUnlocked(w) },
  ];

  /** "You are here": the first open, not-done node of the latest unlocked world that has one. */
  const currentNode = (): MapNode | null => {
    const ws = index.worlds.filter(worldUnlocked);
    for (let i = ws.length - 1; i >= 0; i--) {
      const n = nodes(ws[i]!).find((x) => x.open && !x.done);
      if (n) return n;
    }
    return null;
  };

  /* ================= XP / levels / combo ================= */
  function addXP(n: number, why: string): number {
    const s = S();
    const r = applyXp(s.xp, s.level, n);
    s.xp = r.xp;
    s.level = r.level;
    if (r.delta > 0) quest('xp', r.delta);
    events.emit('xp', { delta: r.delta, xp: s.xp, why });
    if (r.levelsGained.length) {
      for (const L of r.levelsGained) {
        queue.push({ type: 'levelup', level: L });
        const cos = LEVEL_COSMETICS[L];
        if (cos) grantCosmetic(cos, true);
      }
      events.emit('levelup', { level: s.level });
      checkAchievements();
    }
    save();
    return r.delta;
  }

  /* ================= quests ================= */
  function quest(evt: string, value?: number): void {
    const res = questEvent(S(), questDefs(), evt, value, today());
    if (!res.changed) return;
    for (const q of res.completed) {
      events.emit('toast', { msg: `Quest complete: ${q.text} (+${questXp(q)} XP)`, icon: 'quest' });
      addXP(questXp(q), 'quest');
    }
    if (res.freezeEarned)
      events.emit('toast', { msg: 'All daily quests done! +1 streak freeze', icon: 'freeze' });
    events.emit('quests', undefined);
    save();
  }

  /* ================= streak ================= */
  function checkStreakOnBoot(): void {
    const note = checkStreak(S().streak, today());
    if (note) {
      pendingNotes.push(note);
      save();
    }
  }
  function markActiveToday(): boolean {
    const r = markActive(S().streak, today());
    if (!r.changed) return false;
    if (r.freezeEarned) events.emit('toast', { msg: 'Streak milestone! +1 streak freeze', icon: 'freeze' });
    events.emit('streak', { days: S().streak.days });
    checkAchievements();
    save();
    return true;
  }

  /* ================= achievements + cosmetics ================= */
  function checkAchievements(): void {
    const s = S();
    let any = false;
    for (const def of content.achievements) {
      if (s.achievements[def.id] || !testAchievement(s, def.test)) continue;
      s.achievements[def.id] = iso();
      queue.push({ type: 'achievement', def });
      if (def.cosmetic) grantCosmetic(def.cosmetic, true);
      events.emit('achievement', def);
      any = true;
    }
    // Cosmetics earned through play (their `source` / `test` rule).
    for (const c of cosmeticDefs()) {
      if (s.cosmetics.owned.includes(c.id)) continue;
      const t = cosmeticTest(c);
      if (t === 'start') {
        s.cosmetics.owned.push(c.id);
        any = true;
      } else if (t && testAchievement(s, t)) {
        grantCosmetic(c.id, true);
        any = true;
      }
    }
    if (any) save();
  }

  /** Give a cosmetic. quiet → queued as a celebration; otherwise a toast. */
  function grantCosmetic(id: string, quiet = false): boolean {
    const owned = S().cosmetics.owned;
    if (!id || owned.includes(id)) return false;
    owned.push(id);
    const def = cosmeticDef(id) ?? { id, slot: 'hat' as const, name: id, source: '' };
    if (quiet) queue.push({ type: 'cosmetic', def });
    else events.emit('toast', { msg: `New cosmetic: ${def.name}!`, icon: 'gift' });
    events.emit('cosmetic', def);
    save();
    return true;
  }

  function equip(slot: Cosmetic['slot'], id: string | null): void {
    const eq = S().cosmetics.equipped;
    if (slot === 'color') {
      eq.color = id ?? 'classic';
      S().profile.variant = id ?? 'classic';
    } else eq[slot] = id;
    save();
    events.emit('equip', { slot, id });
  }

  /* ================= stats + Curlo ================= */
  function gainStat(skill: Skill, amt: number): void {
    const k: Skill = SKILLS.includes(skill) ? skill : 'structure';
    const st = S().stats;
    const before = st[k];
    st[k] = clamp(Math.round((st[k] + amt) * 10) / 10, 0, 100);
    if (k === 'defense' && shieldTier(before) !== shieldTier(st[k]))
      queue.push({ type: 'tier', tier: shieldTier(st[k]) });
    events.emit('stats', { skill: k });
    save();
  }

  const beatWorldNum = (n: number) =>
    Object.entries(S().bosses).some(([id, b]) => {
      const m = /^w(\d+)\.boss$/.exec(id);
      return !!m && Number(m[1]) >= n && !!b?.beaten;
    });
  const curloForm = (): CurloForm => (beatWorldNum(8) ? 3 : beatWorldNum(4) ? 2 : 1);

  /* ================= bestiary ================= */
  function defeatBug(id: string): boolean {
    const s = S();
    if (!id || s.bestiary.includes(id)) return false;
    s.bestiary.push(id);
    const def = bugDef(id);
    queue.push({ type: 'bug', def });
    quest('bug', 1);
    events.emit('bug', def);
    checkAchievements();
    save();
    return true;
  }

  /* ================= answers ================= */
  /**
   * Bookkeeping for one first-try answer: counters, tags, SRS, combo, quests,
   * Defense stat, bestiary progress (a bug is defeated after min(2, #refs)
   * correct answers on challenges that reference it).
   * mode 'placement' records nothing.
   */
  function recordAnswer(
    ch: Challenge,
    correct: boolean,
    mode: SessionMode,
    assisted = false,
    hintsUsed = 0,
  ): void {
    const s = S();
    const c = s.counters;
    if (mode === 'placement') return;
    if (correct) c.correct++;
    else c.wrong++;
    for (const t of ch.tags) {
      const b = (c.byTag[t] ??= { r: 0, w: 0 });
      if (correct) b.r++;
      else b.w++;
    }
    srsRecord(s.srs, ch.id, correct, now());
    if (correct && !assisted) {
      combo++;
      if (combo > c.bestCombo) c.bestCombo = combo;
      quest('correct', 1);
      quest('combo', combo);
      if (!hintsUsed) quest('hint.none', 1);
      if (mode === 'boss') quest('boss.round', 1);
      if ((DEFENSIVE_TYPES as readonly string[]).includes(ch.type)) {
        c.hardened++;
        quest('harden', 1);
        if (mode !== 'practice' && mode !== 'review') gainStat('defense', 0.5);
      }
      if (ch.bug) {
        const b2 = (c.byTag['bug:' + ch.bug] ??= { r: 0, w: 0 });
        b2.r++;
        const need = Math.min(2, index.bugRefs[ch.bug] ?? 1);
        if (b2.r >= need) defeatBug(ch.bug);
      }
    } else if (!correct) {
      combo = 0;
    }
    if (mode === 'review' && correct) {
      c.reviews++;
      quest('review', 1);
    }
    events.emit('combo', { combo });
    checkAchievements();
    save();
  }

  /**
   * Score an answer the way a session does (legacy Session.challenge):
   *  - retry (second try): +2 XP when right; no hearts, no combo change
   *  - first try right (not assisted): base XP × combo multiplier
   *    (base by mode, ×1.5 for timed rounds that report a score)
   *  - first try wrong in a boss fight: heartLost (the fight counts hearts)
   */
  function answer(ch: Challenge, res: AnswerResult, ctx: AnswerContext): AnswerOutcome {
    if (res.retry) {
      const xp = res.correct ? addXP(RETRY_XP, 'retry') : 0;
      return { xp, heartLost: false, combo, multiplier: comboMultiplier(combo) };
    }
    recordAnswer(ch, res.correct, ctx.mode, !!res.assisted, res.hints ?? 0);
    let xp = 0;
    let heartLost = false;
    if (res.correct && !res.assisted) {
      let base: number = ctx.base ?? BASE_XP[ctx.mode] ?? 10;
      if (res.score != null) base = Math.round(base * 1.5);
      const gain = Math.round(base * comboMultiplier(combo));
      if (gain > 0) xp = addXP(gain, 'correct');
    } else if (costsHeart({ mode: ctx.mode, correct: res.correct, retry: false })) {
      heartLost = true;
    }
    return { xp, heartLost, combo, multiplier: comboMultiplier(combo) };
  }

  /** Opening hint tier 1..3 costs XP (2 / 3 / 5). Returns the (negative) applied delta. */
  const useHint = (tier: 1 | 2 | 3): number => addXP(-(HINT_COST[tier - 1] ?? 0), 'hint');

  /* ================= review / SRS ================= */
  const srsDueIds = () => srsDue(S().srs, now(), (id) => !!index.challenge[id]);

  /** Challenge ids the player has "met" (completed lessons/projects/bosses, or in SRS). */
  function seenChallengeIds(): string[] {
    const s = S();
    return Object.keys(index.challenge).filter((id) => {
      const m = index.challenge[id]!;
      if (m.kind === 'lesson' && m.lesson && lessonDone(m.lesson)) return true;
      if ((m.kind === 'project' || m.kind === 'stress') && projectDone(m.world)) return true;
      if ((m.kind === 'boss' || m.kind === 'defense') && bossBeaten(m.world)) return true;
      return !!s.srs[id];
    });
  }

  const isTimed = (ch: Challenge) => (TIMED_TYPES as readonly string[]).includes(ch.type);

  /** A review set: due SRS items first, then seen challenges, most-missed first. */
  function reviewSet(n = 5, excludeTimed = false): Challenge[] {
    const ok = (id: string) => !!index.challenge[id] && (!excludeTimed || !isTimed(index.challenge[id].ch));
    let out = srsDueIds().filter(ok).slice(0, n);
    if (out.length < n) {
      const srs = S().srs;
      const seen = shuffle(
        seenChallengeIds().filter((id) => ok(id) && !out.includes(id)),
        rng,
      ).sort((a, b) => (srs[b]?.wrong ?? 0) - (srs[a]?.wrong ?? 0));
      out = out.concat(seen.slice(0, n - out.length));
    }
    return out.map((id) => index.challenge[id]!.ch);
  }

  /* ================= completion ================= */
  function completeLesson(lesson: Lesson, accuracy: number): { first: boolean; newCards: Lesson['vault'] } {
    const s = S();
    const rec = s.lessons[lesson.id];
    const first = !rec?.done;
    const prevBest = rec?.best ?? 0;
    s.lessons[lesson.id] = { done: true, best: Math.max(prevBest, accuracy), at: iso() };
    const skill: Skill = lesson.shield ? 'defense' : lesson.skill;
    if (first) gainStat(skill, Math.round(2 + 6 * accuracy));
    else if (accuracy > prevBest) gainStat(skill, 1);
    if (lesson.shield && lesson.skill !== 'defense' && first) gainStat(lesson.skill, 2);
    const newCards = lesson.vault.filter((v) => !s.vault.includes(v.id));
    newCards.forEach((v) => s.vault.push(v.id));
    quest('lesson.done', 1);
    if (accuracy >= 1) quest('perfect', 1);
    markActiveToday();
    checkAchievements();
    events.emit('lesson.done', { lesson, accuracy, first });
    save();
    return { first, newCards };
  }

  /**
   * End of a lesson (legacy playLesson.finish): +10 XP, +10 more when every
   * challenge was right on the first try, then completeLesson.
   * firstTry: challenge id → right on the first try without the answer hint.
   */
  function finishLesson(lesson: Lesson, firstTry: Record<string, boolean>) {
    const ids = Object.keys(firstTry);
    const right = ids.filter((k) => firstTry[k]).length;
    const accuracy = ids.length ? right / ids.length : 1;
    const bonus = addXP(LESSON_BONUS_XP + (accuracy >= 1 ? PERFECT_LESSON_BONUS_XP : 0), 'lesson');
    return { bonus, accuracy, ...completeLesson(lesson, accuracy) };
  }

  function completeProject(world: World): { first: boolean; bonus: number } {
    const s = S();
    const p = world.project;
    const first = !s.projects[p.id]?.done;
    const bonus = addXP(PROJECT_BONUS_XP, 'project');
    s.projects[p.id] = { done: true, step: 0 };
    if (first) {
      gainStat('defense', 2);
      const sk = world.lessons.map((l) => l.skill).find((k) => k !== 'defense');
      if (sk) gainStat(sk, 2);
    }
    quest('project.done', 1);
    markActiveToday();
    checkAchievements();
    save();
    return { first, bonus };
  }

  /** Boss beaten: unlock the next world, rewards (first time), evolution check. */
  function beatBoss(world: World): { first: boolean; unlocked: World | null } {
    const s = S();
    const b = world.boss;
    const first = !bossBeaten(world);
    const formBefore = curloForm();
    s.bosses[b.id] = { beaten: true, at: iso() };
    let unlocked: World | null = null;
    if (first) {
      const i = index.worlds.indexOf(world);
      const next = index.worlds[i + 1];
      if (next && !s.worldsUnlocked.includes(next.id)) {
        s.worldsUnlocked.push(next.id);
        unlocked = next;
      }
      if (b.reward.xp) addXP(b.reward.xp, 'boss');
      if (b.reward.cosmetic) grantCosmetic(b.reward.cosmetic, true);
      if (b.reward.bug) defeatBug(b.reward.bug);
      gainStat('defense', 3);
    }
    const formAfter = curloForm();
    if (formAfter > formBefore) queue.push({ type: 'evolve', from: formBefore, to: formAfter });
    quest('boss.beaten', 1);
    markActiveToday();
    checkAchievements();
    save();
    return { first, unlocked };
  }

  /** Placement quiz: unlock every world up to the last one passed, plus the next. Returns where to start. */
  function placementUnlock(passed: readonly World[]): World | undefined {
    const s = S();
    const ws = index.worlds;
    const last = Math.max(-1, ...passed.map((w) => ws.indexOf(w)));
    for (let i = 0; i <= last + 1 && i < ws.length; i++) {
      if (!s.worldsUnlocked.includes(ws[i]!.id)) s.worldsUnlocked.push(ws[i]!.id);
    }
    s.profile.placementDone = true;
    save();
    return ws[Math.min(last + 1, ws.length - 1)];
  }

  /** A practice/review round finished: practice quest, active day. */
  function finishPractice(): void {
    quest('practice.done', 1);
    markActiveToday();
  }

  /**
   * Time tracking: call every few seconds while the app is visible and the
   * learner was active recently (legacy: every 5 s, idle after 90 s).
   */
  function tick(seconds: number): void {
    const s = S();
    if (!s.profile.onboarded) return;
    s.counters.secondsPlayed += seconds;
    ensureDaily(s, questDefs(), today());
    const d = s.daily;
    const goal = s.profile.dailyGoalMin || 10;
    const before = d.minutes;
    // Counted in whole seconds: legacy rounded minutes to 3 decimals every tick,
    // which drifted (10 real minutes read as 9.96 and the goal came late).
    d.minutes = (Math.round(d.minutes * 60) + seconds) / 60;
    if (Math.floor(d.minutes) > Math.floor(before)) quest('minutes', 1);
    if (before < goal && d.minutes >= goal) {
      events.emit('toast', { msg: `Daily goal reached: ${goal} minutes! Great work!`, icon: 'target' });
    }
    save();
  }

  /** Run once after loading the save (legacy main.js boot order). */
  function boot(): void {
    if (ensureDaily(S(), questDefs(), today())) save();
    checkStreakOnBoot();
    checkAchievements();
    // Cosmetics granted silently on boot don't need a celebration.
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i]!.type === 'cosmetic') queue.splice(i, 1);
  }

  return {
    events,
    get index() {
      return index;
    },
    /** Swap content (dev hot reload). */
    setContent(next: Content) {
      content = next;
      index = buildIndex(next);
    },
    get combo() {
      return combo;
    },
    resetCombo() {
      combo = 0;
    },
    multiplier: () => comboMultiplier(combo),
    levelInfo: () => levelInfo(S().xp),
    /** Pending big celebrations, oldest first; empties the queue. */
    drainCelebrations(): Celebration[] {
      return queue.splice(0, queue.length);
    },
    /** Streak notes from boot (freeze used / streak reset); empties the list. */
    drainNotes(): StreakNote[] {
      return pendingNotes.splice(0, pendingNotes.length);
    },
    boot,
    tick,
    // gating
    worlds: () => index.worlds,
    worldUnlocked,
    lessonDone,
    lessonUnlocked,
    allLessonsDone,
    projectDone,
    projectUnlocked,
    bossBeaten,
    bossUnlocked,
    worldComplete: bossBeaten,
    lessonsDone,
    nodes,
    currentNode,
    // xp, streak, quests
    addXP,
    markActive: markActiveToday,
    questDefs,
    questDef: (id: string) => questDefs().find((q) => q.id === id),
    questEvent: quest,
    // achievements, cosmetics, stats, bestiary
    checkAchievements,
    cosmeticDefs,
    cosmeticDef,
    grantCosmetic,
    equip,
    gainStat,
    curloForm,
    shieldTier: () => shieldTier(S().stats.defense),
    bugDef,
    defeatBug,
    // answers + sessions
    recordAnswer,
    answer,
    useHint,
    finishLesson,
    completeLesson,
    completeProject,
    beatBoss,
    placementUnlock,
    finishPractice,
    // review
    srsDue: srsDueIds,
    seenChallengeIds,
    reviewSet,
    /** Base XP for stress-test attacks in projects (use as AnswerContext.base). */
    STRESS_XP,
  };
}
