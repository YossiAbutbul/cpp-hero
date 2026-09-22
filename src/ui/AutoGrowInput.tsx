/**
 * Typing input that sizes itself to its content (user preference: inputs
 * grow with what you type, then wrap instead of scrolling). Uses CSS
 * `field-sizing: content` where supported, with a JS fallback.
 *
 *   <CodeBlock code={ch.code} blank={<AutoGrowInput variant="fill" value={v} onChange={setV} />} />
 *   <AutoGrowInput variant="console" prompt=">" value={line} onChange={setLine} onEnter={check} />
 *   <AutoGrowInput variant="field" label="Name" value={name} onChange={setName} />
 */
import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import styles from './AutoGrowInput.module.css';

const supportsFieldSizing = typeof CSS !== 'undefined' && !!CSS.supports?.('field-sizing', 'content');

export interface AutoGrowInputProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'prefix'> {
  value: string;
  onChange: (v: string) => void;
  /** fill = inline code blank; console = dark "write a line" box; field = form text field */
  variant?: 'fill' | 'console' | 'field';
  /** Enter submits (Shift+Enter inserts a newline when multiline) */
  onEnter?: () => void;
  multiline?: boolean;
  /** result coloring after checking */
  state?: 'ok' | 'bad';
  /** minimum width in ch (default 4) */
  minCh?: number;
  /** console prompt glyph */
  prompt?: string;
  /** accessible name (required unless aria-labelledby is given) */
  label?: string;
}

export const AutoGrowInput = forwardRef<HTMLTextAreaElement, AutoGrowInputProps>(function AutoGrowInput(
  {
    value,
    onChange,
    variant = 'fill',
    onEnter,
    multiline,
    state,
    minCh = 4,
    prompt,
    label,
    className,
    style,
    ...rest
  },
  fwd,
) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || supportsFieldSizing) return;
    // fallback: width from the longest line (ch), height from scrollHeight
    if (variant === 'fill') {
      const longest = Math.max(...(value || rest.placeholder || '').split('\n').map((l) => l.length), 0);
      el.style.width = `calc(${Math.max(minCh, longest + 1)}ch + 12px)`;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, variant, minCh, rest.placeholder]);

  const area = (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (typeof fwd === 'function') fwd(el);
        else if (fwd) fwd.current = el;
      }}
      rows={1}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\n/g, ''))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
          if (!multiline || onEnter) e.preventDefault();
          onEnter?.();
        }
      }}
      className={[styles.input, styles[variant], state ? styles[state] : '', className].filter(Boolean).join(' ')}
      style={{ minWidth: variant === 'fill' ? `calc(${minCh}ch + 12px)` : undefined, ...style }}
      {...rest}
    />
  );
  if (variant !== 'console') return area;
  return (
    <div className={[styles.consoleBox, state ? styles[state] : ''].filter(Boolean).join(' ')}>
      {prompt && (
        <span className={styles.prompt} aria-hidden="true">
          {prompt}
        </span>
      )}
      {area}
    </div>
  );
});
