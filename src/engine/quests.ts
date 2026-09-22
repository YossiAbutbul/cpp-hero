/**
 * Daily quests (ported from legacy progress.js). Three quests are picked per
 * day with a PRNG seeded by the date, so every reload shows the same ones.
 * Progress is a running sum, except "combo" (and mode: max) which keeps the
 * best value seen. Completing a quest claims it right away; the caller adds
 * its XP (see game.ts), so XP quests never recurse into themselves.
 */
import type { Quest } from '../content/schema';
import { DAILY_QUEST_COUNT, MAX_FREEZES } from './config';
import { canonQuestEvent } from './questEvents';
import type { SaveV1 } from './save';
import { dayStr, seeded, shuffle } from './util';

/** Used only when content has no quests. */
export const DEFAULT_QUESTS: readonly Quest[] = [
  { id: 'q-lessons2', text: 'Complete 2 lessons', goal: 2, event: 'lesson.done', xp: 20 },
  { id: 'q-combo5', text: 'Get 5 correct in a row', goal: 5, event: 'combo', xp: 20 },
  { id: 'q-harden3', text: 'Harden 3 snippets', goal: 3, event: 'harden', xp: 25 },
  { id: 'q-review3', text: 'Review 3 old concepts', goal: 3, event: 'review', xp: 20 },
  { id: 'q-correct10', text: 'Answer 10 challenges correctly', goal: 10, event: 'correct', xp: 20 },
  { id: 'q-xp50', text: 'Earn 50 XP', goal: 50, event: 'xp', xp: 15 },
];

/** XP for a quest (legacy default 20 when missing/0). */
export const questXp = (q: Quest): number => q.xp || 20;

/** Make sure today's quests are picked. Returns true when the daily block was (re)created. */
export function ensureDaily(save: SaveV1, defs: readonly Quest[], today: Date): boolean {
  const d = save.daily;
  const t = dayStr(today);
  const valid = d.quests.every((q) => defs.some((x) => x.id === q.id));
  if (d.day === t && d.quests.length && valid) return false;
  const picks = shuffle(defs, seeded('quests-' + t)).slice(0, Math.min(DAILY_QUEST_COUNT, defs.length));
  save.daily = {
    day: t,
    minutes: d.day === t ? d.minutes : 0,
    quests: picks.map((q) => ({ id: q.id, progress: 0, done: false, claimed: false })),
  };
  return true;
}

export interface QuestEventResult {
  changed: boolean;
  /** Quests completed by this event (their XP is still to be added by the caller). */
  completed: Quest[];
  /** All of today's quests are done now, and a streak freeze was added. */
  freezeEarned: boolean;
}

export function questEvent(
  save: SaveV1,
  defs: readonly Quest[],
  evt: string,
  value: number | undefined,
  today: Date,
): QuestEventResult {
  if (save.daily.day !== dayStr(today)) ensureDaily(save, defs, today);
  const d = save.daily;
  const c = canonQuestEvent(evt);
  const res: QuestEventResult = { changed: false, completed: [], freezeEarned: false };
  for (const q of d.quests) {
    if (q.done) continue;
    const def = defs.find((x) => x.id === q.id);
    if (!def || canonQuestEvent(def.event) !== c) continue;
    const goal = def.goal || 1;
    if (c === 'combo' || def.mode === 'max') q.progress = Math.max(q.progress, value ?? 0);
    else q.progress += value ?? 1;
    q.progress = Math.min(goal, q.progress);
    res.changed = true;
    if (q.progress >= goal) {
      q.done = true;
      q.claimed = true;
      res.completed.push(def);
      if (d.quests.every((x) => x.done) && save.streak.freezes < MAX_FREEZES) {
        save.streak.freezes++;
        res.freezeEarned = true;
      }
    }
  }
  return res;
}
