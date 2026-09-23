/**
 * Practice tab (#/practice): spaced-repetition review and the Practice
 * Arena (replay any challenge type you've met, bonus XP).
 * Runs open #/practice/run (immersive). `#/practice?review=1` starts a review.
 */
import { useEffect, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import { CHALLENGE_TYPES, type ChallengeType } from '@/content/schema';
import { TYPE_LABELS } from '@/features/challenges';
import { Curlo } from '@/features/curlo/Curlo';
import { Button } from '@/ui/Button';
import { wiggle } from '@/ui/fx/motion';
import { Icon, type IconName } from '@/ui/Icon';
import { Card, Screen, ScreenTitle } from '@/ui/Layout';
import { plural } from '@/ui/format';
import { toast } from '@/ui/toast';
import styles from './practice.module.css';

const TYPE_ICON: Record<ChallengeType, IconName> = {
  mcq: 'star',
  predict: 'play',
  fill: 'wand',
  order: 'grip',
  write: 'text',
  bug: 'bug',
  breakit: 'swords',
  harden: 'shield',
  review: 'warn',
  edge: 'target',
  safe: 'shieldO',
  speed: 'bolt',
};

const REVIEW_RUN = '/practice/run?mode=review';

export function PracticeScreen() {
  const { game } = useGame();
  const [params] = useSearchParams();
  const autoReview = params.get('review') === '1';
  const due = game.srsDue().length;
  const seen = game.seenChallengeIds();
  const idx = game.index.challenge;
  const canReview = seen.length > 0 || due > 0;

  useEffect(() => {
    if (!autoReview) return;
    if (canReview) navigate(REVIEW_RUN, { dir: 'up', replace: true });
    else navigate('/practice', { replace: true, dir: 'none' });
  }, [autoReview, canReview]);

  const counts = Object.fromEntries(
    CHALLENGE_TYPES.map((t) => [t, seen.filter((id) => idx[id]?.ch.type === t).length]),
  ) as Record<ChallengeType, number>;

  const open = (t: ChallengeType, e: MouseEvent<HTMLButtonElement>) => {
    if (!counts[t]) {
      wiggle(e.currentTarget);
      toast('Meet this challenge type in a lesson to unlock it here.', { icon: 'lock' });
      return;
    }
    navigate(`/practice/run?mode=arena&type=${t}`, { dir: 'expand', origin: e.currentTarget });
  };

  return (
    <Screen label="Practice">
      <ScreenTitle eyebrow="Practice">Train your brain</ScreenTitle>
      <Card className={styles.reviewCard}>
        <div className={styles.rcCurlo}>
          <Curlo mood={due ? 'thinking' : 'happy'} />
        </div>
        <div className={styles.rcBody}>
          <h3>Spaced review</h3>
          <p className="muted small">
            {due
              ? `${plural(due, 'concept')} due for review.`
              : seen.length
                ? 'Nothing due right now. Review anyway to stay sharp!'
                : 'Finish your first lesson to unlock reviews.'}
          </p>
        </div>
        <Button
          variant="teal"
          icon="practice"
          disabled={!canReview}
          onClick={(e) => navigate(REVIEW_RUN, { dir: 'expand', origin: e.currentTarget })}
        >
          Review
        </Button>
      </Card>
      <h3 className={styles.secH}>
        Practice Arena <span className="muted small">bonus XP</span>
      </h3>
      <div className={styles.grid}>
        {CHALLENGE_TYPES.map((t) => {
          const n = counts[t];
          return (
            <button
              key={t}
              type="button"
              className={[styles.typeCard, n ? '' : styles.locked].filter(Boolean).join(' ')}
              aria-label={`${TYPE_LABELS[t]}, ${n ? plural(n, 'challenge') : 'locked'}`}
              onClick={(e) => open(t, e)}
            >
              <span className={styles.tcIc}>
                <Icon name={n ? TYPE_ICON[t] : 'lock'} />
              </span>
              <b>{TYPE_LABELS[t]}</b>
              <small>{n ? plural(n, 'challenge') : 'Not unlocked yet'}</small>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
