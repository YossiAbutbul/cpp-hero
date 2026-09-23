/** The "Out of hearts!" dialog: 'refill' (quick review round) or 'quit'. See RefillRound.tsx. */
import { useCallback } from 'react';
import { useGame } from '@/app/gameContext';
import { curloLine } from '@/features/curlo/voice';
import { HeartClock } from '@/ui/HeartsChip';
import { useDialog } from '@/ui/overlay/dialogContext';

export function useRefillPrompt() {
  const { game, store } = useGame();
  const dialog = useDialog();
  return useCallback(async (): Promise<'refill' | 'quit'> => {
    const read = () => ({
      n: store.state.hearts.n,
      max: store.state.hearts.max,
      nextIn: game.hearts.nextIn(),
    });
    const v = await dialog.open<'refill' | 'quit'>({
      title: 'Out of hearts!',
      mood: 'worried',
      dismissValue: 'refill',
      body: (
        <>
          <p>{curloLine('noHearts')}</p>
          <HeartClock read={read} onTick={() => game.hearts.regen()} />
          <p className="muted small">
            Or answer 3 quick review questions to earn one now. No hearts lost there.
          </p>
        </>
      ),
      buttons: [
        { label: 'Earn a heart', value: 'refill', variant: 'teal', icon: 'practice' },
        { label: 'Quit to map', value: 'quit', variant: 'ghost' },
      ],
    });
    return v ?? 'refill';
  }, [dialog, game, store]);
}
