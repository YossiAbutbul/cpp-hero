/** fill: one inline blank in the code (AutoGrowInput) · write: type a whole line. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { isNearMiss, matchesAnswer } from '@/engine/matching';
import { CodeBlock } from '@/features/code';
import { AutoGrowInput } from '@/ui/AutoGrowInput';
import { Icon } from '@/ui/Icon';
import { Actions } from '../Actions';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

function useFocusSoon(ref: RefObject<HTMLTextAreaElement | null>, key: unknown) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      // don't steal focus on touch screens (the keyboard would pop up over the code)
      if (window.matchMedia?.('(pointer: coarse)').matches) return;
      ref.current?.focus({ preventScroll: true });
    }, 420);
    return () => clearTimeout(t);
  }, [ref, key]);
}

export function Fill({ ch, phase, attempt, submit }: RendererProps) {
  const c = ch as ChallengeOf<'fill'>;
  const [v, setV] = useState('');
  const [good, setGood] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useFocusSoon(input, attempt);
  const locked = phase !== 'answer';
  const check = () => {
    if (locked || !v.trim()) return;
    const ok = matchesAnswer(v, c);
    setGood(ok);
    const also = c.accept.slice(1);
    submit({
      correct: ok,
      anchor: input,
      softMsg: isNearMiss(v, c)
        ? 'Close! Check spelling, symbols and semicolons.'
        : 'Not quite. Give it another go!',
      visible: ok ? undefined : (
        <div className={styles.rpick}>
          <Icon name="ok" />
          <span>
            Correct: <code className="i">{c.accept[0]}</code>
          </span>
        </div>
      ),
      detail: (
        <div className={styles.accepted}>
          <b>{ok ? 'Your answer:' : 'You typed:'}</b> <code className="i">{v}</code>
          {!ok && (
            <>
              <br />
              <b>Correct:</b> <code className="i">{c.accept[0]}</code>
            </>
          )}
          {also.length > 0 && (
            <>
              <br />
              <span className="muted small">
                Also accepted:{' '}
                {also.map((a) => (
                  <code key={a} className="i">
                    {a}
                  </code>
                ))}
              </span>
            </>
          )}
        </div>
      ),
    });
  };
  const state = phase === 'soft' ? 'bad' : phase === 'done' ? (good ? 'ok' : 'bad') : undefined;
  return (
    <>
      <CodeBlock
        code={c.code}
        unsafe={c.unsafe}
        blank={
          <>
            <AutoGrowInput
              ref={input}
              variant="fill"
              value={v}
              onChange={setV}
              onEnter={check}
              readOnly={locked}
              state={state}
              placeholder={c.placeholder || '???'}
              label="Fill in the blank"
            />
            {state && <Icon name={state === 'ok' ? 'ok' : 'no'} className={styles.inMark} />}
          </>
        }
      />
      <p className={`${styles.subprompt} small muted`}>Type in the blank, then Check (or Enter).</p>
      <Actions check={{ disabled: !v.trim(), onClick: check }} />
    </>
  );
}

export function Write({ ch, phase, attempt, submit }: RendererProps) {
  const c = ch as ChallengeOf<'write'>;
  const [v, setV] = useState('');
  const [good, setGood] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useFocusSoon(input, attempt);
  const locked = phase !== 'answer';
  const sample = c.accept[0] ?? '';
  const check = () => {
    if (locked || !v.trim()) return;
    const ok = matchesAnswer(v, c);
    setGood(ok);
    submit({
      correct: ok,
      anchor: input,
      softMsg: 'Almost! Check names, symbols and the semicolon.',
      visible:
        ok || !sample ? undefined : (
          <div className={styles.rpick}>
            <Icon name="ok" />
            <span>
              One answer: <code className="i">{sample}</code>
            </span>
          </div>
        ),
      detail: (
        <div className={styles.accepted}>
          <b>You wrote:</b> <code className="i">{v}</code>
          {sample && (
            <>
              <br />
              <b>{ok ? 'Model answer:' : 'One correct answer:'}</b> <code className="i">{sample}</code>
            </>
          )}
        </div>
      ),
    });
  };
  const state = phase === 'soft' ? 'bad' : phase === 'done' ? (good ? 'ok' : 'bad') : undefined;
  return (
    <>
      {c.code && <CodeBlock code={c.code} unsafe={c.unsafe} />}
      <div className={styles.writeWrap}>
        <AutoGrowInput
          ref={input}
          variant="console"
          prompt=">"
          value={v}
          onChange={setV}
          onEnter={check}
          readOnly={locked}
          state={state}
          placeholder={c.placeholder || 'Type your C++ here'}
          label="Your line of C++"
        />
        {state && <Icon name={state === 'ok' ? 'ok' : 'no'} className={styles.writeMark} />}
      </div>
      <p className={`${styles.subprompt} small muted`}>Spacing doesn’t matter. Press Enter or Check.</p>
      <Actions check={{ disabled: !v.trim(), onClick: check }} />
    </>
  );
}
