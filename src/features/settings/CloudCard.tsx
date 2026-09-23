/**
 * "Cloud save" card: Google sign-in / sign-out and sync status.
 * Hidden when the app is built without Firebase config.
 */
import { useEffect } from 'react';
import { useCloud } from '@/cloud/cloudContext';
import type { SyncState } from '@/cloud/types';
import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Card } from '@/ui/Layout';
import styles from './settings.module.css';

const STATE: Record<SyncState, { icon: IconName; text: string }> = {
  idle: { icon: 'cloud', text: 'Not synced' },
  syncing: { icon: 'cloud', text: 'Syncing…' },
  synced: { icon: 'check', text: 'Saved to the cloud' },
  offline: { icon: 'info', text: 'Offline. Syncs when you’re back.' },
  error: { icon: 'warn', text: 'Couldn’t sync.' },
  'too-new': { icon: 'warn', text: 'Update the app to sync.' },
};

export function CloudCard() {
  const cloud = useCloud();
  const { prepare } = cloud;
  // Load Firebase while the learner reads the card, so a tap opens the popup at once.
  useEffect(() => {
    if (cloud.enabled) prepare();
  }, [cloud.enabled, prepare]);

  if (!cloud.enabled) return null;
  const { user, state, authReady } = cloud.status;
  const st = STATE[state];

  return (
    <Card className={styles.cloud}>
      <h3>
        <Icon name="cloud" /> Cloud save
      </h3>
      {user ? (
        <>
          <div className={styles.who}>
            <span className={styles.avatar} aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <div className={styles.t}>
              <b>{user.name}</b>
              {user.email && <small>{user.email}</small>}
            </div>
          </div>
          <p className={styles.sync} data-state={state} role="status" aria-live="polite">
            <Icon name={st.icon} size={18} /> <span key={state}>{st.text}</span>
          </p>
          <div className={styles.btns}>
            {state === 'error' && (
              <Button variant="teal" size="small" onClick={cloud.syncNow}>
                Try again
              </Button>
            )}
            <Button variant="ghost" size="small" disabled={cloud.busy} onClick={() => void cloud.signOut()}>
              Sign out
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">Keep your progress safe and play on any device.</p>
          <button
            type="button"
            className={styles.google}
            disabled={cloud.busy || (!authReady && state !== 'idle')}
            onClick={() => void cloud.signIn()}
          >
            <GoogleG />
            <span>{cloud.busy ? 'Signing in…' : 'Sign in with Google'}</span>
          </button>
        </>
      )}
    </Card>
  );
}

/** Google "G" mark (brand colors, per Google sign-in button guidelines). */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
