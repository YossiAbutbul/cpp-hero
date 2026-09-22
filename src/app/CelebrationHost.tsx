/**
 * Shows the celebration queue (src/ui/fx/celebrationQueue.ts) one overlay at
 * a time, and feeds it from game.drainCelebrations(): automatically ~0.5 s
 * after landing on a non-immersive screen, or whenever a screen calls
 * requestCelebrations() (e.g. on its results card).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EvolutionSequence } from '@/features/curlo/EvolutionSequence';
import { LEVEL_COSMETICS } from '@/engine/config';
import {
  closeCelebration,
  registerCelebrationSource,
  requestCelebrations,
  useCurrentCelebration,
} from '@/ui/fx/celebrationQueue';
import { CelebrationOverlay } from '@/ui/fx/CelebrationOverlay';
import { useGame } from './gameContext';

export function CelebrationHost({ immersive }: { immersive: boolean }) {
  const { game, store } = useGame();
  const item = useCurrentCelebration();
  const location = useLocation();

  useEffect(() => {
    registerCelebrationSource(() => game.drainCelebrations());
    return () => registerCelebrationSource(null);
  }, [game]);

  // calm moment: shortly after arriving on a tab / panel screen
  useEffect(() => {
    if (immersive) return;
    const t = window.setTimeout(() => void requestCelebrations(), 500);
    return () => clearTimeout(t);
  }, [location.key, location.pathname, immersive]);

  if (!item) return null;
  if (item.type === 'evolve')
    return (
      <EvolutionSequence
        key={item.uid}
        from={item.from}
        to={item.to}
        name={store.state.profile.name || 'Curlo'}
        onDone={() => closeCelebration(item.uid)}
      />
    );
  const rewardId = item.type === 'levelup' ? LEVEL_COSMETICS[item.level] : undefined;
  return (
    <CelebrationOverlay
      key={item.uid}
      item={item}
      levelReward={rewardId ? game.cosmeticDef(rewardId)?.name : undefined}
      onClose={(accept) => {
        if (accept && item.type === 'cosmetic' && item.def.slot === 'hat') game.equip('hat', item.def.id);
        closeCelebration(item.uid);
      }}
    />
  );
}
