/**
 * PLACEHOLDER map (Phase A): lists the worlds and lessons straight from the
 * YAML content with their lock/done state from the engine, to prove the
 * content → engine → UI pipeline. The real Pop Path map arrives in Phase B.
 */
import { useGame } from '@/app/gameContext';
import './map.css';

export function MapScreen() {
  const { game, store } = useGame();
  const s = store.state;
  const lvl = game.levelInfo();
  const current = game.currentNode();

  return (
    <main className="map-ph">
      <header className="map-ph__top">
        <h1>Cpp Hero</h1>
        <p className="map-ph__hud">
          Level {lvl.level} · {s.xp} XP · {s.hearts.n}/{s.hearts.max} hearts · {s.streak.days}-day streak
        </p>
      </header>
      {game.worlds().map((w) => (
        <section
          key={w.id}
          className={'map-ph__world' + (game.worldUnlocked(w) ? '' : ' is-locked')}
          aria-label={`World ${w.num}`}
        >
          <h2>
            World {w.num}: {w.title}
          </h2>
          <p className="map-ph__blurb">{w.blurb}</p>
          <ol>
            {game.nodes(w).map((n) => (
              <li key={n.id} className={n.done ? 'is-done' : n.open ? 'is-open' : 'is-locked'}>
                <span className="map-ph__state">{n.done ? 'done' : n.open ? 'open' : 'locked'}</span>
                {n.kind === 'lesson' && (
                  <>
                    {n.lesson.title}
                    {n.lesson.shield && <span className="map-ph__badge">Shield</span>}
                    <span className="map-ph__meta">{n.lesson.challenges.length} challenges</span>
                  </>
                )}
                {n.kind === 'project' && <>Project: {w.project.title}</>}
                {n.kind === 'boss' && <>Boss: {w.boss.name}</>}
                {current?.id === n.id && <span className="map-ph__here">you are here</span>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
