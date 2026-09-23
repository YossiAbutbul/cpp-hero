import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultSave, migrate, parseImport, SaveError, validateImport } from './save';
import { levelInfo } from './progress';

const NOW = new Date('2026-03-04T10:00:00.000Z');

/** Load the legacy store.js (the behavioral reference) with small DOM stubs. */
function legacyStore(): { migrate: (s: unknown) => unknown; defaults: () => unknown } {
  const root = join(import.meta.dirname, '..', '..', 'legacy', 'src', 'engine');
  const window: Record<string, unknown> = { addEventListener() {} };
  const document = { addEventListener() {} };
  const location = { hash: '' };
  for (const f of ['core.js', 'store.js']) {
    new Function('window', 'document', 'location', readFileSync(join(root, f), 'utf8'))(
      window,
      document,
      location,
    );
  }
  return (window.CH as { store: { migrate: (s: unknown) => unknown; defaults: () => unknown } }).store;
}

/** A save as the legacy app writes it after some play. */
function playedSave() {
  const s = defaultSave(NOW) as unknown as Record<string, unknown> & ReturnType<typeof defaultSave>;
  s.profile.onboarded = true;
  s.profile.name = 'Ada';
  s.xp = 1234;
  s.level = 9; // legacy curve
  s.lessons['w1.l1'] = { done: true, best: 1, at: NOW.toISOString() };
  s.bosses['w1.boss'] = { beaten: true, at: NOW.toISOString() };
  s.worldsUnlocked.push('w2');
  s.srs['w1.l1.c2'] = { box: 2, due: NOW.toISOString(), wrong: 1, right: 1 };
  s.counters.byTag['w1.cout'] = { r: 3, w: 1 };
  s.daily = {
    day: '2026-03-04',
    minutes: 3.5,
    quests: [{ id: 'lessons2', progress: 1, done: false, claimed: false }],
  };
  return s;
}

describe('save format v1', () => {
  it('defaults match the legacy defaults exactly (except timestamps)', () => {
    const legacy = legacyStore().defaults() as Record<string, unknown>;
    const mine = defaultSave(NOW) as unknown as Record<string, unknown>;
    const strip = (o: Record<string, unknown>) => {
      const c = JSON.parse(JSON.stringify(o)) as Record<string, unknown> & {
        hearts: { lastRefill?: string };
      };
      delete c.createdAt;
      delete c.updatedAt;
      delete c.hearts.lastRefill;
      return c;
    };
    expect(strip(mine)).toEqual(strip(legacy));
  });

  it('migrate() gives the same result as the legacy migrate() (level aside)', () => {
    const legacy = legacyStore();
    const cases: unknown[] = [
      playedSave(),
      { profile: { name: 'Old' }, settings: {}, xp: '120', hearts: { n: 99, max: 3 } }, // pre-versioned, partial, bad values
      { v: 1, profile: {}, settings: { textSize: 'xl' }, stats: { defense: 250 }, worldsUnlocked: ['w2'] },
      { v: 1, profile: {}, settings: {}, cosmetics: { owned: ['crown'], equipped: 'nope' }, lessons: 'bad' },
    ];
    for (const c of cases) {
      const a = legacy.migrate(JSON.parse(JSON.stringify(c))) as Record<string, unknown>;
      const b = migrate(JSON.parse(JSON.stringify(c)), NOW) as unknown as Record<string, unknown>;
      // Timestamps that migrate fills in come from "now"; level is re-derived with the new curve.
      for (const o of [a, b]) {
        delete o.level;
        if (!(c as Record<string, unknown>).createdAt) {
          delete o.createdAt;
          delete o.updatedAt;
        }
        const h = o.hearts as Record<string, unknown>;
        if (!(c as { hearts?: { lastRefill?: string } }).hearts?.lastRefill) delete h.lastRefill;
      }
      expect(b).toEqual(a);
    }
  });

  it('re-derives the level from XP with the new curve', () => {
    const s = migrate(playedSave(), NOW);
    expect(s.xp).toBe(1234);
    expect(s.level).toBe(levelInfo(1234).level);
    expect(s.level).toBe(4);
  });

  it('keeps unknown extra keys (forward compatible) and clamps values', () => {
    const s = migrate(
      { v: 1, profile: {}, settings: {}, extra: { keep: true }, hearts: { n: -3, max: 50 } },
      NOW,
    );
    expect((s as unknown as { extra: unknown }).extra).toEqual({ keep: true });
    expect(s.hearts).toMatchObject({ n: 0, max: 10 });
  });

  it('rejects saves from a newer version and non-objects', () => {
    expect(() => migrate({ v: 2 }, NOW)).toThrow(SaveError);
    expect(() => migrate([], NOW)).toThrow(/not an object/);
  });

  it('validates imports with friendly messages', () => {
    expect(() => validateImport(null)).toThrow(/isn’t a Cpp Hero save/);
    expect(() => validateImport({ profile: {}, settings: {} })).toThrow(/version/);
    expect(() => validateImport({ v: 1, profile: {} })).toThrow(/profile or settings/);
    expect(() => validateImport({ v: 1, profile: {}, settings: {}, lessons: [] })).toThrow(/lesson list/);
    expect(() => parseImport('{nope', NOW)).toThrow(/valid JSON/);
    const back = parseImport(JSON.stringify(playedSave()), NOW);
    expect(back.profile.name).toBe('Ada');
    expect(back.lessons['w1.l1']?.done).toBe(true);
  });
});
