/**
 * Session bookkeeping shared by boss / project / placement: XP earned (net,
 * from the engine's xp events), first-try accuracy, best combo, time, the
 * quit confirm, and leaving back to the map.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import type { ChallengeResult } from '@/features/challenges';
import { clearConfetti } from '@/ui/fx/effects';
import { useDialog } from '@/ui/overlay/dialogContext';

export interface SessionStats {
  xp: number;
  right: number;
  total: number;
  bestCombo: number;
  seconds: number;
}

export function useSession(opts: { noun: string; quitText: string }) {
  const { game } = useGame();
  const dialog = useDialog();
  const stats = useRef({ xp: 0, right: 0, total: 0, bestCombo: 0, t0: 0 });
  const [asking, setAsking] = useState(false);
  const left = useRef(false);

  useEffect(() => {
    stats.current.t0 = Date.now();
    game.resetCombo();
    return game.events.on('xp', ({ delta }) => {
      stats.current.xp += delta;
    });
  }, [game]);

  /** Count a settled challenge (call from onResult). */
  const record = useCallback(
    (r: ChallengeResult) => {
      const s = stats.current;
      if (!r.retried) {
        s.total++;
        if (r.correct && !r.assisted) s.right++;
      }
      s.bestCombo = Math.max(s.bestCombo, game.combo);
    },
    [game],
  );

  const snapshot = useCallback((): SessionStats => {
    const s = stats.current;
    return {
      xp: Math.max(0, s.xp),
      right: s.right,
      total: s.total,
      bestCombo: s.bestCombo,
      seconds: Math.round((Date.now() - s.t0) / 1000),
    };
  }, []);

  /** Back to the map (collapses into the node the session expanded from). */
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    clearConfetti();
    goBack('/', { dir: 'close' });
  }, []);

  const askQuit = useCallback(async () => {
    if (asking || left.current) return;
    setAsking(true);
    const yes = await dialog.confirm({
      title: `Leave this ${opts.noun}?`,
      body: <p>{opts.quitText}</p>,
      yes: 'Leave',
      no: 'Keep going',
      danger: true,
    });
    setAsking(false);
    if (yes) leave();
  }, [asking, dialog, leave, opts.noun, opts.quitText]);

  return { record, snapshot, leave, askQuit };
}
