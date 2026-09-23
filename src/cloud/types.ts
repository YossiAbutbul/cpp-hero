/** Types shared by the lazy Firebase module (session.ts) and the React side. No Firebase imports. */

export interface CloudUser {
  uid: string;
  name: string;
  email: string;
}

/** idle = signed out; too-new = the cloud save comes from a newer app version (sync paused). */
export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'too-new';

export interface CloudStatus {
  /** Firebase has told us whether someone is signed in. */
  authReady: boolean;
  user: CloudUser | null;
  state: SyncState;
  lastSyncAt: number | null;
}

export interface CloudSession {
  /** Google sign-in: popup, falling back to a full-page redirect when popups are blocked. */
  signIn(): Promise<void>;
  /** Push pending changes (best effort), then sign out. The device keeps its save. */
  signOut(): Promise<void>;
  /** Reset progress here AND in the cloud (all devices). Throws CloudOfflineError when offline. */
  resetProgress(): Promise<void>;
  syncNow(): Promise<void>;
  dispose(): void;
}
