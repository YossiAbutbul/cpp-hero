/** Tier-3 hint: the answer itself, per challenge type (legacy challenges.answerText). */
import type { ReactNode } from 'react';
import type { Challenge } from '@/content/schema';
import { Md } from '@/ui/Md';
import { VisibleWS } from './Options';
import styles from './challenges.module.css';

export function answerText(ch: Challenge): ReactNode {
  switch (ch.type) {
    case 'mcq':
      return (
        <b>
          <Md text={ch.options[ch.answer]?.t} />
        </b>
      );
    case 'breakit':
    case 'harden':
      return <code className="i">{ch.options[ch.answer]?.t}</code>;
    case 'predict':
      return (
        <span className={styles.wsOut}>
          <VisibleWS text={ch.options[ch.answer]?.t ?? ''} />
        </span>
      );
    case 'fill':
    case 'write':
      return <code className="i">{ch.accept[0] ?? ''}</code>;
    case 'order':
      return (
        <ol className={styles.ansLines}>
          {ch.lines.map((l, i) => (
            <li key={i}>
              <code className="i">{l.trim()}</code>
            </li>
          ))}
        </ol>
      );
    case 'bug':
      return (
        <>
          Line {ch.bugLine + 1} is the bug. Fix: <code className="i">{ch.options[ch.answer]?.t}</code>
        </>
      );
    case 'review':
      return (
        <>
          Dangerous line{ch.dangerous.length > 1 ? 's' : ''}: {ch.dangerous.map((i) => i + 1).join(', ')}
        </>
      );
    case 'edge':
      return (
        <>
          {ch.answers.map((i) => (
            <code key={i} className="i">
              {ch.options[i]?.t}
            </code>
          ))}
        </>
      );
    default:
      return null;
  }
}

/** First sentence of a text (fallback when `short` is missing). */
export function firstSentence(t: string | undefined): string {
  const s = String(t ?? '').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(s);
  return m ? m[1]! : s;
}
