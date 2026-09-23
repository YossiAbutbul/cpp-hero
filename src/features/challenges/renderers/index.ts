import type { ChallengeType } from '@/content/schema';
import type { AnyRenderer } from '../types';
import { Bug } from './Bug';
import { Choice } from './Choice';
import { Edge } from './Edge';
import { Fill, Write } from './Fill';
import { Order } from './Order';
import { Review } from './Review';
import { Safe, Speed } from './Timed';

/** One renderer per challenge type (static map: renderers are plain components). */
export const RENDERERS: Record<ChallengeType, AnyRenderer> = {
  mcq: Choice,
  predict: Choice,
  breakit: Choice,
  harden: Choice,
  fill: Fill,
  write: Write,
  order: Order,
  bug: Bug,
  review: Review,
  edge: Edge,
  safe: Safe,
  speed: Speed,
};
