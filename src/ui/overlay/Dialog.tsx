/**
 * Centered in-app dialog (never window.confirm): springs in, Escape / scrim
 * / swipe-down on the title dismisses (→ onClose), focus trapped.
 *
 *   <Dialog open={open} onClose={cancel} title="Reset progress?" mood="worried"
 *           actions={<><Button variant="coral" onClick={reset}>Reset</Button>
 *                      <Button variant="ghost" onClick={cancel}>Cancel</Button></>}>
 *     <p>This can't be undone.</p>
 *   </Dialog>
 *
 * Prefer the promise API: await useDialog().open({ … }) / .confirm({ … }).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Curlo } from '@/features/curlo/Curlo';
import type { CurloMood } from '@/features/curlo/curloArt';
import { overlayRoot, useModalKeys, useOverlayLayer, usePresence, useSwipeDown } from './overlay';
import styles from './overlay.module.css';

export interface DialogProps {
  open: boolean;
  /** dismiss (Escape, scrim, swipe) */
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  /** buttons row (stacked full width) */
  actions?: ReactNode;
  /** show Curlo above the title with this mood */
  mood?: CurloMood;
  /** or any other art above the title */
  art?: ReactNode;
  /** false = Escape/scrim do nothing (a choice is required) */
  dismissible?: boolean;
  onExited?: () => void;
  className?: string;
}

export const DIALOG_EXIT_MS = 200;

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  mood,
  art,
  dismissible = true,
  onExited,
  className,
}: DialogProps) {
  const { mounted, shown } = usePresence(open, DIALOG_EXIT_MS);
  const panel = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const isTop = useOverlayLayer(mounted && open);
  useModalKeys(panel, mounted && open, dismissible ? onClose : undefined, isTop);
  useSwipeDown(panel, [head, artRef], dismissible ? onClose : undefined, mounted && dismissible);

  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) wasMounted.current = true;
    else if (wasMounted.current) {
      wasMounted.current = false;
      onExited?.();
    }
  }, [mounted, onExited]);
  useEffect(() => {
    if (shown && panel.current) {
      panel.current.style.transform = '';
      panel.current.style.transition = '';
    }
  }, [shown]);

  if (!mounted) return null;
  return createPortal(
    <div className={styles.layer + ' ' + styles.center}>
      <div
        className={styles.scrim + (shown ? ' ' + styles.scrimOpen : '')}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panel}
        className={[styles.dlg, shown ? styles.dlgOpen : '', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        {(mood || art) && (
          <div ref={artRef} className={styles.dlgArt}>
            {art ?? <Curlo mood={mood} reactKey={shown ? 1 : 0} />}
          </div>
        )}
        <h3 ref={head} id={id} className={styles.dlgTitle}>
          {title}
        </h3>
        {children != null && <div className={styles.dlgBody}>{children}</div>}
        {actions && <div className={styles.dlgBtns}>{actions}</div>}
      </div>
    </div>,
    overlayRoot(),
  );
}
