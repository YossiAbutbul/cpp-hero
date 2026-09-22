/**
 * Hearts chip for the header / session bar. Tapping it opens the hearts
 * rules sheet with a live "Next heart in m:ss" countdown.
 *
 *   <HeartsChip n={s.hearts.n} max={s.hearts.max}
 *     read={() => ({ ...store.state.hearts, nextIn: game.hearts.nextIn() })}
 *     onTick={game.hearts.regen}
 *     onPracticeReview={() => navigate('/practice')} />
 *
 * Pure UI: numbers come in through props / the `read` getter (the sheet
 * re-reads it every second, so it stays live while open).
 */
import { useEffect, useReducer } from 'react';
import { Button } from './Button';
import { fmtClock } from './format';
import { Chip } from './Chip';
import { Hearts } from './GameBits';
import { Icon } from './Icon';
import { useDialog } from './overlay/dialogContext';
import styles from './HeartsChip.module.css';

export interface HeartsSnapshot {
  n: number;
  max: number;
  /** seconds until the next heart (0 when full) */
  nextIn: number;
}

export interface HeartsInfoProps {
  /** current hearts; re-read every second */
  read: () => HeartsSnapshot;
  /** called every second before reading (e.g. game.hearts.regen) */
  onTick?: () => void;
  onPracticeReview?: () => void;
}

function useEverySecond(onTick?: () => void) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const t = window.setInterval(() => {
      onTick?.();
      force();
    }, 1000);
    return () => clearInterval(t);
  }, [onTick]);
}

/** "Next heart in m:ss" / "Hearts are full!" with a 1s live countdown. */
export function HeartClock({ read, onTick }: Pick<HeartsInfoProps, 'read' | 'onTick'>) {
  useEverySecond(onTick);
  const h = read();
  if (h.n >= h.max)
    return (
      <p className={styles.clockRow}>
        <Icon name="heart" /> Hearts are full!
      </p>
    );
  return (
    <p className={styles.clockRow}>
      <Icon name="clock" /> Next heart in <b className={styles.clock}>{fmtClock(h.nextIn)}</b>
    </p>
  );
}

/** The hearts rules sheet body (big hearts, countdown, rules, practice button). */
export function HeartsInfo({ read, onTick, onPracticeReview }: HeartsInfoProps) {
  useEverySecond();
  const h = read();
  return (
    <div>
      <div className={styles.big}>
        <Hearts n={h.n} max={h.max} size={40} />
      </div>
      <HeartClock read={read} onTick={onTick} />
      <ul className={styles.rules}>
        <li>
          <Icon name="no" />
          <span>
            A wrong <b>first try</b> costs one heart. Retries are free.
          </span>
        </li>
        <li>
          <Icon name="clock" />
          <span>
            Hearts refill <b>1 every 30 minutes</b>.
          </span>
        </li>
        <li>
          <Icon name="practice" />
          <span>
            A quick <b>practice review</b> earns one now.
          </span>
        </li>
        <li>
          <Icon name="ok" />
          <span>At zero, practice still works. Never stuck!</span>
        </li>
      </ul>
      {onPracticeReview && (
        <Button variant="teal" icon="practice" block onClick={onPracticeReview}>
          Practice review
        </Button>
      )}
    </div>
  );
}

export interface HeartsChipProps extends HeartsInfoProps {
  n: number;
  max: number;
  className?: string;
}

export function HeartsChip({ n, max, read, onTick, onPracticeReview, className }: HeartsChipProps) {
  const dialog = useDialog();
  return (
    <Chip
      className={className}
      label={`Hearts: ${n} of ${max}`}
      onClick={() =>
        dialog.sheet({
          title: 'Hearts',
          body: (close) => (
            <HeartsInfo
              read={read}
              onTick={onTick}
              onPracticeReview={
                onPracticeReview
                  ? () => {
                      close();
                      onPracticeReview();
                    }
                  : undefined
              }
            />
          ),
        })
      }
    >
      <Hearts n={n} max={max} />
    </Chip>
  );
}
