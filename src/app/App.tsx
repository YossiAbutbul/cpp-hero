import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

/** Root component: the hash router (routes.tsx) renders <AppShell/> and the screens. */
export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
