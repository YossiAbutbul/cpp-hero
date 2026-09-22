import { createHashRouter, RouterProvider } from 'react-router-dom';
import { MapScreen } from '@/features/map/MapScreen';
import { UpdatePrompt } from './UpdatePrompt';

/**
 * Hash routing: works from any static host path (GitHub Pages) and offline
 * without server rewrites. Phase B adds lesson / boss / vault / ... routes.
 */
const router = createHashRouter([{ path: '/', element: <MapScreen /> }], {
  future: { v7_relativeSplatPath: true },
});

export function App() {
  return (
    <>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <UpdatePrompt />
    </>
  );
}
