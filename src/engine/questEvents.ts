/**
 * Quest event names. Content quests (content/shared/quests.yaml) name the
 * event they listen to; several spellings are accepted and canonicalized, so
 * "answer.correct", "correct" and "challenge.correct" are the same event.
 * Ported unchanged from legacy/src/engine/progress.js (ALIASES).
 */
export const QUEST_EVENT_ALIASES = {
  'lesson.done': ['lesson.done', 'lesson', 'lessons', 'lesson.complete'],
  correct: ['correct', 'challenge.correct', 'answer.correct', 'answer'],
  'boss.round': ['boss.round', 'boss.hit'],
  'hint.none': ['hint.none', 'nohint', 'no.hint'],
  combo: ['combo', 'streak.combo', 'inarow', 'in-a-row'],
  harden: ['harden', 'hardened', 'defense.correct', 'defensive.correct', 'defense', 'defend'],
  review: ['review', 'review.done', 'srs.review', 'reviews', 'srs'],
  'boss.beaten': ['boss', 'boss.beaten', 'boss.win', 'boss.done'],
  'project.done': ['project', 'project.done', 'project.complete'],
  'practice.done': ['practice', 'practice.done', 'arena'],
  xp: ['xp', 'xp.earned'],
  minutes: ['minutes', 'time', 'goal'],
  perfect: ['perfect', 'lesson.perfect'],
  bug: ['bug', 'bestiary', 'bug.defeated'],
} as const;

export type QuestEvent = keyof typeof QUEST_EVENT_ALIASES;

const CANON = new Map<string, QuestEvent>();
for (const [k, list] of Object.entries(QUEST_EVENT_ALIASES) as [QuestEvent, readonly string[]][]) {
  for (const a of list) CANON.set(a, k);
}

/** Canonical event name, or the input unchanged when unknown. */
export function canonQuestEvent(e: string): string {
  const s = String(e ?? '');
  return CANON.get(s.toLowerCase()) ?? s;
}

export function isKnownQuestEvent(e: string): boolean {
  return CANON.has(String(e ?? '').toLowerCase());
}
