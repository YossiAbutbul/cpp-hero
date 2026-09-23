import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../engine/config';
import { levelInfo } from '../engine/progress';
import { defaultSave, type SaveV1 } from '../engine/save';
import { clone } from '../engine/util';
import { isFreshProgress, mergeSaves, sameSave, stableStringify, toCloudSave } from './merge';
import { reconcile } from './reconcile';

const T0 = new Date('2026-09-01T10:00:00.000Z');

function save(edit: (s: SaveV1) => void, updatedAt = '2026-09-01T10:00:00.000Z'): SaveV1 {
  const s = defaultSave(T0);
  s.profile.onboarded = true;
  edit(s);
  s.level = levelInfo(s.xp).level;
  s.updatedAt = updatedAt;
  return s;
}

/** Device A: played worlds 1-2 on the phone. */
const phone = save((s) => {
  s.profile.name = 'Phone';
  s.xp = 500;
  s.lessons = {
    'w1.l1': { done: true, best: 1, at: '2026-08-01T00:00:00.000Z' },
    'w1.l2': { done: true, best: 0.5, at: '2026-08-02T00:00:00.000Z' },
  };
  s.bosses = { 'w1.boss': { beaten: true, at: '2026-08-03T00:00:00.000Z' } };
  s.worldsUnlocked = ['w1', 'w2'];
  s.vault = ['a', 'b'];
  s.bestiary = ['off-by-one'];
  s.achievements = { first: '2026-08-01T00:00:00.000Z' };
  s.cosmetics.owned = ['classic', 'cap-sky'];
  s.cosmetics.equipped.hat = 'cap-sky';
  s.stats.logic = 40;
  s.streak = { days: 3, lastDay: '2026-09-01', freezes: 1, best: 5 };
  s.daily = {
    day: '2026-09-01',
    minutes: 7,
    quests: [{ id: 'q1', progress: 2, done: false, claimed: false }],
  };
  s.srs = { c1: { box: 3, due: '2026-09-05T00:00:00.000Z', wrong: 1, right: 3 } };
  s.counters.correct = 40;
  s.counters.byTag = { loops: { r: 5, w: 1 } };
}, '2026-09-01T10:00:00.000Z');

/** Device B: laptop, edited later, less XP but a lesson the phone doesn't have. */
const laptop = save((s) => {
  s.profile.name = 'Laptop';
  s.settings.textSize = 'l';
  s.xp = 300;
  s.lessons = {
    'w1.l2': { done: true, best: 0.9, at: '2026-08-05T00:00:00.000Z' },
    'w2.l1': { done: true, best: 0.8, at: '2026-08-06T00:00:00.000Z' },
  };
  s.worldsUnlocked = ['w1', 'w3', 'w2'];
  s.vault = ['b', 'c'];
  s.achievements = { first: '2026-07-01T00:00:00.000Z', second: '2026-08-06T00:00:00.000Z' };
  s.stats.logic = 10;
  s.stats.memory = 30;
  s.streak = { days: 1, lastDay: '2026-09-02', freezes: 0, best: 4 };
  s.daily = { day: '2026-09-02', minutes: 3, quests: [] };
  s.srs = {
    c1: { box: 1, due: '2026-09-02T00:00:00.000Z', wrong: 1, right: 1 },
    c2: { box: 2, due: '2026-09-04T00:00:00.000Z', wrong: 0, right: 1 },
  };
  s.counters.correct = 30;
  s.counters.wrong = 9;
  s.counters.byTag = { loops: { r: 2, w: 3 }, ptr: { r: 1, w: 0 } };
}, '2026-09-02T10:00:00.000Z');

describe('mergeSaves', () => {
  const m = mergeSaves(phone, laptop);

  it('keeps the most progress from both devices', () => {
    expect(m.xp).toBe(500);
    expect(m.level).toBe(levelInfo(500).level);
    expect(Object.keys(m.lessons).sort()).toEqual(['w1.l1', 'w1.l2', 'w2.l1']);
    expect(m.lessons['w1.l2']).toEqual({ done: true, best: 0.9, at: '2026-08-02T00:00:00.000Z' });
    expect(m.bosses['w1.boss']?.beaten).toBe(true);
    expect(m.worldsUnlocked).toEqual(['w1', 'w2', 'w3']);
    expect(new Set(m.vault)).toEqual(new Set(['a', 'b', 'c']));
    expect(m.achievements).toEqual({ first: '2026-07-01T00:00:00.000Z', second: '2026-08-06T00:00:00.000Z' });
    expect(m.stats).toMatchObject({ logic: 40, memory: 30 });
    expect(m.counters).toMatchObject({ correct: 40, wrong: 9 });
    expect(m.counters.byTag).toEqual({ loops: { r: 5, w: 3 }, ptr: { r: 1, w: 0 } });
    expect(m.cosmetics.owned).toEqual(['classic', 'cap-sky']);
  });

  it('takes choices (name, settings, look) from the save edited last', () => {
    expect(m.profile.name).toBe('Laptop');
    expect(m.settings.textSize).toBe('l');
    expect(m.updatedAt).toBe(laptop.updatedAt);
    expect(m.createdAt).toBe(T0.toISOString());
  });

  it('takes streak and daily quests from the later day, best streak = max', () => {
    expect(m.streak).toEqual({ days: 1, lastDay: '2026-09-02', freezes: 0, best: 5 });
    expect(m.daily.day).toBe('2026-09-02');
  });

  it('merges the same day by max / OR', () => {
    const a = save((s) => {
      s.streak = { days: 4, lastDay: '2026-09-02', freezes: 0, best: 4 };
      s.daily = {
        day: '2026-09-02',
        minutes: 5,
        quests: [{ id: 'q1', progress: 1, done: false, claimed: false }],
      };
    });
    const b = save((s) => {
      s.streak = { days: 3, lastDay: '2026-09-02', freezes: 2, best: 6 };
      s.daily = {
        day: '2026-09-02',
        minutes: 2,
        quests: [
          { id: 'q1', progress: 3, done: true, claimed: false },
          { id: 'q2', progress: 1, done: false, claimed: false },
        ],
      };
    });
    const r = mergeSaves(a, b);
    expect(r.streak).toEqual({ days: 4, lastDay: '2026-09-02', freezes: 2, best: 6 });
    expect(r.daily.minutes).toBe(5);
    expect(r.daily.quests).toEqual([
      { id: 'q1', progress: 3, done: true, claimed: false },
      { id: 'q2', progress: 1, done: false, claimed: false },
    ]);
  });

  it('keeps the SRS entry with more reviews', () => {
    expect(m.srs.c1).toEqual(phone.srs.c1);
    expect(m.srs.c2).toEqual(laptop.srs.c2);
  });

  it('never un-completes a lesson or boss', () => {
    const a = save(
      (s) => void (s.lessons = { x: { done: true, best: 0.4, at: '2026-01-01T00:00:00.000Z' } }),
    );
    const b = save(
      (s) => void (s.lessons = { x: { done: false, best: 0.9, at: '2026-02-01T00:00:00.000Z' } }),
    );
    expect(mergeSaves(a, b).lessons.x).toEqual({ done: true, best: 0.9, at: '2026-01-01T00:00:00.000Z' });
    expect(mergeSaves(b, a).lessons.x).toEqual({ done: true, best: 0.9, at: '2026-01-01T00:00:00.000Z' });
  });

  it('never lowers any progress field compared with either input', () => {
    for (const [a, b] of [
      [phone, laptop],
      [laptop, phone],
    ] as const) {
      const r = mergeSaves(a, b);
      for (const s of [a, b]) {
        expect(r.xp).toBeGreaterThanOrEqual(s.xp);
        expect(r.streak.best).toBeGreaterThanOrEqual(s.streak.best);
        for (const k of ['correct', 'wrong', 'bestCombo', 'hardened', 'reviews', 'secondsPlayed'] as const)
          expect(r.counters[k]).toBeGreaterThanOrEqual(s.counters[k]);
        for (const k of Object.keys(s.lessons)) if (s.lessons[k]?.done) expect(r.lessons[k]?.done).toBe(true);
        for (const w of s.worldsUnlocked) expect(r.worldsUnlocked).toContain(w);
        for (const v of s.vault) expect(r.vault).toContain(v);
        for (const k of Object.keys(s.achievements)) expect(r.achievements[k]).toBeTruthy();
        expect(r.profile.onboarded || !s.profile.onboarded).toBe(true);
      }
    }
  });

  it('is order independent for progress and idempotent', () => {
    const ab = mergeSaves(phone, laptop);
    const ba = mergeSaves(laptop, phone);
    const progress = (s: SaveV1) =>
      stableStringify({
        xp: s.xp,
        lessons: s.lessons,
        bosses: s.bosses,
        projects: s.projects,
        worlds: s.worldsUnlocked,
        vault: [...s.vault].sort(),
        achievements: s.achievements,
        counters: s.counters,
        stats: s.stats,
        srs: s.srs,
        streak: s.streak,
        daily: s.daily,
        profile: s.profile,
        settings: s.settings,
      });
    expect(progress(ab)).toBe(progress(ba));
    expect(sameSave(mergeSaves(ab, ab), ab)).toBe(true);
    expect(sameSave(mergeSaves(ab, phone), ab)).toBe(true);
    expect(sameSave(mergeSaves(phone, phone), phone)).toBe(true);
  });

  it('does not modify its inputs', () => {
    const a = clone(phone);
    const b = clone(laptop);
    mergeSaves(a, b);
    expect(a).toEqual(phone);
    expect(b).toEqual(laptop);
  });
});

describe('toCloudSave', () => {
  it('drops unknown keys and clips the name', () => {
    const s = save((x) => {
      x.profile.name = 'x'.repeat(100);
      (x as unknown as Record<string, unknown>).legacyJunk = 1;
      (x.profile as unknown as Record<string, unknown>).extra = true;
    });
    const c = toCloudSave(s);
    expect('legacyJunk' in c).toBe(false);
    expect('extra' in c.profile).toBe(false);
    expect(c.profile.name).toHaveLength(40);
    expect(Object.keys(c).sort()).toEqual(Object.keys(defaultSave()).sort());
  });
});

describe('stableStringify', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } })).toBe(
      stableStringify({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }),
    );
  });
});

describe('reconcile', () => {
  const cloudOf = (s: SaveV1, epoch = 0) => ({ v: SAVE_VERSION, epoch, save: clone(s) });

  it('uploads the device save on first sign-in', () => {
    const r = reconcile(phone, { uid: null, epoch: 0 }, 'u1', null);
    expect(r.kind === 'ok' && r.create && r.upload?.xp === 500 && !r.localChanged).toBe(true);
  });

  it('merges a guest save into the cloud copy', () => {
    const r = reconcile(phone, { uid: null, epoch: 0 }, 'u1', cloudOf(laptop, 2));
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.local.xp).toBe(500);
    expect(Object.keys(r.local.lessons)).toHaveLength(3);
    expect(r.upload).not.toBeNull();
    expect(r.localChanged).toBe(true);
    expect(r.epoch).toBe(2);
  });

  it('does nothing when both sides already match', () => {
    const merged = mergeSaves(phone, laptop);
    const r = reconcile(merged, { uid: 'u1', epoch: 0 }, 'u1', cloudOf(toCloudSave(merged)));
    expect(r.kind === 'ok' && r.upload === null && !r.localChanged).toBe(true);
  });

  it('never merges a save linked to another account', () => {
    const r = reconcile(phone, { uid: 'someone-else', epoch: 0 }, 'u1', cloudOf(laptop));
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.replaced).toBe('other-account');
    expect(r.local.xp).toBe(300);
    expect(r.upload).toBeNull();
    const fresh = reconcile(phone, { uid: 'someone-else', epoch: 0 }, 'u1', null);
    if (fresh.kind !== 'ok') throw new Error(fresh.kind);
    expect(isFreshProgress(fresh.local)).toBe(true);
    expect(fresh.create).toBe(true);
  });

  it('takes the cloud copy after a reset on another device', () => {
    const reset = save(() => {}, '2026-09-03T00:00:00.000Z');
    const r = reconcile(phone, { uid: 'u1', epoch: 0 }, 'u1', cloudOf(reset, 1));
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.replaced).toBe('reset');
    expect(r.local.xp).toBe(0);
    expect(r.epoch).toBe(1);
    expect(r.upload).toBeNull();
  });

  it('refuses a cloud save from a newer app version', () => {
    expect(
      reconcile(phone, { uid: 'u1', epoch: 0 }, 'u1', { v: SAVE_VERSION + 1, epoch: 0, save: {} }).kind,
    ).toBe('too-new');
  });
});
