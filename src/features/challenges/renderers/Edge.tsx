/** edge: multi-select every test input that exposes the bug. */
import { useRef, useState } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { CodeBlock } from '@/features/code';
import { bounce } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { finalState, finalTag, OptionGrid, useOptionKeys, WhyList } from '../Options';
import { Actions } from '../Actions';
import { checkEdge } from '../check';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

export function Edge({ ch, phase, reveal, submit }: RendererProps) {
  const c = ch as ChallengeOf<'edge'>;
  const [picked, setPicked] = useState<number[]>([]);
  const [sent, setSent] = useState<number[]>([]);
  const gridEl = useRef<HTMLDivElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const active = phase === 'answer';

  const toggle = (i: number) => {
    if (!active) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    bounce(btns.current[i] ?? null);
  };
  useOptionKeys(c.options.length, toggle, active);

  const check = () => {
    if (!active || !picked.length) return;
    const A = c.answers;
    const good = checkEdge(c, picked);
    setSent(picked.slice());
    submit({
      correct: good,
      anchor: gridEl,
      softMsg: 'Not quite: a pick is off, or one is missing.',
      detail: <WhyList options={c.options} right={A} picked={picked} rightLabel="Exposes the bug." mono />,
    });
  };

  return (
    <>
      {c.code && <CodeBlock code={c.code} unsafe={c.unsafe} />}
      <p className={styles.subprompt}>
        <Icon name="target" /> Select <b>every</b> input that exposes the bug.
      </p>
      <div ref={gridEl}>
        <OptionGrid
          texts={c.options.map((o) => o.t)}
          mono
          toggle={!reveal}
          buttonRef={(i, el) => (btns.current[i] = el)}
          disabled={() => !active}
          state={(i) => (reveal ? finalState(i, c.answers, sent) : picked.includes(i) ? 'on' : undefined)}
          tag={(i) => (reveal ? finalTag(i, c.answers, sent) : undefined)}
          onPick={toggle}
        />
      </div>
      <Actions check={{ disabled: !picked.length, onClick: check }} />
    </>
  );
}
