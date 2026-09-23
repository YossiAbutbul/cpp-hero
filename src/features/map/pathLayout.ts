/** Geometry + per-session memory for the winding Pop Path (shared by WorldPath and MapScreen). */
import type { MapNode } from '@/engine/game';

export const TOP = 84;
export const GAP = 118;
export const BOTTOM = 86;
/** zig-zag offsets (× amplitude) per node index */
export const OFFS = [0, -0.72, -0.12, 0.68, 0.82, 0.08, -0.55, -0.8, 0.2];

/**
 * Per app session: how far each world's trail was drawn, whether the map was
 * shown yet, and where it was scrolled (restored when coming back).
 */
export const mapMemory = {
  shown: false,
  lit: new Map<string, number>(),
  scroll: -1,
  /** current node id when the map was last shown */
  cur: '',
  /** worlds known to be unlocked (to announce new ones) */
  unlocked: new Set<string>(),
};

export type NodeState = 'done' | 'cur' | 'open' | 'lock';

export function nodeState(n: MapNode, cur: MapNode | null): NodeState {
  return n.done ? 'done' : cur?.id === n.id ? 'cur' : n.open ? 'open' : 'lock';
}

/** Index of the last node the trail reaches (done or current), -1 = none. */
export function litIndex(nodes: readonly MapNode[], cur: MapNode | null): number {
  let lit = -1;
  nodes.forEach((n, i) => {
    if (n.done || cur?.id === n.id) lit = i;
  });
  return lit;
}

/** Smooth vertical S-curve through the points. */
export function curve(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => {
      if (!i) return `M${p.x} ${p.y}`;
      const q = pts[i - 1]!;
      const dy = (p.y - q.y) / 2;
      return `C${q.x} ${q.y + dy} ${p.x} ${p.y - dy} ${p.x} ${p.y}`;
    })
    .join(' ');
}
