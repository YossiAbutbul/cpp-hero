/**
 * Small game-status visuals: StreakFlame, ComboMeter, Hearts row.
 *
 *   <StreakFlame days={7} />                 // flame grows with the streak (max 1.5×)
 *   <StreakFlame days={7} big />             // 72px hero flame (streak sheet)
 *   <ComboMeter combo={game.combo} multiplier={game.multiplier()} />   // hot at 3, blazing at 6
 *   <Hearts n={3} max={5} />                 // losing one pops the heart out
 */
import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { anim, reduced, SPRING } from './fx/motion';
import { Icon } from './Icon';
import { ICONS } from './icons';
import styles from './GameBits.module.css';

export function StreakFlame({ days, big, className }: { days: number; big?: boolean; className?: string }) {
  const fs = big ? 1 : Math.min(1.5, 1 + days * 0.04);
  return (
    <svg
      className={[styles.flame, big ? styles.big : '', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ '--fs': fs } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: ICONS.flame }}
    />
  );
}

export interface ComboMeterProps {
  combo: number;
  multiplier?: number;
  className?: string;
}

/** Session combo chip: pops on every increase, glows hotter as it grows. */
export function ComboMeter({ combo, multiplier = 1, className }: ComboMeterProps) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(combo);
  useLayoutEffect(() => {
    if (combo > prev.current)
      void anim(el.current, [{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-6deg)' }, { transform: 'scale(1)' }], {
        duration: 380,
        easing: SPRING,
      });
    prev.current = combo;
  }, [combo]);
  const cls = [styles.combo, combo >= 3 ? styles.hot : '', combo >= 6 ? styles.blaze : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span
      ref={el}
      className={cls}
      style={{ '--heat': Math.min(1, combo / 10) } as CSSProperties}
      aria-live="polite"
      aria-label={`Combo ${combo}${multiplier > 1 ? `, ${multiplier} times XP` : ''}`}
    >
      <Icon name="bolt" />
      <span>
        x{combo}
        {multiplier > 1 ? ` · ${multiplier}× XP` : ''}
      </span>
    </span>
  );
}

export interface HeartsProps {
  n: number;
  max: number;
  /** icon px (default 18) */
  size?: number;
  className?: string;
}

/** A row of hearts; when `n` drops, the lost heart pops out before going grey. */
export function Hearts({ n, max, size = 18, className }: HeartsProps) {
  const row = useRef<HTMLSpanElement>(null);
  const prev = useRef(n);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = n;
    if (n >= before || reduced() || !row.current) return;
    const lost = row.current.children[n] as HTMLElement | undefined;
    if (!lost) return;
    lost.classList.remove(styles.empty ?? '');
    void anim(
      lost,
      [
        { transform: 'none' },
        { transform: 'scale(1.5) rotate(-15deg)' },
        { transform: 'translateY(14px) scale(.3) rotate(30deg)', opacity: 0 },
      ],
      { duration: 460, easing: 'ease-in' },
    ).then(() => lost.classList.add(styles.empty ?? ''));
  }, [n]);
  return (
    <span ref={row} className={[styles.hearts, className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? undefined : styles.empty}>
          <svg
            viewBox="0 0 24 24"
            style={{ width: size, height: size }}
            focusable="false"
            dangerouslySetInnerHTML={{ __html: ICONS.heart }}
          />
        </span>
      ))}
    </span>
  );
}
