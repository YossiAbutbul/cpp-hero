/**
 * firestore.rules against the Firestore emulator.
 * Run: npm run test:rules   (firebase emulators:exec starts the emulator; needs Java 21+)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { toCloudSave } from '../../src/cloud/merge';
import { SAVE_VERSION } from '../../src/engine/config';
import { defaultSave, type SaveV1 } from '../../src/engine/save';

const PROJECT = 'demo-cpp-hero';
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync(join(import.meta.dirname, '..', '..', 'firestore.rules'), 'utf8') },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const google = { firebase: { sign_in_provider: 'google.com' as const } };
const as = (uid: string): Firestore =>
  env.authenticatedContext(uid, google).firestore() as unknown as Firestore;
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

function played(): SaveV1 {
  const s = defaultSave(new Date('2026-09-01T00:00:00.000Z'));
  s.profile.onboarded = true;
  s.xp = 120;
  s.level = 2;
  s.lessons = { 'w1.l1': { done: true, best: 1, at: '2026-09-01T00:00:00.000Z' } };
  s.worldsUnlocked = ['w1', 'w2'];
  s.vault = ['w1.hello'];
  s.achievements = { first: '2026-09-01T00:00:00.000Z' };
  s.counters.correct = 10;
  s.srs = { 'w1.l1.c1': { box: 2, due: '2026-09-02T00:00:00.000Z', wrong: 0, right: 1 } };
  s.counters.byTag = { 'bug:off-by-one': { r: 1, w: 0 } };
  return toCloudSave(s);
}

/** A late-game save: every world played (sizes like a real full run). */
function bigSave(): SaveV1 {
  const s = played();
  const at = '2026-09-01T00:00:00.000Z';
  for (let w = 1; w <= 16; w++) {
    for (let l = 1; l <= 6; l++) s.lessons[`w${w}.l${l}`] = { done: true, best: 0.9, at };
    s.projects[`w${w}.p`] = { done: true, step: 4 };
    s.bosses[`w${w}.boss`] = { beaten: true, at };
    if (!s.worldsUnlocked.includes(`w${w}`)) s.worldsUnlocked.push(`w${w}`);
  }
  for (let i = 0; i < 800; i++) s.srs[`c${i}`] = { box: 3, due: at, wrong: 1, right: 2 };
  for (let i = 0; i < 300; i++) s.vault.push(`card${i}`);
  for (let i = 0; i < 80; i++) s.bestiary.push(`bug${i}`);
  for (let i = 0; i < 60; i++) s.achievements[`a${i}`] = at;
  for (let i = 0; i < 300; i++) s.counters.byTag[`tag${i}`] = { r: 3, w: 1 };
  for (let i = 0; i < 30; i++) s.cosmetics.owned.push(`hat${i}`);
  return s;
}

const newDoc = (save: SaveV1 = played()) => ({
  v: SAVE_VERSION,
  epoch: 0,
  save,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

/** Create alice's doc (rules bypassed) with real timestamps. */
async function seed(save: SaveV1 = played(), epoch = 0) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'users', 'alice'), {
      v: SAVE_VERSION,
      epoch,
      save,
      createdAt: Timestamp.fromMillis(Date.parse('2026-09-01T00:00:00.000Z')),
      updatedAt: Timestamp.fromMillis(Date.parse('2026-09-01T00:00:00.000Z')),
    });
  });
}

const aliceDoc = () => doc(as('alice'), 'users', 'alice');
const update = (save: SaveV1, extra: Record<string, unknown> = {}) =>
  updateDoc(aliceDoc(), { v: SAVE_VERSION, save, updatedAt: serverTimestamp(), ...extra });

describe('access', () => {
  it('owner can create and read their doc', async () => {
    await assertSucceeds(setDoc(aliceDoc(), newDoc()));
    await assertSucceeds(getDoc(aliceDoc()));
  });

  it('signed-out users and other users are denied', async () => {
    await seed();
    await assertFails(getDoc(doc(anon(), 'users', 'alice')));
    await assertFails(setDoc(doc(anon(), 'users', 'alice'), newDoc()));
    await assertFails(getDoc(doc(as('bob'), 'users', 'alice')));
    await assertFails(setDoc(doc(as('bob'), 'users', 'alice'), newDoc()));
    await assertFails(updateDoc(doc(as('bob'), 'users', 'alice'), { updatedAt: serverTimestamp() }));
  });

  it('non-Google sign-in is denied', async () => {
    const db = env
      .authenticatedContext('alice', { firebase: { sign_in_provider: 'anonymous' as const } })
      .firestore();
    await assertFails(setDoc(doc(db as unknown as Firestore, 'users', 'alice'), newDoc()));
  });

  it('listing users and other collections is denied', async () => {
    await seed();
    await assertFails(getDocs(collection(as('alice'), 'users')));
    await assertFails(setDoc(doc(as('alice'), 'other', 'x'), { a: 1 }));
    await assertFails(setDoc(doc(as('alice'), 'users', 'alice', 'sub', 'x'), { a: 1 }));
  });

  it('nobody can delete', async () => {
    await seed();
    await assertFails(deleteDoc(aliceDoc()));
  });
});

describe('create validation', () => {
  it('needs epoch 0 and server timestamps', async () => {
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), epoch: 1 }));
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), updatedAt: Timestamp.fromMillis(0) }));
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), createdAt: Timestamp.fromMillis(0) }));
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), resetAt: serverTimestamp() }));
  });

  it('rejects unknown keys and bad types', async () => {
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), admin: true }));
    await assertFails(setDoc(aliceDoc(), newDoc({ ...played(), extra: 1 } as SaveV1)));
    const s = played();
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, xp: '100' } as unknown as SaveV1)));
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, xp: -1 })));
    await assertFails(
      setDoc(aliceDoc(), newDoc({ ...s, settings: { ...s.settings, textSize: 'xl' } } as unknown as SaveV1)),
    );
    await assertFails(
      setDoc(aliceDoc(), newDoc({ ...s, profile: { ...s.profile, admin: true } } as unknown as SaveV1)),
    );
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, stats: { ...s.stats, logic: 101 } })));
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), v: SAVE_VERSION + 1 })); // save.v != v
    await assertFails(setDoc(aliceDoc(), { ...newDoc(), v: 0, save: { ...s, v: 0 } }));
  });

  it('enforces size limits', async () => {
    const s = played();
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, profile: { ...s.profile, name: 'x'.repeat(41) } })));
    const lessons: SaveV1['lessons'] = {};
    for (let i = 0; i < 501; i++) lessons[`l${i}`] = { done: true, best: 1, at: '' };
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, lessons })));
    await assertFails(
      setDoc(aliceDoc(), newDoc({ ...s, worldsUnlocked: Array.from({ length: 65 }, (_, i) => `w${i}`) })),
    );
    await assertFails(setDoc(aliceDoc(), newDoc({ ...s, worldsUnlocked: [] })));
    await assertSucceeds(
      setDoc(aliceDoc(), newDoc({ ...s, profile: { ...s.profile, name: 'x'.repeat(40) } })),
    );
  });
});

describe('progress updates', () => {
  it('allows more progress', async () => {
    await seed();
    const s = played();
    s.xp = 200;
    s.lessons['w1.l2'] = { done: true, best: 0.5, at: '2026-09-02T00:00:00.000Z' };
    s.worldsUnlocked.push('w3');
    s.profile.name = 'New name';
    s.hearts.n = 2; // hearts may go down
    await assertSucceeds(update(s));
  });

  it('allows an update that changes every part of a full save (stays under the 1000-expression limit)', async () => {
    await seed(bigSave());
    const s = bigSave();
    s.createdAt = '2026-08-01T00:00:00.000Z';
    s.updatedAt = '2026-09-03T00:00:00.000Z';
    s.profile.name = 'Everything';
    s.settings.textSize = 'l';
    s.xp = 999;
    s.level = 5;
    s.hearts = { n: 1, max: 6, lastRefill: '2026-09-03T00:00:00.000Z' };
    s.streak = { days: 9, lastDay: '2026-09-03', freezes: 2, best: 9 };
    s.daily = {
      day: '2026-09-03',
      minutes: 12.5,
      quests: [{ id: 'q', progress: 1, done: true, claimed: true }],
    };
    s.stats = { logic: 50, structure: 40, memory: 30, toolkit: 20, defense: 10 };
    s.lessons['w2.l1'] = { done: true, best: 0.75, at: '2026-09-03T00:00:00.000Z' };
    s.projects['w17.p'] = { done: true, step: 1 };
    s.bosses['w17.boss'] = { beaten: true, at: '2026-09-03T00:00:00.000Z' };
    s.worldsUnlocked.push('w17');
    s.srs['w2.l1.c1'] = { box: 1, due: '2026-09-04T00:00:00.000Z', wrong: 1, right: 0 };
    s.vault.push('w2.card');
    s.bestiary.push('off-by-one');
    s.achievements.second = '2026-09-03T00:00:00.000Z';
    s.cosmetics.owned.push('cap-sky');
    s.cosmetics.equipped = { hat: 'cap-sky', color: 'mint', shield: null };
    s.counters = {
      ...s.counters,
      correct: 99,
      wrong: 9,
      bestCombo: 7,
      hardened: 3,
      reviews: 4,
      secondsPlayed: 3600,
    };
    s.counters.byTag.loops = { r: 3, w: 1 };
    await assertSucceeds(update(s));
  });

  it('accepts creating a full save', async () => {
    await assertSucceeds(setDoc(aliceDoc(), newDoc(bigSave())));
  });

  it('rejects bad data in changed parts and new top-level keys', async () => {
    await seed();
    const s = played();
    await assertFails(update({ ...s, settings: { ...s.settings, textSize: 'huge' } } as unknown as SaveV1));
    await assertFails(update({ ...s, profile: { ...s.profile, name: 'x'.repeat(41) } }));
    await assertFails(update({ ...s, extra: true } as unknown as SaveV1));
    await assertFails(update(s, { admin: true }));
    await assertFails(update({ ...s, counters: { ...s.counters, correct: '99' } } as unknown as SaveV1));
    await assertFails(update({ ...s, xp: 500.5 }));
  });

  it('never lets progress go down', async () => {
    await seed();
    const cases: ((s: SaveV1) => void)[] = [
      (s) => void (s.xp = 119),
      (s) => void (s.lessons = {}),
      (s) => void (s.worldsUnlocked = ['w1']),
      (s) => void (s.vault = []),
      (s) => void (s.achievements = {}),
      (s) => void (s.counters.correct = 9),
      (s) => void (s.profile.onboarded = false),
      (s) => void (s.cosmetics.owned = []),
    ];
    for (const edit of cases) {
      const s = played();
      edit(s);
      await assertFails(update(s));
    }
  });

  it('needs updatedAt = server time and keeps createdAt / epoch / version', async () => {
    await seed();
    await assertFails(updateDoc(aliceDoc(), { v: SAVE_VERSION, save: played(), updatedAt: Timestamp.now() }));
    await assertFails(update(played(), { createdAt: serverTimestamp() }));
    await assertFails(update(played(), { epoch: 5 }));
    await assertFails(update(played(), { resetAt: serverTimestamp() }));
  });

  it('refuses to downgrade the save version', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(db, 'users', 'alice'), {
        v: 2,
        epoch: 0,
        save: { ...played(), v: 2 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await assertFails(update(played()));
  });
});

describe('reset', () => {
  const fresh = () => toCloudSave(defaultSave());

  it('allows a fresh save with epoch + 1 and resetAt = server time', async () => {
    await seed(bigSave(), 3);
    await assertSucceeds(update(fresh(), { epoch: 4, resetAt: serverTimestamp() }));
    const snap = await getDoc(aliceDoc());
    if (snap.data()?.epoch !== 4) throw new Error('epoch not bumped');
  });

  it('refuses a reset that is not fresh, skips epochs, or has no resetAt', async () => {
    await seed(played(), 3);
    await assertFails(update(played(), { epoch: 4, resetAt: serverTimestamp() }));
    await assertFails(update({ ...fresh(), xp: 5 }, { epoch: 4, resetAt: serverTimestamp() }));
    await assertFails(update(fresh(), { epoch: 5, resetAt: serverTimestamp() }));
    await assertFails(update(fresh(), { epoch: 4 }));
    await assertFails(update(fresh(), { epoch: 4, resetAt: Timestamp.fromMillis(0) }));
    await assertFails(update(fresh())); // same epoch: progress would go down
  });
});
