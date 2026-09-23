/**
 * Out of hearts mid-session (legacy Session.refill): no dead end. A dialog
 * offers a quick review round (+1 heart when at least one is right) or
 * quitting to the map. The round: 3 review questions, mode 'refill', no
 * hearts at stake.
 *
 *   const refill = useRefillPrompt();   // ./useRefillPrompt
 *   if (store.state.hearts.n <= 0) { if ((await refill()) === 'quit') leave(); else setRefill(true); }
 *   <RefillRound pool={lesson.challenges} onDone={resume} />
 *
 * `paged` slides each question in as its own SlidePage (lesson); otherwise
 * the caller's page wraps the whole round (boss).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/app/gameContext';
import type { Challenge } from '@/content/schema';
import { ChallengeRunner, isTimedType } from '@/features/challenges';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { SlidePage } from './SessionFrame';
import { shuffled } from './util';

export function RefillRound({
  pool,
  paged = false,
  onDone,
}: {
  /** fills the round up to 3 when the review set is short */
  pool: readonly Challenge[];
  paged?: boolean;
  onDone: () => void;
}) {
  const { game } = useGame();
  const dialog = useDialog();
  const initial = useMemo(() => {
    const set = game.reviewSet(3, true).slice(0, 3);
    for (const c of shuffled(pool)) if (set.length < 3 && !set.includes(c) && !isTimedType(c)) set.push(c);
    return set;
    // once per round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [set, setSet] = useState(initial);
  const [i, setI] = useState(0);
  const [got, setGot] = useState(0);
  const [round, setRound] = useState(0);

  const finish = async (right: number) => {
    if (right > 0) {
      game.hearts.gain(1);
      toast('+1 heart! Back to it!', { icon: 'heart' });
      onDone();
      return;
    }
    await dialog.open({
      title: 'So close!',
      mood: 'thinking',
      body: <p>Get at least one right to earn the heart. Let’s try another round!</p>,
      buttons: [{ label: 'Try again', value: true }],
      dismissValue: true,
    });
    setSet((s) => shuffled(s));
    setI(0);
    setGot(0);
    setRound((r) => r + 1);
  };

  // nothing to review yet: just give the heart back (once, even if the effect runs twice)
  const gaveBack = useRef(false);
  useEffect(() => {
    if (initial.length || gaveBack.current) return;
    gaveBack.current = true;
    game.hearts.gain(1);
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!set.length) return null;
  const ch = set[i]!;
  const key = `${round}:${i}:${ch.id}`;
  const runner = (
    <ChallengeRunner
      key={key}
      challenge={ch}
      mode="refill"
      noHearts
      eyebrow={`Heart refill · ${i + 1} of ${set.length}`}
      onContinue={(r) => {
        const right = got + (r.correct ? 1 : 0);
        setGot(right);
        if (i + 1 >= set.length) void finish(right);
        else setI(i + 1);
      }}
    />
  );
  return paged ? (
    <SlidePage pageKey={`refill:${key}`} enterOnMount>
      {runner}
    </SlidePage>
  ) : (
    runner
  );
}
