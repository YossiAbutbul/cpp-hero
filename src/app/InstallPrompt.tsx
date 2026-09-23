/**
 * "Install Cpp Hero" bar (same look as the update bar). Chrome / Edge /
 * Android: Install opens the browser's own install dialog
 * (beforeinstallprompt). iPhone / iPad Safari has no such event, so the bar
 * explains Share → Add to Home Screen instead. Never shown inside the
 * installed app, on immersive screens (lessons, onboarding), or for two weeks
 * after "Not now".
 */
import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import styles from './shell.module.css';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'cpphero.install.dismissedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 4000;

// The event can fire before React mounts: catch it at module load.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own button instead of the mini-infobar
    deferred = e as InstallEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore: it just shows again next visit */
  }
}

export function InstallPrompt({ hidden }: { hidden: boolean }) {
  const [canPrompt, setCanPrompt] = useState(() => !!deferred);
  const [ready, setReady] = useState(false); // after a short delay, not right on load
  const [closed, setClosed] = useState(() => snoozed() || standalone());

  useEffect(() => {
    const f = () => setCanPrompt(!!deferred);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const ios = !canPrompt && isIos();
  if (closed || hidden || !ready || (!canPrompt && !ios)) return null;

  const later = () => {
    snooze();
    setClosed(true);
  };

  const install = async () => {
    const e = deferred;
    if (!e) return;
    deferred = null;
    setClosed(true);
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'dismissed') snooze();
  };

  return (
    <div role="status" className={`${styles.update} ${styles.install}`}>
      {ios ? (
        <span>
          Install Cpp Hero: tap <b>Share</b>, then <b>Add to Home Screen</b>.
        </span>
      ) : (
        <span>Install Cpp Hero for quick, offline play.</span>
      )}
      {!ios && (
        <Button size="small" variant="sun" icon="download" onClick={() => void install()}>
          Install
        </Button>
      )}
      <Button size="small" variant="ghost" onClick={later}>
        {ios ? 'Got it' : 'Not now'}
      </Button>
    </div>
  );
}
