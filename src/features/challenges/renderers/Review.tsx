/** review: tap every dangerous line to flag it, then submit the review. */
import { useRef, useState } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { CodeBlock, type LineState } from '@/features/code';
import { Icon } from '@/ui/Icon';
import { Md } from '@/ui/Md';
import { plural } from '@/ui/format';
import { Actions } from '../Actions';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

export function Review({ ch, phase, reveal, submit }: RendererProps) {
  const c = ch as ChallengeOf<'review'>;
  const [flagged, setFlagged] = useState<number[]>([]);
  const codeEl = useRef<HTMLDivElement>(null);
  const active = phase === 'answer';
  const D = c.dangerous;

  const toggle = (i: number) => {
    if (!active) return;
    setFlagged((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));
  };

  const check = () => {
    if (!active) return;
    const good = flagged.length === D.length && D.every((i) => flagged.includes(i));
    const caught = D.filter((i) => flagged.includes(i)).length;
    const falseFlags = flagged.filter((i) => !D.includes(i)).length;
    const keys = Object.keys(c.lineNotes)
      .map(Number)
      .sort((a, b) => a - b);
    submit({
      correct: good,
      anchor: codeEl,
      softMsg: `You caught ${caught} of ${D.length} dangerous lines${falseFlags ? ` and flagged ${plural(falseFlags, 'safe line')}.` : '.'}`,
      detail: keys.length ? (
        <ul className={styles.why}>
          {keys.map((i) => {
            const isD = D.includes(i);
            return (
              <li key={i} className={isD ? styles.nope : styles.yes}>
                <Icon name={isD ? 'alert' : 'ok'} />
                <div>
                  <code>Line {i + 1}</code>
                  <span>
                    <b>{isD ? 'Dangerous.' : 'Fine.'}</b> <Md text={c.lineNotes[String(i)]} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : undefined,
    });
  };

  const lineState = (i: number): LineState | undefined => {
    const isD = D.includes(i);
    const isF = flagged.includes(i);
    if (reveal) return isD && isF ? 'ok' : isD ? 'miss' : isF ? 'bad' : undefined;
    return isF ? 'flagged' : undefined;
  };
  const lineMark = (i: number) => {
    const isD = D.includes(i);
    const isF = flagged.includes(i);
    if (reveal) {
      if (isD && isF)
        return (
          <span className={styles.lmark}>
            <Icon name="ok" />
            <b>Caught</b>
          </span>
        );
      if (isD)
        return (
          <span className={styles.lmark}>
            <Icon name="alert" />
            <b>Missed</b>
          </span>
        );
      if (isF)
        return (
          <span className={styles.lmark}>
            <Icon name="no" />
            <b>Safe</b>
          </span>
        );
      return null;
    }
    return isF ? (
      <span className={styles.lmark}>
        <Icon name="alert" />
        <b>Flagged</b>
      </span>
    ) : null;
  };

  return (
    <>
      <CodeBlock
        ref={codeEl}
        code={c.code}
        unsafe={c.unsafe}
        label="Code review: tap every dangerous line"
        onLineClick={active ? toggle : undefined}
        pressedLines={flagged}
        lineState={lineState}
        lineMark={lineMark}
      />
      <p className={styles.subprompt}>
        <Icon name="alert" /> Tap every dangerous line to flag it, then submit.
      </p>
      <Actions check={{ label: 'Submit review', onClick: check }} />
    </>
  );
}
