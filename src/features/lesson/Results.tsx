/**
 * Session results card (legacy Session.results): Curlo celebrates, stat tiles
 * count up, confetti; big overlays (level-ups, achievements…) queue after it.
 *
 *   <Results title="Lesson complete!" sub={line} tiles={sessionTiles(stats)} onContinue={leave} />
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import type { CurloMood } from '@/features/curlo/curloArt';
import { Button } from '@/ui/Button';
import { CountUp } from '@/ui/CountUp';
import { burstAt, clearConfetti, rain } from '@/ui/fx/effects';
import { requestCelebrations } from '@/ui/fx/celebrationQueue';
import { popIn, reduced } from '@/ui/fx/motion';
import { fmtDuration } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import styles from './lesson.module.css';

export interface Tile {
  label: string;
  value: number;
  tone: 'sun' | 'teal' | 'tang' | 'sky' | 'coral';
  icon: IconName;
  format?: (n: number) => string;
}

/** The standard four tiles: XP, accuracy, best combo, time. */
export function sessionTiles(s: { xp: number; right: number; total: number; bestCombo: number; seconds: number }): Tile[] {
  return [
    { label: 'XP earned', value: Math.max(0, s.xp), tone: 'sun', icon: 'bolt', format: (n) => `+${n}` },
    {
      label: 'Accuracy',
      value: s.total ? Math.round((100 * s.right) / s.total) : 100,
      tone: 'teal',
      icon: 'target',
      format: (n) => `${n}%`,
    },
    { label: 'Best combo', value: s.bestCombo, tone: 'tang', icon: 'flame', format: (n) => `x${n}` },
    { label: 'Time', value: s.seconds, tone: 'sky', icon: 'clock', format: fmtDuration },
  ];
}

export interface ResultsProps {
  title: string;
  sub?: ReactNode;
  tiles: Tile[];
  extra?: ReactNode;
  button?: string;
  mood?: CurloMood;
  onContinue: () => void;
}

export function Results({ title, sub, tiles, extra, button = 'Continue', mood = 'celebrate', onContinue }: ResultsProps) {
  const curlo = useCurloReact('happy');
  const curloEl = useRef<HTMLDivElement>(null);
  const tilesEl = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const els = Array.from(tilesEl.current?.children ?? []);
    els.forEach((t, i) => popIn(t, 250 + i * 110));
    const t1 = window.setTimeout(
      () => {
        curlo.react(mood, 1500);
        if (mood !== 'worried') {
          burstAt(curloEl.current, { n: 140 });
          rain(80);
        }
      },
      reduced() ? 50 : 420,
    );
    const t2 = window.setTimeout(() => btn.current?.focus({ preventScroll: true }), 600);
    const t3 = window.setTimeout(() => void requestCelebrations(), reduced() ? 200 : 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearConfetti();
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={styles.results} onPointerDown={() => clearConfetti()}>
      <div ref={curloEl} className={styles.resCurlo}>
        <Curlo {...curlo.props} />
      </div>
      <h2 className={styles.resTitle}>{title}</h2>
      {sub && <p className={styles.resSub}>{sub}</p>}
      <div ref={tilesEl} className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={`${styles.tileStat} ${styles[t.tone]}`}>
            <div className={styles.tsL}>
              <Icon name={t.icon} />
              {t.label}
            </div>
            <div className={styles.tsV}>
              <CountUp value={t.value} from={0} duration={900} format={t.format} />
            </div>
          </div>
        ))}
      </div>
      {extra}
      <Button
        ref={btn}
        size="big"
        block
        iconEnd="next"
        onClick={() => {
          clearConfetti();
          onContinue();
        }}
      >
        {button}
      </Button>
    </div>
  );
}
