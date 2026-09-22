/**
 * The dramatic evolution overlay (legacy curlo.evolve): shake → flicker
 * between the old and new form (accelerating) → white flash → reveal with
 * confetti. Tap / Enter / Space / Escape skips straight to the reveal; a
 * second tap closes. Reduced motion: straight to the reveal.
 *
 *   <EvolutionSequence from={1} to={2} name="Curlo" onDone={next} />
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/ui/Button';
import { burstAt, clearConfetti, rain } from '@/ui/fx/effects';
import { anim, reduced } from '@/ui/fx/motion';
import { overlayRoot, useOverlayLayer } from '@/ui/overlay/overlay';
import styles from '@/ui/fx/celebrate.module.css';
import { Curlo } from './Curlo';
import { FORMS, type CurloFormN } from './curloArt';

export interface EvolutionSequenceProps {
  from: CurloFormN;
  to: CurloFormN;
  /** the player's name for Curlo */
  name: string;
  onDone: () => void;
}

const FLICKS = [900, 1150, 1350, 1500, 1620, 1720, 1800, 1870, 1930, 1980, 2020];

export function EvolutionSequence({ from, to, name, onDone }: EvolutionSequenceProps) {
  const f = FORMS[to] ?? FORMS[2];
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [shaking, setShaking] = useState(!reduced());
  const [reactKey, setReactKey] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const flashEl = useRef<HTMLDivElement>(null);
  const newWrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const closed = useRef(false);
  const isTop = useOverlayLayer(true);

  const finish = useCallback(() => {
    if (done) return;
    timers.current.forEach(clearTimeout);
    setDone(true);
    setShowNew(true);
    setShaking(false);
    setReactKey((k) => k + 1);
  }, [done]);

  const close = useCallback(() => {
    if (!done) return finish();
    if (closed.current) return;
    closed.current = true;
    clearConfetti();
    void anim(root.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, rm: 'keep', fill: 'forwards' }).then(onDone);
  }, [done, finish, onDone]);

  // the reveal: confetti + focus the button
  useEffect(() => {
    if (!done) return;
    btn.current?.focus();
    burstAt(newWrap.current, { n: 160 });
    rain(90);
  }, [done]);

  useEffect(() => {
    root.current?.focus();
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    if (reduced()) later(finish, 400);
    else {
      FLICKS.forEach((t, i) => later(() => setShowNew(i % 2 === 0), t));
      later(
        () =>
          void anim(flashEl.current, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700, rm: 'keep' }),
        2050,
      );
      later(finish, 2350);
    }
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [isTop]);

  return createPortal(
    <div
      ref={root}
      className={styles.evo}
      role="dialog"
      aria-modal="true"
      aria-label="Curlo is evolving"
      tabIndex={-1}
      onClick={close}
    >
      <div className={styles.evoRays} aria-hidden="true" />
      <div ref={flashEl} className={styles.evoFlash} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.evoT1}>{done ? 'Evolution!' : 'What?!'}</div>
        <div className={styles.evoStage}>
          <div className={styles.evoOld + (shaking ? ' ' + styles.evoShake : '')} style={{ opacity: showNew ? 0 : 1 }}>
            <Curlo form={from} mood="bracing" reactKey={1} />
          </div>
          <div ref={newWrap} className={styles.evoNew} style={{ opacity: showNew ? 1 : 0 }}>
            <Curlo form={to} mood="celebrate" reactKey={reactKey} />
          </div>
          <div className={styles.evoGlow} aria-hidden="true" />
        </div>
        <div className={styles.evoT2} aria-live="polite">
          {done ? (
            <>
              {name} reached{' '}
              <b>
                Form {to}: {f.name}
              </b>
              !<br />
              <span className={styles.evoGear}>New gear: {f.gear}</span>
            </>
          ) : (
            <>{name} is evolving…</>
          )}
        </div>
        {done && (
          <Button ref={btn} variant="sun">
            Amazing!
          </Button>
        )}
        <div className={styles.skip}>{done ? 'Tap anywhere to continue' : 'Tap anywhere to skip'}</div>
      </div>
    </div>,
    overlayRoot(),
  );
}
