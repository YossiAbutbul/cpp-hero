/**
 * Firebase side of cloud sync. Loaded with a dynamic import() only when the
 * VITE_FIREBASE_* config exists AND the learner is signed in or opens the
 * sign-in card, so the Firebase SDK is a separate chunk that guests never
 * download.
 *
 * The device save (localStorage) stays the source of truth for play. This
 * module keeps Firestore users/{uid} in step with it:
 * - every sync is a transaction: read the cloud doc, reconcile() (pure,
 *   ./reconcile.ts), write the merged save if it differs, then merge the
 *   result into the device save (merging again with anything the learner did
 *   while the transaction was in flight);
 * - writes are debounced after each store save and flushed when the page is
 *   hidden; offline, nothing is written and the next change / "online" event
 *   syncs again (the device save already holds everything);
 * - a snapshot listener pulls changes made on other devices.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { SAVE_VERSION } from '@/engine/config';
import { defaultSave } from '@/engine/save';
import type { Store } from '@/engine/store';
import type { CloudConfig } from './config';
import { backupSave, readLink, writeLink, type StoredLink } from './link';
import { mergeSaves, sameSave, toCloudSave } from './merge';
import { reconcile, type Reconciled } from './reconcile';
import type { CloudSession, CloudStatus } from './types';

/** A change is pushed after this quiet time... */
const PUSH_DEBOUNCE_MS = 3000;
/** ...but at most once per this interval while playing (the game saves every 5 s). Hidden page / sign-out flush at once. */
const PUSH_MIN_INTERVAL_MS = 30_000;

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}
let services: Promise<Services> | null = null;

/** One Firebase app per page (survives StrictMode double effects and HMR). */
function getServices(cfg: CloudConfig): Promise<Services> {
  services ??= (async () => {
    const app = initializeApp(cfg.firebase);
    if (cfg.appCheck) {
      const ac = await import('firebase/app-check');
      if (cfg.appCheck.debugToken)
        (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          cfg.appCheck.debugToken;
      ac.initializeAppCheck(app, {
        provider:
          cfg.appCheck.provider === 'v3'
            ? new ac.ReCaptchaV3Provider(cfg.appCheck.siteKey)
            : new ac.ReCaptchaEnterpriseProvider(cfg.appCheck.siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
    const auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    if (cfg.emulators) {
      connectAuthEmulator(auth, `http://${cfg.emulators.host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, cfg.emulators.host, 8080);
    }
    return { app, auth, db };
  })();
  return services;
}

const errCode = (e: unknown): string =>
  typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';

export class CloudOfflineError extends Error {
  override name = 'CloudOfflineError';
}

export async function startCloud(
  cfg: CloudConfig,
  store: Store,
  emit: (s: CloudStatus) => void,
  say: (msg: string) => void,
): Promise<CloudSession> {
  const { auth, db } = await getServices(cfg);

  let status: CloudStatus = { user: null, state: 'idle', lastSyncAt: null, authReady: false };
  const set = (patch: Partial<CloudStatus>) => {
    status = { ...status, ...patch };
    emit(status);
  };

  let user: User | null = null;
  let blocked = false; // cloud save from a newer app version: never write
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubSnap: (() => void) | null = null;
  let disposed = false;
  let resetting = false; // our own reset: don't report it as "reset on another device"
  // Link (account + reset counter) this session last synced with. Kept in memory, not
  // re-read from localStorage: another tab's reset bumps the stored epoch, and this tab
  // (still holding the old progress) must then take the reset cloud copy, not merge into it.
  const seen = readLink();
  const link = (patch: Partial<StoredLink>) => Object.assign(seen, writeLink(patch));
  let markAuthReady: () => void = () => {};
  const authReady = new Promise<void>((r) => (markAuthReady = r));

  // Serialize syncs / resets so two transactions never race each other here.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn, fn);
    chain = p.catch(() => {});
    return p;
  };

  const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

  /** Put a reconcile result into the device save without losing play that happened meanwhile. */
  const apply = (uid: string, r: Extract<Reconciled, { kind: 'ok' }>) => {
    if (r.replaced) {
      if (r.localChanged) {
        backupSave(JSON.stringify(store.state));
        store.replace(r.local);
        say(
          r.replaced === 'reset'
            ? 'Progress was reset on another device.'
            : 'Loaded this accountג€™s progress. The old save is kept in its own account.',
        );
      }
    } else {
      const next = mergeSaves(store.state, r.local);
      if (!sameSave(next, store.state)) store.replace(next);
    }
    link({ uid, epoch: r.epoch, active: true });
  };

  const fail = (e: unknown) => {
    const code = errCode(e);
    if (code === 'unavailable' || code === 'failed-precondition' || !online()) {
      set({ state: 'offline' });
      return;
    }
    console.warn('[cloud] sync failed', e);
    set({ state: 'error' });
  };

  const syncOnce = (): Promise<void> =>
    serial(async () => {
      const u = user;
      if (!u || blocked || disposed) return;
      if (!online()) return set({ state: 'offline' });
      set({ state: 'syncing' });
      const ref = doc(db, 'users', u.uid);
      try {
        const r = await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          const data: DocumentData | null = snap.exists() ? snap.data() : null;
          const res = reconcile(
            store.state,
            seen,
            u.uid,
            data ? { v: data.v, epoch: data.epoch, save: data.save } : null,
          );
          if (res.kind === 'ok' && res.upload) {
            if (res.create)
              tx.set(ref, {
                v: SAVE_VERSION,
                epoch: 0,
                save: res.upload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            else tx.update(ref, { v: SAVE_VERSION, save: res.upload, updatedAt: serverTimestamp() });
          }
          return res;
        });
        if (user?.uid !== u.uid) return; // signed out meanwhile
        if (r.kind === 'too-new') {
          blocked = true;
          return set({ state: 'too-new' });
        }
        apply(u.uid, r);
        set({ state: 'synced', lastSyncAt: Date.now() });
        listen(u.uid);
      } catch (e) {
        if (user?.uid !== u.uid) return; // signed out meanwhile (permission-denied is expected)
        fail(e);
      }
    });

  let lastPush = 0;
  /** Throttled push: the first change waits PUSH_DEBOUNCE_MS, later ones join the pending timer. */
  const schedule = (ms = PUSH_DEBOUNCE_MS) => {
    if (!user || blocked || timer) return;
    const wait = Math.max(ms, lastPush + PUSH_MIN_INTERVAL_MS - Date.now());
    timer = setTimeout(() => {
      timer = null;
      lastPush = Date.now();
      void syncOnce();
    }, wait);
  };

  /** Pull changes made on other devices. */
  const listen = (uid: string) => {
    if (unsubSnap) return;
    unsubSnap = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites || !snap.exists() || user?.uid !== uid || blocked || resetting)
          return;
        const d = snap.data();
        const r = reconcile(store.state, seen, uid, { v: d.v, epoch: d.epoch, save: d.save });
        if (r.kind === 'too-new') {
          blocked = true;
          return set({ state: 'too-new' });
        }
        if (r.localChanged) apply(uid, r);
        if (r.upload) schedule();
      },
      (e) => {
        unsubSnap = null;
        fail(e);
      },
    );
  };

  const stopListening = () => {
    unsubSnap?.();
    unsubSnap = null;
  };

  const offSave = store.onSave(() => schedule());
  const onOnline = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastPush = 0;
    schedule(500);
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      timer = null;
      void syncOnce();
    }
  };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onHidden);

  let first = true;
  const offAuth = onAuthStateChanged(auth, (u) => {
    // The first callback always counts: a signed-out start must clear the "active" flag
    // (abandoned redirect, expired session), or Firebase would load on every start.
    const changed = first || user?.uid !== u?.uid;
    first = false;
    markAuthReady();
    user = u;
    blocked = false;
    set({
      authReady: true,
      user: u ? { uid: u.uid, name: u.displayName || u.email || 'You', email: u.email || '' } : null,
      state: u ? status.state : 'idle',
    });
    if (!changed) return;
    stopListening();
    if (u) {
      link({ active: true });
      void syncOnce();
    } else {
      link({ active: false });
    }
  });

  // Finish a redirect sign-in (no-op otherwise).
  getRedirectResult(auth).catch((e: unknown) => {
    console.warn('[cloud] redirect sign-in failed', e);
    say('Sign-in didnג€™t finish. Try again.');
  });

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return {
    async signIn() {
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = errCode(e);
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          writeLink({ active: true }); // so the app loads this module again after the redirect
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
    },

    async signOut() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        // Best effort: push the last changes first (the device keeps them anyway).
        await Promise.race([syncOnce(), new Promise((r) => setTimeout(r, 4000))]);
      }
      stopListening();
      await fbSignOut(auth);
    },

    resetProgress() {
      return serial(async () => {
        await authReady; // a linked device must not reset locally only, before auth is known
        const u = user;
        if (!u) {
          store.reset();
          return;
        }
        if (!online()) throw new CloudOfflineError('offline');
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        const ref = doc(db, 'users', u.uid);
        let epoch = seen.epoch;
        resetting = true;
        try {
          epoch = await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) return 0;
            const next = (Number(snap.data().epoch) || 0) + 1;
            tx.update(ref, {
              v: SAVE_VERSION,
              epoch: next,
              save: toCloudSave(defaultSave()),
              updatedAt: serverTimestamp(),
              resetAt: serverTimestamp(),
            });
            return next;
          });
        } catch (e) {
          resetting = false;
          if (errCode(e) === 'unavailable') throw new CloudOfflineError('offline');
          throw e;
        }
        link({ uid: u.uid, epoch, active: true });
        store.reset();
        resetting = false;
        set({ state: 'synced', lastSyncAt: Date.now() });
      });
    },

    syncNow: () => syncOnce(),

    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      stopListening();
      offAuth();
      offSave();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHidden);
    },
  };
}
