/**
 * Boss fight rounds, pure (no React, no save). A fight is one or more stages
 * (Worlds 1-15: one stage holding every round; World 16: three). Each stage
 * needs `hp` hits; a missed round comes back once the stage's list runs out.
 * Losing all hearts in a multi-stage fight restarts only that stage:
 * startStage(stages, run.stage) gives the stage back at the hp it began with.
 *
 *   const stages = bossStages(boss);
 *   let run = startStage(stages, 0);
 *   const d = drawRound(run, stages, shuffle); run = d.run;   // play d.ch
 *   run = answerRound(run, d.ch, correct);
 *   if (stageCleared(run)) run = startStage(stages, run.stage + 1);  // unless it was the last
 */
import type { Boss, Challenge } from '../content/schema';

export interface Stage {
  /** '' for a single-stage boss */
  name: string;
  taunt: string[];
  rounds: Challenge[];
  /** hits that break this stage */
  hp: number;
}

export interface BossRun {
  /** index into the stages */
  stage: number;
  /** boss hp left in the whole fight (drives the hp bar) */
  hp: number;
  /** hits still needed in this stage */
  stageHp: number;
  list: Challenge[];
  i: number;
  missed: Challenge[];
}

/** Total hp of a boss (at least 1). */
export const bossHp = (b: Boss): number => Math.max(1, b.hp || b.rounds.length || 1);

/** The boss's stages; a boss without `stages` is one stage with every round. */
export function bossStages(b: Boss): Stage[] {
  if (!b.stages?.length) return [{ name: '', taunt: b.taunt, rounds: b.rounds, hp: bossHp(b) }];
  const byId = new Map(b.rounds.map((r) => [r.id, r]));
  return b.stages.map((s) => ({
    name: s.name,
    taunt: s.taunt.length ? s.taunt : b.taunt,
    rounds: s.rounds.map((id) => byId.get(id)).filter((r): r is Challenge => !!r),
    hp: s.hp,
  }));
}

/** A fresh start of stage `stage`: its rounds in order, hp as it was when the stage began. */
export function startStage(stages: Stage[], stage: number): BossRun {
  const s = stages[stage]!;
  return {
    stage,
    hp: stages.slice(stage).reduce((a, x) => a + x.hp, 0),
    stageHp: s.hp,
    list: s.rounds.slice(),
    i: 0,
    missed: [],
  };
}

/**
 * The next round of the current stage. When the list runs out the missed
 * rounds come back (or the whole stage if none were missed), shuffled;
 * `lap` is true then (the screen says "Round two!").
 */
export function drawRound(
  run: BossRun,
  stages: Stage[],
  shuffle: (xs: Challenge[]) => Challenge[] = (xs) => xs,
): { run: BossRun; ch: Challenge; lap: boolean } {
  let r = run;
  let lap = false;
  if (r.i >= r.list.length) {
    lap = true;
    r = {
      ...r,
      list: shuffle(r.missed.length ? r.missed.slice() : stages[r.stage]!.rounds.slice()),
      missed: [],
      i: 0,
    };
  }
  return { run: { ...r, i: r.i + 1 }, ch: r.list[r.i]!, lap };
}

/** Settle a round: a hit lowers both hp counts, a miss queues the round again. */
export function answerRound(run: BossRun, ch: Challenge, correct: boolean): BossRun {
  if (correct) return { ...run, hp: Math.max(0, run.hp - 1), stageHp: Math.max(0, run.stageHp - 1) };
  return { ...run, missed: [...run.missed, ch] };
}

/** The current stage is broken (no hits left in it). */
export const stageCleared = (run: BossRun): boolean => run.stageHp <= 0;

/** Index of the stage after this one, or null after the last stage. */
export const nextStage = (run: BossRun, stages: Stage[]): number | null =>
  run.stage + 1 < stages.length ? run.stage + 1 : null;

/** 1-based hit number of the round being played, across the whole fight. */
export const roundNumber = (run: BossRun, stages: Stage[]): number =>
  stages.reduce((a, s) => a + s.hp, 0) - run.hp + 1;

/** 1-based round number inside the current stage. */
export const stageRound = (run: BossRun, stages: Stage[]): number => stages[run.stage]!.hp - run.stageHp + 1;
