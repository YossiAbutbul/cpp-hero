/**
 * Optional cloud save (Google sign-in + Firestore sync). Renders its children
 * unchanged; with no VITE_FIREBASE_* config it does nothing at all and the
 * Firebase chunk is not even built. With config, Firebase loads only when
 * this device is signed in (or returning from a sign-in redirect), or when
 * the Settings cloud card asks for it.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { toast } from '@/ui/toast';
import { CloudContext, INITIAL_STATUS, type CloudContextValue, type ResetResult } from './cloudContext';
import { cloudConfig } from './config';
import { readLink } from './link';
import type { CloudSession, CloudStatus } from './types';

export function CloudProvider({ children }: { children: ReactNode }) {
  const { store } = useGame();
  const [status, setStatus] = useState<CloudStatus>(INITIAL_STATUS);
  const [busy, setBusy] = useState(false);
  const session = useRef<Promise<CloudSession> | null>(null);
  const ready = useRef<CloudSession | null>(null);

  const load = useCallback((): Promise<CloudSession> | null => {
    // The env check is a build-time constant: without config the import() below is dropped from the bundle.
    if (!import.meta.env.VITE_FIREBASE_API_KEY || !cloudConfig) return null;
    const cfg = cloudConfig;
    session.current ??= import('./session')
      .then((m) => m.startCloud(cfg, store, setStatus, (msg) => toast(msg, { icon: 'cloud', ms: 4000 })))
      .then((s) => (ready.current = s))
      .catch((e: unknown) => {
        session.current = null;
        console.warn('[cloud] could not start', e);
        throw e;
      });
    return session.current;
  }, [store]);

  // Signed in on this device (or back from a redirect): start syncing right away.
  useEffect(() => {
    if (cloudConfig && readLink().active) load()?.catch(() => {});
  }, [load]);

  const value = useMemo<CloudContextValue>(
    () => ({
      enabled: !!cloudConfig,
      status,
      busy,
      prepare: () => void load()?.catch(() => {}),
      async signIn() {
        setBusy(true);
        try {
          // Already loaded: call straight away so the popup keeps the tap's user activation.
          const s = ready.current ?? (await load());
          await s?.signIn();
        } catch (e) {
          console.warn('[cloud] sign-in failed', e);
          toast('Sign-in didn’t work. Try again.', { icon: 'warn' });
        } finally {
          setBusy(false);
        }
      },
      async signOut() {
        setBusy(true);
        try {
          await (await session.current)?.signOut();
          toast('Signed out. Your progress stays on this device.', { icon: 'cloud' });
        } catch (e) {
          console.warn('[cloud] sign-out failed', e);
          toast('Sign-out didn’t work. Try again.', { icon: 'warn' });
        } finally {
          setBusy(false);
        }
      },
      syncNow: () => void ready.current?.syncNow(),
      async resetProgress(): Promise<ResetResult> {
        const s = ready.current;
        if (!s || !status.user) {
          store.reset();
          return 'ok';
        }
        try {
          await s.resetProgress();
          return 'ok';
        } catch (e) {
          if (e instanceof Error && e.name === 'CloudOfflineError') return 'offline';
          console.warn('[cloud] reset failed', e);
          return 'error';
        }
      },
    }),
    [status, busy, load, store],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}
