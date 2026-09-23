/**
 * Engine constants and feature flags. Rules are ported unchanged from the
 * legacy engine (legacy/src/engine/{progress,session,challenges}.js) unless
 * a comment says otherwise.
 */

/**
 * SOUND_ENABLED=false turns ALL audio off: no AudioContext is created, SFX
 * and music are no-ops and the Sound/Music settings are hidden.
 * (settings.sound / settings.music stay in the save for format stability.)
 */
export const SOUND_ENABLED = false;

/** localStorage key and current save format version (docs/ARCHITECTURE.md "Save format"). */
export const SAVE_KEY = 'cpphero.save';
export const SAVE_VERSION = 1;

/** Hearts per boss fight (engine/hearts.ts). Also the old save's hearts.max default. */
export const DEFAULT_MAX_HEARTS = 5;

/** Leitner boxes 1..5 → review again after this many days. */
export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 16] as const;

/** XP cost of hint tier 1, 2, 3 (tier 3 = the answer). */
export const HINT_COST = [2, 3, 5] as const;

/** Base XP for a correct first-try answer, by session mode. */
export const BASE_XP = {
  lesson: 10,
  boss: 12,
  project: 8,
  practice: 15,
  review: 8,
  placement: 0,
} as const;
export type SessionMode = keyof typeof BASE_XP;

/** Modes that offer a second try after a miss (never boss / placement). */
export const RETRY_MODES: readonly SessionMode[] = ['lesson', 'project', 'practice', 'review'];
/** Consolation XP for getting it right on the second try. */
export const RETRY_XP = 2;
/** Stress-test attacks in a project: base XP (× combo multiplier). */
export const STRESS_XP = 12;
/** Finishing a project. */
export const PROJECT_BONUS_XP = 30;
/** Finishing a lesson: 10, +10 more when every challenge was right on the first try. */
export const LESSON_BONUS_XP = 10;
export const PERFECT_LESSON_BONUS_XP = 10;

/** Streak freezes: at most 3; +1 every 5 streak days and when all daily quests are done. */
export const MAX_FREEZES = 3;
export const FREEZE_EVERY_STREAK_DAYS = 5;

/** Daily quests picked per day. */
export const DAILY_QUEST_COUNT = 3;

/** Challenge types grouped by behavior. */
export const DEFENSIVE_TYPES = ['bug', 'breakit', 'harden', 'review', 'edge', 'safe'] as const;
export const TIMED_TYPES = ['speed', 'safe'] as const;

/** Level-up rewards (hat cosmetics built into the engine). */
export const LEVEL_COSMETICS: Readonly<Record<number, string>> = {
  3: 'cap-sky',
  5: 'bow-ribbon',
  8: 'antenna-bobble',
  12: 'tophat',
  18: 'halo-ring',
};

/** Starter looks offered during onboarding (the one you pick becomes owned). */
export const STARTER_COLORS = ['classic', 'berry', 'mint', 'sky'] as const;

/** Curlo's shield tier from the Defense stat: 1 wood, 2 steel + helm (25+), 3 golden guard (60+). */
export const shieldTier = (defense: number): 1 | 2 | 3 => (defense >= 60 ? 3 : defense >= 25 ? 2 : 1);
