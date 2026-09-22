/**
 * Onboarding (#/onboarding, immersive): Curlo intro, name + look, daily
 * goal, optional placement quiz. STUB: Phase B builds it. The shell sends
 * every not-yet-onboarded player here; the button below finishes onboarding
 * so the rest of the app is reachable meanwhile.
 */
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import { StubScreen } from '@/app/StubScreen';
import { Button } from '@/ui/Button';

export function OnboardingScreen() {
  const { update } = useGame();
  return (
    <StubScreen
      immersive
      closable={false}
      label="Welcome"
      eyebrow="Welcome to Cpp Hero"
      title="Meet Curlo"
      todo="Animated intro, name your buddy, pick a look and a daily goal, optional placement quiz."
    >
      <Button
        block
        icon="play"
        onClick={() => {
          update((s) => void (s.profile.onboarded = true));
          navigate('/', { dir: 'fade', replace: true });
        }}
      >
        Start playing
      </Button>
    </StubScreen>
  );
}
