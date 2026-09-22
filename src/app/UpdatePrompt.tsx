/**
 * Service worker registration + "new version" prompt.
 * The worker checks for updates automatically (on load and every hour); a
 * new version installs in the background, then waits until the learner taps
 * Refresh, so the app never reloads mid-lesson by itself. Also tells the
 * learner once when offline play is ready.
 */
import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

export function UpdatePrompt() {
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

  if (!needRefresh && !offlineReady) return null;
  return (
    <div role="status" className="update-prompt">
      <span>{needRefresh ? 'A new version of Cpp Hero is ready.' : 'Cpp Hero now works offline.'}</span>
      {needRefresh && (
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Refresh
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        {needRefresh ? 'Later' : 'OK'}
      </button>
    </div>
  );
}
