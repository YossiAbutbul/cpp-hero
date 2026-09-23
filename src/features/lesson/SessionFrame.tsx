/**
 * Immersive session chrome (legacy Session shell): quit button, progress bar,
 * combo chip and (heart modes) hearts, over a scroll area. Escape asks to quit.
 *
 *   <SessionFrame label="Lesson" progress={done / total} hearts onQuit={askQuit} scrollKey={page}>
 *     <SlidePage pageKey={page}>…</SlidePage>
 *   </SessionFrame>
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { ComboMeter, Hearts } from '@/ui/GameBits';
import { IconButton } from '@/ui/Button';
import { overlayCount } from '@/ui/overlay/overlay';
import styles from './lesson.module.css';

export interface SessionFrameProps {
  label: string;
  /** 0..1 */
  progress: number;
  /** show the hearts (lesson / boss) */
  hearts?: boolean;
  onQuit: () => void;
  /** scroll back to the top when this changes (new page) */
  scrollKey?: unknown;
  children: ReactNode;
}

export function SessionFrame({ label, progress, hearts, onQuit, scrollKey, children }: SessionFrameProps) {
  const { game, store } = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  const quitRef = useRef(onQuit);
  useEffect(() => {
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
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  const p = Math.max(0, Math.min(1, progress));
  const h = store.state.hearts;
  return (
    <section className={styles.session} aria-label={label}>
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
        <ComboMeter combo={game.combo} multiplier={game.multiplier()} />
        {hearts && (
          <span className={styles.hearts} aria-label={`${h.n} of ${h.max} hearts`} role="img">
            <Hearts n={h.n} max={h.max} size={16} />
          </span>
        )}
      </header>
      <div ref={scroller} className={styles.scroll}>
        <div className={styles.stage}>{children}</div>
      </div>
    </section>
  );
}
