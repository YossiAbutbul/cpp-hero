/**
 * Screen transitions (WAAPI), ported from legacy ui.js transition().
 * All transform / opacity / clip-path, ≤ ~420ms. Each returns a promise
 * that resolves when the leaving screen can be removed; anim()'s timeout
 * fallback guarantees it resolves even if frames never render.
 */
import { anim, EASE_IN, EASE_OUT, reduced } from '@/ui/fx/motion';
import type { NavDir } from './navigation';

export interface Point {
  x: number;
  y: number;
  r: number;
}

/** Center of `rect` in `inEl`'s coordinates. */
export function pointIn(rect: DOMRect, inEl: Element): Point {
  const s = inEl.getBoundingClientRect();
  return { x: rect.left + rect.width / 2 - s.left, y: rect.top + rect.height / 2 - s.top, r: Math.max(rect.width, rect.height) / 2 };
}

function farCorner(p: Point, el: Element): number {
  const { width: w, height: h } = el.getBoundingClientRect();
  return Math.ceil(Math.max(Math.hypot(p.x, p.y), Math.hypot(w - p.x, p.y), Math.hypot(p.x, h - p.y), Math.hypot(w - p.x, h - p.y))) + 8;
}

export interface TransitionSpec {
  dir: NavDir;
  /** expand: where the new screen grows from (client rect) */
  originRect?: DOMRect;
  /** close/down: element to collapse the leaving screen into */
  collapseTo?: Element | null;
}

/** First screen of the session: a soft lift-in. */
export function enterFirst(to: HTMLElement): void {
  void anim(to, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
    duration: 280,
    easing: EASE_OUT,
    rm: 'fade',
  });
}

export function runTransition(from: HTMLElement | null, to: HTMLElement, spec: TransitionSpec): Promise<unknown> {
  let { dir } = spec;
  if (!from || dir === 'none') return Promise.resolve();
  from.style.pointerEvents = 'none';

  if (reduced() || dir === 'fade') {
    const out = anim(from, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, rm: 'keep', fill: 'forwards' });
    void anim(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, rm: 'keep' });
    return out;
  }

  if (dir === 'expand') {
    if (spec.originRect) {
      const o = pointIn(spec.originRect, to);
      const R = farCorner(o, to);
      const at = ` at ${o.x}px ${o.y}px`;
      to.style.zIndex = '12';
      void anim(from, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.96)', opacity: 0.6 }], {
        duration: 400,
        fill: 'forwards',
      });
      return anim(to, [{ clipPath: `circle(${Math.max(8, o.r)}px${at})` }, { clipPath: `circle(${R}px${at})` }], {
        duration: 400,
        easing: 'cubic-bezier(.3,.7,.2,1)',
        rm: 'keep',
      }).then(() => {
        to.style.clipPath = '';
        to.style.zIndex = '';
      });
    }
    dir = 'up';
  }

  if ((dir === 'down' || dir === 'close') && spec.collapseTo) {
    const p = pointIn(spec.collapseTo.getBoundingClientRect(), from);
    const R = farCorner(p, from);
    const at = ` at ${p.x}px ${p.y}px`;
    from.style.zIndex = '12';
    void anim(to, [{ transform: 'scale(.97)', opacity: 0.7 }, { transform: 'none', opacity: 1 }], {
      duration: 360,
      easing: EASE_OUT,
    });
    return anim(
      from,
      [{ clipPath: `circle(${R}px${at})` }, { clipPath: `circle(${Math.max(6, p.r * 0.6)}px${at})`, opacity: 0.4 }],
      { duration: 360, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards', rm: 'keep' },
    );
  }

  let outK: Keyframe[];
  let inK: Keyframe[];
  const outD = 220;
  let inD = 380;
  if (dir === 'up') {
    to.style.zIndex = '12';
    outK = [{ transform: 'none', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }];
    inK = [
      { transform: 'translateY(60%) scale(.96)', opacity: 0 },
      { transform: 'translateY(-1.5%)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ];
  } else if (dir === 'down' || dir === 'close') {
    from.style.zIndex = '12';
    outK = [{ transform: 'none', opacity: 1 }, { transform: 'translateY(40%) scale(.94)', opacity: 0 }];
    inK = [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'scale(1.005)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }];
    inD = 340;
  } else {
    const d = dir === -1 ? -1 : 1;
    outK = [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-d * 18}%) scale(.94)`, opacity: 0 }];
    inK = [
      { transform: `translateX(${d * 26}%) scale(.97)`, opacity: 0 },
      { transform: `translateX(${-d * 1.2}%) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ];
  }
  void anim(to, inK, { duration: inD, easing: EASE_OUT }).then(() => {
    to.style.zIndex = '';
  });
  return anim(from, outK, { duration: dir === 'down' || dir === 'close' ? 300 : outD, easing: EASE_IN, fill: 'forwards' });
}
