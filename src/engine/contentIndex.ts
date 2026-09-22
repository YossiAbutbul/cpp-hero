/**
 * Lookup tables over the content (ported from legacy progress.js buildIndex).
 * Build once per content version (content hot-reloads in dev).
 */
import type { Challenge, Content, Lesson, Skill, VaultCard, World } from '../content/schema';

export type ChallengeKind = 'lesson' | 'project' | 'stress' | 'boss' | 'defense';

export interface ChallengeRef {
  ch: Challenge;
  kind: ChallengeKind;
  world: World;
  /** Only for kind 'lesson'. */
  lesson: Lesson | null;
}

export interface ContentIndex {
  /** Worlds sorted by num. */
  worlds: World[];
  world: Record<string, World>;
  lesson: Record<string, Lesson>;
  /** World and position of each lesson. */
  lessonMeta: Record<string, { world: World; index: number }>;
  challenge: Record<string, ChallengeRef>;
  byType: Record<string, string[]>;
  vault: Record<string, { card: VaultCard; world: World; lesson: Lesson }>;
  /** Skill of the first lesson that uses a tag (for per-topic stats). */
  tagSkill: Record<string, Skill>;
  /** How many challenges reference each bestiary bug. */
  bugRefs: Record<string, number>;
}

export function buildIndex(content: Content): ContentIndex {
  const worlds = [...content.worlds].sort((a, b) => a.num - b.num);
  const idx: ContentIndex = {
    worlds,
    world: {},
    lesson: {},
    lessonMeta: {},
    challenge: {},
    byType: {},
    vault: {},
    tagSkill: {},
    bugRefs: {},
  };
  const addCh = (ch: Challenge, kind: ChallengeKind, world: World, lesson: Lesson | null = null) => {
    idx.challenge[ch.id] = { ch, kind, world, lesson };
    (idx.byType[ch.type] ??= []).push(ch.id);
    if (lesson) for (const t of ch.tags) idx.tagSkill[t] ??= lesson.skill;
    if (ch.bug) idx.bugRefs[ch.bug] = (idx.bugRefs[ch.bug] ?? 0) + 1;
  };
  for (const w of worlds) {
    idx.world[w.id] = w;
    w.lessons.forEach((l, i) => {
      idx.lesson[l.id] = l;
      idx.lessonMeta[l.id] = { world: w, index: i };
      l.challenges.forEach((ch) => addCh(ch, 'lesson', w, l));
      l.vault.forEach((card) => (idx.vault[card.id] = { card, world: w, lesson: l }));
    });
    w.project.steps.forEach((ch) => addCh(ch, 'project', w));
    w.project.stress.attacks.forEach((a) => addCh(a.challenge, 'stress', w));
    w.boss.rounds.forEach((ch) => addCh(ch, 'boss', w));
    w.boss.defense.forEach((d) => addCh(d.challenge, 'defense', w));
  }
  return idx;
}
