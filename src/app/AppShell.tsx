/**
 * The app frame: header + HUD, the screen stage, bottom tabs, and the
 * global hosts (dialogs/sheets, toasts, celebrations, effects layer, PWA
 * prompt). Immersive routes cover the chrome, which becomes inert.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FxLayer } from '@/ui/fx/FxLayer';
import { DialogProvider } from '@/ui/overlay/DialogProvider';
import { ToastHost } from '@/ui/ToastHost';
import { CelebrationHost } from './CelebrationHost';
import { useGame } from './gameContext';
import { Header } from './Header';
import { navigate } from './navigation';
import { useRouteHandle } from './routeMeta';
import { Stage } from './Stage';
import { TabBar } from './TabBar';
import { UpdatePrompt } from './UpdatePrompt';
import { useApplySettings, useEngineToasts, useGameClock } from './useShellEffects';
import styles from './shell.module.css';

export function AppShell() {
  const { store } = useGame();
  const handle = useRouteHandle();
  const location = useLocation();
  const immersive = !!handle.immersive;
  useApplySettings();
  useGameClock();
  useEngineToasts();

  // New players start with onboarding (the dev gallery stays reachable).
  const onboarded = store.state.profile.onboarded;
  useEffect(() => {
    if (!onboarded && !/^\/(onboarding|dev)\b/.test(location.pathname))
      navigate('/onboarding', { dir: 'none', replace: true });
  }, [onboarded, location.pathname]);

  // chrome under an immersive screen: not focusable / not announced
  const header = useRef<HTMLElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    for (const el of [header.current, tabs.current]) if (el) el.inert = immersive;
  }, [immersive]);

  return (
    <DialogProvider>
      <div className={styles.root}>
        <div className={styles.world} aria-hidden="true">
          <div className={`${styles.amb} ${styles.ambA}`} />
          <div className={`${styles.amb} ${styles.ambB}`} />
          <div className={`${styles.amb} ${styles.ambC}`} />
        </div>
        <div className={styles.app} id="app">
          <a
            className={styles.skipLink}
            href="#main"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector<HTMLElement>('[data-screen-current] [data-screen-focus]')?.focus();
            }}
          >
            Skip to content
          </a>
          <header ref={header} className={`${styles.chrome} ${styles.header}`} aria-hidden={immersive || undefined}>
            <Header handle={handle} />
          </header>
          <main style={{ display: 'contents' }}>
            <Stage />
          </main>
          <div ref={tabs} className={`${styles.chrome} ${styles.tabsRow}`} aria-hidden={immersive || undefined}>
            <TabBar handle={handle} />
          </div>
          <UpdatePrompt installHidden={immersive || !onboarded} />
          <ToastHost />
          <div id="overlay-root" className={styles.overlayRoot} />
          <FxLayer />
          <CelebrationHost immersive={immersive} />
        </div>
      </div>
    </DialogProvider>
  );
}
