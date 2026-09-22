/**
 * Placeholder body for screens that later Phase B agents fill in. Delete
 * the import from your screen once it has real content.
 */
import type { ReactNode } from 'react';
import { Curlo } from '@/features/curlo/Curlo';
import { Button } from '@/ui/Button';
import { Card, Screen, ScreenTitle } from '@/ui/Layout';
import { goBack } from './navigation';

export interface StubScreenProps {
  label: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  /** one line: what this screen will do */
  todo: ReactNode;
  /** immersive screens get safe-area padding… */
  immersive?: boolean;
  /** …and a Close button (default: same as immersive) */
  closable?: boolean;
  children?: ReactNode;
}

export function StubScreen({ label, title, eyebrow, todo, immersive, closable = immersive, children }: StubScreenProps) {
  return (
    <Screen label={label} immersive={immersive}>
      {closable && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <Button variant="ghost" size="small" icon="x" onClick={() => goBack('/', { dir: 'close' })}>
            Close
          </Button>
        </div>
      )}
      <ScreenTitle eyebrow={eyebrow}>{title}</ScreenTitle>
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 64, flex: 'none' }}>
            <Curlo mood="thinking" />
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {todo}
          </p>
        </div>
      </Card>
      {children}
    </Screen>
  );
}
