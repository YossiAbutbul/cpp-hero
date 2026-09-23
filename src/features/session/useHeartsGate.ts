/**
 * Lessons and bosses need a heart to start. The map checks this before
 * opening a node (useStartNode); this covers the other ways in (a direct
 * link, browser back/forward): with no heart, go back to the map.
 */
import { useEffect } from 'react';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import { toast } from '@/ui/toast';

export function useHeartsGate(): void {
  const { game, store } = useGame();
  useEffect(() => {
    game.hearts.regen();
    if (store.state.hearts.n > 0) return;
    toast('Out of hearts! Earn one in Practice, or wait a bit.', { icon: 'heart', ms: 4000 });
    goBack('/', { dir: 'close' });
    // once, on entering the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
