/**
 * Daily streak with freezes (ported from legacy progress.js).
 * Day strings are local calendar days "YYYY-MM-DD".
 */
import { FREEZE_EVERY_STREAK_DAYS, MAX_FREEZES } from './config';
import type { SaveV1 } from './save';
import { dayDiff, dayStr } from './util';

type Streak = SaveV1['streak'];

export type StreakNote = { kind: 'freeze-used'; days: number } | { kind: 'reset' } | null;

/**
 * On boot: missed days are covered by freezes (one per missed day) or the
 * streak resets. Returns a note for the UI, or null when nothing happened.
 */
export function checkStreak(st: Streak, today: Date): StreakNote {
  if (!st.lastDay) return null;
  const diff = dayDiff(st.lastDay, dayStr(today));
  if (diff <= 1) return null;
  const missed = diff - 1;
  if (st.days > 0 && st.freezes >= missed) {
    st.freezes -= missed;
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    st.lastDay = dayStr(y);
    return { kind: 'freeze-used', days: st.days };
  }
  if (st.days > 0) {
    st.days = 0;
    return { kind: 'reset' };
  }
  return null;
}

export interface MarkActiveResult {
  /** false when today was already counted */
  changed: boolean;
  /** a streak freeze was earned (every 5 days, max 3 held) */
  freezeEarned: boolean;
}

/** Count today as active (a lesson / review / practice / boss finished). */
export function markActive(st: Streak, today: Date): MarkActiveResult {
  const t = dayStr(today);
  if (st.lastDay === t) return { changed: false, freezeEarned: false };
  const diff = dayDiff(st.lastDay, t);
  st.days = diff === 1 ? st.days + 1 : 1;
  if (!st.lastDay) st.days = 1;
  st.lastDay = t;
  st.best = Math.max(st.best, st.days);
  let freezeEarned = false;
  if (st.days > 0 && st.days % FREEZE_EVERY_STREAK_DAYS === 0 && st.freezes < MAX_FREEZES) {
    st.freezes++;
    freezeEarned = true;
  }
  return { changed: true, freezeEarned };
}
