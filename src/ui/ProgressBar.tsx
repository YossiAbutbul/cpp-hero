/**
 * Springy progress bar (legacy .xpbar / .goalbar / .sbar). The fill is a
 * scaleX transform with an elastic transition, so it's 60fps and
 * interruptible; it springs in from 0 on mount.
 *
 *   <ProgressBar value={info.into} max={info.need} label="Experience" />
 *   <ProgressBar value={3} max={10} tone="teal" height={22}>3 / 10 min today</ProgressBar>
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** xp = sun gradient (default); others are flat token colors */
  tone?: 'xp' | 'teal' | 'tang' | 'coral' | 'sky' | 'sun';
  /** px (default 14) */
  height?: number;
  /** accessible name; the bar is a progressbar role */
  label?: string;
  /** text centered on the bar (e.g. "3 / 10 min") */
  children?: ReactNode;
  /** start from 0 and spring to the value on mount (default true) */
  animateIn?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ProgressBar({
  value,
  max = 1,
  tone = 'xp',
  height = 14,
  label,
  children,
  animateIn = true,
  className,
  style,
}: ProgressBarProps) {
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [ready, setReady] = useState(!animateIn);
  useEffect(() => {
    if (ready) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    const t = window.setTimeout(() => setReady(true), 120);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [ready]);
  return (
    <div
      className={[styles.bar, className].filter(Boolean).join(' ')}
      style={{ height, ...style }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <i className={`${styles.fill} ${styles[tone] ?? ''}`} style={{ '--p': ready ? p : 0 } as CSSProperties} />
      {children != null && (
        <span className={styles.text} style={{ lineHeight: `${height}px` }}>
          {children}
        </span>
      )}
    </div>
  );
}
