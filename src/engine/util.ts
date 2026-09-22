/** Small pure helpers shared by the engine modules (ported from legacy engine/core.js). */

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Local calendar day "YYYY-MM-DD". */
export function dayStr(d: Date = new Date()): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

/** Whole days from day string a to day string b (b - a). Infinity when either is empty. */
export function dayDiff(a: string, b: string): number {
  if (!a || !b) return Infinity;
  const [ya = 0, ma = 1, da = 1] = a.split('-').map(Number);
  const [yb = 0, mb = 1, db = 1] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** 32-bit FNV-1a hash of a string. */
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** Deterministic PRNG (mulberry32) from a string seed. */
export function seeded(seed: string): Rng {
  let s = hash(seed);
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Deep clone of JSON-able data. */
export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object' && !Array.isArray(o);
