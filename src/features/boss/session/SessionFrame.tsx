/**
 * Immersive session chrome for boss battles, projects and the placement
 * quiz (legacy Session shell): Quit, progress bar, combo chip and (heart
 * modes) hearts over a scroll area. Escape asks to quit.
 *
 *   <SessionFrame label="Boss battle" progress={done / total} hearts onQuit={quit} scrollKey={pageKey}>
 *     <SlidePage pageKey={pageKey}>…</SlidePage>
 *   </SessionFrame>
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { IconButton } from '@/ui/Button';
import { anim, reduced } from '@/ui/fx/motion';
import { ComboMeter, Hearts } from '@/ui/GameBits';
import { overlayCount } from '@/ui/overlay/overlay';
import styles from './session.module.css';

export interface SessionFrameProps {
  label: string;
  /** 0..1 */
  progress: number;
  /** show the hearts (boss) */
  hearts?: boolean;
  /** show the combo chip (default true) */
  combo?: boolean;
  onQuit: () => void;
  /** scroll back to the top when this changes (new page) */
  scrollKey?: unknown;
  /** extra layer over the whole session (e.g. the boss entrance) */
  overlay?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SessionFrame({
  label,
  progress,
  hearts,
  combo = true,
  onQuit,
  scrollKey,
  overlay,
  className,
  children,
}: SessionFrameProps) {
  const { game, store } = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  const quitRef = useRef(onQuit);
  useLayoutEffect(() => {
    quitRef.current = onQuit;
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayCount() === 0) {
        e.preventDefault();
        quitRef.current();
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  const p = Math.max(0, Math.min(1, progress));
  const h = store.state.hearts;
  return (
    <section className={[styles.session, className].filter(Boolean).join(' ')} aria-label={label}>
      <header className={styles.top}>
        <IconButton icon="x" label="Quit" size="small" onClick={() => quitRef.current()} />
        <div
          className={styles.prog}
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p * 100)}
        >
          <i style={{ transform: `scaleX(${p})` }} />
        </div>
        {combo && <ComboMeter combo={game.combo} multiplier={game.multiplier()} />}
        {hearts && (
          <span className={styles.hearts} role="img" aria-label={`${h.n} of ${h.max} hearts`}>
            <Hearts n={h.n} max={h.max} size={16} />
          </span>
        )}
      </header>
      <div ref={scroller} className={styles.scroll} data-screen-focus tabIndex={-1}>
        <div className={styles.stage}>{children}</div>
      </div>
      {overlay}
    </section>
  );
}

/** One session page; a new pageKey slides the new card in (legacy Session.page). */
export function SlidePage({ pageKey, children }: { pageKey: string | number; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const rm = reduced();
    void anim(
      el.current,
      rm
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { transform: 'translateX(34%) translateY(3%) scale(.94) rotate(2deg)', opacity: 0 },
            { transform: 'translateX(-1.5%) scale(1.005)', opacity: 1, offset: 0.68 },
            { transform: 'none', opacity: 1 },
          ],
      { duration: rm ? 140 : 380, easing: 'cubic-bezier(.22,.9,.3,1.05)', rm: 'keep' },
    );
  }, [pageKey]);
  return (
    <div ref={el} key={pageKey} className={styles.page}>
      {children}
    </div>
  );
}
