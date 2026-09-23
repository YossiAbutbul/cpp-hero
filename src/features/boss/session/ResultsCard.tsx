/**
 * End-of-session results (legacy Session.results): Curlo celebrates, stat
 * tiles count up, extra lines (unlocks, stat gains), then Continue. Queued
 * celebrations (level-ups, achievements, cosmetics…) show over it.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { Button } from '@/ui/Button';
import { CountUp } from '@/ui/CountUp';
import { requestCelebrations } from '@/ui/fx/celebrationQueue';
import { burstAt, clearConfetti, rain } from '@/ui/fx/effects';
import { popIn, reduced } from '@/ui/fx/motion';
import { fmtDuration } from '@/ui/format';
import { Icon, type IconName } from '@/ui/Icon';
import type { SessionStats } from './useSession';
import styles from './session.module.css';

export interface ResultsCardProps {
  title: string;
  sub?: ReactNode;
  stats: SessionStats;
  extra?: ReactNode;
  button?: string;
  onContinue: () => void;
}

interface Tile {
  label: string;
  value: number;
  tone: 'sun' | 'teal' | 'tang' | 'sky';
  icon: IconName;
  fmt: (n: number) => string;
}

export function ResultsCard({ title, sub, stats, extra, button = 'Continue', onContinue }: ResultsCardProps) {
  const curlo = useCurloReact('happy');
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const tiles: Tile[] = [
    { label: 'XP earned', value: stats.xp, tone: 'sun', icon: 'bolt', fmt: (n) => `+${n}` },
    {
      label: 'Accuracy',
      value: stats.total ? Math.round((100 * stats.right) / stats.total) : 100,
      tone: 'teal',
      icon: 'target',
      fmt: (n) => `${n}%`,
    },
    { label: 'Best combo', value: stats.bestCombo, tone: 'tang', icon: 'flame', fmt: (n) => `x${n}` },
    { label: 'Time', value: stats.seconds, tone: 'sky', icon: 'clock', fmt: fmtDuration },
  ];

  useEffect(() => {
    const el = root.current;
    el?.querySelectorAll('[data-tile]').forEach((t, i) => void popIn(t, 250 + i * 110));
    const t1 = window.setTimeout(
      () => {
        curlo.react('celebrate', 1500);
        burstAt(el?.querySelector('[data-curlo]'), { n: 140 });
        rain(80);
      },
      reduced() ? 50 : 420,
    );
    const t2 = window.setTimeout(() => btn.current?.focus({ preventScroll: true }), 600);
    const t3 = window.setTimeout(() => void requestCelebrations(), reduced() ? 200 : 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className={styles.results} onPointerDown={() => clearConfetti()}>
      <div className={styles.resCurlo} data-curlo>
        <Curlo {...curlo.props} />
      </div>
      <h2 className={styles.resTitle}>{title}</h2>
      {sub && <p className={styles.resSub}>{sub}</p>}
      <div className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.label} data-tile className={`${styles.tile} ${styles['t_' + t.tone]}`}>
            <div className={styles.tileL}>
              <Icon name={t.icon} />
              {t.label}
            </div>
            <div className={styles.tileV}>
              <CountUp value={t.value} from={0} duration={900} format={t.fmt} />
            </div>
          </div>
        ))}
      </div>
      {extra}
      <Button
        ref={btn}
        block
        iconEnd="next"
        className={styles.next}
        onClick={async () => {
          clearConfetti();
          await requestCelebrations();
          onContinue();
        }}
      >
        {button}
      </Button>
    </div>
  );
}

/** A highlighted line on the results card ("World 3 unlocked", "Defense stat up!"). */
export function Gain({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className={styles.gain}>
      <Icon name={icon} />
      <span>{children}</span>
    </div>
  );
}
