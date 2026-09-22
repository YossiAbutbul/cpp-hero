import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurloMood } from './curloArt';

export interface CurloReact {
  mood: CurloMood;
  /** Set a mood (replays its motion even if unchanged); back to happy after `backMs` if given. */
  react: (mood: CurloMood, backMs?: number) => void;
  /** Spread onto <Curlo {...c.props} />. */
  props: { mood: CurloMood; reactKey: number };
}

/**
 * Timed mood changes for one Curlo:
 *   const c = useCurloReact('thinking');
 *   <Curlo {...c.props} />
 *   onCorrect: c.react('celebrate', 1100)  ·  onWrong: c.react('worried', 1400)
 */
export function useCurloReact(initial: CurloMood = 'happy'): CurloReact {
  const [s, set] = useState({ mood: initial, key: 0 });
  const timer = useRef(0);
  const react = useCallback((mood: CurloMood, backMs?: number) => {
    clearTimeout(timer.current);
    set((p) => ({ mood, key: p.key + 1 }));
    if (backMs) timer.current = window.setTimeout(() => set((p) => ({ mood: 'happy', key: p.key + 1 })), backMs);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { mood: s.mood, react, props: { mood: s.mood, reactKey: s.key } };
}
