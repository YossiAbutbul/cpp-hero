/** Unit tests for the small pure rule modules: progress, hearts, boss stages, streak, SRS, quests, achievements, cosmetics. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { BossSchema, type Boss, type Challenge, type Quest } from '../content/schema';
import { testAchievement } from './achievements';
import {
  answerRound,
  bossHp,
  bossStages,
  drawRound,
  nextStage,
  roundNumber,
  stageCleared,
  stageRound,
  startStage,
} from './boss';
import { allCosmetics, cosmeticTest } from './cosmetics';
import { costsHeart, FIGHT_HEARTS, fightAnswer } from './hearts';
import { applyXp, comboMultiplier, levelInfo, xpForLevel, xpToNext } from './progress';
import { canonQuestEvent, isKnownQuestEvent } from './questEvents';
import { ensureDaily, questEvent } from './quests';
import { defaultSave } from './save';
import { srsDue, srsRecord } from './srs';
import { checkStreak, markActive } from './streak';
import { dayDiff, dayStr, seeded, shuffle } from './util';

const T0 = Date.parse('2026-03-04T10:00:00.000Z');
const day = (s: string) => new Date(s + 'T12:00:00');

describe('levels', () => {
  it('uses the slower curve: 150·L XP per level', () => {
    expect(xpToNext(1)).toBe(150);
    expect(xpToNext(6)).toBe(900);
    expect(xpForLevel(7)).toBe(3150);
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: 150 });
    expect(levelInfo(149).level).toBe(1);
    expect(levelInfo(150)).toEqual({ level: 2, into: 0, need: 300 });
    expect(levelInfo(3149).level).toBe(6);
    expect(levelInfo(3150).level).toBe(7);
    for (let l = 1; l < 30; l++) expect(levelInfo(xpForLevel(l)).level).toBe(l);
  });

  it('applyXp reports every level gained and never goes below 0', () => {
    expect(applyXp(100, 1, 400)).toEqual({ delta: 400, xp: 500, level: 3, levelsGained: [2, 3] });
    expect(applyXp(3, 1, -10)).toEqual({ delta: -3, xp: 0, level: 1, levelsGained: [] });
  });

  it('combo multiplier tiers', () => {
    expect([0, 2, 3, 5, 6, 9, 10, 40].map(comboMultiplier)).toEqual([1, 1, 1.5, 1.5, 2, 2, 3, 3]);
  });
});

describe('boss fight hearts', () => {
  it('only a wrong FIRST try in a boss fight costs a heart', () => {
    expect(costsHeart({ mode: 'boss', correct: false, retry: false })).toBe(true);
    expect(costsHeart({ mode: 'boss', correct: false, retry: true })).toBe(false);
    expect(costsHeart({ mode: 'boss', correct: true, retry: false })).toBe(false);
    for (const mode of ['lesson', 'project', 'practice', 'review', 'placement'] as const)
      expect(costsHeart({ mode, correct: false, retry: false })).toBe(false);
  });

  it('a fight starts with 5 hearts and the 5th miss knocks you out', () => {
    expect(FIGHT_HEARTS).toBe(5);
    let n = FIGHT_HEARTS;
    const out: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const r = fightAnswer(n, { correct: false, retry: false });
      expect(r.lost).toBe(true);
      n = r.hearts;
      out.push(r.knockedOut);
    }
    expect(n).toBe(0);
    expect(out).toEqual([false, false, false, false, true]);
  });

  it('right answers and retries keep hearts; never below 0', () => {
    expect(fightAnswer(3, { correct: true, retry: false })).toEqual({ hearts: 3, lost: false, knockedOut: false });
    expect(fightAnswer(3, { correct: false, retry: true })).toEqual({ hearts: 3, lost: false, knockedOut: false });
    expect(fightAnswer(0, { correct: false, retry: false })).toEqual({ hearts: 0, lost: false, knockedOut: true });
  });
});

describe('boss stages', () => {
  const ch = (n: number) => ({ id: `wt.boss.r${n}`, type: 'mcq' }) as Challenge;
  const rounds = [1, 2, 3, 4, 5, 6].map(ch);
  const base = { id: 'wt.boss', name: 'Test', art: 'x', hp: 5, taunt: ['boo'], rounds, defense: [] } as unknown as Boss;
  const staged: Boss = {
    ...base,
    stages: [
      { name: 'One', taunt: [], rounds: ['wt.boss.r1', 'wt.boss.r2', 'wt.boss.r3'], hp: 2 },
      { name: 'Two', taunt: ['grr'], rounds: ['wt.boss.r4', 'wt.boss.r5', 'wt.boss.r6'], hp: 3 },
    ],
  };

  it('a boss without stages is one stage holding every round', () => {
    const st = bossStages(base);
    expect(st).toHaveLength(1);
    expect(st[0]).toMatchObject({ name: '', hp: 5, taunt: ['boo'] });
    expect(st[0]!.rounds).toBe(rounds);
    expect(bossHp(base)).toBe(5);
    const run = startStage(st, 0);
    expect(run).toMatchObject({ stage: 0, hp: 5, stageHp: 5 });
    expect(nextStage(run, st)).toBeNull();
  });

  it('stages resolve round ids and fall back to the boss taunts', () => {
    const st = bossStages(staged);
    expect(st.map((s) => s.rounds.map((r) => r.id))).toEqual([
      ['wt.boss.r1', 'wt.boss.r2', 'wt.boss.r3'],
      ['wt.boss.r4', 'wt.boss.r5', 'wt.boss.r6'],
    ]);
    expect(st.map((s) => s.taunt)).toEqual([['boo'], ['grr']]);
    // the later stage starts at the hp left after the earlier ones
    expect(startStage(st, 1)).toMatchObject({ stage: 1, hp: 3, stageHp: 3 });
  });

  it('plays a stage in order, brings misses back, then moves to the next stage', () => {
    const st = bossStages(staged);
    let run = startStage(st, 0);
    const played: string[] = [];
    const play = (correct: boolean) => {
      const d = drawRound(run, st);
      played.push(d.ch.id + (correct ? '' : '✗') + (d.lap ? '↻' : ''));
      run = answerRound(d.run, d.ch, correct);
    };
    play(false);
    play(true);
    expect(stageRound(run, st)).toBe(2);
    play(false);
    play(true); // lap: only the two missed rounds come back
    expect(played).toEqual(['wt.boss.r1✗', 'wt.boss.r2', 'wt.boss.r3✗', 'wt.boss.r1↻']);
    expect(stageCleared(run)).toBe(true);
    expect(run.hp).toBe(3);
    expect(nextStage(run, st)).toBe(1);
    run = startStage(st, 1);
    expect(roundNumber(run, st)).toBe(3);
    expect(stageRound(run, st)).toBe(1);
    for (let i = 0; i < 3; i++) play(true);
    expect(run.hp).toBe(0);
    expect(stageCleared(run)).toBe(true);
    expect(nextStage(run, st)).toBeNull();
  });

  it('a lap with no misses replays the whole stage (shuffled)', () => {
    const st = bossStages(staged);
    const rev = (xs: Challenge[]) => xs.slice().reverse();
    let run = { ...startStage(st, 0), i: 3 };
    const d = drawRound(run, st, rev);
    expect(d.lap).toBe(true);
    expect(d.ch.id).toBe('wt.boss.r3');
    run = d.run;
    expect(run.list.map((r) => r.id)).toEqual(['wt.boss.r3', 'wt.boss.r2', 'wt.boss.r1']);
  });

  it('restarting a stage gives back its hp and rounds, not the earlier stages', () => {
    const st = bossStages(staged);
    let run = startStage(st, 1);
    for (let i = 0; i < 2; i++) {
      const d = drawRound(run, st);
      run = answerRound(d.run, d.ch, i === 0);
    }
    expect(run).toMatchObject({ hp: 2, stageHp: 2 });
    expect(run.missed).toHaveLength(1);
    const again = startStage(st, run.stage);
    expect(again).toMatchObject({ stage: 1, hp: 3, stageHp: 3, i: 0, missed: [] });
    expect(again.list.map((r) => r.id)).toEqual(['wt.boss.r4', 'wt.boss.r5', 'wt.boss.r6']);
  });

  it('the schema checks stage ids, order and hp (World 16 is valid)', () => {
    const w16 = BossSchema.parse(
      parse(readFileSync(new URL('../../content/worlds/16-final-boss/boss.yaml', import.meta.url), 'utf8')),
    );
    expect(w16.stages?.map((s) => s.hp)).toEqual([3, 3, 4]);
    expect(BossSchema.safeParse(w16).success).toBe(true);
    const bad = (stages: Boss['stages']) => {
      const r = BossSchema.safeParse({ ...w16, stages });
      return r.success ? [] : r.error.issues.map((i) => i.message);
    };
    const ok = w16.stages!;
    expect(bad([{ ...ok[0]!, hp: 4 }, ok[1]!, ok[2]!]).join()).toMatch(/adds up to 11/);
    expect(bad([{ ...ok[0]!, rounds: ok[0]!.rounds.slice(1) }, ok[1]!, { ...ok[2]!, hp: 5 }]).join()).toMatch(
      /every round id once/,
    );
    expect(bad([ok[1]!, ok[0]!, ok[2]!]).join()).toMatch(/in order/);
    expect(bad([{ ...ok[0]!, hp: 5, rounds: ok[0]!.rounds }, { ...ok[1]!, hp: 1 }, ok[2]!]).join()).toMatch(
      /needs at least hp \(5\)/,
    );
  });
});

describe('streak', () => {
  it('counts consecutive days and records the best', () => {
    const st = { days: 0, lastDay: '', freezes: 0, best: 0 };
    expect(markActive(st, day('2026-03-01')).changed).toBe(true);
    expect(markActive(st, day('2026-03-01')).changed).toBe(false);
    markActive(st, day('2026-03-02'));
    expect(st).toMatchObject({ days: 2, lastDay: '2026-03-02', best: 2 });
    markActive(st, day('2026-03-05')); // gap → restart
    expect(st).toMatchObject({ days: 1, best: 2 });
  });

  it('earns a freeze every 5 days (max 3)', () => {
    const st = { days: 4, lastDay: '2026-03-01', freezes: 2, best: 4 };
    expect(markActive(st, day('2026-03-02')).freezeEarned).toBe(true);
    expect(st.freezes).toBe(3);
    const full = { days: 9, lastDay: '2026-03-01', freezes: 3, best: 9 };
    expect(markActive(full, day('2026-03-02')).freezeEarned).toBe(false);
  });

  it('uses one freeze per missed day on boot, or resets', () => {
    const st = { days: 6, lastDay: '2026-03-01', freezes: 2, best: 6 };
    expect(checkStreak(st, day('2026-03-04'))).toEqual({ kind: 'freeze-used', days: 6 });
    expect(st).toMatchObject({ freezes: 0, lastDay: '2026-03-03', days: 6 });
    const st2 = { days: 6, lastDay: '2026-03-01', freezes: 1, best: 6 };
    expect(checkStreak(st2, day('2026-03-04'))).toEqual({ kind: 'reset' });
    expect(st2.days).toBe(0);
    expect(
      checkStreak({ days: 3, lastDay: '2026-03-03', freezes: 0, best: 3 }, day('2026-03-04')),
    ).toBeNull();
  });
});

describe('SRS (Leitner)', () => {
  it('wrong → box 1 due now; right → next box with its interval', () => {
    const srs = {};
    srsRecord(srs, 'a', true, T0);
    expect(srs).toEqual({}); // never-missed items aren't tracked
    srsRecord(srs, 'a', false, T0);
    expect(srs).toEqual({ a: { box: 1, due: new Date(T0).toISOString(), wrong: 1, right: 0 } });
    srsRecord(srs, 'a', true, T0);
    expect(srs).toMatchObject({ a: { box: 2, right: 1, due: new Date(T0 + 86_400_000).toISOString() } });
    for (let i = 0; i < 5; i++) srsRecord(srs, 'a', true, T0);
    expect(srs).toMatchObject({ a: { box: 5, due: new Date(T0 + 16 * 86_400_000).toISOString() } });
    srsRecord(srs, 'a', false, T0);
    expect(srs).toMatchObject({ a: { box: 1, wrong: 2 } });
  });

  it('lists due ids that still exist, oldest first', () => {
    const srs = {
      a: { box: 1, due: new Date(T0 - 5000).toISOString(), wrong: 1, right: 0 },
      b: { box: 1, due: new Date(T0 - 9000).toISOString(), wrong: 1, right: 0 },
      c: { box: 2, due: new Date(T0 + 9000).toISOString(), wrong: 1, right: 1 },
      gone: { box: 1, due: new Date(T0 - 9999).toISOString(), wrong: 1, right: 0 },
    };
    expect(srsDue(srs, T0, (id) => id !== 'gone')).toEqual(['b', 'a']);
  });
});

describe('daily quests', () => {
  const defs: Quest[] = [
    { id: 'l2', text: 'Complete 2 lessons', goal: 2, event: 'lesson.done', xp: 20 },
    { id: 'c5', text: '5 in a row', goal: 5, event: 'combo', xp: 20 },
    { id: 'h3', text: 'Harden 3', goal: 3, event: 'defensive.correct', xp: 25 },
  ];

  it('picks the same quests for the same day', () => {
    const a = defaultSave();
    const b = defaultSave();
    ensureDaily(a, defs, day('2026-03-04'));
    ensureDaily(b, defs, day('2026-03-04'));
    expect(a.daily).toEqual(b.daily);
    expect(a.daily.quests).toHaveLength(3);
    expect(ensureDaily(a, defs, day('2026-03-04'))).toBe(false);
    expect(ensureDaily(a, defs, day('2026-03-05'))).toBe(true);
  });

  it('sums progress, keeps the max for combo, completes and earns a freeze when all done', () => {
    const s = defaultSave();
    const t = day('2026-03-04');
    ensureDaily(s, defs, t);
    expect(questEvent(s, defs, 'lesson', 1, t).completed).toEqual([]); // alias of lesson.done
    expect(questEvent(s, defs, 'combo', 4, t).completed).toEqual([]);
    questEvent(s, defs, 'combo', 2, t);
    expect(s.daily.quests.find((q) => q.id === 'c5')?.progress).toBe(4);
    expect(questEvent(s, defs, 'combo', 7, t).completed.map((q) => q.id)).toEqual(['c5']);
    questEvent(s, defs, 'lesson.done', 1, t);
    questEvent(s, defs, 'harden', 1, t);
    questEvent(s, defs, 'harden', 1, t);
    const last = questEvent(s, defs, 'defense.correct', 1, t);
    expect(last.completed.map((q) => q.id)).toEqual(['h3']);
    expect(last.freezeEarned).toBe(true);
    expect(s.streak.freezes).toBe(1);
    expect(s.daily.quests.every((q) => q.done && q.claimed)).toBe(true);
  });

  it('canonicalizes event aliases', () => {
    expect(canonQuestEvent('answer.correct')).toBe('correct');
    expect(canonQuestEvent('REVIEW.DONE')).toBe('review');
    expect(isKnownQuestEvent('defensive.correct')).toBe(true);
    expect(isKnownQuestEvent('nope')).toBe(false);
  });
});

describe('achievements DSL', () => {
  const s = defaultSave();
  s.lessons = {
    a: { done: true, best: 1, at: '' },
    b: { done: true, best: 0.5, at: '' },
    c: { done: false, best: 0, at: '' },
  };
  s.counters.bestCombo = 10;
  s.counters.hardened = 3;
  s.counters.reviews = 9;
  s.streak = { days: 2, lastDay: '', freezes: 0, best: 7 };
  s.bestiary = ['off-by-one'];
  s.bosses = { 'w3.boss': { beaten: true, at: '' } };
  s.xp = 500;
  s.level = 3;

  it.each([
    ['lessons:2', true],
    ['lessons:3', false],
    ['combo:10', true],
    ['streak:7', true],
    ['streak:8', false],
    ['bestiary:off-by-one', true],
    ['bestiary:null-deref', false],
    ['bestiary:1', true],
    ['hardened:3', true],
    ['world:w3', true],
    ['world:w4', false],
    ['perfect:1', true],
    ['perfect:2', false],
    ['reviews:10', false],
    ['xp:500', true],
    ['level:4', false],
    ['bosses:1', true],
    ['bogus:1', false],
    ['nonsense', false],
  ])('%s → %s', (test, want) => {
    expect(testAchievement(s, test)).toBe(want);
  });
});

describe('cosmetics', () => {
  it('parses the common `source` phrasings into tests', () => {
    const c = (source: string) => cosmeticTest({ id: 'x', slot: 'hat', name: 'X', source });
    expect(c('Owned from the start')).toBe('start');
    expect(c('Reach level 5')).toBe('level:5');
    expect(c('Finish 10 lessons')).toBe('lessons:10');
    expect(c('Keep a 7-day streak')).toBe('streak:7');
    expect(c('Hit a 25-answer combo')).toBe('combo:25');
    expect(c('Complete 50 reviews')).toBe('reviews:50');
    expect(c('Harden 100 snippets')).toBe('hardened:100');
    expect(c('Defeat the Final Boss')).toBe('world:w16');
    expect(c('Defeat the Syntax Gremlin (World 1)')).toBe('world:w1');
    expect(c('A secret')).toBeNull();
  });

  it('adds the built-in level rewards once', () => {
    const all = allCosmetics([{ id: 'tophat', slot: 'hat', name: 'Mine', source: 'x' }]);
    expect(all.filter((c) => c.id === 'tophat')).toHaveLength(1);
    expect(all.map((c) => c.id)).toContain('cap-sky');
  });
});

describe('util', () => {
  it('day strings and differences', () => {
    expect(dayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayDiff('2026-02-27', '2026-03-01')).toBe(2);
    expect(dayDiff('', '2026-03-01')).toBe(Infinity);
  });

  it('seeded shuffle is deterministic', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], seeded('x'));
    expect(shuffle([1, 2, 3, 4, 5, 6], seeded('x'))).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
