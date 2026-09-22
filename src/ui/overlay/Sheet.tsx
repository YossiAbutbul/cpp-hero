/**
 * Bottom sheet: springs up, scrim tap / Escape / X / swipe-down on the
 * handle or title closes it, focus is trapped while open and returns after.
 *
 *   const [open, setOpen] = useState(false);
 *   <Sheet open={open} onClose={() => setOpen(false)} title="Daily quests">…</Sheet>
 *
 * Prefer the promise API for one-off sheets: useDialog().sheet({ title, body }).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../Button';
import { overlayRoot, useModalKeys, useOverlayLayer, usePresence, useSwipeDown } from './overlay';
import styles from './overlay.module.css';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  /** called after the exit transition (the sheet is unmounted) */
  onExited?: () => void;
}

export const SHEET_EXIT_MS = 300;

export function Sheet({ open, onClose, title, children, className, onExited }: SheetProps) {
  const { mounted, shown } = usePresence(open, SHEET_EXIT_MS);
  const panel = useRef<HTMLDivElement>(null);
  const grab = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const isTop = useOverlayLayer(mounted && open);
  useModalKeys(panel, mounted && open, onClose, isTop);
  useSwipeDown(panel, [grab, head], onClose, mounted);

  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) wasMounted.current = true;
    else if (wasMounted.current) {
      wasMounted.current = false;
      onExited?.();
    }
  }, [mounted, onExited]);
  useEffect(() => {
    // clear a swipe-dismiss offset if the sheet is reopened mid-exit
    if (shown && panel.current) {
      panel.current.style.transform = '';
      panel.current.style.transition = '';
    }
  }, [shown]);

  if (!mounted) return null;
  return createPortal(
    <div className={styles.layer}>
      <div className={styles.scrim + (shown ? ' ' + styles.scrimOpen : '')} onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={[styles.sheet, shown ? styles.sheetOpen : '', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div ref={grab} className={styles.grab} aria-hidden="true" />
        <h3 ref={head} className={styles.sheetHead}>
          <span id={id}>{title}</span>
          <IconButton icon="x" label="Close" size="small" onClick={onClose} />
        </h3>
        <div className={styles.sheetBody} data-modal-body>
          {children}
        </div>
      </div>
    </div>,
    overlayRoot(),
  );
}
