/**
 * "Tell me more" expander: short text by default, the rest one tap away.
 * Height animates with a grid-rows transition (interruptible, no measuring);
 * closed content is inert so it can't take focus.
 *
 *   <Expander><p>{lesson.concept.body}</p></Expander>
 *   <Expander label="Why?" lessLabel="Hide" defaultOpen onToggle={…}>…</Expander>
 */
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Expander.module.css';

export interface ExpanderProps {
  children: ReactNode;
  label?: string;
  lessLabel?: string;
  defaultOpen?: boolean;
  /** controlled mode */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

export function Expander({
  children,
  label = 'Tell me more',
  lessLabel = 'Show less',
  defaultOpen = false,
  open: controlled,
  onToggle,
  className,
}: ExpanderProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const body = useRef<HTMLDivElement>(null);
  // React 18 has no `inert` prop; set the DOM property directly.
  useLayoutEffect(() => {
    if (body.current) body.current.inert = !open;
  }, [open]);
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.btn}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setInner(!open);
          onToggle?.(!open);
        }}
      >
        <span>{open ? lessLabel : label}</span>
        <Icon name="down" className={styles.chev} />
      </button>
      <div ref={body} id={id} className={styles.body + (open ? ' ' + styles.open : '')}>
        <div className={styles.clip}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  );
}
