/**
 * Persistence for the save (ported from legacy engine/store.js).
 *
 * Every storage access is wrapped in try/catch. If storage is unavailable
 * (private mode, sandboxed iframe, quota...) the state lives in memory and
 * `onNotice` fires once so the UI can show "Progress can't be saved on this
 * device". No DOM or React here: pass a Storage-like object in (defaults to
 * window.localStorage when present) so it is testable in Node.
 */
import { SAVE_KEY } from './config';
import { defaultSave, migrate, parseImport, type SaveV1 } from './save';
import { dayStr } from './util';

/** The subset of the Web Storage API the store needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoreOptions {
  /** Defaults to globalThis.localStorage (if accessible). null = memory only. */
  storage?: StorageLike | null;
  key?: string;
  now?: () => Date;
  /** Called once when progress can't be persisted. */
  onNotice?: (msg: string) => void;
  /** Debounce for save() in ms (default 250). */
  debounceMs?: number;
}

export interface Store {
  readonly state: SaveV1;
  /** false once storage failed (state is memory-only). */
  readonly persistent: boolean;
  /** Load (or create) the save. Never throws; an unreadable save is kept under <key>.broken. */
  load(): SaveV1;
  /** Debounced write (coalesces bursts of updates). */
  save(): void;
  /** Write now. Returns false when it couldn't be persisted. */
  saveNow(): boolean;
  /** Replace the whole state (import / reset); migrates first. */
  replace(next: unknown): SaveV1;
  /** Fresh save (the caller confirms first). */
  reset(): SaveV1;
  /** Pretty JSON for "export progress" + a suggested file name. */
  exportJSON(): { json: string; fileName: string };
  /** Parse + validate + migrate an exported file's text (does NOT replace; call replace() after confirming). */
  parseImport(json: string): SaveV1;
  /** Subscribe to state replacement / saves. */
  subscribe(fn: () => void): () => void;
}

export const NOTICE =
  'Progress can’t be saved on this device. You can still play, and export your progress from Settings.';

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export function createStore(opts: StoreOptions = {}): Store {
  const key = opts.key ?? SAVE_KEY;
  const now = opts.now ?? (() => new Date());
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const debounceMs = opts.debounceMs ?? 250;
  const listeners = new Set<() => void>();
  let state: SaveV1 = defaultSave(now());
  let persistent = !!storage;
  let noticeShown = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const notice = () => {
    if (noticeShown) return;
    noticeShown = true;
    opts.onNotice?.(NOTICE);
  };
  const notify = () => listeners.forEach((fn) => fn());

  const probe = (): boolean => {
    if (!storage) return false;
    try {
      storage.setItem('__ch_probe__', '1');
      storage.removeItem('__ch_probe__');
      return true;
    } catch {
      return false;
    }
  };

  const store: Store = {
    get state() {
      return state;
    },
    get persistent() {
      return persistent;
    },

    load() {
      persistent = probe();
      let raw: string | null = null;
      if (persistent && storage) {
        try {
          raw = storage.getItem(key);
        } catch {
          persistent = false;
        }
      }
      let loaded: SaveV1 | null = null;
      if (raw) {
        try {
          loaded = migrate(JSON.parse(raw), now());
        } catch (e) {
          console.warn('[store] save unreadable, starting fresh', e);
          try {
            storage?.setItem(key + '.broken', raw); // keep it in case the user wants it back
          } catch {
            /* ignore */
          }
        }
      }
      state = loaded ?? defaultSave(now());
      if (!persistent) notice();
      notify();
      return state;
    },

    save() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        store.saveNow();
      }, debounceMs);
    },

    saveNow() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      state.updatedAt = now().toISOString();
      if (!persistent || !storage) {
        notice();
        return false;
      }
      try {
        storage.setItem(key, JSON.stringify(state));
        return true;
      } catch {
        persistent = false;
        notice();
        return false;
      }
    },

    replace(next) {
      state = migrate(next, now());
      store.saveNow();
      notify();
      return state;
    },

    reset() {
      try {
        storage?.removeItem(key);
      } catch {
        /* ignore */
      }
      state = defaultSave(now());
      store.saveNow();
      notify();
      return state;
    },

    exportJSON() {
      state.updatedAt = now().toISOString();
      return { json: JSON.stringify(state, null, 2), fileName: `cpp-hero-save-${dayStr(now())}.json` };
    },

    parseImport(json) {
      return parseImport(json, now());
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return store;
}
