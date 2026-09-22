/** Small display formatters shared by UI components. */

/** Seconds → "m:ss" (countdowns). */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

/** Seconds → "1h 05m", "12m", "45s". */
export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}

/** "1 day" / "3 days" */
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
