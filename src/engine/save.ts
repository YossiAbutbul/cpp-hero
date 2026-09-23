/**
 * Save format v1 (docs/ARCHITECTURE.md "Save format"), byte-compatible with
 * the legacy app (legacy/src/engine/store.js) so existing progress imports:
 * same localStorage key, same field names and defaults, same migrate() rules.
 */
import { DEFAULT_MAX_HEARTS, SAVE_VERSION } from './config';
import { levelInfo } from './progress';
import { clamp, clone, isObj } from './util';

export type TextSize = 's' | 'm' | 'l';
export type Skill = 'logic' | 'structure' | 'memory' | 'toolkit' | 'defense';

export interface QuestProgress {
  id: string;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export interface SrsEntry {
  /** Leitner box 1..5 */
  box: number;
  /** ISO time when it is due again */
  due: string;
  wrong: number;
  right: number;
}

export interface SaveV1 {
  v: number;
  createdAt: string;
  updatedAt: string;
  profile: {
    name: string;
    variant: string;
    dailyGoalMin: number;
    onboarded: boolean;
    placementDone: boolean;
  };
  settings: { sound: boolean; music: boolean; reduceMotion: boolean; textSize: TextSize };
  xp: number;
  /** Derived from xp on load (see migrate). */
  level: number;
  hearts: { n: number; max: number; lastRefill: string };
  streak: { days: number; lastDay: string; freezes: number; best: number };
  daily: { day: string; minutes: number; quests: QuestProgress[] };
  /** 0..100 each */
  stats: Record<Skill, number>;
  /** best = accuracy 0..1 */
  lessons: Record<string, { done: boolean; best: number; at: string }>;
  projects: Record<string, { done: boolean; step: number }>;
  bosses: Record<string, { beaten: boolean; at: string }>;
  worldsUnlocked: string[];
  srs: Record<string, SrsEntry>;
  vault: string[];
  bestiary: string[];
  /** achievement id → unlock time (ISO) */
  achievements: Record<string, string>;
  cosmetics: { owned: string[]; equipped: { hat: string | null; color: string; shield: string | null } };
  counters: {
    correct: number;
    wrong: number;
    bestCombo: number;
    hardened: number;
    reviews: number;
    secondsPlayed: number;
    /** per concept tag, plus "bug:<id>" keys for bestiary progress */
    byTag: Record<string, { r: number; w: number }>;
  };
}

/** A fresh save. */
export function defaultSave(now: Date = new Date()): SaveV1 {
  const iso = now.toISOString();
  return {
    v: SAVE_VERSION,
    createdAt: iso,
    updatedAt: iso,
    profile: { name: 'Curlo', variant: 'classic', dailyGoalMin: 10, onboarded: false, placementDone: false },
    settings: { sound: true, music: false, reduceMotion: false, textSize: 'm' },
    xp: 0,
    level: 1,
    hearts: { n: DEFAULT_MAX_HEARTS, max: DEFAULT_MAX_HEARTS, lastRefill: iso },
    streak: { days: 0, lastDay: '', freezes: 0, best: 0 },
    daily: { day: '', minutes: 0, quests: [] },
    stats: { logic: 0, structure: 0, memory: 0, toolkit: 0, defense: 0 },
    lessons: {},
    projects: {},
    bosses: {},
    worldsUnlocked: ['w1'],
    srs: {},
    vault: [],
    bestiary: [],
    achievements: {},
    cosmetics: { owned: ['classic'], equipped: { hat: null, color: 'classic', shield: null } },
    counters: { correct: 0, wrong: 0, bestCombo: 0, hardened: 0, reviews: 0, secondsPlayed: 0, byTag: {} },
  };
}

/**
 * Fill missing keys from defaults (recursively for plain objects) so a save
 * written by an older build (or hand-edited) still has every field.
 * Values present in `obj` win; values whose type doesn't match are replaced.
 * Maps keyed by id (lessons, srs, ...) have empty defaults and are kept as is.
 * (Exact port of the legacy fillDefaults.)
 */
export function fillDefaults(
  obj: Record<string, unknown>,
  def: Record<string, unknown>,
): Record<string, unknown> {
  for (const k of Object.keys(def)) {
    const dv = def[k];
    const ov = obj[k];
    if (ov === undefined || (ov === null && dv !== null)) {
      obj[k] = clone(dv === undefined ? null : dv);
      continue;
    }
    if (isObj(dv)) {
      if (!isObj(ov)) {
        obj[k] = clone(dv);
        continue;
      }
      if (Object.keys(dv).length) fillDefaults(ov, dv);
    } else if (Array.isArray(dv)) {
      if (!Array.isArray(ov)) obj[k] = clone(dv);
    } else if (typeof dv !== typeof ov && dv !== null) {
      obj[k] = dv;
    }
  }
  return obj;
}

export class SaveError extends Error {
  override name = 'SaveError';
}

/**
 * Upgrade an older (or partial) save to the current version, in place, and
 * return it. Add a step per version bump:  if (s.v === 1) { ...; s.v = 2; }
 * Throws SaveError for non-objects and saves from a NEWER version.
 */
export function migrate(input: unknown, now: Date = new Date()): SaveV1 {
  if (!isObj(input)) throw new SaveError('Save is not an object');
  const s = input;
  if (typeof s.v !== 'number') s.v = 1; // pre-versioned saves = v1 shape
  if ((s.v as number) > SAVE_VERSION) {
    throw new SaveError(`This save comes from a newer version of Cpp Hero (v${String(s.v)}).`);
  }
  // (No migrations yet: v1 is the first format.)
  fillDefaults(s, defaultSave(now) as unknown as Record<string, unknown>);
  const save = s as unknown as SaveV1;
  // Id-keyed maps: drop entries of the wrong kind (hand-edited / broken saves) so the
  // game never reads e.g. lessons.x.done on null.
  const keepObjects = (m: Record<string, unknown>) => {
    for (const k of Object.keys(m)) if (!isObj(m[k])) delete m[k];
  };
  keepObjects(save.lessons);
  keepObjects(save.projects);
  keepObjects(save.bosses);
  keepObjects(save.srs);
  keepObjects(save.counters.byTag);
  for (const k of Object.keys(save.achievements))
    if (typeof save.achievements[k] !== 'string') delete save.achievements[k];
  for (const key of ['worldsUnlocked', 'vault', 'bestiary'] as const)
    save[key] = save[key].filter((x): x is string => typeof x === 'string');
  save.cosmetics.owned = save.cosmetics.owned.filter((x): x is string => typeof x === 'string');
  // Sanity clamps (same as legacy).
  save.hearts.max = clamp(+save.hearts.max || DEFAULT_MAX_HEARTS, 1, 10);
  save.hearts.n = clamp(+save.hearts.n || 0, 0, save.hearts.max);
  for (const k of Object.keys(save.stats) as Skill[]) save.stats[k] = clamp(+save.stats[k] || 0, 0, 100);
  if (!['s', 'm', 'l'].includes(save.settings.textSize)) save.settings.textSize = 'm';
  if (!save.worldsUnlocked.includes('w1')) save.worldsUnlocked.unshift('w1');
  if (!save.cosmetics.owned.includes('classic')) save.cosmetics.owned.unshift('classic');
  if (!isObj(save.cosmetics.equipped))
    save.cosmetics.equipped = { hat: null, color: 'classic', shield: null };
  save.xp = Math.max(0, Math.round(+save.xp || 0));
  // Level is derived from XP (keeps imported / hand-edited saves consistent).
  // NOTE: the level curve is slower than the legacy one, so a legacy save
  // shows a lower level after import; its XP and unlocks are unchanged.
  save.level = levelInfo(save.xp).level;
  save.v = SAVE_VERSION;
  return save;
}

/** Light shape check for imported files. Throws SaveError with a friendly message. */
export function validateImport(o: unknown): asserts o is Record<string, unknown> {
  if (!isObj(o)) throw new SaveError('That file isn’t a Cpp Hero save.');
  if (typeof o.v !== 'number') throw new SaveError('Missing save version (v).');
  if (!isObj(o.profile) || !isObj(o.settings))
    throw new SaveError('The save is missing profile or settings.');
  if (o.lessons != null && !isObj(o.lessons)) throw new SaveError('Lessons data is malformed.');
  if (o.worldsUnlocked != null && !Array.isArray(o.worldsUnlocked))
    throw new SaveError('worldsUnlocked is malformed.');
}

export const MAX_IMPORT_CHARS = 3_000_000;

/** Parse + validate + migrate an exported JSON string. Throws SaveError. */
export function parseImport(json: string, now: Date = new Date()): SaveV1 {
  // A full save (even with thousands of review cards) is well under this; bigger input would only fill up storage.
  if (json.length > MAX_IMPORT_CHARS) throw new SaveError('That file is too big to be a Cpp Hero save.');
  let o: unknown;
  try {
    o = JSON.parse(json);
  } catch {
    throw new SaveError('That file isn’t valid JSON.');
  }
  validateImport(o);
  return migrate(o, now);
}
