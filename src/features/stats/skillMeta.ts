/** Display names/colors for Curlo's five skills and concept tags (shared by the Curlo tab and Stats). */
import type { Skill } from '@/content/schema';

export const SKILL_NAMES: Record<Skill, string> = {
  logic: 'Logic',
  structure: 'Structure',
  memory: 'Memory',
  toolkit: 'Toolkit',
  defense: 'Defense',
};

/** ProgressBar tones + CSS colors per skill (legacy SKILL_COLORS). */
export const SKILL_TONE: Record<Skill, 'sky' | 'teal' | 'sun' | 'tang' | 'coral'> = {
  logic: 'sky',
  structure: 'teal',
  memory: 'sun',
  toolkit: 'tang',
  defense: 'coral',
};
export const SKILL_COLOR: Record<Skill, string> = {
  logic: 'var(--sky)',
  structure: 'var(--teal)',
  memory: 'var(--sun)',
  toolkit: 'var(--tang)',
  defense: 'var(--coral)',
};

/** "w5.signed-unsigned" → "signed unsigned"; "w1.cout" → "cout". */
export function tagLabel(tag: string): string {
  return tag.replace(/^w\d+\./, '').replace(/[-_]/g, ' ');
}

/** World id from a tag ("w5.for" → "w5"), or null for unprefixed tags. */
export function tagWorld(tag: string): string | null {
  const m = /^(w\d+)\./.exec(tag);
  return m ? m[1]! : null;
}
