/**
 * Route table (hash routing: works from any static host path and offline).
 * Each screen lives in its own file under src/features/<feature>/ so
 * feature work never touches another feature's files. `handle` drives the
 * shell (see routeMeta.ts): active tab, header panel, immersive chrome.
 */
import { lazy, Suspense } from 'react';
import { createHashRouter, type RouteObject } from 'react-router-dom';
import { BestiaryScreen } from '@/features/bestiary/BestiaryScreen';
import { BossScreen } from '@/features/boss/BossScreen';
import { CurloScreen } from '@/features/curlo/CurloScreen';
import { LessonScreen } from '@/features/lesson/LessonScreen';
import { MapScreen } from '@/features/map/MapScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PracticeScreen } from '@/features/practice/PracticeScreen';
import { ProjectScreen } from '@/features/project/ProjectScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { StatsScreen } from '@/features/stats/StatsScreen';
import { VaultScreen } from '@/features/vault/VaultScreen';
import { AppShell } from './AppShell';
import { bindRouter } from './navigation';
import { NotFound, RouteError } from './RouteError';
import type { RouteHandle } from './routeMeta';

const h = (x: RouteHandle) => x;

// Dev-only component gallery (#/dev/ui); compiled out of production builds.
const UiGallery = import.meta.env.DEV ? lazy(() => import('@/features/dev/UiGallery')) : null;

const children: RouteObject[] = [
  { index: true, element: <MapScreen />, handle: h({ tab: 'map' }) },
  { path: 'curlo', element: <CurloScreen />, handle: h({ tab: 'curlo' }) },
  { path: 'practice', element: <PracticeScreen />, handle: h({ tab: 'practice' }) },
  { path: 'vault', element: <VaultScreen />, handle: h({ tab: 'vault' }) },
  { path: 'bestiary', element: <BestiaryScreen />, handle: h({ tab: 'bestiary' }) },
  { path: 'stats', element: <StatsScreen />, handle: h({ panel: 'stats' }) },
  { path: 'settings', element: <SettingsScreen />, handle: h({ panel: 'settings' }) },
  { path: 'lesson/:id', element: <LessonScreen />, handle: h({ immersive: true, tab: 'map' }) },
  { path: 'project/:world', element: <ProjectScreen />, handle: h({ immersive: true, tab: 'map' }) },
  { path: 'boss/:world', element: <BossScreen />, handle: h({ immersive: true, tab: 'map' }) },
  { path: 'onboarding', element: <OnboardingScreen />, handle: h({ immersive: true }) },
  { path: '*', element: <NotFound />, handle: h({}) },
];
if (UiGallery)
  children.splice(children.length - 1, 0, {
    path: 'dev/ui',
    element: (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    ),
    handle: h({}),
  });

export const router = createHashRouter([{ path: '/', element: <AppShell />, errorElement: <RouteError />, children }], {
  future: { v7_relativeSplatPath: true },
});
bindRouter(router);
