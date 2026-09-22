import { describe, expect, it, vi } from 'vitest';
import { SAVE_KEY } from './config';
import { createStore, NOTICE, type StorageLike } from './store';

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const throwing: StorageLike = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('SecurityError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

const now = () => new Date('2026-03-04T10:00:00.000Z');

describe('store', () => {
  it('creates a fresh save and persists it under cpphero.save', () => {
    const storage = new MemStorage();
    const st = createStore({ storage, now });
    const s = st.load();
    expect(st.persistent).toBe(true);
    expect(s.v).toBe(1);
    s.xp = 42;
    expect(st.saveNow()).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).xp).toBe(42);
    expect(createStore({ storage, now }).load().xp).toBe(42);
  });

  it('falls back to memory (once-only notice) when storage throws', () => {
    const onNotice = vi.fn();
    const st = createStore({ storage: throwing, now, onNotice });
    const s = st.load();
    expect(st.persistent).toBe(false);
    s.xp = 5;
    expect(st.saveNow()).toBe(false);
    expect(st.state.xp).toBe(5);
    expect(onNotice).toHaveBeenCalledTimes(1);
    expect(onNotice).toHaveBeenCalledWith(NOTICE);
  });

  it('works with no storage at all', () => {
    const st = createStore({ storage: null, now, onNotice: () => {} });
    expect(st.load().v).toBe(1);
    expect(st.persistent).toBe(false);
  });

  it('keeps an unreadable save under .broken and starts fresh', () => {
    const storage = new MemStorage();
    storage.setItem(SAVE_KEY, '{not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createStore({ storage, now }).load();
    warn.mockRestore();
    expect(s.xp).toBe(0);
    expect(storage.getItem(SAVE_KEY + '.broken')).toBe('{not json');
  });

  it('migrates an older/partial save on load', () => {
    const storage = new MemStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ profile: { name: 'Old' }, settings: {}, xp: 500 }));
    const s = createStore({ storage, now }).load();
    expect(s).toMatchObject({ v: 1, xp: 500, level: 3, profile: { name: 'Old', dailyGoalMin: 10 } });
  });

  it('debounces save()', async () => {
    vi.useFakeTimers();
    const storage = new MemStorage();
    const set = vi.spyOn(storage, 'setItem');
    const st = createStore({ storage, now, debounceMs: 100 });
    st.load();
    set.mockClear();
    st.save();
    st.save();
    st.save();
    expect(set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(set).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('exports and re-imports progress', () => {
    const a = createStore({ storage: new MemStorage(), now });
    a.load().profile.name = 'Ada';
    a.state.lessons['w1.l1'] = { done: true, best: 1, at: now().toISOString() };
    const { json, fileName } = a.exportJSON();
    expect(fileName).toBe('cpp-hero-save-2026-03-04.json');

    const b = createStore({ storage: new MemStorage(), now });
    b.load();
    const listener = vi.fn();
    b.subscribe(listener);
    const parsed = b.parseImport(json);
    expect(b.state.profile.name).toBe('Curlo'); // not replaced until confirmed
    b.replace(parsed);
    expect(b.state.profile.name).toBe('Ada');
    expect(b.state.lessons['w1.l1']?.done).toBe(true);
    expect(listener).toHaveBeenCalled();
    expect(() => b.parseImport('[]')).toThrow();
  });

  it('reset() wipes progress', () => {
    const storage = new MemStorage();
    const st = createStore({ storage, now });
    st.load().xp = 999;
    st.saveNow();
    expect(st.reset().xp).toBe(0);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).xp).toBe(0);
  });
});
