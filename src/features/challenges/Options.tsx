/**
 * Option buttons (legacy .opts / .opt), per-option "why" lists, visible
 * whitespace for predicted output, and A–H / 1–8 keyboard shortcuts.
 * Right/wrong is never color alone: every mark has an icon and a text tag.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import type { Option } from '@/content/schema';
import { Icon } from '@/ui/Icon';
import { overlayCount } from '@/ui/overlay/overlay';
import { Md } from '@/ui/Md';
import styles from './challenges.module.css';

export const KEYS = 'ABCDEFGH';

/** Program output with visible whitespace: ␣ for spaces, → tabs, ↵ newlines. */
export function VisibleWS({ text }: { text: string }) {
  if (text === '') return <span className={styles.ws}>(nothing)</span>;
  const out: ReactNode[] = [];
  let buf = '';
  let k = 0;
  const flush = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  for (const c of text) {
    if (c === ' ' || c === '\t' || c === '\n') {
      flush();
      out.push(
        <span key={k++} className={styles.ws} aria-hidden="true">
          {c === ' ' ? '␣' : c === '\t' ? '→' : '↵'}
        </span>,
      );
      if (c === '\n') out.push(<br key={k++} />);
    } else buf += c;
  }
  flush();
  return <>{out}</>;
}

/** Screen-reader text for an option. */
export const speakOpt = (t: string) => (t === '' ? 'nothing' : t.replace(/\n/g, ' newline '));

export type OptState = 'right' | 'wrong' | 'dim' | 'tried' | 'on' | undefined;

export interface OptionGridProps {
  texts: readonly string[];
  /** one column (default: 2 columns when every option is short) */
  single?: boolean;
  mono?: boolean;
  /** predict: visible whitespace */
  ws?: boolean;
  /** multi-select (aria-pressed + tick) */
  toggle?: boolean;
  state?: (i: number) => OptState;
  tag?: (i: number) => string | undefined;
  disabled?: (i: number) => boolean;
  onPick: (i: number) => void;
  tight?: boolean;
  /** key caps: letters (default) or numbers */
  numbers?: boolean;
  className?: string;
  buttonRef?: (i: number, el: HTMLButtonElement | null) => void;
}

export function OptionGrid({
  texts,
  single,
  mono,
  ws,
  toggle,
  state,
  tag,
  disabled,
  onPick,
  tight,
  numbers,
  className,
  buttonRef,
}: OptionGridProps) {
  const short = texts.every((t) => t.length <= 14 && !t.includes('\n'));
  const cls = [
    styles.opts,
    short && !single ? '' : styles.single,
    mono ? styles.mono : '',
    tight ? styles.tight : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} role="group" aria-label="Answer options">
      {texts.map((t, i) => {
        const st = state?.(i);
        const tg = tag?.(i);
        const key = numbers ? String(i + 1) : KEYS[i];
        return (
          <button
            key={i}
            ref={(el) => buttonRef?.(i, el)}
            type="button"
            className={[styles.opt, st ? styles[st] : ''].filter(Boolean).join(' ')}
            disabled={disabled?.(i)}
            aria-pressed={toggle ? st === 'on' : undefined}
            aria-label={`Option ${key}: ${speakOpt(t)}${tg ? ` (${tg})` : ''}`}
            onClick={() => onPick(i)}
          >
            <span className={styles.key} aria-hidden="true">
              {key}
            </span>
            {tg && (
              <span className={styles.tag} aria-hidden="true">
                {tg}
              </span>
            )}
            {st === 'right' && <Icon name="ok" className={styles.mark} />}
            {st === 'wrong' && <Icon name="no" className={styles.mark} />}
            {toggle && (
              <span className={styles.tick} aria-hidden="true">
                <Icon name="check" />
              </span>
            )}
            <span className={[styles.otxt, ws ? styles.wsOut : ''].filter(Boolean).join(' ')}>
              {ws ? <VisibleWS text={t} /> : mono ? t : <Md text={t} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A–H / 1–8 pick the matching option while `active`. */
export function useOptionKeys(n: number, onPick: (i: number) => void, active: boolean, lettersToo = true) {
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  useEffect(() => {
    if (!active) return;
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && /INPUT|TEXTAREA/.test(t.tagName)) return;
      if (overlayCount() > 0) return;
      const key = e.key.toUpperCase();
      let i = -1;
      if (/^[1-8]$/.test(key)) i = Number(key) - 1;
      else if (lettersToo && key.length === 1 && KEYS.includes(key)) i = KEYS.indexOf(key);
      if (i >= 0 && i < n) {
        e.preventDefault();
        pick.current(i);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [n, active, lettersToo]);
}

/** Per-option "why" list for the explanation panel. */
export function WhyList({
  options,
  right,
  picked,
  ws,
  mono,
  rightLabel = 'Right answer.',
}: {
  options: readonly Option[];
  right: readonly number[];
  picked: readonly number[];
  ws?: boolean;
  mono?: boolean;
  rightLabel?: string;
}) {
  return (
    <ul className={styles.why}>
      {options.map((o, i) => {
        const yes = right.includes(i);
        return (
          <li key={i} className={yes ? styles.yes : styles.nope}>
            <Icon name={yes ? 'ok' : 'no'} />
            <div>
              {ws ? (
                <code className={styles.wsOut}>
                  <VisibleWS text={o.t} />
                </code>
              ) : mono ? (
                <code>{o.t}</code>
              ) : (
                <b className={styles.wopt}>
                  <Md text={o.t} />
                </b>
              )}
              <span>
                {yes ? <b>{rightLabel} </b> : picked.includes(i) ? <b>Your pick. </b> : null}
                <Md text={o.why || (yes ? '' : 'Not this one.')} />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Options that look like code get the monospace font. */
export const looksLikeCode = (texts: readonly string[]) => texts.every((t) => /[;(){}<>=[\]]/.test(t));

/** Final marks for a single-answer grid. */
export function finalState(i: number, right: readonly number[], picked: readonly number[]): OptState {
  if (right.includes(i)) return 'right';
  if (picked.includes(i)) return 'wrong';
  return 'dim';
}
export function finalTag(i: number, right: readonly number[], picked: readonly number[]): string | undefined {
  if (right.includes(i)) return picked.includes(i) ? 'Correct' : 'Answer';
  if (picked.includes(i)) return 'Your pick';
  return undefined;
}
