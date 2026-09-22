/**
 * Cosmetics: content cosmetics + built-in level rewards, and the unlock rule
 * for each (ported from legacy progress.js cosmeticTest).
 */
import type { Cosmetic } from '../content/schema';

/** Engine level-up rewards (ids chosen not to collide with content cosmetics). */
export const BUILTIN_COSMETICS: readonly Cosmetic[] = [
  { id: 'cap-sky', slot: 'hat', name: 'Sky Cap', source: 'Reach level 3' },
  { id: 'bow-ribbon', slot: 'hat', name: 'Bow Ribbon', source: 'Reach level 5' },
  { id: 'antenna-bobble', slot: 'hat', name: 'Antenna Bobble', source: 'Reach level 8' },
  { id: 'tophat', slot: 'hat', name: 'Top Hat', source: 'Reach level 12' },
  { id: 'halo-ring', slot: 'hat', name: 'Halo', source: 'Reach level 18' },
];

export function allCosmetics(content: readonly Cosmetic[]): Cosmetic[] {
  const list = content.slice();
  for (const c of BUILTIN_COSMETICS) if (!list.some((x) => x.id === c.id)) list.push(c);
  return list;
}

/**
 * How a cosmetic is earned, as an achievement-DSL test: its explicit `test`,
 * else parsed from the display text `source` ("Reach level 5" → level:5).
 * 'start' = owned from the start. null = granted directly (e.g. boss rewards).
 */
export function cosmeticTest(def: Cosmetic): string | null {
  if (def.test) return def.test;
  const src = String(def.source ?? '');
  let m: RegExpExecArray | null;
  if (/from the start/i.test(src)) return 'start';
  if ((m = /level (\d+)/i.exec(src))) return 'level:' + m[1];
  if ((m = /(\d+)\s*lessons?/i.exec(src))) return 'lessons:' + m[1];
  if ((m = /(\d+)-day streak/i.exec(src))) return 'streak:' + m[1];
  if ((m = /(\d+)-answer combo/i.exec(src))) return 'combo:' + m[1];
  if ((m = /(\d+)\s*reviews?/i.exec(src))) return 'reviews:' + m[1];
  if ((m = /harden (\d+)/i.exec(src))) return 'hardened:' + m[1];
  if (/final boss/i.test(src)) return 'world:w16';
  if ((m = /world (\d+)/i.exec(src))) return 'world:w' + m[1];
  return null;
}
