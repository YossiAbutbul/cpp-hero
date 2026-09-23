/**
 * A practice session (#/practice/run?mode=review | ?mode=arena&type=bug; immersive):
 *   review  5 spaced-repetition items (due first, then most-missed); +1 heart at the end
 *   arena   5 seen challenges of one type for bonus XP; no hearts at stake
 * Both use the lesson session chrome, the ChallengeRunner and the results card.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import { CHALLENGE_TYPES, type Challenge, type ChallengeType } from '@/content/schema';
import { shuffle } from '@/engine/util';
import { ChallengeRunner, TYPE_LABELS } from '@/features/challenges';
import { Results, sessionTiles } from '@/features/lesson/Results';
import { SessionFrame } from '@/features/lesson/SessionFrame';
import { SlidePage } from '@/features/lesson/SlidePage';
import { useQuit } from '@/features/lesson/useQuit';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Card, Screen } from '@/ui/Layout';
import styles from './practice.module.css';

export function PracticeRun() {
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'arena' ? 'arena' : 'review';
  const t = params.get('type') ?? '';
  const type = (CHALLENGE_TYPES as readonly string[]).includes(t) ? (t as ChallengeType) : null;
  return <Run key={`${mode}:${type ?? ''}`} mode={mode} type={type} />;
}

function Run({ mode, type }: { mode: 'review' | 'arena'; type: ChallengeType | null }) {
  const { game, store } = useGame();
  const [list] = useState<Challenge[]>(() => {
    if (mode === 'review') return game.reviewSet(5);
    const idx = game.index.challenge;
    const seen = game.seenChallengeIds().filter((id) => idx[id]!.ch.type === type);
    return shuffle(seen)
      .slice(0, 5)
      .map((id) => idx[id]!.ch);
  });
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [t0] = useState(() => Date.now());
  const [xp0] = useState(() => store.state.xp);
  const [done, setDone] = useState<null | { seconds: number; xp: number; gained: number }>(null);
  const noun = mode === 'review' ? 'review' : 'practice run';
  const askQuit = useQuit(noun);

  useEffect(() => {
    game.resetCombo();
  }, [game]);

  if (!list.length)
    return (
      <Screen label="Practice" immersive>
        <Card>
          <p>Finish a lesson first. Then there’s something to practice!</p>
          <Button variant="ghost" icon="back" onClick={() => goBack('/practice', { dir: 'close' })}>
            Back
          </Button>
        </Card>
      </Screen>
    );

  const finish = () => {
    let gained = 0;
    if (mode === 'review') gained = game.finishPractice();
    else {
      game.questEvent('practice.done', 1);
      game.markActive();
    }
    setDone({ seconds: Math.round((Date.now() - t0) / 1000), xp: store.state.xp - xp0, gained });
  };

  const ch = list[i];
  const label = type ? TYPE_LABELS[type] : '';
  return (
    <SessionFrame
      label={mode === 'review' ? 'Review' : `Practice: ${label}`}
      progress={done ? 1 : i / list.length}
      onQuit={() => (done ? goBack('/practice', { dir: 'close' }) : void askQuit())}
      scrollKey={done ? 'done' : i}
    >
      {done ? (
        <SlidePage pageKey="done">
          <Results
            title={mode === 'review' ? 'Review complete!' : 'Practice complete!'}
            sub={mode === 'review' ? 'Spaced repetition keeps concepts fresh.' : 'Bonus XP earned in the Arena.'}
            tiles={sessionTiles({ xp: done.xp, right, total: list.length, bestCombo, seconds: done.seconds })}
            extra={
              mode === 'review' ? (
                <div className={styles.gain}>
                  <Icon name="heart" /> {done.gained ? '+1 heart for reviewing!' : 'Hearts are full. Nice upkeep!'}
                </div>
              ) : undefined
            }
            onContinue={() => goBack('/practice', { dir: 'close' })}
          />
        </SlidePage>
      ) : ch ? (
        <SlidePage pageKey={i}>
          <ChallengeRunner
            key={`${i}:${ch.id}`}
            challenge={ch}
            mode={mode === 'review' ? 'review' : 'practice'}
            eyebrow={
              mode === 'review'
                ? `Review · ${i + 1} of ${list.length} · ${TYPE_LABELS[ch.type]}`
                : `Practice Arena · ${label} · ${i + 1} of ${list.length} · bonus XP`
            }
            onResult={(r) => {
              if (r.firstTry) setRight((n) => n + 1);
              setBestCombo((b) => Math.max(b, game.combo));
            }}
            onContinue={() => (i + 1 >= list.length ? finish() : setI(i + 1))}
          />
        </SlidePage>
      ) : null}
    </SessionFrame>
  );
}
