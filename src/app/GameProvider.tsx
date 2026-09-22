/**
 * Boots the engine once: loads the save (localStorage with in-memory
 * fallback), creates the game over the current content and keeps it in sync
 * with content hot reloads. Re-renders consumers whenever the save changes.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { SaveV1 } from '@/engine/save';
import { getContent } from '@/content';
import { useContent } from '@/content/useContent';
import { createGame, type Game } from '@/engine/game';
import { createStore, type Store } from '@/engine/store';
import { GameContext } from './gameContext';

function boot(onNotice: (msg: string) => void): { store: Store; game: Game } {
  const store = createStore({ onNotice });
  store.load();
  const game = createGame({ content: getContent(), store });
  game.boot();
  return { store, game };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const content = useContent();
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Created once (lazy state init); content updates are pushed in via setContent.
  const [{ store, game }] = useState(() => boot((msg) => setNotice(msg)));

  // Content hot reload (dev): swap it into the engine during render, so the
  // same render already sees the new index ("adjust state on prop change").
  const [shownContent, setShownContent] = useState(content);
  if (content !== shownContent) {
    game.setContent(content);
    setShownContent(content);
  }

  const update = useCallback(
    (fn: (state: SaveV1) => void) => {
      fn(store.state);
      store.save();
      setVersion((v) => v + 1);
    },
    [store],
  );

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const offs = [
      store.subscribe(bump),
      ...(['xp', 'hearts', 'quests', 'streak', 'equip', 'stats', 'combo'] as const).map((e) => game.events.on(e, bump)),
    ];
    // Flush pending writes when the page is hidden or closed.
    const flush = () => void store.saveNow();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      offs.forEach((off) => off());
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [store, game]);

  return (
    <GameContext.Provider value={{ store, game, version, content, notice, update }}>
      {children}
    </GameContext.Provider>
  );
}
