import { createContext, useContext } from 'react';
import type { Content } from '@/content';
import type { Game } from '@/engine/game';
import type { SaveV1 } from '@/engine/save';
import type { Store } from '@/engine/store';

export interface GameContextValue {
  store: Store;
  game: Game;
  /** The current content (changes on dev hot reload). */
  content: Content;
  /** Bumps whenever the save changes (coarse re-render trigger). */
  version: number;
  /** "Progress can't be saved on this device" (storage unavailable), else null. The shell shows it as a toast. */
  notice: string | null;
  /**
   * Mutate the save directly (settings, profile…), then save + re-render:
   *   update((s) => { s.settings.textSize = 'l'; });
   * Game rules (XP, answers) go through `game` instead.
   */
  update: (fn: (state: SaveV1) => void) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const v = useContext(GameContext);
  if (!v) throw new Error('useGame() must be used inside <GameProvider>');
  return v;
}
