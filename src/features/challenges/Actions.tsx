/**
 * The actions row under a challenge's inputs (Hint + the big Check button).
 * Renderers place <Actions check={…} /> where it belongs; the runner provides
 * the rendering through context (it owns hints and the answer phase).
 */
import { useContext } from 'react';
import { ActionsContext } from './actionsContext';
import type { CheckSpec } from './types';

export function Actions({ check = null }: { check?: CheckSpec | null }) {
  const render = useContext(ActionsContext);
  return <>{render(check)}</>;
}
