/**
 * Hearts live only in boss fights. Each fight starts with FIGHT_HEARTS; a
 * wrong FIRST try costs one (never a retry). At 0 the fight is lost.
 * Nothing here touches the save (save.hearts stays only for old saves).
 */
import { DEFAULT_MAX_HEARTS, type SessionMode } from './config';

/** Hearts at the start of every boss fight. */
export const FIGHT_HEARTS = DEFAULT_MAX_HEARTS;

/** Does this answer cost a heart? Only a wrong first try in a boss fight. */
export function costsHeart(o: { mode: SessionMode; correct: boolean; retry: boolean }): boolean {
  return o.mode === 'boss' && !o.correct && !o.retry;
}

/** Hearts left after an answer in a fight, and whether that knocked you out. */
export function fightAnswer(
  hearts: number,
  o: { correct: boolean; retry: boolean },
): { hearts: number; lost: boolean; knockedOut: boolean } {
  const lost = hearts > 0 && costsHeart({ mode: 'boss', ...o });
  const left = lost ? hearts - 1 : Math.max(0, hearts);
  return { hearts: left, lost, knockedOut: left <= 0 };
}
