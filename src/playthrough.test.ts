/**
 * Full playthrough of the REAL content with the pure engine (no browser):
 *  1. every challenge's correct answer (built from the content) passes the
 *     same check the UI uses, and clearly wrong answers fail it;
 *  2. a new player finishes every world lesson by lesson, then the project,
 *     then the boss, the way the screens call the engine, until World 16;
 *  3. cross references (review tags, bugs, cosmetics, achievements) exist and
 *     every achievement / bug / cosmetic can actually be earned.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../scripts/lib/content-fs';
import type { Challenge, Content, World } from './content/schema';
import { answerRound, bossStages, drawRound, nextStage, stageCleared, startStage } from './engine/boss';
import { testAchievement } from './engine/achievements';
import { STARTER_COLORS } from './engine/config';
import { cosmeticTest } from './engine/cosmetics';
import { createGame, type Game } from './engine/game';
import { matchesAnswer } from './engine/matching';
import { defaultSave, type SaveV1 } from './engine/save';
import { seeded } from './engine/util';
import {
  checkBug,
  checkChoice,
  checkEdge,
  checkOrder,
  checkReview,
  safeItemRight,
  speedItemRight,
  timedPass,
} from './features/challenges/check';

let content: Content;
beforeAll(() => {
  const r = loadContentFromDisk();
  if (!r.content) throw new Error('content invalid: ' + JSON.stringify(r.issues.slice(0, 3)));
  content = r.content;
});

/* ------------------------------------------------------------------ */
/* Answers, as the UI would report them                                */
/* ------------------------------------------------------------------ */

type Answer =
  | { k: 'choice'; i: number }
  | { k: 'bug'; line: number; fix: number }
  | { k: 'multi'; picked: number[] }
  | { k: 'text'; v: string }
  | { k: 'order'; program: string[] }
  | { k: 'timed'; picks: number[] };

/** The UI's verdict for an answer (same check functions the renderers call). */
function accepted(ch: Challenge, a: Answer): boolean {
  switch (ch.type) {
    case 'mcq':
    case 'predict':
    case 'breakit':
    case 'harden':
      return a.k === 'choice' && checkChoice(ch, a.i);
    case 'bug':
      return a.k === 'bug' && checkBug(ch, a.line, a.fix);
    case 'edge':
      return a.k === 'multi' && checkEdge(ch, a.picked);
    case 'review':
      return a.k === 'multi' && checkReview(ch, a.picked);
    case 'fill':
    case 'write':
      // the Check button is disabled for blank input
      return a.k === 'text' && !!a.v.trim() && matchesAnswer(a.v, ch);
    case 'order':
      return a.k === 'order' && checkOrder(ch, a.program).correct;
    case 'safe': {
      if (a.k !== 'timed') return false;
      const right = ch.items.filter((it, i) => safeItemRight(it, a.picks[i] ?? -1)).length;
      return timedPass(right, ch.items.length);
    }
    case 'speed': {
      if (a.k !== 'timed') return false;
      const right = ch.items.filter((it, i) => speedItemRight(it, a.picks[i] ?? -1)).length;
      return timedPass(right, ch.items.length);
    }
  }
}

/** Timed rounds report a score (fraction right). */
function score(ch: Challenge, a: Answer): number | undefined {
  if (a.k !== 'timed' || (ch.type !== 'safe' && ch.type !== 'speed')) return undefined;
  const right =
    ch.type === 'safe'
      ? ch.items.filter((it, i) => safeItemRight(it, a.picks[i] ?? -1)).length
      : ch.items.filter((it, i) => speedItemRight(it, a.picks[i] ?? -1)).length;
  return right / ch.items.length;
}

/** Every correct answer the content defines (fill/write: each accepted string). */
function correctAnswers(ch: Challenge): Answer[] {
  switch (ch.type) {
    case 'mcq':
    case 'predict':
    case 'breakit':
    case 'harden':
      return [{ k: 'choice', i: ch.answer }];
    case 'bug':
      return [{ k: 'bug', line: ch.bugLine, fix: ch.answer }];
    case 'edge':
      return [{ k: 'multi', picked: ch.answers.slice().reverse() }];
    case 'review':
      return [{ k: 'multi', picked: ch.dangerous.slice().reverse() }];
    case 'fill':
      return ch.accept.map((v) => ({ k: 'text', v }));
    case 'write':
      return ch.accept.map((v) => ({ k: 'text', v }));
    case 'order':
      return [{ k: 'order', program: ch.lines.slice() }];
    case 'safe':
      return [{ k: 'timed', picks: ch.items.map((it) => (it.safe ? 1 : 0)) }];
    case 'speed':
      return [{ k: 'timed', picks: ch.items.map((it) => it.answer) }];
  }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const lineCount = (code: string) => code.split('\n').length;

/** Clearly wrong answers (each must be rejected). */
function wrongAnswers(ch: Challenge): { what: string; a: Answer }[] {
  const out: { what: string; a: Answer }[] = [];
  switch (ch.type) {
    case 'mcq':
    case 'predict':
    case 'breakit':
    case 'harden':
      range(ch.options.length)
        .filter((i) => i !== ch.answer)
        .forEach((i) => out.push({ what: `option ${i}`, a: { k: 'choice', i } }));
      break;
    case 'bug': {
      const other = range(lineCount(ch.code)).find((i) => i !== ch.bugLine);
      if (other != null) out.push({ what: `line ${other}`, a: { k: 'bug', line: other, fix: ch.answer } });
      range(ch.options.length)
        .filter((i) => i !== ch.answer)
        .forEach((i) => out.push({ what: `fix ${i}`, a: { k: 'bug', line: ch.bugLine, fix: i } }));
      break;
    }
    case 'edge': {
      out.push({ what: 'one pick missing', a: { k: 'multi', picked: ch.answers.slice(1) } });
      const extra = range(ch.options.length).find((i) => !ch.answers.includes(i));
      if (extra != null)
        out.push({ what: 'one extra pick', a: { k: 'multi', picked: [...ch.answers, extra] } });
      break;
    }
    case 'review': {
      out.push({ what: 'nothing flagged', a: { k: 'multi', picked: [] } });
      out.push({ what: 'one line missing', a: { k: 'multi', picked: ch.dangerous.slice(1) } });
      const all = range(lineCount(ch.code));
      if (all.length > ch.dangerous.length)
        out.push({ what: 'every line flagged', a: { k: 'multi', picked: all } });
      break;
    }
    case 'fill':
    case 'write': {
      for (const v of ['', 'xyzzy', ';', '0', '___'])
        out.push({ what: JSON.stringify(v), a: { k: 'text', v } });
      const first = ch.accept[0];
      if (first) out.push({ what: 'answer + junk', a: { k: 'text', v: `${first} xyzzy` } });
      if (first) out.push({ what: 'junk + answer', a: { k: 'text', v: `xyzzy ${first}` } });
      break;
    }
    case 'order': {
      const want = ch.lines.map((l) => l.trim()).join('\n');
      const perms = [
        ch.lines.slice().reverse(),
        ...range(ch.lines.length - 1).map((r) => rotate(ch.lines, r + 1)),
      ];
      const wrong = perms.find((p) => p.map((l) => l.trim()).join('\n') !== want);
      if (wrong) out.push({ what: 'shuffled', a: { k: 'order', program: wrong } });
      out.push({ what: 'last line missing', a: { k: 'order', program: ch.lines.slice(0, -1) } });
      for (const d of ch.distractors ?? [])
        out.push({
          what: `with distractor ${JSON.stringify(d)}`,
          a: { k: 'order', program: [...ch.lines, d] },
        });
      break;
    }
    case 'safe':
      out.push({ what: 'all flipped', a: { k: 'timed', picks: ch.items.map((it) => (it.safe ? 0 : 1)) } });
      out.push({ what: 'no answers (time out)', a: { k: 'timed', picks: [] } });
      break;
    case 'speed':
      out.push({
        what: 'all wrong',
        a: { k: 'timed', picks: ch.items.map((it) => (it.answer + 1) % it.options.length) },
      });
      out.push({ what: 'no answers (time out)', a: { k: 'timed', picks: [] } });
      break;
  }
  return out;
}

const rotate = <T>(xs: readonly T[], r: number): T[] => [...xs.slice(r), ...xs.slice(0, r)];

/** Every challenge with where it lives. */
function allChallenges(c: Content): { where: string; ch: Challenge }[] {
  const out: { where: string; ch: Challenge }[] = [];
  for (const w of c.worlds) {
    for (const l of w.lessons) l.challenges.forEach((ch) => out.push({ where: l.id, ch }));
    w.project.steps.forEach((ch) => out.push({ where: w.project.id, ch }));
    w.project.stress.attacks.forEach((a) => out.push({ where: w.project.id + ' stress', ch: a.challenge }));
    w.boss.rounds.forEach((ch) => out.push({ where: w.boss.id, ch }));
    w.boss.defense.forEach((d) => out.push({ where: w.boss.id + ' defense', ch: d.challenge }));
  }
  return out;
}

/** Content problems a learner would trip over even though the check is "right". */
function ambiguities(ch: Challenge): string[] {
  const out: string[] = [];
  // predict options are exact outputs: a trailing newline is a real difference
  const norm = (t: string) => (ch.type === 'predict' ? t : t.trim());
  const dupOf = (texts: readonly string[], right: readonly number[]) =>
    range(texts.length).filter(
      (i) => !right.includes(i) && right.some((r) => norm(texts[r]!) === norm(texts[i]!)),
    );
  if ('options' in ch) {
    const texts = ch.options.map((o) => o.t);
    const right = ch.type === 'edge' ? ch.answers : [ch.answer];
    for (const i of dupOf(texts, right)) out.push(`wrong option ${i} has the same text as a right one`);
  }
  if (ch.type === 'edge' && ch.answers.length === ch.options.length) out.push('every option is an answer');
  if (ch.type === 'speed')
    ch.items.forEach((it, k) => {
      for (const i of dupOf(it.options, [it.answer])) out.push(`item ${k}: wrong option ${i} = the answer`);
    });
  if (ch.type === 'write' && !ch.accept.length)
    out.push('write has no accept[0]: the UI shows no model answer');
  if (ch.type === 'order') {
    const lines = new Set(ch.lines.map((l) => l.trim()));
    for (const d of ch.distractors ?? [])
      if (lines.has(d.trim())) out.push(`distractor ${JSON.stringify(d)} is a real line`);
  }
  return out;
}

describe('every challenge', () => {
  it('accepts its correct answer and rejects clearly wrong ones', () => {
    const problems: string[] = [];
    const list = allChallenges(content);
    expect(list.length).toBeGreaterThan(500);
    const types = new Set<string>();
    for (const { where, ch } of list) {
      types.add(ch.type);
      const tag = `${where} ${ch.id} (${ch.type})`;
      for (const a of correctAnswers(ch))
        if (!accepted(ch, a)) problems.push(`${tag}: correct answer rejected: ${JSON.stringify(a)}`);
      for (const { what, a } of wrongAnswers(ch))
        if (accepted(ch, a)) problems.push(`${tag}: wrong answer accepted: ${what}`);
      for (const p of ambiguities(ch)) problems.push(`${tag}: ${p}`);
    }
    expect(problems).toEqual([]);
    expect(types.size).toBe(12);
  });
});

/* ------------------------------------------------------------------ */
/* Playthrough                                                         */
/* ------------------------------------------------------------------ */

const DAY = 24 * 3600 * 1000;

function setup(t0 = Date.parse('2026-03-02T09:00:00')) {
  const clock = { t: t0 };
  const store = { state: defaultSave(new Date(t0)) as SaveV1, save() {} };
  store.state.profile.onboarded = true;
  const game = createGame({ content, store, now: () => clock.t, rng: seeded('playthrough') });
  game.boot();
  return { game, clock, s: () => store.state };
}

interface Watch {
  xp: number;
  level: number;
}

/**
 * Plays one challenge like the ChallengeRunner does. `miss` = the first try is
 * wrong (a real wrong answer from wrongAnswers), then the retry is right when
 * the mode allows a retry.
 */
function play(
  game: Game,
  s: () => SaveV1,
  ch: Challenge,
  mode: 'lesson' | 'project' | 'stress' | 'boss' | 'review' | 'practice',
  miss: boolean,
  watch: Watch,
): { correct: boolean; firstTry: boolean } {
  const engineMode = mode === 'stress' ? 'project' : mode;
  const actx = { mode: engineMode, base: mode === 'stress' ? game.STRESS_XP : undefined } as const;
  const timed = ch.type === 'safe' || ch.type === 'speed';
  const canRetry = !timed && mode !== 'boss';
  const good = correctAnswers(ch)[0]!;
  const bad = wrongAnswers(ch)[0]?.a;
  const check = () => {
    const st = s();
    expect(st.xp).toBeGreaterThanOrEqual(watch.xp);
    expect(st.level).toBeGreaterThanOrEqual(watch.level);
    expect(st.hearts.n).toBeGreaterThanOrEqual(0);
    expect(st.hearts.n).toBeLessThanOrEqual(st.hearts.max);
    watch.xp = st.xp;
    watch.level = st.level;
  };
  let result: { correct: boolean; firstTry: boolean };
  if (miss && bad) {
    expect(accepted(ch, bad)).toBe(false);
    if (canRetry) {
      game.answer(ch, { correct: false }, actx);
      check();
      const ok = accepted(ch, good);
      game.answer(ch, { correct: ok, assisted: true, retry: true }, actx);
      result = { correct: ok, firstTry: false };
    } else {
      game.answer(ch, { correct: false, score: score(ch, bad) }, actx);
      result = { correct: false, firstTry: false };
    }
  } else {
    const ok = accepted(ch, good);
    game.answer(ch, { correct: ok, score: score(ch, good) }, actx);
    result = { correct: ok, firstTry: ok };
  }
  check();
  return result;
}

/**
 * Deterministic misses: every 7th eligible first try, never on bug-carrying
 * challenges (so every bug can still be defeated) and only in the bosses of
 * Worlds 1-2 (later bosses are played perfectly, for the long-combo achievements).
 */
function misser() {
  let n = 0;
  return (ch: Challenge, bossWorld?: number) =>
    !ch.bug && (bossWorld == null || bossWorld <= 2) && ++n % 7 === 0;
}

function expectCurrent(game: Game, id: string | null) {
  expect(game.currentNode()?.id ?? null).toBe(id);
}

describe('full playthrough', { timeout: 120_000 }, () => {
  it('a new player can finish all 16 worlds, and every reward is earnable', () => {
    const { game, clock, s } = setup();
    const worlds = game.worlds();
    expect(worlds.map((w) => w.num)).toEqual(range(16).map((i) => i + 1));
    const watch: Watch = { xp: s().xp, level: s().level };
    const miss = misser();

    // Only World 1 is open at the start; everything else is locked.
    expect(s().worldsUnlocked).toEqual(['w1']);
    for (const w of worlds.slice(1)) expect(game.nodes(w).some((n) => n.open)).toBe(false);

    const reviewRound = () => {
      game.resetCombo();
      for (const ch of game.reviewSet(5)) play(game, s, ch, 'review', false, watch);
      game.finishPractice();
    };

    worlds.forEach((w: World, wi) => {
      expect(game.worldUnlocked(w)).toBe(true);
      // one world per day (keeps a streak going)
      clock.t += DAY;
      game.boot();

      /* lessons, in order */
      w.lessons.forEach((lesson, li) => {
        expectCurrent(game, lesson.id);
        const nodes = game.nodes(w);
        expect(nodes.map((n) => n.open)).toEqual(nodes.map((_, k) => k <= li));
        expect(game.projectUnlocked(w)).toBe(false);
        expect(game.bossUnlocked(w)).toBe(false);

        game.resetCombo();
        const firstTry: Record<string, boolean> = {};
        const queue = [...lesson.challenges];
        const retried: Challenge[] = [];
        for (const ch of queue) {
          const r = play(game, s, ch, 'lesson', miss(ch), watch);
          firstTry[ch.id] = r.firstTry;
          if (!r.correct) retried.push(ch);
        }
        for (const ch of retried) expect(play(game, s, ch, 'lesson', false, watch).correct).toBe(true);
        const vaultBefore = s().vault.length;
        const r = game.finishLesson(lesson, firstTry);
        expect(r.first).toBe(true);
        expect(game.lessonDone(lesson)).toBe(true);
        expect(s().vault.length).toBe(vaultBefore + lesson.vault.length);
        clock.t += 10 * 60 * 1000;
      });

      /* project */
      expect(game.projectUnlocked(w)).toBe(true);
      expect(game.bossUnlocked(w)).toBe(false);
      expectCurrent(game, w.project.id);
      game.resetCombo();
      for (const ch of w.project.steps) play(game, s, ch, 'project', miss(ch), watch);
      for (const a of w.project.stress.attacks)
        play(game, s, a.challenge, 'stress', miss(a.challenge), watch);
      expect(game.completeProject(w).first).toBe(true);
      expect(game.projectDone(w)).toBe(true);

      /* boss: hp hits needed, missed rounds come back; defense until each is blocked */
      expect(game.bossUnlocked(w)).toBe(true);
      expectCurrent(game, w.boss.id);
      game.resetCombo();
      const stages = bossStages(w.boss);
      let run = startStage(stages, 0);
      let guard = 0;
      while (run.hp > 0) {
        expect(++guard).toBeLessThan(200);
        const ni = stageCleared(run) ? nextStage(run, stages) : null;
        if (ni != null) run = startStage(stages, ni);
        const d = drawRound(run, stages);
        const r = play(game, s, d.ch, 'boss', miss(d.ch, w.num), watch);
        run = answerRound(d.run, d.ch, r.correct);
      }
      expect(stageCleared(run) && nextStage(run, stages) == null).toBe(true);
      for (const d of w.boss.defense) {
        let ok = play(game, s, d.challenge, 'boss', miss(d.challenge, w.num), watch).correct;
        while (!ok) ok = play(game, s, d.challenge, 'boss', false, watch).correct;
      }
      const res = game.beatBoss(w);
      expect(res.first).toBe(true);
      expect(game.bossBeaten(w)).toBe(true);
      const next = worlds[wi + 1];
      expect(res.unlocked?.id ?? null).toBe(next?.id ?? null);
      if (next) {
        expect(game.worldUnlocked(next)).toBe(true);
        expectCurrent(game, next.lessons[0]!.id);
      }
      expect(game.nodes(w).every((n) => n.open && n.done)).toBe(true);
      expect(game.curloForm()).toBe(w.num >= 8 ? 3 : w.num >= 4 ? 2 : 1);

      reviewRound();
      game.drainCelebrations();
    });

    // Nothing is locked forever: every node of every world was opened and done.
    expectCurrent(game, null);
    for (const w of worlds) expect(game.nodes(w).every((n) => n.open && n.done)).toBe(true);
    expect(s().worldsUnlocked).toEqual(worlds.map((w) => w.id));

    // Keep playing a review a day for the long-streak achievements.
    const streakGoal = Math.max(
      0,
      ...content.achievements.map((a) => /^streak:(\d+)$/.exec(a.test)?.[1]).map((n) => Number(n ?? 0)),
    );
    for (let d = 0; d < 60 && s().streak.days < streakGoal; d++) {
      clock.t += DAY;
      game.boot();
      reviewRound();
    }
    game.checkAchievements();

    // After all 16 worlds: where a perfect-ish run lands on the level curve.
    const endLevel = s().level;
    expect(endLevel).toBeGreaterThanOrEqual(12);
    // Level-gated rewards past that are earned by more practice (Arena: 5 seen challenges a round).
    const levelGoal = Math.max(
      ...game.cosmeticDefs().map((c) => Number(/^level:(\d+)$/.exec(cosmeticTest(c) ?? '')?.[1] ?? 0)),
    );
    const seen = game.seenChallengeIds();
    for (let r = 0; r < 1000 && s().level < levelGoal; r++) {
      game.resetCombo();
      for (let k = 0; k < 5; k++)
        play(game, s, game.index.challenge[seen[(r * 5 + k) % seen.length]!]!.ch, 'practice', false, watch);
      game.questEvent('practice.done', 1);
      game.markActive();
    }
    game.checkAchievements();

    const st = s();
    // Every achievement was earned.
    expect(
      content.achievements.filter((a) => !st.achievements[a.id]).map((a) => `${a.id} (${a.test})`),
    ).toEqual([]);
    // Every bestiary bug was defeated.
    expect(content.bestiary.filter((b) => !st.bestiary.includes(b.id)).map((b) => b.id)).toEqual([]);
    // Every cosmetic was earned, except the starter colors picked at onboarding.
    const starters = new Set<string>(STARTER_COLORS);
    expect(
      game
        .cosmeticDefs()
        .filter((c) => !starters.has(c.id) && !st.cosmetics.owned.includes(c.id))
        .map((c) => `${c.id} (${c.source})`),
    ).toEqual([]);
    // Every vault card collected.
    const cards = content.worlds.flatMap((w) => w.lessons.flatMap((l) => l.vault.map((v) => v.id)));
    expect(cards.filter((id) => !st.vault.includes(id))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Cross references                                                    */
/* ------------------------------------------------------------------ */

describe('cross references', () => {
  it('every referenced id exists', () => {
    const problems: string[] = [];
    const bugs = new Set(content.bestiary.map((b) => b.id));
    const cosmetics = new Set(content.cosmetics.map((c) => c.id));
    const worldIds = new Set(content.worlds.map((w) => w.id));
    const tagWorld = new Map<string, number>();
    for (const w of content.worlds)
      for (const l of w.lessons)
        for (const ch of l.challenges)
          for (const t of ch.tags) tagWorld.set(t, Math.min(w.num, tagWorld.get(t) ?? Infinity));
    for (const w of content.worlds) {
      for (const l of w.lessons)
        for (const t of l.reviewTags) {
          const at = tagWorld.get(t);
          if (at == null) problems.push(`${l.id} reviewTags: no lesson challenge has "${t}"`);
          else if (at > w.num)
            problems.push(`${l.id} reviewTags: "${t}" first appears in a later world (${at})`);
        }
      const r = w.boss.reward;
      if (r.bug && !bugs.has(r.bug)) problems.push(`${w.boss.id} reward.bug "${r.bug}"`);
      if (r.cosmetic && !cosmetics.has(r.cosmetic))
        problems.push(`${w.boss.id} reward.cosmetic "${r.cosmetic}"`);
    }
    for (const { ch } of allChallenges(content))
      if (ch.bug && !bugs.has(ch.bug)) problems.push(`${ch.id} bug "${ch.bug}"`);
    for (const b of content.bestiary)
      if (!worldIds.has(b.world)) problems.push(`bug ${b.id} world "${b.world}"`);
    for (const a of content.achievements) {
      if (a.cosmetic && !cosmetics.has(a.cosmetic))
        problems.push(`achievement ${a.id} cosmetic "${a.cosmetic}"`);
      const m = /^([a-z]+):(.+)$/.exec(a.test);
      if (m?.[1] === 'bestiary' && !/^\d+$/.test(m[2]!) && !bugs.has(m[2]!))
        problems.push(`achievement ${a.id} test "${a.test}"`);
      if (m?.[1] === 'world' && !worldIds.has(m[2]!)) problems.push(`achievement ${a.id} test "${a.test}"`);
    }
    for (const c of content.cosmetics) {
      const t = cosmeticTest(c);
      const granted =
        content.worlds.some((w) => w.boss.reward.cosmetic === c.id) ||
        content.achievements.some((a) => a.cosmetic === c.id) ||
        (STARTER_COLORS as readonly string[]).includes(c.id);
      if (!t && !granted) problems.push(`cosmetic ${c.id}: no way to earn it ("${c.source}")`);
      if (t && t !== 'start') {
        const m = /^([a-z]+):(.+)$/.exec(t);
        if (!m) problems.push(`cosmetic ${c.id}: bad test "${t}"`);
        else if (m[1] === 'world' && !worldIds.has(m[2]!)) problems.push(`cosmetic ${c.id}: test "${t}"`);
        else if (m[1] === 'bestiary' && !/^\d+$/.test(m[2]!) && !bugs.has(m[2]!))
          problems.push(`cosmetic ${c.id}: test "${t}"`);
        // an unknown kind never passes
        else if (!testAchievement(maxedSave(), t))
          problems.push(`cosmetic ${c.id}: test "${t}" can never pass`);
      }
    }
    expect(problems).toEqual([]);
  });
});

/** A save with every counter maxed (for "can this test ever pass" checks). */
function maxedSave(): SaveV1 {
  const s = defaultSave(new Date(0)) as SaveV1;
  const big = 1e9;
  s.xp = big;
  s.level = 1000;
  s.counters.bestCombo = big;
  s.counters.hardened = big;
  s.counters.reviews = big;
  s.counters.correct = big;
  s.streak.best = big;
  s.bestiary = content.bestiary.map((b) => b.id);
  s.vault = content.worlds.flatMap((w) => w.lessons.flatMap((l) => l.vault.map((v) => v.id)));
  for (const w of content.worlds) {
    s.bosses[w.boss.id] = { beaten: true, at: '' };
    s.projects[w.project.id] = { done: true, step: 0 };
    for (const l of w.lessons) s.lessons[l.id] = { done: true, best: 1, at: '' };
  }
  return s;
}
