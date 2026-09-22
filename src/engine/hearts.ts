/**
 * Hearts: lose one on a wrong FIRST try in lessons and bosses (never on a
 * retry, never in practice/review/project), +1 every 30 minutes, +1 per
 * practice review round. Pure functions that mutate the given hearts object.
 */
import { HEART_MODES, HEART_REFILL_MS, type SessionMode } from './config';
import type { SaveV1 } from './save';

type Hearts = SaveV1['hearts'];

/** Refill hearts for the time passed. Returns how many were gained. */
export function regenHearts(h: Hearts, now: number): number {
  const last = Date.parse(h.lastRefill) || now;
  if (h.n >= h.max) {
    h.lastRefill = new Date(now).toISOString();
    return 0;
  }
  const k = Math.floor((now - last) / HEART_REFILL_MS);
  if (k <= 0) return 0;
  const before = h.n;
  h.n = Math.min(h.max, h.n + k);
  // Keep the partial progress toward the next heart, unless now full.
  h.lastRefill = new Date(h.n >= h.max ? now : last + k * HEART_REFILL_MS).toISOString();
  return h.n - before;
}

/** Seconds until the next heart (0 when full). */
export function nextHeartIn(h: Hearts, now: number): number {
  if (h.n >= h.max) return 0;
  const last = Date.parse(h.lastRefill) || now;
  return Math.max(0, (last + HEART_REFILL_MS - now) / 1000);
}

/** Lose one heart. Returns the hearts left. */
export function loseHeart(h: Hearts, now: number): number {
  if (h.n <= 0) return 0;
  // The refill clock starts when you drop below full.
  if (h.n >= h.max) h.lastRefill = new Date(now).toISOString();
  h.n--;
  return h.n;
}

/** Gain k hearts (capped). Returns how many were actually gained. */
export function gainHeart(h: Hearts, k: number, now: number): number {
  const before = h.n;
  h.n = Math.min(h.max, h.n + k);
  if (h.n >= h.max) h.lastRefill = new Date(now).toISOString();
  return h.n - before;
}

/** Does this answer cost a heart? Only wrong first tries in heart modes. */
export function costsHeart(o: {
  mode: SessionMode;
  correct: boolean;
  retry: boolean;
  noHearts?: boolean;
}): boolean {
  return !o.correct && !o.retry && !o.noHearts && HEART_MODES.includes(o.mode);
}
