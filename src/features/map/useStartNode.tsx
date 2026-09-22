/**
 * Starting a map node: out-of-hearts check (lessons and bosses), the world's
 * story intro before its first lesson, then the session expands from the
 * node (data-origin-id = node id, so it collapses back into it on exit).
 */
import { useCallback } from 'react';
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import type { MapNode } from '@/engine/game';
import { curloLine } from '@/features/curlo/voice';
import { HeartClock } from '@/ui/HeartsChip';
import { useDialog } from '@/ui/overlay/dialogContext';
import { nodePath } from './nodeMeta';
import { StoryBubbles } from './StoryBubbles';

/** Where "earn a heart" / "review" goes (the practice screen reads ?review=1). */
export const REVIEW_PATH = '/practice?review=1';

export function useStartNode() {
  const { game, store } = useGame();
  const dialog = useDialog();

  return useCallback(
    async (n: MapNode): Promise<void> => {
      if (n.kind === 'lesson' || n.kind === 'boss') {
        game.hearts.regen();
        if (store.state.hearts.n <= 0) {
          const read = () => ({ n: store.state.hearts.n, max: store.state.hearts.max, nextIn: game.hearts.nextIn() });
          const v = await dialog.open<'p' | 'w'>({
            title: 'Out of hearts',
            mood: 'worried',
            body: (
              <>
                <p>{curloLine('noHearts')}</p>
                <HeartClock read={read} onTick={() => game.hearts.regen()} />
                <p className="muted small">A quick review earns a heart right away.</p>
              </>
            ),
            buttons: [
              { label: 'Earn a heart', value: 'p', variant: 'teal', icon: 'practice' },
              { label: 'Wait for it', value: 'w', variant: 'ghost' },
            ],
          });
          if (v === 'p') navigate(REVIEW_PATH, { dir: 1 });
          return;
        }
      }
      const w = n.world;
      if (n.kind === 'lesson' && n.i === 0 && !n.done && w.story.intro.length) {
        const go = await dialog.open<boolean>({
          title: `World ${w.num}: ${w.title}`,
          dismissValue: false,
          buttons: [],
          body: (close) => (
            <StoryBubbles lines={w.story.intro} onDone={() => close(true)} onSkip={() => close(true)} curloSize={92} />
          ),
        });
        if (!go) return;
      }
      navigate(nodePath(n), { dir: 'expand', origin: n.id });
    },
    [game, store, dialog],
  );
}
