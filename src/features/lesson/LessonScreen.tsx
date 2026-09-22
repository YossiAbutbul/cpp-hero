/** Lesson session (#/lesson/:id, immersive): concept → demo → challenges → recap. STUB: Phase B fills it in. */
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { StubScreen } from '@/app/StubScreen';

export function LessonScreen() {
  const { id = '' } = useParams();
  const { game } = useGame();
  const lesson = game.index.lesson[id];
  return (
    <StubScreen
      immersive
      label="Lesson"
      eyebrow={`Lesson ${id}`}
      title={lesson?.title ?? 'Lesson not found'}
      todo="Concept with analogy, animated code demo, 3–6 challenges, recap card."
    />
  );
}
