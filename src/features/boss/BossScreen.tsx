/** Boss battle (#/boss/:world, immersive): entrance, rounds, defense phase, victory. STUB: Phase B fills it in. */
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { StubScreen } from '@/app/StubScreen';
import { BossArt } from '@/ui/art/Art';

export function BossScreen() {
  const { world = '' } = useParams();
  const { game } = useGame();
  const w = game.index.world[world];
  return (
    <StubScreen
      immersive
      label="Boss battle"
      eyebrow={w ? `World ${w.num} boss` : 'Boss'}
      title={w?.boss.name ?? 'Boss not found'}
      todo="Entrance, HP bar, mixed rounds incl. a timed one, defense phase, victory sequence."
    >
      {w && <BossArt kind={w.boss.art} size={160} style={{ display: 'block', margin: '0 auto' }} />}
    </StubScreen>
  );
}
