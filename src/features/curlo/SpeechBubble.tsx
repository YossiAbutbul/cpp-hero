/**
 * Speech bubble (legacy .bubble) + the Curlo-with-bubble header (legacy .qhead).
 *
 *   <SpeechBubble tail="left" popKey={line}>…</SpeechBubble>   // pops whenever popKey changes
 *   <CurloSays mood="thinking" text="Hmm, read it line by line with me." />
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Md } from '@/ui/Md';
import { anim, SPRING } from '@/ui/fx/motion';
import { Curlo, type CurloProps } from './Curlo';
import styles from './SpeechBubble.module.css';

export interface SpeechBubbleProps {
  children?: ReactNode;
  /** markdown-lite text (alternative to children) */
  text?: string;
  tail?: 'left' | 'bottom' | 'none';
  /** 'boss' = the coral boss speech style */
  tone?: 'default' | 'boss';
  /** the bubble pops (springy scale) on mount and whenever this changes */
  popKey?: unknown;
  className?: string;
  /** polite live region (default true) so screen readers hear new lines */
  live?: boolean;
}

export function SpeechBubble({
  children,
  text,
  tail = 'left',
  tone = 'default',
  popKey,
  className,
  live = true,
}: SpeechBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    void anim(
      ref.current,
      [{ transform: 'scale(.85)', opacity: 0.3 }, { transform: 'scale(1.04)', opacity: 1 }, { transform: 'none' }],
      { duration: 360, easing: SPRING },
    );
  }, [popKey]);
  const cls = [
    styles.bubble,
    tail === 'left' ? styles.tailL : tail === 'bottom' ? styles.tailB : '',
    tone === 'boss' ? styles.boss : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={ref} className={cls} aria-live={live ? 'polite' : undefined}>
      {text != null ? <Md text={text} /> : children}
    </div>
  );
}

export interface CurloSaysProps extends Omit<CurloProps, 'size' | 'className'> {
  text?: string;
  children?: ReactNode;
  /** Curlo width in px (default 78; 62 on narrow phones) */
  curloSize?: number;
  popKey?: unknown;
  className?: string;
}

/** Curlo on the left, speech bubble on the right. */
export function CurloSays({ text, children, curloSize, popKey, className, ...curlo }: CurloSaysProps) {
  return (
    <div className={styles.qhead + (className ? ' ' + className : '')}>
      <div className={styles.mini} style={curloSize ? { width: curloSize } : undefined}>
        <Curlo {...curlo} />
      </div>
      <SpeechBubble text={text} popKey={popKey ?? text}>
        {children}
      </SpeechBubble>
    </div>
  );
}
