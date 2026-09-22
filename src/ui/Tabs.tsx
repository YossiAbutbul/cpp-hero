/**
 * Segmented tabs (legacy .seg) with a springy sliding pill and full ARIA
 * tabs keyboard support (←/→/Home/End). Panels are optional: pass `panel`
 * per item to let Tabs render the active one (it slides in by direction).
 *
 *   <Tabs label="Vault sections" value={tab} onChange={setTab}
 *         items={[{ id: 'cards', label: 'Cards', icon: 'vault', panel: <Cards/> },
 *                 { id: 'rules', label: 'Defense Rules', icon: 'shield', panel: <Rules/> }]} />
 */
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { anim, EASE_OUT } from './fx/motion';
import { Icon, type IconName } from './Icon';
import styles from './Tabs.module.css';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: IconName;
  panel?: ReactNode;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** accessible name of the tab list */
  label: string;
  size?: 'md' | 'small';
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, label, size = 'md', className }: TabsProps<T>) {
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<CSSProperties>({ opacity: 0 });
  const prevIdx = useRef(items.findIndex((i) => i.id === value));
  const idx = items.findIndex((i) => i.id === value);

  useLayoutEffect(() => {
    const measure = () => {
      const btn = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[idx];
      if (btn) setPill({ width: btn.offsetWidth, transform: `translateX(${btn.offsetLeft}px)`, opacity: 1 });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (listRef.current) ro?.observe(listRef.current);
    return () => ro?.disconnect();
  }, [idx, items.length]);

  useLayoutEffect(() => {
    const d = idx >= prevIdx.current ? 1 : -1;
    if (prevIdx.current !== idx)
      void anim(panelRef.current, [{ opacity: 0, transform: `translateX(${d * 24}px)` }, { opacity: 1, transform: 'none' }], {
        duration: 260,
        easing: EASE_OUT,
        rm: 'fade',
      });
    prevIdx.current = idx;
  }, [idx]);

  const move = (k: number) => {
    const n = items.length;
    const next = items[(k + n) % n];
    if (!next) return;
    onChange(next.id);
    requestAnimationFrame(() =>
      listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[(k + n) % n]?.focus(),
    );
  };

  const active = items[idx];
  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className={[styles.seg, size === 'small' ? styles.small : ''].join(' ')}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(idx + 1);
          else if (e.key === 'ArrowLeft') move(idx - 1);
          else if (e.key === 'Home') move(0);
          else if (e.key === 'End') move(items.length - 1);
          else return;
          e.preventDefault();
        }}
      >
        <span className={styles.pill} style={pill} aria-hidden="true" />
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            id={`${base}-t${i}`}
            aria-selected={i === idx}
            aria-controls={it.panel !== undefined ? `${base}-p${i}` : undefined}
            tabIndex={i === idx ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(it.id)}
          >
            {it.icon && <Icon name={it.icon} />}
            {it.label}
          </button>
        ))}
      </div>
      {active?.panel !== undefined && (
        <div ref={panelRef} role="tabpanel" id={`${base}-p${idx}`} aria-labelledby={`${base}-t${idx}`}>
          {active.panel}
        </div>
      )}
    </div>
  );
}
