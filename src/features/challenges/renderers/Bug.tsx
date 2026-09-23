/** bug: step 1 tap the buggy line, step 2 choose the fix. */
import { useEffect, useRef, useState } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { CodeBlock, type LineState } from '@/features/code';
import { slideUp } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { finalState, finalTag, OptionGrid, useOptionKeys, WhyList } from '../Options';
import { Actions } from '../Actions';
import { checkBug, checkChoice } from '../check';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

export function Bug({ ch, phase, attempt, canSoft, reveal, submit }: RendererProps) {
  const c = ch as ChallengeOf<'bug'>;
  const [stage, setStage] = useState<'line' | 'fix'>('line');
  const [line, setLine] = useState<{ i: number; attempt: number } | null>(null);
  const [lineWrong, setLineWrong] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const lineEls = useRef<HTMLDivElement>(null);
  const fixEl = useRef<HTMLDivElement>(null);
  const active = phase === 'answer';
  const cur = picks[attempt];
  const tried = picks.slice(0, attempt).filter((x) => x != null);
  const lineNow = line && line.attempt === attempt ? line.i : null;

  const bugNote = (
    <div className={styles.accepted}>
      <Icon name="bug" /> The bug was on <b>line {c.bugLine + 1}</b>.
    </div>
  );

  const tapLine = (i: number) => {
    if (!active || stage !== 'line' || lineNow != null) return;
    setLine({ i, attempt });
    if (i === c.bugLine) {
      setStage('fix');
      return;
    }
    if (canSoft) {
      submit({
        correct: false,
        anchor: lineEls,
        softMsg: 'That line is fine. Look for what could break.',
        detail: (
          <>
            {bugNote}
            <WhyList options={c.options} right={[c.answer]} picked={[]} rightLabel="The fix." mono />
          </>
        ),
      });
      return;
    }
    setLineWrong(true);
    setStage('fix');
  };

  useEffect(() => {
    if (stage !== 'fix') return;
    slideUp(fixEl.current);
    const t = window.setTimeout(() => {
      fixEl.current?.querySelector('button')?.focus({ preventScroll: true });
      try {
        fixEl.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [stage]);

  const pick = (k: number) => {
    if (!active || stage !== 'fix' || cur != null || tried.includes(k)) return;
    const next = picks.slice(0, attempt);
    next[attempt] = k;
    setPicks(next);
    const fixOK = checkChoice(c, k);
    submit({
      // line is the bug line here unless lineWrong (a wrong first tap with no retry left)
      correct: checkBug(c, lineWrong ? (line?.i ?? -1) : c.bugLine, k),
      noRetry: lineWrong,
      pickedWhy: c.options[k]?.why,
      anchor: btns.current[k],
      visible: lineWrong ? (
        <div className={styles.rpick}>
          <Icon name="bug" />
          <span>
            The bug was on <b>line {c.bugLine + 1}</b>.{fixOK ? ' You picked the right fix, though!' : ''}
          </span>
        </div>
      ) : undefined,
      detail: <WhyList options={c.options} right={[c.answer]} picked={[k]} rightLabel="The fix." mono />,
    });
  };
  useOptionKeys(c.options.length, pick, active && stage === 'fix' && cur == null);

  const targetShown = reveal || stage === 'fix';
  const lineState = (i: number): LineState | undefined => {
    if (i === c.bugLine && targetShown) return 'ok';
    if (lineNow === i && i !== c.bugLine) return 'bad';
    if (lineWrong && line?.i === i) return 'bad';
    return undefined;
  };
  const lineMark = (i: number) => {
    if (i === c.bugLine && targetShown)
      return (
        <span className={styles.lmark}>
          <Icon name={lineWrong || reveal ? 'bug' : 'ok'} />
          <b>{lineWrong || (reveal && stage === 'line') ? 'Bug here' : 'Found it!'}</b>
        </span>
      );
    if ((lineNow === i || (lineWrong && line?.i === i)) && i !== c.bugLine)
      return (
        <span className={styles.lmark}>
          <Icon name="no" />
          <b>Not this one</b>
        </span>
      );
    return null;
  };

  const picked = cur != null ? [...tried, cur] : tried;
  return (
    <>
      <div ref={lineEls}>
        <CodeBlock
          code={c.code}
          unsafe={c.unsafe}
          label="Code: tap the buggy line"
          onLineClick={active && stage === 'line' && lineNow == null ? tapLine : undefined}
          lineState={lineState}
          lineMark={lineMark}
        />
      </div>
      <p className={styles.subprompt}>
        {stage === 'line' ? (
          <>
            <Icon name="bug" /> <b>Step 1:</b> tap the line with the bug.
          </>
        ) : (
          <>
            <Icon name="wand" /> <b>Step 2:</b> choose the fix for line {c.bugLine + 1}.
          </>
        )}
      </p>
      {stage === 'fix' && (
        <div ref={fixEl}>
          <OptionGrid
            texts={c.options.map((o) => o.t)}
            mono
            single
            buttonRef={(i, el) => (btns.current[i] = el)}
            disabled={(i) => !active || cur != null || tried.includes(i)}
            state={(i) =>
              reveal
                ? finalState(i, [c.answer], picked)
                : i === cur
                  ? 'wrong'
                  : tried.includes(i)
                    ? 'tried'
                    : undefined
            }
            tag={(i) =>
              reveal
                ? finalTag(i, [c.answer], picked)
                : i === cur
                  ? 'Not quite'
                  : tried.includes(i)
                    ? 'Tried'
                    : undefined
            }
            onPick={pick}
          />
        </div>
      )}
      <Actions />
    </>
  );
}
