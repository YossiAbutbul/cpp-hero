/**
 * Out of hearts mid-session (legacy Session.refill): no dead end. A dialog
 * offers a quick review round (+1 heart when at least one is right) or
 * quitting to the map.
 *
 *   const refill = useRefillPrompt();   // ./useRefillPrompt
 *   if (store.state.hearts.n <= 0) { if ((await refill()) === 'quit') leave(); else setStep({ k: 'refill' }); }
 *   <RefillRound fallback={boss.rounds} onDone={resume} />
 */
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/app/gameContext';
import type { Challenge } from '@/content/schema';
import { ChallengeRunner, isTimedType } from '@/features/challenges';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { shuffled } from './util';

export function RefillRound({ fallback, onDone }: { fallback: readonly Challenge[]; onDone: () => void }) {
  const { game } = useGame();
  const dialog = useDialog();
  const initial = useMemo(() => {
    const set = game.reviewSet(3, true);
    for (const c of shuffled(fallback)) if (set.length < 3 && !set.includes(c) && !isTimedType(c)) set.push(c);
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
    });
    setSet((s) => shuffled(s));
    setI(0);
    setGot(0);
    setRound((r) => r + 1);
  };

  // nothing to review yet: just give the heart back
  useEffect(() => {
    if (initial.length) return;
    game.hearts.gain(1);
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!set.length) return null;
  const ch = set[i]!;
  return (
    <ChallengeRunner
      key={`${round}:${i}:${ch.id}`}
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
}
