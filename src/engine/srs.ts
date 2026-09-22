/**
 * Spaced repetition (Leitner boxes 1..5, review after 0/1/3/7/16 days).
 * Wrong → box 1, due now. Right → next box, due after that box's interval.
 * A right answer on a never-missed challenge creates no entry (only missed
 * concepts are tracked), exactly like legacy.
 */
import { SRS_INTERVAL_DAYS } from './config';
import type { SaveV1 } from './save';

type Srs = SaveV1['srs'];
const DAY_MS = 86_400_000;

export function srsRecord(srs: Srs, id: string, correct: boolean, now: number): void {
  const e = srs[id];
  if (!correct) {
    srs[id] = {
      box: 1,
      due: new Date(now).toISOString(),
      wrong: (e ? e.wrong : 0) + 1,
      right: e ? e.right : 0,
    };
  } else if (e) {
    e.right++;
    e.box = Math.min(5, e.box + 1);
    e.due = new Date(now + (SRS_INTERVAL_DAYS[e.box - 1] ?? 0) * DAY_MS).toISOString();
  }
}

/** Ids due now that still exist (`exists`), oldest due first. */
export function srsDue(srs: Srs, now: number, exists: (id: string) => boolean): string[] {
  return Object.keys(srs)
    .filter((id) => exists(id) && Date.parse(srs[id]!.due) <= now)
    .sort((a, b) => Date.parse(srs[a]!.due) - Date.parse(srs[b]!.due));
}
