/**
 * One big celebration overlay (legacy ui.js celebrate()): level-up,
 * achievement, bug defeated, new gear, shield upgrade. Tap anywhere /
 * Enter / Space / Escape to continue. Rendered by the app's
 * <CelebrationHost/> from the queue in celebrationQueue.ts.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Celebration } from '@/engine/game';
import { Curlo } from '@/features/curlo/Curlo';
import { TIERS } from '@/features/curlo/curloArt';
import { BeastArt } from '../art/Art';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Md } from '../Md';
import { overlayRoot, useOverlayLayer } from '../overlay/overlay';
import { burstAt, clearConfetti } from './effects';
import { anim, SPRING } from './motion';
import styles from './celebrate.module.css';

export interface CelebrationOverlayProps {
  item: Exclude<Celebration, { type: 'evolve' }>;
  /** name of the cosmetic a level-up unlocks, if any */
  levelReward?: string;
  /** accept = main button / Enter; false = secondary button / Escape / tap */
  onClose: (accept: boolean) => void;
}

interface Look {
  kind: 'lvl' | 'ach' | 'bug' | 'cos' | 'tier';
  t1: string;
  big?: string;
  mascot?: { mood: 'celebrate' | 'bracing'; hat?: string; tier?: 1 | 2 | 3 };
  art?: ReactNode;
  text: ReactNode;
  btn: string;
  btn2?: string;
}

function look(item: CelebrationOverlayProps['item'], levelReward?: string): Look {
  switch (item.type) {
    case 'levelup':
      return {
        kind: 'lvl',
        t1: 'LEVEL UP!',
        big: String(item.level),
        mascot: { mood: 'celebrate' },
        text: (
          <>
            You reached <b>level {item.level}</b>!
            {levelReward && (
              <>
                <br />
                Unlocked: <b>{levelReward}</b>
              </>
            )}
          </>
        ),
        btn: 'Awesome!',
      };
    case 'achievement':
      return {
        kind: 'ach',
        t1: 'ACHIEVEMENT!',
        art: (
          <div className={styles.medal} data-art>
            <Icon name="trophy" />
          </div>
        ),
        text: (
          <>
            <b className={styles.achName}>{item.def.name}</b>
            <br />
            {item.def.desc}
          </>
        ),
        btn: 'Nice!',
      };
    case 'bug':
      return {
        kind: 'bug',
        t1: 'BUG DEFEATED!',
        art: (
          <div className={styles.bugReveal} data-art>
            <BeastArt kind={item.def.art || 'bug'} color={item.def.color} />
          </div>
        ),
        text: (
          <>
            <b>{item.def.name}</b> joins your Bug Bestiary.
            {item.def.prevent && (
              <>
                <br />
                <span className="small">
                  <Md text={item.def.prevent} />
                </span>
              </>
            )}
          </>
        ),
        btn: 'Collect',
      };
    case 'cosmetic': {
      const hat = item.def.slot === 'hat';
      return {
        kind: 'cos',
        t1: 'NEW GEAR!',
        mascot: { mood: 'celebrate', hat: hat ? item.def.id : undefined },
        text: (
          <>
            You unlocked <b>{item.def.name}</b>!
          </>
        ),
        btn: hat ? 'Wear it!' : 'Nice!',
        btn2: hat ? 'Later' : undefined,
      };
    }
    case 'tier':
      return {
        kind: 'tier',
        t1: 'SHIELD UPGRADE!',
        mascot: { mood: 'bracing', tier: item.tier },
        text: (
          <>
            Your Defense stat grew! Shield: <b>{TIERS[item.tier].name}</b>
          </>
        ),
        btn: 'Shields up!',
      };
  }
}

export function CelebrationOverlay({ item, levelReward, onClose }: CelebrationOverlayProps) {
  const L = look(item, levelReward);
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bigRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const closed = useRef(false);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const isTop = useOverlayLayer(true);
  const [reactKey, setReactKey] = useState(0);

  const close = (accept: boolean) => {
    if (closed.current) return;
    closed.current = true;
    clearConfetti();
    void anim(root.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, rm: 'keep', fill: 'forwards' }).then(() =>
      onCloseRef.current(accept),
    );
  };
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    root.current?.focus();
    void anim(inner.current, [{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
      duration: 440,
      easing: SPRING,
      rm: 'fade',
    });
    void anim(
      bigRef.current,
      [
        { transform: 'scale(0) rotate(-20deg)' },
        { transform: 'scale(1.3) rotate(6deg)', offset: 0.6 },
        { transform: 'scale(.92)', offset: 0.8 },
        { transform: 'none' },
      ],
      { duration: 700 },
    );
    const art = root.current?.querySelector('[data-art]');
    void anim(
      art,
      [
        { transform: 'scale(.2) rotate(-30deg)', opacity: 0 },
        { transform: 'scale(1.2) rotate(8deg)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 600, delay: 120, fill: 'backwards', rm: 'fade' },
    );
    const t = window.setTimeout(() => {
      setReactKey(1);
      burstAt(art ?? mascotRef.current ?? inner.current, { n: 120 });
    }, 240);
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current(e.key !== 'Escape');
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={root}
      className={`${styles.lvl} ${styles[L.kind]}`}
      role="dialog"
      aria-modal="true"
      aria-label={L.t1}
      tabIndex={-1}
      onClick={(e) => {
        const b = (e.target as Element).closest('[data-v]');
        close(b ? b.getAttribute('data-v') === '1' : false);
      }}
    >
      <div className={styles.rays} aria-hidden="true" />
      <div ref={inner} className={styles.inner}>
        <div className={styles.t1}>{L.t1}</div>
        {L.big && (
          <div ref={bigRef} className={styles.big}>
            {L.big}
          </div>
        )}
        {L.mascot && (
          <div ref={mascotRef} className={styles.mascot}>
            <Curlo
              mood={L.mascot.mood}
              reactKey={reactKey}
              tier={L.mascot.tier}
              cosmetics={L.mascot.hat ? { hat: L.mascot.hat } : undefined}
            />
          </div>
        )}
        {L.art}
        <div className={styles.t2}>{L.text}</div>
        <div className={styles.row}>
          <Button data-v="1">{L.btn}</Button>
          {L.btn2 && (
            <Button variant="ghost" data-v="0">
              {L.btn2}
            </Button>
          )}
        </div>
        <div className={styles.skip}>Tap anywhere to continue</div>
      </div>
    </div>,
    overlayRoot(),
  );
}
