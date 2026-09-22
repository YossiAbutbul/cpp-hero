/** Bottom-sheet body for a tapped map node: what it is, how long, and Start. */
import { useGame } from '@/app/gameContext';
import type { MapNode } from '@/engine/game';
import { BossArt } from '@/ui/art/Art';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Md } from '@/ui/Md';
import { plural } from '@/ui/format';
import { lessonMinutes, SKILL_COLORS, SKILL_NAMES } from './nodeMeta';
import styles from './Map.module.css';

export function NodeSheet({ node: n, onStart }: { node: MapNode; onStart: () => void }) {
  const { store } = useGame();
  const s = store.state;

  if (n.kind === 'lesson') {
    const l = n.lesson;
    const skill = l.shield ? 'defense' : l.skill;
    const rec = s.lessons[l.id];
    return (
      <div className={styles.sheet}>
        <div className={styles.tags}>
          <span className={styles.pill} style={{ background: SKILL_COLORS[skill] }}>
            {SKILL_NAMES[skill]}
          </span>
          {l.shield && (
            <span className={styles.shieldTag}>
              <Icon name="shield" /> Shield lesson
            </span>
          )}
          <span className={styles.kindTag}>Lesson {n.i + 1}</span>
        </div>
        <p className={styles.short}>
          <Md text={l.concept.short} />
        </p>
        <p className={styles.facts}>
          <span>
            <Icon name="target" /> {plural(l.challenges.length, 'challenge')}
          </span>
          <span>
            <Icon name="clock" /> about {lessonMinutes(n)} min
          </span>
          {rec?.done && (
            <span>
              <Icon name="star" /> best {Math.round((rec.best ?? 0) * 100)}%
            </span>
          )}
        </p>
        <Button block icon={n.done ? 'retype' : 'play'} variant={n.done ? 'teal' : 'primary'} onClick={onStart} data-autofocus>
          {n.done ? 'Play again' : 'Start'}
        </Button>
      </div>
    );
  }

  if (n.kind === 'project') {
    const p = n.world.project;
    return (
      <div className={styles.sheet}>
        <div className={styles.tags}>
          <span className={styles.pill} style={{ background: 'var(--sun-d)' }}>
            Mini-project
          </span>
        </div>
        <p className={styles.short}>
          <Md text={p.intro} />
        </p>
        <p className={styles.facts}>
          <span>
            <Icon name="project" /> {plural(p.steps.length, 'build step')}
          </span>
          <span>
            <Icon name="swords" /> Stress Test: {plural(p.stress.attacks.length, 'attack')}
          </span>
        </p>
        <Button block icon={n.done ? 'retype' : 'play'} variant={n.done ? 'teal' : 'primary'} onClick={onStart} data-autofocus>
          {n.done ? 'Build again' : s.projects[p.id]?.step ? `Resume at step ${(s.projects[p.id]?.step ?? 0) + 1}` : 'Start building'}
        </Button>
      </div>
    );
  }

  const b = n.world.boss;
  return (
    <div className={styles.sheet}>
      <div className={styles.bossArt}>
        <BossArt kind={b.art} size={132} />
      </div>
      <p className={styles.short}>
        <b>{b.name}:</b> <Md text={b.intro} />
      </p>
      <p className={styles.facts}>
        <span>
          <Icon name="heart" /> {b.hp} HP
        </span>
        <span>
          <Icon name="shield" /> Defense Phase
        </span>
        <span>
          <Icon name="warn" /> misses cost hearts
        </span>
      </p>
      <Button block variant="coral" icon="swords" onClick={onStart} data-autofocus>
        {n.done ? 'Rematch' : 'Fight!'}
      </Button>
    </div>
  );
}
