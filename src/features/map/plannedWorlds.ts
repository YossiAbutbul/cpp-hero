/**
 * Worlds that are planned but have no content yet. The map shows every
 * world from content; numbers above the last one show as "coming soon".
 */
export const TOTAL_WORLDS = 16;

const PLANNED: Record<number, { title: string; icon: string }> = {
  9: { title: 'Memory', icon: 'memory' },
  10: { title: 'Structs & Classes', icon: 'class' },
  11: { title: 'Inheritance & Polymorphism', icon: 'tree' },
  12: { title: 'The Citadel', icon: 'castle' },
  13: { title: 'Templates', icon: 'template' },
  14: { title: 'The STL', icon: 'stl' },
  15: { title: 'Modern C++', icon: 'star' },
  16: { title: 'The Final Boss', icon: 'crown' },
};

export interface PlannedWorld {
  num: number;
  title: string;
  icon: string;
}

/** Planned worlds after the last world that has content. */
export function comingSoon(lastNum: number): PlannedWorld[] {
  const out: PlannedWorld[] = [];
  for (let n = lastNum + 1; n <= TOTAL_WORLDS; n++) {
    const p = PLANNED[n];
    out.push({ num: n, title: p?.title ?? 'Coming soon', icon: p?.icon ?? 'star' });
  }
  return out;
}
