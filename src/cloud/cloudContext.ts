import { createContext, useContext } from 'react';
import type { CloudStatus } from './types';

export type ResetResult = 'ok' | 'offline' | 'error';

export interface CloudContextValue {
  /** VITE_FIREBASE_* config present (else every cloud UI is hidden). */
  enabled: boolean;
  status: CloudStatus;
  /** A sign-in / sign-out is in progress. */
  busy: boolean;
  /** Start downloading the Firebase chunk (the Settings card calls this on mount so a tap opens the popup at once). */
  prepare(): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  syncNow(): void;
  /** Reset progress on this device and, when signed in, in the cloud. */
  resetProgress(): Promise<ResetResult>;
}

export const INITIAL_STATUS: CloudStatus = { authReady: false, user: null, state: 'idle', lastSyncAt: null };

export const CloudContext = createContext<CloudContextValue | null>(null);

export function useCloud(): CloudContextValue {
  const v = useContext(CloudContext);
  if (!v) throw new Error('useCloud() must be used inside <CloudProvider>');
  return v;
}
