/**
 * Internal contract between the ChallengeRunner and the per-type renderers.
 *
 * A renderer owns its inputs (picked option, typed text, tile order…) and
 * reports an Outcome through `submit`. The runner does the scoring
 * (game.answer), the retry flow, hints, effects and the feedback panel, and
 * tells the renderer what to show through `phase` / `attempt` / `reveal`.
 */
import type { ReactNode } from 'react';
import type { Challenge, ChallengeOf, ChallengeType } from '@/content/schema';

export type Phase = 'answer' | 'soft' | 'done';

export interface Outcome {
  correct: boolean;
  /** the "why" of the option the learner picked (shown by default) */
  pickedWhy?: string;
  /** soft-miss nudge that does not reveal the answer */
  softMsg?: string;
  /** extra content shown by default in the final result */
  visible?: ReactNode;
  /** extra content behind "Tell me more" */
  detail?: ReactNode;
  /** element the confetti / shake starts from */
  anchor?: Element | null;
  /** timed rounds: fraction right (0..1) + counts */
  score?: number;
  right?: number;
  total?: number;
  /** this miss can't be retried (e.g. bug: second wrong line) */
  noRetry?: boolean;
}

export interface CheckSpec {
  label?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface RendererProps<T extends ChallengeType = ChallengeType> {
  ch: ChallengeOf<T>;
  phase: Phase;
  /** 0 on the first try; bumps on "Try again" (renderers reset their marks) */
  attempt: number;
  /** a wrong answer now would be a retryable soft miss */
  canSoft: boolean;
  /** final state: mark the correct answer */
  reveal: boolean;
  submit: (o: Outcome) => void;
  /** renders the actions row (Hint + the big Check button); place it under the inputs */
  actions: (c: CheckSpec | null) => ReactNode;
}

export type AnyRenderer = (p: RendererProps) => ReactNode;

export const TYPE_LABELS: Record<ChallengeType, string> = {
  mcq: 'Concept check',
  predict: 'Predict the output',
  fill: 'Fill in the blank',
  order: 'Put the lines in order',
  write: 'Write a line',
  bug: 'Spot & fix the bug',
  breakit: 'Break it',
  harden: 'Harden it',
  review: 'Code review',
  edge: 'Edge case hunt',
  safe: 'Safe or unsafe?',
  speed: 'Speed round',
};

export const isTimedType = (ch: Challenge) => ch.type === 'safe' || ch.type === 'speed';
export const DEFENSIVE = ['bug', 'breakit', 'harden', 'review', 'edge', 'safe'] as const;
export const isDefensive = (ch: Challenge) => (DEFENSIVE as readonly string[]).includes(ch.type);
