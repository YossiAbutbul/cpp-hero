import { useMatches } from 'react-router-dom';
import type { IconName } from '@/ui/Icon';

export type TabId = 'map' | 'curlo' | 'practice' | 'vault' | 'bestiary';

/** Bottom tab bar, in order (slide direction follows this order). */
export const TABS: readonly { id: TabId; path: string; label: string; icon: IconName }[] = [
  { id: 'map', path: '/', label: 'Map', icon: 'map' },
  { id: 'curlo', path: '/curlo', label: 'Curlo', icon: 'buddy' },
  { id: 'practice', path: '/practice', label: 'Practice', icon: 'practice' },
  { id: 'vault', path: '/vault', label: 'Vault', icon: 'vault' },
  { id: 'bestiary', path: '/bestiary', label: 'Bestiary', icon: 'bug' },
];

export const tabIndex = (id: TabId | undefined) => (id ? TABS.findIndex((t) => t.id === id) : -1);

/** `handle` on each route (see routes.tsx). */
export interface RouteHandle {
  /** which bottom tab is active on this screen */
  tab?: TabId;
  /** header panel toggled by the Stats / Settings buttons */
  panel?: 'stats' | 'settings';
  /** full-screen: hides the header, HUD and tab bar (sessions, onboarding) */
  immersive?: boolean;
}

/** The deepest matched route's handle. */
export function useRouteHandle(): RouteHandle {
  const matches = useMatches();
  return (matches[matches.length - 1]?.handle as RouteHandle | undefined) ?? {};
}
