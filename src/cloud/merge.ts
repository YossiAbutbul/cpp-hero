/**
 * Pure merge of two saves (this device vs the cloud copy). No Firebase here.
 *
 * Rules (never lose progress, never regress):
 * - Progress only grows: XP, counters, stats, streak.best = max; lessons,
 *   bosses, projects, achievements, worlds, vault, bestiary, owned cosmetics
 *   = union (done/beaten flags OR'ed, best scores max, first completion time).
 * - Things that are choices, not progress (profile name/look, settings,
 *   equipped cosmetics, hearts) come from the save edited last (updatedAt;
 *   a tie goes to `a`).
 * - Day-scoped things (streak, daily quests) come from the later day; on the
 *   same day they are merged with max / OR.
 * The result is deterministic, idempotent (merge(a, a) equals a), and its
 * progress fields are the same whichever argument order is used.
 */
import { SAVE_VERSION } from '../engine/config';
import { levelInfo } from '../engine/progress';
import { defaultSave, type QuestProgress, type SaveV1, type Skill, type SrsEntry } from '../engine/save';
import { clone, isObj } from '../engine/util';

const maxN = (a: number, b: number): number => Math.max(+a || 0, +b || 0);
const minIso = (a: string, b: string): string => (!a ? b : !b ? a : a < b ? a : b);
const maxIso = (a: string, b: string): string => (!a ? b : !b ? a : a > b ? a : b);

/** Union keeping a's order, then b's new items. */
function union(a: readonly string[], b: readonly string[]): string[] {
  const out = [...a];
  const seen = new Set(a);
  for (const x of b) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Merge two id-keyed maps with a per-entry merge (entries only on one side are copied). */
function mergeMap<T>(a: Record<string, T>, b: Record<string, T>, f: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(a)) out[k] = clone(a[k] as T);
  for (const k of Object.keys(b)) {
    const bv = b[k] as T;
    out[k] = k in a ? f(a[k] as T, bv) : clone(bv);
  }
  return out;
}

const worldNum = (id: string): number => Number(/\d+/.exec(id)?.[0] ?? 1e9);

/** a wins ties: true when a was edited at the same time or later. */
const aIsNewer = (a: SaveV1, b: SaveV1): boolean => (a.updatedAt || '') >= (b.updatedAt || '');

function mergeSrs(x: SrsEntry, y: SrsEntry): SrsEntry {
  // More reviews = more recent knowledge. Tie: the later due date (more confident box).
  const nx = (x.right || 0) + (x.wrong || 0);
  const ny = (y.right || 0) + (y.wrong || 0);
  const pick = nx !== ny ? (nx > ny ? x : y) : (x.due || '') >= (y.due || '') ? x : y;
  return clone(pick);
}

function mergeQuests(a: QuestProgress[], b: QuestProgress[]): QuestProgress[] {
  const byId = new Map(b.map((q) => [q.id, q]));
  const out = a.map((q) => {
    const o = byId.get(q.id);
    if (!o) return clone(q);
    return {
      id: q.id,
      progress: maxN(q.progress, o.progress),
      done: !!(q.done || o.done),
      claimed: !!(q.claimed || o.claimed),
    };
  });
  const ids = new Set(a.map((q) => q.id));
  for (const q of b) if (!ids.has(q.id)) out.push(clone(q));
  return out;
}

/**
 * Merge two saves (both already migrated to the current version).
 * Returns a new object; inputs are not modified.
 */
export function mergeSaves(a: SaveV1, b: SaveV1): SaveV1 {
  const newer = aIsNewer(a, b) ? a : b;
  const out = clone(newer);

  out.v = Math.max(a.v, b.v, SAVE_VERSION);
  out.createdAt = minIso(a.createdAt, b.createdAt);
  out.updatedAt = maxIso(a.updatedAt, b.updatedAt);

  // Profile: choices from the newer save, one-way flags OR'ed.
  out.profile.onboarded = !!(a.profile.onboarded || b.profile.onboarded);
  out.profile.placementDone = !!(a.profile.placementDone || b.profile.placementDone);

  out.xp = maxN(a.xp, b.xp);
  out.level = levelInfo(out.xp).level;

  out.hearts.max = maxN(a.hearts.max, b.hearts.max);
  out.hearts.n = Math.min(out.hearts.n, out.hearts.max);

  // Streak: the later day decides; same day = max.
  const sa = a.streak;
  const sb = b.streak;
  if ((sa.lastDay || '') === (sb.lastDay || '')) {
    out.streak = {
      days: maxN(sa.days, sb.days),
      lastDay: sa.lastDay,
      freezes: maxN(sa.freezes, sb.freezes),
      best: maxN(sa.best, sb.best),
    };
  } else {
    const later = (sa.lastDay || '') > (sb.lastDay || '') ? sa : sb;
    out.streak = { ...clone(later), best: maxN(sa.best, sb.best) };
  }
  out.streak.best = Math.max(out.streak.best, out.streak.days);

  // Daily quests: the later day decides; same day = merged.
  const da = a.daily;
  const db = b.daily;
  if ((da.day || '') === (db.day || '')) {
    out.daily = {
      day: da.day,
      minutes: maxN(da.minutes, db.minutes),
      quests: mergeQuests(da.quests, db.quests),
    };
  } else {
    out.daily = clone((da.day || '') > (db.day || '') ? da : db);
  }

  for (const k of Object.keys(out.stats) as Skill[]) out.stats[k] = maxN(a.stats[k], b.stats[k]);

  out.lessons = mergeMap(a.lessons, b.lessons, (x, y) => {
    const done = !!(x.done || y.done);
    const at = x.done && y.done ? minIso(x.at, y.at) : x.done ? x.at : y.done ? y.at : maxIso(x.at, y.at);
    return { done, best: maxN(x.best, y.best), at };
  });
  out.projects = mergeMap(a.projects, b.projects, (x, y) => ({
    done: !!(x.done || y.done),
    step: maxN(x.step, y.step),
  }));
  out.bosses = mergeMap(a.bosses, b.bosses, (x, y) => {
    const beaten = !!(x.beaten || y.beaten);
    const at =
      x.beaten && y.beaten ? minIso(x.at, y.at) : x.beaten ? x.at : y.beaten ? y.at : maxIso(x.at, y.at);
    return { beaten, at };
  });
  out.worldsUnlocked = union(a.worldsUnlocked, b.worldsUnlocked).sort((x, y) => worldNum(x) - worldNum(y));
  out.srs = mergeMap(a.srs, b.srs, mergeSrs);
  out.vault = union(a.vault, b.vault);
  out.bestiary = union(a.bestiary, b.bestiary);
  out.achievements = mergeMap(a.achievements, b.achievements, minIso);

  out.cosmetics.owned = union(a.cosmetics.owned, b.cosmetics.owned);
  const eq = out.cosmetics.equipped;
  // Equipped items must be owned (they always are, after the union).
  if (eq.hat && !out.cosmetics.owned.includes(eq.hat)) eq.hat = null;
  if (eq.shield && !out.cosmetics.owned.includes(eq.shield)) eq.shield = null;

  const ca = a.counters;
  const cb = b.counters;
  out.counters = {
    correct: maxN(ca.correct, cb.correct),
    wrong: maxN(ca.wrong, cb.wrong),
    bestCombo: maxN(ca.bestCombo, cb.bestCombo),
    hardened: maxN(ca.hardened, cb.hardened),
    reviews: maxN(ca.reviews, cb.reviews),
    secondsPlayed: maxN(ca.secondsPlayed, cb.secondsPlayed),
    byTag: mergeMap(ca.byTag, cb.byTag, (x, y) => ({ r: maxN(x.r, y.r), w: maxN(x.w, y.w) })),
  };
  return out;
}

/** JSON with sorted object keys (Firestore returns map keys in any order). */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (isObj(v)) {
    return (
      '{' +
      Object.keys(v)
        .filter((k) => v[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stableStringify(v[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(v) ?? 'null';
}

/** Same content, ignoring the updatedAt stamp. */
export function sameSave(a: SaveV1, b: SaveV1): boolean {
  return stableStringify({ ...a, updatedAt: '' }) === stableStringify({ ...b, updatedAt: '' });
}

/** Size caps shared with firestore.rules (keep them in sync). */
export const CLOUD_LIMITS = {
  name: 40,
  shortString: 64,
  isoString: 40,
  lessons: 500,
  projects: 100,
  bosses: 100,
  worlds: 64,
  srs: 5000,
  vault: 2000,
  bestiary: 1000,
  achievements: 500,
  owned: 200,
  byTag: 3000,
  quests: 10,
} as const;

/**
 * Project a save onto exactly the keys the cloud accepts (firestore.rules
 * uses hasOnly on these objects): drops unknown keys that old or hand-edited
 * saves may carry and clips the profile name. Id-keyed maps are kept as is.
 */
export function toCloudSave(save: SaveV1): SaveV1 {
  const def = defaultSave() as unknown as Record<string, unknown>;
  const src = save as unknown as Record<string, unknown>;
  const fixed = new Set([
    'profile',
    'settings',
    'hearts',
    'streak',
    'daily',
    'stats',
    'cosmetics',
    'counters',
  ]);
  const pick = (o: Record<string, unknown>, d: Record<string, unknown>): Record<string, unknown> => {
    const r: Record<string, unknown> = {};
    for (const k of Object.keys(d)) r[k] = o[k];
    return r;
  };
  const out = pick(src, def);
  for (const k of fixed) out[k] = pick(src[k] as Record<string, unknown>, def[k] as Record<string, unknown>);
  const cos = out.cosmetics as SaveV1['cosmetics'];
  cos.equipped = pick(
    cos.equipped as unknown as Record<string, unknown>,
    (def.cosmetics as SaveV1['cosmetics']).equipped as unknown as Record<string, unknown>,
  ) as unknown as SaveV1['cosmetics']['equipped'];
  const s = clone(out) as unknown as SaveV1;
  s.profile.name = String(s.profile.name).slice(0, CLOUD_LIMITS.name);
  s.daily.quests = s.daily.quests.slice(0, CLOUD_LIMITS.quests).map((q) => ({
    id: String(q.id),
    progress: +q.progress || 0,
    done: !!q.done,
    claimed: !!q.claimed,
  }));
  return s;
}

/** True when a save is a fresh start (what a cloud reset must look like). */
export function isFreshProgress(s: SaveV1): boolean {
  return (
    s.xp === 0 &&
    Object.keys(s.lessons).length === 0 &&
    Object.keys(s.bosses).length === 0 &&
    Object.keys(s.projects).length === 0 &&
    Object.keys(s.achievements).length === 0 &&
    s.vault.length === 0 &&
    s.bestiary.length === 0
  );
}
