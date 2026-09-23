/**
 * Answer matching for `fill` and `write` challenges (exact port of legacy
 * engine/challenges.js normalize/matches):
 *   straighten smart quotes, NBSP → space, trim, collapse whitespace, then drop
 *   spaces around punctuation  ( ) { } [ ] ; , < > = + - * / & | ! :
 * `accept` strings are normalized the same way and compared for equality;
 * `acceptRe` regex sources are tested against the NORMALIZED input.
 */
export function normalizeAnswer(s: unknown): string {
  return String(s ?? '')
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([(){}[\];,<>=+\-*/&|!:])\s*/g, '$1');
}

export interface Acceptable {
  accept?: readonly string[];
  acceptRe?: readonly string[];
}

export function matchesAnswer(input: string, ch: Acceptable): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  if ((ch.accept ?? []).some((a) => normalizeAnswer(a) === n)) return true;
  return (ch.acceptRe ?? []).some((r) => {
    try {
      return new RegExp(r).test(n);
    } catch {
      return false; // invalid regexes are reported by `npm run validate`
    }
  });
}

/** Edit distance counting insert / delete / substitute / swap of two neighbours as 1. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/**
 * A wrong answer that is nearly right: it matches an `accept` string once
 * case, spaces and semicolons are ignored, or it is a small typo away
 * (1 edit up to 4 characters, 2 up to 10, 3 beyond). Picks the "Close! …"
 * nudge over a neutral one.
 */
export function isNearMiss(input: string, ch: Acceptable): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  const loose = (s: string) => s.toLowerCase().replace(/[\s;]/g, '');
  return (ch.accept ?? []).some((raw) => {
    const a = normalizeAnswer(raw);
    if (!a) return false;
    if (loose(a) === loose(n)) return true;
    const len = Math.max(a.length, n.length);
    const allowed = len <= 4 ? 1 : len <= 10 ? 2 : 3;
    return editDistance(a, n) <= allowed;
  });
}
