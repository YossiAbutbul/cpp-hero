/**
 * Navigation with themed transitions (port of the legacy router's motion
 * system). Use these instead of react-router's navigate so the Stage knows
 * how to animate:
 *
 *   navigate('/vault', { dir: 1 })                          // slide forward (tabs: View Transitions API)
 *   navigate('/lesson/w1.l2', { dir: 'expand', origin: nodeEl })   // grow a circle from the tapped node
 *   goBack('/', { dir: 'close' })                           // collapse back into that node / button
 *   navigate('/boss/w1', { dir: 'up' })                     // card rises (no origin)
 *   navigate('/stats', { dir: 'fade', replace: true })      // quick crossfade
 *
 * dir:
 *   1 / -1     direction-aware horizontal slide with a spring settle. Uses
 *              document.startViewTransition when available, WAAPI otherwise.
 *   'expand'   circular clip-path reveal from `origin` (an element, or the
 *              value of its data-origin-id). The id is remembered so leaving
 *              that screen with 'close'/'down' (or the browser Back button)
 *              collapses it back into the same element.
 *   'up'       new screen rises from the bottom.
 *   'down' / 'close'  leaving screen drops away (or collapses into its origin).
 *   'fade'     quick crossfade.   'none'  instant.
 * Everything is ≤ ~420ms, interruptible (a new navigation finishes the
 * running one instantly) and a plain crossfade under reduced motion.
 */
import { reduced } from '@/ui/fx/motion';

export type NavDir = 1 | -1 | 'up' | 'down' | 'close' | 'expand' | 'fade' | 'none';

export interface NavOptions {
  dir?: NavDir;
  /** element (or its data-origin-id) the new screen expands from / collapses into */
  origin?: Element | string | null;
  replace?: boolean;
}

/** What the Stage reads when the location changes. */
export interface PendingNav {
  seq: number;
  dir: NavDir;
  originRect?: DOMRect;
  originId?: string;
  /** the View Transitions API handles this one */
  vt?: boolean;
}

interface RouterLike {
  navigate(to: string | number, opts?: { replace?: boolean; flushSync?: boolean }): Promise<void>;
}

let router: RouterLike | null = null;
let pending: PendingNav | null = null;
let seq = 0;
let activeVT: { skipTransition(): void } | null = null;

/** Called once by the router module. */
export function bindRouter(r: RouterLike): void {
  router = r;
}

export const peekPendingNav = (): PendingNav | null => pending;
export function clearPendingNav(s?: number): void {
  if (!pending || s == null || pending.seq === s) pending = null;
}

function resolveOrigin(origin: NavOptions['origin']): { rect?: DOMRect; id?: string } {
  if (!origin) return {};
  const el =
    typeof origin === 'string'
      ? document.querySelector(`[data-origin-id="${CSS.escape(origin)}"]`)
      : origin;
  const id = typeof origin === 'string' ? origin : (origin.getAttribute('data-origin-id') ?? undefined);
  const rect = el && el.getClientRects().length ? el.getBoundingClientRect() : undefined;
  return { rect, id };
}

/** Finish any running View Transition right away (interruptible navigation). */
function skipVT(): void {
  try {
    activeVT?.skipTransition();
  } catch {
    /* ignore */
  }
  activeVT = null;
}

export function navigate(to: string, opts: NavOptions = {}): void {
  if (!router) return;
  skipVT();
  const dir: NavDir = opts.dir ?? 1;
  const o = resolveOrigin(opts.origin);
  const p: PendingNav = { seq: ++seq, dir, originRect: o.rect, originId: o.id };
  pending = p;

  const canVT =
    (dir === 1 || dir === -1) &&
    !reduced() &&
    typeof document.startViewTransition === 'function' &&
    document.visibilityState === 'visible' &&
    !!document.querySelector('[data-screen-current]');
  if (canVT) {
    p.vt = true;
    const html = document.documentElement;
    html.dataset.vt = dir === -1 ? 'back' : 'fwd';
    try {
      const r = router;
      let ran = false;
      const vt = document.startViewTransition(() => {
        ran = true;
        return r.navigate(to, { replace: opts.replace, flushSync: true });
      });
      activeVT = vt;
      // Safety net: if the page isn't producing frames the update callback can
      // stall; skipping runs it right away, so a navigation is never lost.
      window.setTimeout(() => {
        if (!ran) vt.skipTransition();
      }, 250);
      const clear = () => {
        if (activeVT === vt) activeVT = null;
        delete html.dataset.vt;
      };
      vt.finished.then(clear, clear);
      vt.ready.catch(() => {});
      vt.updateCallbackDone.catch(() => {});
      return;
    } catch {
      p.vt = false;
      delete html.dataset.vt;
    }
  }
  void router.navigate(to, { replace: opts.replace });
}

/**
 * Back to the previous in-app screen (or `fallback` when the app was opened
 * directly on this one). Default dir 'close': collapses into the element the
 * screen expanded from, else drops down.
 */
export function goBack(fallback = '/', opts: { dir?: NavDir } = {}): void {
  if (!router) return;
  skipVT();
  pending = { seq: ++seq, dir: opts.dir ?? 'close' };
  // react-router keeps the entry index in history.state.idx (null for entries
  // created by editing the URL by hand: then any non-initial key counts)
  const st = window.history.state as { idx?: number | null; key?: string } | null;
  const canBack = typeof st?.idx === 'number' ? st.idx > 0 : !!st?.key && st.key !== 'default';
  if (canBack) void router.navigate(-1);
  else void router.navigate(fallback, { replace: true });
}

/** Hook form (for symmetry with react-router): const nav = useNav(); nav('/vault', { dir: 1 }) */
export const useNav = () => navigate;
