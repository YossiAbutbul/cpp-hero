/**
 * Curlo's story lines as tap-to-advance speech bubbles (world intros, boss
 * intros, victories, onboarding).
 *
 *   <StoryBubbles lines={w.story.intro} doneLabel="Let's go!" onDone={start} />
 *
 * Tap the bubble, Curlo or Next to advance; Enter works through the focused
 * button. `onSkip` adds a "Skip" link.
 */
import { useState } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { SpeechBubble } from '@/features/curlo/SpeechBubble';
import type { CurloMood } from '@/features/curlo/curloArt';
import { Button } from '@/ui/Button';
import { Md } from '@/ui/Md';
import styles from './StoryBubbles.module.css';

export interface StoryBubblesProps {
  lines: readonly string[];
  onDone: () => void;
  onSkip?: () => void;
  doneLabel?: string;
  /** mood per line (cycles); default a lively mix */
  moods?: readonly CurloMood[];
  /** Curlo width in px (0 = no Curlo) */
  curloSize?: number;
  /** speaker prefix, e.g. the boss name (then no Curlo is shown) */
  speaker?: string;
  tone?: 'default' | 'boss';
}

const MIX: CurloMood[] = ['celebrate', 'happy', 'worried', 'bracing', 'thinking'];

export function StoryBubbles({
  lines,
  onDone,
  onSkip,
  doneLabel = 'Let’s go!',
  moods = MIX,
  curloSize = 96,
  speaker,
  tone = 'default',
}: StoryBubblesProps) {
  const [i, setI] = useState(0);
  const last = i >= lines.length - 1;
  const next = () => (last ? onDone() : setI((k) => Math.min(lines.length - 1, k + 1)));
  const mood = moods[i % moods.length] ?? 'happy';
  const line = lines[i] ?? '';

  return (
    <div className={styles.story}>
      {curloSize > 0 && !speaker && (
        <button type="button" className={styles.curlo} style={{ width: curloSize }} onClick={next} tabIndex={-1} aria-hidden="true">
          <Curlo mood={mood} reactKey={i} />
        </button>
      )}
      <div className={styles.tap} onClick={next}>
        <SpeechBubble tail={speaker ? 'none' : 'bottom'} tone={tone} popKey={i} className={styles.bubble}>
          {speaker && <b>{speaker}: </b>}
          <Md text={line} />
        </SpeechBubble>
      </div>
      {lines.length > 1 && (
        <div className={styles.dots} aria-hidden="true">
          {lines.map((_, k) => (
            <i key={k} className={k <= i ? styles.on : undefined} />
          ))}
        </div>
      )}
      <span className="sr">
        Line {i + 1} of {lines.length}
      </span>
      <Button block iconEnd={last ? undefined : 'next'} onClick={next} data-autofocus>
        {last ? doneLabel : 'Next'}
      </Button>
      {onSkip && !last && (
        <button type="button" className={styles.skip} onClick={onSkip}>
          Skip
        </button>
      )}
    </div>
  );
}
