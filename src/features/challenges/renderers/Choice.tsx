/** mcq / predict / breakit / harden: tap an option to answer. */
import { useRef, useState } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { CodeBlock } from '@/features/code';
import { Icon } from '@/ui/Icon';
import { finalState, finalTag, looksLikeCode, OptionGrid, useOptionKeys, WhyList } from '../Options';
import { Actions } from '../Actions';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

type ChoiceCh = ChallengeOf<'mcq'> | ChallengeOf<'predict'> | ChallengeOf<'breakit'> | ChallengeOf<'harden'>;

export function Choice({ ch, phase, attempt, reveal, submit }: RendererProps) {
  const c = ch as ChoiceCh;
  const isPredict = c.type === 'predict';
  const isHarden = c.type === 'harden';
  const texts = c.options.map((o) => o.t);
  const mono = isPredict || isHarden || c.type === 'breakit' || looksLikeCode(texts);
  // picks[k] = what was picked on attempt k (earlier ones are "tried")
  const [picks, setPicks] = useState<number[]>([]);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = picks[attempt];
  const tried = picks.slice(0, attempt);

  const pick = (i: number) => {
    if (phase !== 'answer' || cur != null || tried.includes(i)) return;
    const next = picks.slice(0, attempt);
    next[attempt] = i;
    setPicks(next);
    const good = i === c.answer;
    submit({
      correct: good,
      pickedWhy: c.options[i]?.why,
      anchor: btns.current[i],
      detail: <WhyList options={c.options} right={[c.answer]} picked={[i]} ws={isPredict} mono={mono} />,
    });
  };
  useOptionKeys(texts.length, pick, phase === 'answer' && cur == null);

  const picked = cur != null ? [cur] : [];
  const blankText = reveal ? c.options[c.answer]?.t : undefined;

  return (
    <>
      {c.code && (
        <CodeBlock
          code={c.code}
          unsafe={c.unsafe}
          blank={
            isHarden ? (
              <span
                className={[styles.slot, reveal ? styles.slotOk : ''].filter(Boolean).join(' ')}
                aria-label={blankText ? `filled with ${blankText}` : 'missing check'}
              >
                {blankText ?? ' ? '}
              </span>
            ) : undefined
          }
        />
      )}
      {c.type === 'breakit' && (
        <p className={styles.subprompt}>
          <Icon name="swords" /> Pick the input that breaks it.
        </p>
      )}
      <OptionGrid
        texts={texts}
        ws={isPredict}
        mono={mono}
        single={isHarden}
        buttonRef={(i, el) => (btns.current[i] = el)}
        disabled={(i) => phase !== 'answer' || cur != null || tried.includes(i)}
        state={(i) =>
          reveal ? finalState(i, [c.answer], picked) : i === cur ? 'wrong' : tried.includes(i) ? 'tried' : undefined
        }
        tag={(i) =>
          reveal ? finalTag(i, [c.answer], picked) : i === cur ? 'Not quite' : tried.includes(i) ? 'Tried' : undefined
        }
        onPick={pick}
      />
      <Actions />
    </>
  );
}
