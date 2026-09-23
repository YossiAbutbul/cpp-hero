/**
 * Runtime access to the game content (the app's only entry point to it).
 *
 * The data comes from the virtual module built by the Vite content plugin:
 * YAML is parsed and validated at build/dev time, so this bundle contains
 * plain data only. In dev, editing a YAML file hot-swaps the data and every
 * subscriber (see useContent) re-renders, without a page reload.
 */
import initial from 'virtual:cpp-hero-content';
import type { Content } from './schema';

export type * from './schema';
export { demoStates, type DemoState, type DemoFrameState, type MemCellState } from './demoState';

let current: Content = initial;
const listeners = new Set<() => void>();

export function getContent(): Content {
  return current;
}

/** Subscribe to content changes (dev hot reload). Returns an unsubscribe function. */
export function subscribeContent(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (import.meta.hot) {
  import.meta.hot.accept('virtual:cpp-hero-content', (mod) => {
    if (!mod) return;
    current = (mod as unknown as { default: Content }).default;
    listeners.forEach((fn) => fn());
    console.info('[content] reloaded');
  });
}
