/**
 * The screen stage: renders the current route's screen plus, briefly, the
 * one that is leaving, and runs the transition between them (see
 * navigation.ts for the vocabulary). Screens are grid items of the app
 * frame: normal screens fill the stage row, immersive ones cover the whole
 * frame (header + tab bar included).
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { cancelAnims } from '@/ui/fx/motion';
import { clearPendingNav, peekPendingNav, type NavDir } from './navigation';
import { tabIndex, useRouteHandle, type RouteHandle } from './routeMeta';
import { enterFirst, runTransition } from './transitions';
import styles from './shell.module.css';

interface Entry {
  key: string;
  el: ReactNode;
  handle: RouteHandle;
  /** data-origin-id this screen expanded from (collapse target on exit) */
  originId?: string;
  leaving?: boolean;
  /** transition that brought this entry in */
  enter?: { seq?: number; dir: NavDir; originRect?: DOMRect; vt?: boolean };
}

function defaultDir(prev: Entry, next: RouteHandle): NavDir {
  if (prev.originId) return 'close';
  if (prev.handle.immersive) return 'down';
  if (next.immersive) return 'up';
  const a = tabIndex(prev.handle.tab);
  const b = tabIndex(next.tab);
  if (prev.handle.panel || next.panel || a < 0 || b < 0) return 'fade';
  return b < a ? -1 : 1;
}

export function Stage() {
  const location = useLocation();
  const outlet = useOutlet();
  const handle = useRouteHandle();
  // location.key alone isn't unique: entries created by editing the URL by
  // hand all get the key "default", so the path is part of the identity.
  const locId = `${location.key}:${location.pathname}${location.search}`;
  const [entries, setEntries] = useState<Entry[]>(() => [{ key: locId, el: outlet, handle }]);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const ran = useRef<string | null>(null);

  // A new location: keep the old screen (same instance) as "leaving" and add
  // the new one. Deterministic, so it's safe under StrictMode double render.
  const current = entries[entries.length - 1]!;
  if (current.key !== locId) {
    const p = peekPendingNav();
    const dir = p?.dir ?? defaultDir(current, handle);
    const vt = !!p?.vt;
    const next: Entry = {
      key: locId,
      el: outlet,
      handle,
      originId: dir === 'expand' || (p?.originId && dir !== 'close' && dir !== 'down') ? p?.originId : undefined,
      enter: { seq: p?.seq, dir, originRect: p?.originRect, vt },
    };
    // Keep the origin across a 'fade' swap between header panels.
    if (!next.originId && dir === 'fade' && current.originId && p?.originId) next.originId = p.originId;
    setEntries((list) => {
      const cur = list[list.length - 1]!;
      if (cur.key === locId) return list;
      // anything still leaving is dropped at once (interruptible)
      return vt || dir === 'none' ? [next] : [{ ...cur, leaving: true }, next];
    });
  }

  useLayoutEffect(() => {
    const cur = entries[entries.length - 1]!;
    if (ran.current === cur.key) return;
    const first = ran.current === null;
    ran.current = cur.key;
    const to = nodes.current.get(cur.key);
    if (!to) return;
    clearPendingNav(cur.enter?.seq);

    // focus the new screen for keyboard / screen-reader users
    const target =
      to.querySelector<HTMLElement>('[data-autofocus]') ?? to.querySelector<HTMLElement>('h1, h2') ?? to;
    if (!target.matches('button, a[href], input, select, textarea') && !target.hasAttribute('tabindex'))
      target.setAttribute('tabindex', '-1');
    target.dataset.screenFocus = '';
    if (!first) target.focus({ preventScroll: true });

    if (first) return enterFirst(to);
    const leaving = entries.find((e) => e.leaving);
    if (!leaving || cur.enter?.vt) return;
    const from = nodes.current.get(leaving.key) ?? null;
    if (from) cancelAnims(from);
    cancelAnims(to);
    const dir = cur.enter?.dir ?? 'fade';
    let collapseTo: Element | null = null;
    if ((dir === 'close' || dir === 'down') && leaving.originId) {
      const sel = `[data-origin-id="${CSS.escape(leaving.originId)}"]`;
      const t = to.querySelector(sel) ?? document.querySelector(`.${styles.chrome} ${sel}`);
      if (t && t.getClientRects().length) collapseTo = t;
    }
    let alive = true;
    const remove = () => {
      if (!alive) return;
      alive = false;
      setEntries((list) => list.filter((e) => e.key !== leaving.key));
    };
    void runTransition(from, to, { dir, originRect: cur.enter?.originRect, collapseTo }).then(remove);
    const safety = window.setTimeout(remove, 900);
    return () => clearTimeout(safety);
  }, [entries]);

  return (
    <>
      {entries.map((e) => (
        <div
          key={e.key}
          ref={(el) => {
            if (el) nodes.current.set(e.key, el);
            else nodes.current.delete(e.key);
          }}
          className={[styles.screen, e.handle.immersive ? styles.immersive : '', e.leaving ? styles.leaving : '']
            .filter(Boolean)
            .join(' ')}
          data-screen-current={e.leaving ? undefined : ''}
          aria-hidden={e.leaving || undefined}
        >
          {e.el}
        </div>
      ))}
    </>
  );
}
