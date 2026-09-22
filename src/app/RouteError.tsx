/** Error boundary + 404 screens (never a dead end: always a way back to the map). */
import { useRouteError } from 'react-router-dom';
import { Curlo } from '@/features/curlo/Curlo';
import { Button } from '@/ui/Button';
import { Card, Screen } from '@/ui/Layout';
import { navigate } from './navigation';

function Oops({ title, text }: { title: string; text: string }) {
  return (
    <Screen label={title}>
      <Card className="center">
        <div style={{ width: 110, margin: '0 auto 6px' }}>
          <Curlo mood="worried" />
        </div>
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        <Button onClick={() => navigate('/', { dir: 'fade', replace: true })}>Back to the map</Button>
      </Card>
    </Screen>
  );
}

export function NotFound() {
  return <Oops title="Nothing here" text="This page doesn’t exist (yet)." />;
}

export function RouteError() {
  const err = useRouteError();
  console.error('[route]', err);
  return (
    <div style={{ position: 'relative', height: '100dvh', maxWidth: 480, margin: '0 auto' }}>
      <Oops title="Oops" text="Something went wrong loading this screen." />
    </div>
  );
}
