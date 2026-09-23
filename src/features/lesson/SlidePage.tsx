/**
 * One session page that springs in when `pageKey` changes (legacy card slide):
 * the new card slides from the right with a small overshoot. Interruptible
 * (WAAPI), a crossfade under reduced motion.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { anim, reduced } from '@/ui/fx/motion';
import styles from './lesson.module.css';

export function SlidePage({ pageKey, children }: { pageKey: string | number; children: ReactNode }) {
  return (
    <Page key={pageKey} first={pageKey === 0 || pageKey === 'intro'}>
      {children}
    </Page>
  );
}

function Page({ children, first }: { children: ReactNode; first: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (first) return;
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
  }, [first]);
  return (
    <div ref={el} className={styles.page}>
      {children}
    </div>
  );
}
