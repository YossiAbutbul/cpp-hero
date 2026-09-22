/**
 * Shared overlay plumbing for Sheet / Dialog / celebration overlays:
 * a portal target, an overlay stack (only the top one handles Escape and
 * traps focus), a focus trap, swipe-down-to-dismiss and a presence helper
 * that keeps a closing overlay mounted until its exit transition ends.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Where overlays render: #overlay-root inside the app frame (falls back to body). */
export const overlayRoot = (): HTMLElement => document.getElementById('overlay-root') ?? document.body;

/* ---------------- stack ---------------- */
const stack: number[] = [];
let seq = 0;
const stackListeners = new Set<() => void>();

/** Number of open overlays (the shell ignores Escape for its panels while > 0). */
export const overlayCount = () => stack.length;

/** Registers an overlay while `active`; returns isTop() for key handling. */
export function useOverlayLayer(active: boolean): () => boolean {
  const id = useRef(0);
  useLayoutEffect(() => {
    if (!active) return;
    const me = ++seq;
    id.current = me;
    stack.push(me);
    stackListeners.forEach((f) => f());
    return () => {
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      stackListeners.forEach((f) => f());
    };
  }, [active]);
  return () => stack[stack.length - 1] === id.current;
}

/* ---------------- keys + focus ---------------- */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (x) => x.offsetParent !== null || x === document.activeElement,
  );
}

/**
 * While `active`: Escape → onEscape (top overlay only), Tab cycles inside
 * `ref`, the first focusable (or `[data-autofocus]`) gets focus, and focus
 * returns to the previously focused element afterwards.
 */
export function useModalKeys(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: (() => void) | undefined,
  isTop: () => boolean,
): void {
  const esc = useRef(onEscape);
  useLayoutEffect(() => {
    esc.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const root = ref.current;
      if (!root || root.contains(document.activeElement)) return;
      const body = root.querySelector<HTMLElement>('[data-modal-body]');
      const f =
        root.querySelector<HTMLElement>('[data-autofocus]') ??
        (body && focusables(body)[0]) ??
        focusables(root)[0] ??
        root;
      f.focus({ preventScroll: true });
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      const root = ref.current;
      if (e.key === 'Escape') {
        if (esc.current) {
          e.preventDefault();
          e.stopPropagation();
          esc.current();
        }
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const f = focusables(root);
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      try {
        if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    };
    // isTop is stable per layer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ref]);
}

/* ---------------- swipe down ---------------- */

/**
 * Drag `handles` down to dismiss `panel`: past ~90px or a quick flick it
 * dismisses, otherwise it springs back. Controls inside handles still work.
 */
export function useSwipeDown(
  panel: RefObject<HTMLElement | null>,
  handles: RefObject<HTMLElement | null>[],
  onDismiss: (() => void) | undefined,
  enabled = true,
): void {
  const cb = useRef(onDismiss);
  useLayoutEffect(() => {
    cb.current = onDismiss;
  });
  useEffect(() => {
    if (!enabled) return;
    const els = handles.map((h) => h.current).filter((x): x is HTMLElement => !!x);
    const offs = els.map((handle) => {
      handle.style.touchAction = 'none';
      const down = (e: PointerEvent) => {
        const p = panel.current;
        if (!p || (e.button != null && e.button !== 0)) return;
        if ((e.target as Element).closest('button, input, textarea, a, select')) return;
        const y0 = e.clientY;
        const t0 = Date.now();
        let dy = 0;
        let moved = false;
        const mv = (ev: PointerEvent) => {
          dy = Math.max(0, ev.clientY - y0);
          if (!moved && dy > 6) {
            moved = true;
            p.style.transition = 'none';
          }
          if (moved) p.style.transform = `translateY(${dy}px)`;
        };
        const up = () => {
          document.removeEventListener('pointermove', mv);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
          if (!moved) return;
          const v = dy / Math.max(1, Date.now() - t0);
          if (dy > 90 || v > 0.7) {
            // continue from the dragged offset straight off the bottom edge
            // (the component clears these inline styles when it reopens)
            p.style.transition = 'transform .26s cubic-bezier(.5,0,.75,0), opacity .26s';
            p.style.transform = 'translateY(110%)';
            cb.current?.();
          } else {
            p.style.transition = 'transform .32s cubic-bezier(.34,1.56,.64,1)';
            p.style.transform = '';
            window.setTimeout(() => {
              p.style.transition = '';
            }, 360);
          }
        };
        document.addEventListener('pointermove', mv);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      };
      handle.addEventListener('pointerdown', down);
      return () => handle.removeEventListener('pointerdown', down);
    });
    return () => offs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, panel]);
}

/* ---------------- presence ---------------- */

/**
 * Keeps something mounted while it animates out.
 *   const { mounted, shown } = usePresence(open, 320);
 *   mounted → render it; shown → apply the "open" class (CSS transitions do the rest).
 * Interruptible: reopening mid-exit just flips `shown` back on.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) {
      // two frames so the closed state is painted before the transition starts
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setEntered(true));
      });
      const safety = window.setTimeout(() => setEntered(true), 80);
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
        clearTimeout(safety);
      };
    }
    const t = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted: mounted || open, shown: open && entered };
}
