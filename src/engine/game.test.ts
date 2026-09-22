/**
 * Game rules wired together, exercised against the REAL content (content/),
 * including the level-curve target: a full run of Worlds 1–3 ends at level 6–7.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../../scripts/lib/content-fs';
import type { Challenge, Content, World } from '../content/schema';
import { HEART_REFILL_MS, STRESS_XP } from './config';
import { createGame, type Game } from './game';
import { defaultSave, type SaveV1 } from './save';
import { seeded } from './util';

let content: Content;
beforeAll(() => {
  const r = loadContentFromDisk();
  if (!r.content) throw new Error('content invalid: ' + JSON.stringify(r.issues.slice(0, 3)));
  content = r.content;
});

function setup(t0 = Date.parse('2026-03-02T09:00:00')) {
  const clock = { t: t0 };
  const store = { state: defaultSave(new Date(t0)) as SaveV1, save() {} };
  store.state.profile.onboarded = true;
  const game = createGame({ content, store, now: () => clock.t, rng: seeded('test') });
  game.boot();
  return { game, store, clock, s: () => store.state };
}

const timed = (ch: Challenge) => ch.type === 'speed' || ch.type === 'safe';
const right = (ch: Challenge) => ({ correct: true, ...(timed(ch) ? { score: 1 } : {}) });

/** Play a world perfectly, the way the sessions do (combo resets per session). */
function playWorld(game: Game, w: World) {
  for (const lesson of w.lessons) {
    game.resetCombo();
    const firstTry: Record<string, boolean> = {};
    for (const ch of [...lesson.challenges, ...game.interleaveFor(lesson)]) {
      game.answer(ch, right(ch), { mode: 'lesson' });
      if (lesson.challenges.includes(ch)) firstTry[ch.id] = true;
    }
    game.finishLesson(lesson, firstTry);
  }
  game.resetCombo();
  for (const ch of w.project.steps) game.answer(ch, right(ch), { mode: 'project' });
  for (const a of w.project.stress.attacks)
    game.answer(a.challenge, right(a.challenge), { mode: 'project', base: STRESS_XP });
  game.completeProject(w);
  game.resetCombo();
  for (const ch of w.boss.rounds.slice(0, w.boss.hp)) game.answer(ch, right(ch), { mode: 'boss' });
  for (const d of w.boss.defense) game.answer(d.challenge, right(d.challenge), { mode: 'boss' });
  return game.beatBoss(w);
}

describe('gating', () => {
  it('opens lessons in order, then project, then boss, then the next world', () => {
    const { game, s } = setup();
    const [w1, w2] = game.worlds();
    expect(game.nodes(w1!).map((n) => n.open)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(game.currentNode()?.id).toBe('w1.l1');
    expect(game.worldUnlocked(w2!)).toBe(false);
    const r = playWorld(game, w1!);
    expect(r).toEqual({ first: true, unlocked: w2 });
    expect(s().worldsUnlocked).toEqual(['w1', 'w2']);
    expect(game.currentNode()?.id).toBe('w2.l1');
    expect(s().bestiary).toContain('missing-semicolon');
    expect(s().cosmetics.owned).toContain('gremlin-horns');
    expect(s().vault.length).toBeGreaterThan(0);
    expect(s().achievements['first-lesson'] ?? Object.keys(s().achievements).length).toBeTruthy();
  });
});

describe('answer scoring', () => {
  it('XP × combo multiplier; a wrong first try costs a heart and resets the combo', () => {
    const { game, s } = setup();
    const chs = content.worlds[0]!.lessons[0]!.challenges;
    const xp: number[] = [];
    for (let i = 0; i < 4; i++)
      xp.push(game.answer(chs[i % chs.length]!, { correct: true }, { mode: 'lesson' }).xp);
    expect(xp).toEqual([10, 10, 15, 15]); // combo 3+ → 1.5×
    const miss = game.answer(chs[0]!, { correct: false }, { mode: 'lesson' });
    expect(miss).toMatchObject({ xp: 0, heartLost: true, combo: 0 });
    expect(s().hearts.n).toBe(4);
    // the retry: +2 XP, no heart, combo untouched
    expect(game.answer(chs[0]!, { correct: true, retry: true }, { mode: 'lesson' })).toMatchObject({
      xp: 2,
      heartLost: false,
      combo: 0,
    });
    expect(game.answer(chs[0]!, { correct: false, retry: true }, { mode: 'lesson' }).heartLost).toBe(false);
    expect(s().hearts.n).toBe(4);
  });

  it('assisted answers earn nothing but keep hearts; practice never costs hearts', () => {
    const { game, s } = setup();
    const ch = content.worlds[0]!.lessons[0]!.challenges[0]!;
    expect(game.answer(ch, { correct: true, assisted: true }, { mode: 'lesson' }).xp).toBe(0);
    expect(game.answer(ch, { correct: false }, { mode: 'practice' }).heartLost).toBe(false);
    expect(s().hearts.n).toBe(5);
  });

  it('hints cost 2 / 3 / 5 XP', () => {
    const { game, s } = setup();
    game.addXP(20, 'test');
    expect([game.useHint(1), game.useHint(2), game.useHint(3)]).toEqual([-2, -3, -5]);
    expect(s().xp).toBe(10);
  });

  it('records SRS entries for misses and review counters', () => {
    const { game, s } = setup();
    const ch = content.worlds[0]!.lessons[0]!.challenges[1]!;
    game.answer(ch, { correct: false }, { mode: 'lesson' });
    expect(s().srs[ch.id]).toMatchObject({ box: 1, wrong: 1 });
    expect(game.srsDue()).toEqual([ch.id]);
    expect(game.reviewSet(3).map((c) => c.id)).toContain(ch.id);
    game.answer(ch, { correct: true }, { mode: 'review' });
    expect(s().counters.reviews).toBe(1);
    expect(s().srs[ch.id]).toMatchObject({ box: 2, right: 1 });
  });

  it('defeats a bestiary bug after min(2, refs) correct answers', () => {
    const { game, s } = setup();
    const withBug = game.index.challenge;
    const ids = Object.keys(withBug).filter((id) => withBug[id]!.ch.bug === 'missing-semicolon');
    expect(ids.length).toBeGreaterThanOrEqual(2);
    game.answer(withBug[ids[0]!]!.ch, { correct: true }, { mode: 'lesson' });
    expect(s().bestiary).not.toContain('missing-semicolon');
    game.answer(withBug[ids[1]!]!.ch, { correct: true }, { mode: 'lesson' });
    expect(s().bestiary).toContain('missing-semicolon');
    expect(game.drainCelebrations().some((c) => c.type === 'bug')).toBe(true);
  });

  it('refills hearts over time', () => {
    const { game, s, clock } = setup();
    const ch = content.worlds[0]!.lessons[0]!.challenges[0]!;
    game.answer(ch, { correct: false }, { mode: 'lesson' });
    game.answer(ch, { correct: false }, { mode: 'boss' });
    expect(s().hearts.n).toBe(3);
    clock.t += HEART_REFILL_MS + 1000;
    expect(game.hearts.regen()).toBe(1);
    expect(s().hearts.n).toBe(4);
  });
});

describe('level curve (docs in progress.ts)', () => {
  it('a full, perfect run of Worlds 1–3 (one day per world) ends at level 6–7', () => {
    const { game, s, clock } = setup();
    const levels: number[] = [];
    const worlds = game.worlds();
    expect(worlds.length).toBeGreaterThanOrEqual(3);
    for (const w of worlds) {
      playWorld(game, w);
      levels.push(s().level);
      clock.t += 86_400_000;
      game.boot();
      if (levels.length === 3) {
        // Legacy reached level 12 here; the slower curve targets ~6–7.
        expect(s().level).toBeGreaterThanOrEqual(6);
        expect(s().level).toBeLessThanOrEqual(7);
        expect(levels[0]).toBeLessThan(levels[2]!);
        expect(s().worldsUnlocked.slice(0, 3)).toEqual(['w1', 'w2', 'w3']);
        expect(s().streak.days).toBe(3);
      }
    }
    // Soft check for the longer path: after World 8, somewhere around level 12–15.
    if (levels.length >= 8) {
      expect(levels[7]).toBeGreaterThanOrEqual(10);
      expect(levels[7]).toBeLessThanOrEqual(16);
    }
  });
});

describe('time tracking', () => {
  it('counts minutes toward the daily goal', () => {
    const { game, s } = setup();
    const toasts: string[] = [];
    game.events.on('toast', (t) => toasts.push(t.msg));
    for (let i = 0; i < 12 * 10; i++) game.tick(5); // 10 minutes
    expect(s().counters.secondsPlayed).toBe(600);
    expect(s().daily.minutes).toBeCloseTo(10, 5);
    expect(toasts.some((m) => m.startsWith('Daily goal reached'))).toBe(true);
  });
});
