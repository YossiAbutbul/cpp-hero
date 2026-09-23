import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { GameProvider } from '@/app/GameProvider';
import { CloudProvider } from '@/cloud/CloudProvider';
import '@/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in index.html');

createRoot(root).render(
  <StrictMode>
    <GameProvider>
      <CloudProvider>
        <App />
      </CloudProvider>
    </GameProvider>
  </StrictMode>,
);
