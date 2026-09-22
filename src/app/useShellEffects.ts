/**
 * Shell-level side effects:
 *   useApplySettings()  save settings → <html data-ts> + .rm + fx reduced-motion flag
 *   useGameClock()      every 5 s while visible and active (input in the last 90 s): game.tick(5)
 *   useEngineToasts()   engine 'toast' events, the storage notice and boot streak notes → toasts
 */
import { useEffect } from 'react';
import { setAppReducedMotion } from '@/ui/fx/motion';
import { toast } from '@/ui/toast';
import { useGame } from './gameContext';

export function useApplySettings(): void {
  const { store } = useGame();
  const { textSize, reduceMotion } = store.state.settings;
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.ts = textSize;
    html.classList.toggle('rm', reduceMotion);
    setAppReducedMotion(reduceMotion);
  }, [textSize, reduceMotion]);
}

const IDLE_MS = 90_000;
const TICK_S = 5;

export function useGameClock(): void {
  const { game } = useGame();
  useEffect(() => {
    let lastInput = Date.now();
    const mark = () => (lastInput = Date.now());
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((ev) => window.addEventListener(ev, mark, { passive: true, capture: true }));
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_MS) return;
      game.tick(TICK_S);
    }, TICK_S * 1000);
    return () => {
      clearInterval(t);
      evs.forEach((ev) => window.removeEventListener(ev, mark, { capture: true }));
    };
  }, [game]);
}

export function useEngineToasts(): void {
  const { game, notice } = useGame();
  useEffect(() => game.events.on('toast', (t) => toast(t.msg, { icon: t.icon })), [game]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => toast(notice, { icon: 'info', ms: 5000 }), 1200);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const n = game.drainNotes().find(Boolean);
      if (!n) return;
      if (n.kind === 'freeze-used')
        toast(`A streak freeze saved your ${n.days}-day streak!`, { icon: 'freeze', ms: 4000 });
      else toast('Your streak restarted. Today is day one!', { icon: 'flame', ms: 4000 });
    }, 900);
    return () => clearTimeout(t);
  }, [game]);
}
