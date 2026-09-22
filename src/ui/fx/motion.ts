/**
 * Motion toolkit (port of legacy engine/fx.js): reduced-motion state, a safe
 * WAAPI wrapper and small spring presets. Everything animates transform /
 * opacity (60fps) and stays well under 400ms unless it is a celebration.
 *
 * The golden rule: nothing may depend on an animation finishing. anim()
 * resolves on finish OR after duration+delay+120ms, and then drops the effect
 * (or jumps to the end for fill:'forwards'), so a hidden tab or a throttled
 * browser can never leave an element stuck invisible on its first keyframe.
 */
import { useSyncExternalStore } from 'react';

export const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
export const EASE_OUT = 'cubic-bezier(.22,.9,.3,1.05)';
export const EASE_IN = 'cubic-bezier(.5,0,.75,0)';

/* ---------------- reduced motion ---------------- */

const mq: MediaQueryList | null =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let appReduced = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
mq?.addEventListener?.('change', notify);

/** True when the OS or the in-app "reduce animations" setting asks for less motion. */
export function reduced(): boolean {
  return appReduced || !!mq?.matches;
}

/** Called by the app shell when settings.reduceMotion changes. */
export function setAppReducedMotion(on: boolean): void {
  if (appReduced === on) return;
  appReduced = on;
  notify();
}

/** React hook: re-renders when reduced-motion changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reduced,
    () => false,
  );
}

/** Motion-aware pause (capped at 120ms under reduced motion). */
export const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced() ? Math.min(ms, 120) : ms));

/* ---------------- WAAPI wrapper ---------------- */

export interface AnimOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: FillMode;
  /**
   * Under reduced motion: 'skip' (default, no animation), 'fade' (a 140ms
   * opacity fade instead) or 'keep' (run as-is: use for opacity-only effects).
   */
  rm?: 'skip' | 'fade' | 'keep';
}

/** Animate `el`; the promise always resolves (see the file comment). */
export function anim(
  el: Element | null | undefined,
  keyframes: Keyframe[],
  opts: AnimOptions = {},
): Promise<Animation | undefined> {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return Promise.resolve(undefined);
  const rm = reduced();
  const mode = opts.rm ?? 'skip';
  if (rm && mode === 'skip') return Promise.resolve(undefined);
  let kf = keyframes;
  const o: KeyframeAnimationOptions = {
    duration: opts.duration ?? 300,
    easing: opts.easing ?? 'ease-out',
    delay: opts.delay ?? 0,
    fill: opts.fill ?? 'none',
  };
  if (rm && mode === 'fade') {
    kf = [{ opacity: 0 }, { opacity: 1 }];
    Object.assign(o, { duration: 140, easing: 'ease', delay: 0 });
  }
  return new Promise((resolve) => {
    let done = false;
    let a: Animation | undefined;
    const fin = () => {
      if (!done) {
        done = true;
        resolve(a);
      }
    };
    try {
      a = el.animate(kf, o);
      a.onfinish = fin;
      a.oncancel = fin;
    } catch {
      fin();
      return;
    }
    setTimeout(
      () => {
        try {
          if (a && a.playState !== 'finished' && a.playState !== 'idle') {
            if (o.fill === 'forwards' || o.fill === 'both') {
              try {
                a.finish();
              } catch {
                a.cancel();
              }
            } else a.cancel(); // drop the effect: the element shows its normal style
          }
        } catch {
          /* ignore */
        }
        fin();
      },
      Number(o.duration) + Number(o.delay) + 120,
    );
  });
}

/** Cancel every running animation on an element. */
export function cancelAnims(el: Element | null | undefined): void {
  el?.getAnimations?.().forEach((a) => a.cancel());
}

/* ---------------- presets ---------------- */

/** Springy pop-in (scale from small with overshoot). */
export const popIn = (el: Element | null, delay = 0) =>
  anim(
    el,
    [
      { transform: 'scale(.6)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.65 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 340, delay, fill: 'backwards', rm: 'fade' },
  );

/** Slide up + fade in (explanations, cards). */
export const slideUp = (el: Element | null, delay = 0) =>
  anim(
    el,
    [
      { transform: 'translateY(40px) scale(.96)', opacity: 0 },
      { transform: 'translateY(-5px) scale(1.01)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 380, easing: EASE_OUT, delay, fill: 'backwards', rm: 'fade' },
  );

/** Small "boing" for confirmations. */
export const bounce = (el: Element | null) =>
  anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18) rotate(-4deg)' }, { transform: 'scale(1)' }], {
    duration: 360,
    easing: SPRING,
  });

/** Horizontal shake (wrong answers). */
export const shake = (el: Element | null, strength = 10) =>
  anim(
    el,
    [
      { transform: 'none' },
      { transform: `translateX(${-strength}px)` },
      { transform: `translateX(${strength * 0.9}px)` },
      { transform: `translateX(${-strength * 0.6}px)` },
      { transform: `translateX(${strength * 0.4}px)` },
      { transform: 'none' },
    ],
    { duration: 380 },
  );

/** Wiggle (tapping locked things). */
export const wiggle = (el: Element | null) =>
  anim(
    el,
    [
      { transform: 'none' },
      { transform: 'rotate(-9deg)', offset: 0.2 },
      { transform: 'rotate(8deg)', offset: 0.45 },
      { transform: 'rotate(-4deg)', offset: 0.7 },
      { transform: 'none' },
    ],
    { duration: 380, easing: SPRING },
  );

/**
 * Quick staggered lift-in for already-laid-out elements: 20–40ms apart,
 * everything done within ~350ms. Instant under reduced motion.
 */
export function stagger(els: ArrayLike<Element>, opts: { duration?: number; total?: number } = {}): void {
  const n = els.length;
  if (!n || reduced()) return;
  const dur = opts.duration ?? 220;
  const budget = opts.total ?? 350;
  const step = n > 1 ? Math.max(20, Math.min(40, (budget - dur) / (n - 1))) : 0;
  Array.from(els).forEach((el, i) => {
    void anim(el, [{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], {
      duration: dur,
      delay: Math.min(i * step, budget - dur),
      easing: EASE_OUT,
      fill: 'backwards',
    });
  });
}

const pokeRaf = new WeakMap<HTMLElement, number>();
/** Damped-spring squash-and-stretch (poke Curlo, press big things). */
export function springPoke(el: HTMLElement | null): void {
  if (!el || reduced()) return;
  let x = -0.2;
  let v = 0;
  let last = performance.now();
  const k = 320;
  const d = 10;
  cancelAnimationFrame(pokeRaf.get(el) ?? 0);
  const f = (t: number) => {
    const dt = Math.min(0.032, (t - last) / 1000);
    last = t;
    v += (-k * x - d * v) * dt;
    x += v * dt;
    el.style.transform = `scale(${1 - x},${1 + x})`;
    if (Math.abs(x) > 0.002 || Math.abs(v) > 0.02) pokeRaf.set(el, requestAnimationFrame(f));
    else el.style.transform = '';
  };
  el.style.transformOrigin = '50% 100%';
  pokeRaf.set(el, requestAnimationFrame(f));
  setTimeout(() => {
    cancelAnimationFrame(pokeRaf.get(el) ?? 0);
    el.style.transform = '';
  }, 1600);
}

const pulseTimers = new WeakMap<Element, Map<string, number>>();
/** Re-trigger a CSS animation class (removed again after `ms`). No-op under reduced motion. */
export function pulseClass(el: Element | null, cls: string | undefined, ms = 1600): void {
  if (!el || !cls || reduced()) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  let m = pulseTimers.get(el);
  if (!m) pulseTimers.set(el, (m = new Map()));
  clearTimeout(m.get(cls));
  m.set(
    cls,
    window.setTimeout(() => el.classList.remove(cls), ms),
  );
}
