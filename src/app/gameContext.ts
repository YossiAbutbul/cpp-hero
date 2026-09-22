import { createContext, useContext } from 'react';
import type { Content } from '@/content';
import type { Game } from '@/engine/game';
import type { Store } from '@/engine/store';

export interface GameContextValue {
  store: Store;
  game: Game;
  /** The current content (changes on dev hot reload). */
  content: Content;
  /** Bumps whenever the save changes (coarse re-render trigger for Phase A). */
  version: number;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const v = useContext(GameContext);
  if (!v) throw new Error('useGame() must be used inside <GameProvider>');
  return v;
}
