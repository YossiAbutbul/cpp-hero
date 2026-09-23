import { useRef } from 'react';
import { goBack } from '@/app/navigation';
import { useDialog } from '@/ui/overlay/dialogContext';

/** "Leave this lesson?" confirm, then back to the map. Returns the ask function. */
export function useQuit(noun: string, onQuit?: () => void) {
  const dialog = useDialog();
  const asking = useRef(false);
  return async () => {
    if (asking.current) return;
    asking.current = true;
    const yes = await dialog.confirm({
      title: `Leave this ${noun}?`,
      body: `Your progress in this ${noun} won’t be saved.`,
      yes: 'Leave',
      no: 'Keep going',
      danger: true,
    });
    asking.current = false;
    if (!yes) return;
    onQuit?.();
    goBack('/', { dir: 'close' });
  };
}
