/**
 * Label · bar · number row (legacy .stat/.sbar). The bar springs from 0 and
 * the number counts up after `delay` ms; both are instant under reduced
 * motion, and a timeout guarantees the final state.
 *
 *   <StatBar label="Logic" value={42} color="var(--sky)" delay={90} />
 *   <StatBar label="W3" value={5} max={7} format={(n) => `${n}/7`} />
 */
import type { CSSProperties } from 'react';
import { CountUp } from '@/ui/CountUp';
import styles from './stats.module.css';
import { useDelayedFlag } from './useDelayedFlag';

export interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  /** ms before the fill + count start */
  delay?: number;
  format?: (n: number) => string;
  /** shown instead of the number (e.g. "–" when there's no data) */
  empty?: string;
  /** accessible name (defaults to label) */
  aria?: string;
}

export function StatBar({ label, value, max = 100, color = 'var(--tang)', delay = 0, format, empty, aria }: StatBarProps) {
  const go = useDelayedFlag(delay);
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const v = Math.round(value);
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <div
        className={styles.sbar}
        role="meter"
        aria-label={aria ?? label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={v}
      >
        <i className={styles.sfill} style={{ '--c': color, '--p': go ? p : 0 } as CSSProperties} />
      </div>
      <span className={styles.snum}>
        {empty ?? <CountUp value={go ? v : 0} from={0} duration={700} format={format} />}
      </span>
    </div>
  );
}
