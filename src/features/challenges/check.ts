/**
 * Pure answer checks, one per challenge type (no React). The renderers use
 * these to decide `correct`; tests use the same functions
 * (src/playthrough.test.ts). fill / write use engine/matching.ts.
 */
import type { ChallengeOf, SafeItem, SpeedItem } from '../../content/schema';

/** mcq / predict / breakit / harden (and the fix step of bug): the picked option index. */
export const checkChoice = (c: { answer: number }, picked: number): boolean => picked === c.answer;

/** bug: the tapped line and the picked fix must both be right. */
export const checkBug = (
  c: Pick<ChallengeOf<'bug'>, 'bugLine' | 'answer'>,
  line: number,
  fix: number,
): boolean => line === c.bugLine && fix === c.answer;

/** Same members, ignoring order (edge picks, review flags). */
export const sameSet = (want: readonly number[], got: readonly number[]): boolean =>
  got.length === want.length && want.every((i) => got.includes(i));

/** edge: every input that exposes the bug, and nothing else. */
export const checkEdge = (c: Pick<ChallengeOf<'edge'>, 'answers'>, picked: readonly number[]): boolean =>
  sameSet(c.answers, picked);

/** review: every dangerous line flagged, and no safe line. */
export const checkReview = (
  c: Pick<ChallengeOf<'review'>, 'dangerous'>,
  flagged: readonly number[],
): boolean => sameSet(c.dangerous, flagged);

/** order: the program's lines (text, in order) against `lines`, ignoring leading/trailing spaces. */
export function checkOrder(
  c: Pick<ChallengeOf<'order'>, 'lines'>,
  program: readonly string[],
): { correct: boolean; inPlace: number } {
  const got = program.map((t) => t.trim());
  const want = c.lines.map((l) => l.trim());
  const correct = got.length === want.length && got.every((t, i) => t === want[i]);
  const inPlace = got.filter((t, i) => want[i] != null && t === want[i]).length;
  return { correct, inPlace };
}

/** safe round: k = 1 means "Safe", 0 means "Unsafe". */
export const safeItemRight = (it: Pick<SafeItem, 'safe'>, k: number): boolean => (k === 1) === it.safe;
/** speed round: the picked option index. */
export const speedItemRight = (it: Pick<SpeedItem, 'answer'>, k: number): boolean => k === it.answer;

/** Timed rounds pass with at least 2/3 right. */
export const timedNeed = (total: number): number => Math.ceil((total * 2) / 3);
export const timedPass = (right: number, total: number): boolean => right >= timedNeed(total);
