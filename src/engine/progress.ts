/**
 * XP, levels and combo multipliers.
 *
 * Level curve (changed from legacy on purpose):
 *   legacy: XP to go from level L to L+1 = 100 + 50·(L−1)
 *           → a full run of Worlds 1–3 (~3,800 XP) reached level 12, too fast.
 *   now:    XP to go from level L to L+1 = 150·L
 *           → total XP to REACH level L = 75·L·(L−1)
 *
 *   level:     2    3    4     5     6     7     8     10    12    16    20
 *   total XP: 150  450  900  1500  2250  3150  4200  6750  9900  18000 28500
 *
 * Simulated on the real content (one play day per world, daily quests included):
 *   perfect run (every first try right):   W1 1,216 XP → L4, W2 2,395 → L6, W3 3,725 → L7
 *   a miss every 4th answer (then retried): W1   791 XP → L3, W2 1,579 → L5, W3 2,461 → L6
 * (the legacy curve put the perfect run at level 11–12). game.test.ts keeps
 * the Worlds 1–3 result inside 6–7. Later worlds need more XP per level, so
 * level-ups keep coming but slow down gradually.
 */

/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number): number => 150 * level;

/** Total XP needed to reach `level` from level 1. */
export const xpForLevel = (level: number): number => 75 * level * (level - 1);

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level */
  into: number;
  /** XP the current level needs in total */
  need: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, need: xpToNext(level) };
}

/** XP multiplier for the current in-session combo (legacy rule). */
export const comboMultiplier = (combo: number): number =>
  combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1;

export interface XpChange {
  /** XP actually applied (XP never drops below 0) */
  delta: number;
  xp: number;
  level: number;
  /** Every level newly reached, in order (empty when none) */
  levelsGained: number[];
}

/** Apply an XP change to the given totals. Pure. */
export function applyXp(xp: number, level: number, n: number): XpChange {
  const next = Math.max(0, Math.round(xp + n));
  const info = levelInfo(next);
  const levelsGained: number[] = [];
  for (let l = level + 1; l <= info.level; l++) levelsGained.push(l);
  return { delta: next - xp, xp: next, level: info.level, levelsGained };
}
