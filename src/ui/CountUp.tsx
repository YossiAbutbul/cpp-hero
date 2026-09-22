/**
 * Number that counts (ease-out cubic) from its previous value to `value`.
 * Instant under reduced motion; a timeout guarantees the final number even
 * when rAF is throttled.
 *   <CountUp value={xp} />   <CountUp value={into} format={(n) => `${n} / ${need}`} />
 */
import { useEffect, useRef, useState } from 'react';
import { reduced } from './fx/motion';

export interface CountUpProps {
  value: number;
  /** first render counts up from here (default: no count on mount) */
  from?: number;
  /** ms (default 500) */
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function CountUp({ value, from, duration = 500, format, className }: CountUpProps) {
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(shown);
  useEffect(() => {
    const start = shownRef.current;
    if (start === value || reduced()) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const n = Math.round(start + (value - start) * e);
      shownRef.current = n;
      setShown(n);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const safety = window.setTimeout(() => {
      shownRef.current = value;
      setShown(value);
    }, duration + 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [value, duration]);
  return <span className={className}>{format ? format(shown) : shown}</span>;
}
