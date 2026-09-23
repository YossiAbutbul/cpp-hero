/**
 * Out of hearts mid-session: no dead end (legacy Session.refill). Ask first,
 * then 3 quick review questions (mode 'refill', no hearts at stake); one right
 * answer earns a heart back.
 *
 *   const askRefill = useOutOfHearts();
 *   if (store.state.hearts.n <= 0) { if ((await askRefill()) === 'quit') leave(); else setRefill(true); }
 *   {refill && <RefillRound pool={lesson.challenges} onDone={() => setRefill(false)} />}
 */
import { useState } from 'react';
import { useGame } from '@/app/gameContext';
import type { Challenge } from '@/content/schema';
import { ChallengeRunner, isTimedType } from '@/features/challenges';
import { curloLine } from '@/features/curlo/voice';
import { HeartClock } from '@/ui/HeartsChip';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { shuffle } from '@/engine/util';
import { SlidePage } from './SlidePage';

export function useOutOfHearts() {
  const dialog = useDialog();
  const { game, store } = useGame();
  return () =>
    dialog.open<'refill' | 'quit'>({
      title: 'Out of hearts!',
      mood: 'worried',
      body: (
        <>
          <p>{curloLine('noHearts')}</p>
          <HeartClock
            read={() => ({ n: store.state.hearts.n, max: store.state.hearts.max, nextIn: game.hearts.nextIn() })}
            onTick={() => game.hearts.regen()}
          />
          <p className="muted small">Or answer 3 quick review questions to earn one now. No hearts lost there.</p>
        </>
      ),
      buttons: [
        { label: 'Earn a heart', value: 'refill', variant: 'teal', icon: 'practice' },
        { label: 'Quit to map', value: 'quit', variant: 'ghost' },
      ],
      dismissValue: 'refill',
    });
}

function pickSet(reviewSet: Challenge[], pool: readonly Challenge[]): Challenge[] {
  const set = reviewSet.slice(0, 3);
  for (const c of shuffle(pool.slice())) {
    if (set.length >= 3) break;
    if (!set.includes(c) && !isTimedType(c)) set.push(c);
  }
  return set;
}

export function RefillRound({ pool, onDone }: { pool: readonly Challenge[]; onDone: () => void }) {
  const { game } = useGame();
  const dialog = useDialog();
  const [round, setRound] = useState(() => ({ set: pickSet(game.reviewSet(3, true), pool), n: 0 }));
  const [i, setI] = useState(0);
  const [got, setGot] = useState(0);

  const finish = async (gotNow: number) => {
    if (gotNow > 0 || !round.set.length) {
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
    setRound((r) => ({ set: shuffle(r.set.slice()), n: r.n + 1 }));
    setI(0);
    setGot(0);
  };

  const ch = round.set[i];
  if (!ch) return null;
  return (
    <SlidePage pageKey={`refill:${round.n}:${i}`}>
      <ChallengeRunner
        key={`refill:${round.n}:${i}`}
        challenge={ch}
        mode="refill"
        noHearts
        eyebrow={`Heart refill · ${i + 1} of ${round.set.length}`}
        onContinue={(r) => {
          const g = got + (r.correct ? 1 : 0);
          setGot(g);
          if (i + 1 >= round.set.length) void finish(g);
          else setI(i + 1);
        }}
      />
    </SlidePage>
  );
}
