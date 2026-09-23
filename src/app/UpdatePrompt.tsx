/**
 * Service worker registration + "new version" prompt.
 * The worker checks for updates automatically (on load and every hour); a
 * new version installs in the background, then waits until the learner taps
 * Refresh, so the app never reloads mid-lesson by itself. Also tells the
 * learner once when offline play is ready (as a toast), and offers to install the app (InstallPrompt).
 */
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { InstallPrompt } from './InstallPrompt';
import styles from './shell.module.css';

const HOUR = 60 * 60 * 1000;

/** installHidden: hide the install bar (immersive screens, before onboarding). */
export function UpdatePrompt({ installHidden }: { installHidden: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update().catch(() => {}), HOUR);
    },
    onRegisterError(e: unknown) {
      console.warn('[pwa] service worker registration failed (the app still works online)', e);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast('Cpp Hero now works offline.', { icon: 'ok' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  // One bar at a time: the update bar wins over the install bar.
  if (!needRefresh) return <InstallPrompt hidden={installHidden} />;
  return (
    <div role="status" className={styles.update}>
      <span>A new version of Cpp Hero is ready.</span>
      <Button size="small" variant="sun" onClick={() => void updateServiceWorker(true)}>
        Refresh to update
      </Button>
      <Button size="small" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </Button>
    </div>
  );
}
