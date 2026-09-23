/** Small helpers for session screens. */

/** Fisher-Yates shuffle (copy). */
export function shuffled<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
