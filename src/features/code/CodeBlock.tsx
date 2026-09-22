/**
 * Syntax-highlighted code block (legacy CH.code.block).
 *
 * Wrapping rule (user preference): code NEVER scrolls sideways. Each logical
 * line wraps with a hanging indent (continuation rows start 2ch past the
 * line's own indentation), keeps ONE line number, and highlights cover the
 * whole wrapped line.
 *
 *   <CodeBlock code={ch.code} unsafe={ch.unsafe} />
 *   <CodeBlock code="g++ -Wall main.cpp" lang="shell" />
 *   <CodeBlock code={ch.code} blank={<AutoGrowInput variant="fill" value={v} onChange={setV} label="Fill the blank" />} />
 *   <CodeBlock code={src} blank={(i) => <Slot key={i} n={i} />} />          // several ___
 *   <CodeBlock code={src} highlightLines={[2]} />
 *   <CodeBlock code={src} onLineClick={toggle} pressedLines={picked}
 *              lineState={(i) => (bad.includes(i) ? 'bad' : undefined)} lineMark={(i) => …} />
 *   <CodeBlock code={hardened} safe diffAgainst={unsafe} caption="+ marks the fix" />
 */
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/ui/Icon';
import { highlightLine, indentOf, splitLines, type Tok } from './highlight';
import styles from './code.module.css';

export type LineState = 'flagged' | 'ok' | 'bad' | 'miss' | 'added';

export interface CodeBlockProps {
  code: string;
  /** cpp (default; shell command lines are detected automatically), shell, or text (no colors) */
  lang?: 'cpp' | 'shell' | 'text';
  /** red "UNSAFE — don't copy" badge + tinted block */
  unsafe?: boolean;
  /** teal "Hardened" badge */
  safe?: boolean;
  /** accessible name (default "C++ code" / "Unsafe C++ code") */
  label?: string;
  /** small caption next to the badges */
  caption?: string;
  /** what renders at each "___": a node (same for all) or index → node */
  blank?: ReactNode | ((index: number) => ReactNode);
  /** 0-based line(s) to highlight (execution / focus) */
  highlightLines?: number | readonly number[];
  /** per-line state coloring (review/bug challenges) */
  lineState?: (line: number) => LineState | undefined;
  /** trailing per-line marker (icon + short text) */
  lineMark?: (line: number) => ReactNode;
  /** makes lines tappable buttons */
  onLineClick?: (line: number) => void;
  /** tappable lines currently selected (aria-pressed) */
  pressedLines?: readonly number[];
  /** lines not present in this other source get a "+" mark */
  diffAgainst?: string;
  /** typing effect: number of characters shown (undefined = all) */
  reveal?: number;
  /** cap the height (default true: 60vh, scrolls vertically only) */
  capHeight?: boolean;
  className?: string;
  style?: CSSProperties;
  /** click on the code body (e.g. skip typing) */
  onBodyClick?: () => void;
  /** extra class on the .code element (e.g. a glitch pulse) */
  codeClassName?: string;
}

function renderToks(toks: Tok[], plain: boolean, blank: CodeBlockProps['blank'], counter: { n: number }): ReactNode[] {
  return toks.map((tk, k) => {
    if (tk.t === 'blank') {
      const i = counter.n++;
      const node = typeof blank === 'function' ? blank(i) : blank;
      return (
        <span key={k} className={styles.blankIn}>
          {node ?? (
            <span className={styles.blank} aria-label="blank">
              ___
            </span>
          )}
        </span>
      );
    }
    if (tk.t === 'lead')
      return (
        <span key={k} className={styles.lead}>
          {tk.v}
        </span>
      );
    if (plain || tk.t === 'ws' || tk.t === 'id') return tk.v;
    return (
      <span key={k} className={styles['t-' + tk.t]}>
        {tk.v}
      </span>
    );
  });
}

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    lang = 'cpp',
    unsafe,
    safe,
    label,
    caption,
    blank,
    highlightLines,
    lineState,
    lineMark,
    onLineClick,
    pressedLines,
    diffAgainst,
    reveal,
    capHeight = true,
    className,
    style,
    onBodyClick,
    codeClassName,
  },
  ref,
) {
  const lines = splitLines(code);
  const other = diffAgainst != null ? splitLines(diffAgainst).map((s) => s.trim()) : null;
  const hl = new Set(highlightLines == null ? [] : typeof highlightLines === 'number' ? [highlightLines] : highlightLines);
  const counter = { n: 0 };
  let left = reveal ?? Infinity;
  let caretDone = false;

  const rows = lines.map((ln, i) => {
    // typing effect bookkeeping
    const show = Math.max(0, Math.min(ln.length, left));
    const hidden = reveal != null && left <= 0 && i > 0 && caretDone;
    left -= ln.length;
    const caretHere = reveal != null && !caretDone && left <= 0;
    if (caretHere) caretDone = true;

    const toks =
      lang === 'text'
        ? [{ t: 'id' as const, v: reveal != null ? ln.slice(0, show) : ln }]
        : lang === 'shell'
          ? [{ t: 'sh' as const, v: reveal != null ? ln.slice(0, show) : ln }]
          : highlightLine(ln, reveal != null ? show : undefined);
    const added = !!other && !!ln.trim() && !other.includes(ln.trim());
    const st = lineState?.(i) ?? (added ? 'added' : undefined);
    const cls = [
      styles.ln,
      hl.has(i) ? styles.hl : '',
      st ? styles[st] : '',
      onLineClick ? styles.tap : '',
    ]
      .filter(Boolean)
      .join(' ');
    const inner = (
      <>
        <span className={styles.no} aria-hidden="true">
          {i + 1}
        </span>
        <span className={styles.cd} style={{ '--ind': indentOf(ln) } as CSSProperties}>
          {renderToks(toks, lang === 'text', blank, counter)}
          {caretHere && <span className={styles.caret} />}
          {!ln && !caretHere ? ' ' : null}
        </span>
        {added && (
          <span className={styles.dmark} aria-label="changed line">
            +
          </span>
        )}
        {lineMark?.(i)}
      </>
    );
    return onLineClick ? (
      <button
        key={i}
        type="button"
        className={cls}
        data-l={i}
        aria-pressed={pressedLines ? pressedLines.includes(i) : undefined}
        aria-label={`Line ${i + 1}: ${ln.trim() || 'blank line'}`}
        style={hidden ? { visibility: 'hidden' } : undefined}
        onClick={() => onLineClick(i)}
      >
        {inner}
      </button>
    ) : (
      <div key={i} className={cls} data-l={i} style={hidden ? { visibility: 'hidden' } : undefined}>
        {inner}
      </div>
    );
  });

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} style={style}>
      {(unsafe || safe || caption) && (
        <div className={styles.dhead}>
          {unsafe && (
            <span className={`${styles.badge} ${styles.badgeUnsafe}`}>
              <Icon name="warn" />
              Unsafe — don’t copy
            </span>
          )}
          {safe && (
            <span className={`${styles.badge} ${styles.badgeSafe}`}>
              <Icon name="shield" />
              Hardened
            </span>
          )}
          {caption && <span className={styles.dcap}>{caption}</span>}
        </div>
      )}
      <div
        ref={ref}
        className={[
          styles.code,
          unsafe ? styles.isUnsafe : '',
          onLineClick ? styles.tappable : '',
          capHeight ? styles.cap : '',
          codeClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        role={onLineClick ? 'group' : 'region'}
        aria-label={label ?? (unsafe ? 'Unsafe C++ code' : lang === 'shell' ? 'Shell command' : 'C++ code')}
        onClick={onBodyClick}
      >
        {rows}
      </div>
    </div>
  );
});
