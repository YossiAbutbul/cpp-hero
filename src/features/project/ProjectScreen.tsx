/** Mini-project (#/project/:world, immersive): guided build steps + Stress Test. STUB: Phase B fills it in. */
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { StubScreen } from '@/app/StubScreen';

export function ProjectScreen() {
  const { world = '' } = useParams();
  const { game } = useGame();
  const w = game.index.world[world];
  return (
    <StubScreen
      immersive
      label="Mini-project"
      eyebrow={w ? `World ${w.num} project` : 'Project'}
      title={w?.project.title ?? 'Project not found'}
      todo="Guided build in validated steps, ending with a Stress Test of hostile inputs."
    />
  );
}
