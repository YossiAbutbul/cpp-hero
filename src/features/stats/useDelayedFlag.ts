import { useEffect, useState } from 'react';
import { reduced } from '@/ui/fx/motion';

/**
 * false on the first frame, true after `delay` ms (right away under reduced
 * motion). Drives "render now, then fill / count up" entrances; a safety
 * timeout guarantees it flips even when rAF is throttled.
 */
export function useDelayedFlag(delay = 0): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const ms = reduced() ? 0 : delay;
    let t = 0;
    const r = requestAnimationFrame(() => (t = window.setTimeout(() => setOn(true), ms)));
    const safety = window.setTimeout(() => setOn(true), ms + 400);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
      clearTimeout(safety);
    };
  }, [delay]);
  return on;
}
