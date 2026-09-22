import { useSyncExternalStore } from 'react';
import { getContent, subscribeContent, type Content } from './index';

/** The current game content; re-renders when a YAML file is edited in dev. */
export function useContent(): Content {
  return useSyncExternalStore(subscribeContent, getContent, getContent);
}
