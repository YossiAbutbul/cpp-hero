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
