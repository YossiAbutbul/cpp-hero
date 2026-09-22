/**
 * Achievement test DSL (content/shared/achievements.yaml `test`):
 *   lessons:N  combo:N  streak:N  bestiary:<bug id>|N  hardened:N  world:wN
 *   perfect:N  reviews:N   (extras: xp:N level:N correct:N bosses:N vault:N projects:N)
 * Ported unchanged from legacy progress.js.
 */
import type { SaveV1 } from './save';

const countWhere = <T>(rec: Record<string, T>, pred: (v: T) => boolean): number =>
  Object.values(rec).filter(pred).length;

export function testAchievement(s: SaveV1, test: string): boolean {
  const m = /^([a-z]+):(.+)$/.exec(String(test ?? '').trim());
  if (!m) return false;
  const kind = m[1]!;
  const arg = m[2]!;
  const n = Number(arg);
  switch (kind) {
    case 'lessons':
      return countWhere(s.lessons, (l) => !!l?.done) >= n;
    case 'combo':
      return s.counters.bestCombo >= n;
    case 'streak':
      return Math.max(s.streak.best, s.streak.days) >= n;
    case 'bestiary':
      return Number.isNaN(n) ? s.bestiary.includes(arg) : s.bestiary.length >= n;
    case 'hardened':
      return s.counters.hardened >= n;
    case 'world':
      return !!s.bosses[arg + '.boss']?.beaten;
    case 'perfect':
      return countWhere(s.lessons, (l) => !!l?.done && l.best >= 1) >= n;
    case 'reviews':
      return s.counters.reviews >= n;
    case 'xp':
      return s.xp >= n;
    case 'level':
      return s.level >= n;
    case 'correct':
      return s.counters.correct >= n;
    case 'bosses':
      return countWhere(s.bosses, (b) => !!b?.beaten) >= n;
    case 'vault':
      return s.vault.length >= n;
    case 'projects':
      return countWhere(s.projects, (p) => !!p?.done) >= n;
    default:
      return false; // unknown kinds are reported by `npm run validate`
  }
}
