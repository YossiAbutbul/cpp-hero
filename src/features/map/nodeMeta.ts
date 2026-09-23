/** Labels, routes and small facts about map nodes (shared by the map, its sheet and the start flow). */
import type { MapNode } from '@/engine/game';
import type { Skill } from '@/content/schema';

export const SKILL_NAMES: Record<Skill, string> = {
  logic: 'Logic',
  structure: 'Structure',
  memory: 'Memory',
  toolkit: 'Toolkit',
  defense: 'Defense',
};
export const SKILL_COLORS: Record<Skill, string> = {
  logic: 'var(--sky)',
  structure: 'var(--teal)',
  memory: 'var(--sun-d)',
  toolkit: 'var(--tang)',
  defense: 'var(--coral-d)',
};

/** Where "earn a heart" / "review" goes (the practice screen reads ?review=1). */
export const REVIEW_PATH = '/practice?review=1';

export function nodePath(n: MapNode): string {
  if (n.kind === 'lesson') return `/lesson/${n.id}`;
  return n.kind === 'project' ? `/project/${n.world.id}` : `/boss/${n.world.id}`;
}

export function nodeTitle(n: MapNode): string {
  if (n.kind === 'lesson') return n.lesson.title;
  if (n.kind === 'project') return n.world.project.title;
  return n.world.boss.name;
}

export function nodeKind(n: MapNode): string {
  if (n.kind === 'lesson') return (n.lesson.shield ? 'Shield lesson ' : 'Lesson ') + (n.i + 1);
  return n.kind === 'project' ? 'Project' : 'Boss';
}

/** Rough play time in minutes (concept + demo + challenges). */
export function lessonMinutes(n: Extract<MapNode, { kind: 'lesson' }>): number {
  const l = n.lesson;
  return Math.max(3, Math.round(1.5 + (l.demo ? 1 : 0) + l.challenges.length * 0.6));
}

/** Why a locked node is locked (toast text). */
export function lockedReason(n: MapNode, worldOpen: boolean): string {
  const w = n.world;
  if (!worldOpen) return `Beat the World ${w.num - 1} boss to unlock World ${w.num}.`;
  if (n.kind === 'project') return `Finish every lesson in World ${w.num} to unlock the project.`;
  if (n.kind === 'boss') return `Complete the mini-project to face ${w.boss.name}.`;
  return 'Finish the previous lesson first.';
}
