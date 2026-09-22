/**
 * The celebration queue: big skippable overlays (level-up, achievement, bug
 * defeated, new gear, shield upgrade, evolution) shown one after another by
 * <CelebrationHost/> (src/app/CelebrationHost.tsx).
 *
 *   await requestCelebrations();   // show whatever game.drainCelebrations() has queued
 *   await showCelebration({ type: 'levelup', level: 4 });   // show one directly (dev gallery)
 *
 * Screens call requestCelebrations() at a calm moment (e.g. the results
 * card); the shell also calls it shortly after landing on a tab screen.
 */
import { useSyncExternalStore } from 'react';
import type { Celebration } from '@/engine/game';

export type CelebrationItem = Celebration & { uid: number };

let queue: CelebrationItem[] = [];
let uid = 0;
let source: (() => Celebration[]) | null = null;
const listeners = new Set<() => void>();
const idleWaiters: (() => void)[] = [];

function emit() {
  listeners.forEach((fn) => fn());
  if (!queue.length) idleWaiters.splice(0).forEach((r) => r());
}

/** The shell registers the engine's drain function here. */
export function registerCelebrationSource(fn: (() => Celebration[]) | null): void {
  source = fn;
}

/** Resolves once the queue is empty (immediately if it already is). */
export function whenCelebrationsIdle(): Promise<void> {
  if (!queue.length) return Promise.resolve();
  return new Promise((r) => idleWaiters.push(r));
}

/** Queue celebrations; resolves when the queue has been fully shown. */
export function showCelebration(items: Celebration | Celebration[]): Promise<void> {
  const list = Array.isArray(items) ? items : [items];
  if (list.length) {
    queue = [...queue, ...list.map((c) => ({ ...c, uid: ++uid }))];
    emit();
  }
  return whenCelebrationsIdle();
}

/** Drain the engine's pending celebrations into the queue; resolves when all are closed. */
export function requestCelebrations(): Promise<void> {
  return showCelebration(source?.() ?? []);
}

/** Close the overlay on top of the queue (the host calls this). */
export function closeCelebration(id: number): void {
  if (queue[0]?.uid !== id) return;
  queue = queue.slice(1);
  emit();
}

/** Hook: the celebration currently on screen (or undefined). */
export function useCurrentCelebration(): CelebrationItem | undefined {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => queue[0],
    () => undefined,
  );
}
