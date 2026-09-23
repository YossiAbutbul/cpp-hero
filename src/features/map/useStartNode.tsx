/**
 * Starting a map node: the world's story intro before its first lesson, then
 * the session expands from the node (data-origin-id = node id, so it
 * collapses back into it on exit).
 */
import { useCallback } from 'react';
import { navigate } from '@/app/navigation';
import type { MapNode } from '@/engine/game';
import { useDialog } from '@/ui/overlay/dialogContext';
import { nodePath } from './nodeMeta';
import { StoryBubbles } from './StoryBubbles';

export function useStartNode() {
  const dialog = useDialog();

  return useCallback(
    async (n: MapNode): Promise<void> => {
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
    [dialog],
  );
}
