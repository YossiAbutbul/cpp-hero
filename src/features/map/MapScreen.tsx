/**
 * PLACEHOLDER map: lists the worlds and nodes straight from the YAML
 * content with their lock/done state. The real Pop Path map (winding path,
 * node sheets, "you are here", parallax) replaces this file.
 *
 * Already wired to the shell's transition system: open nodes expand into
 * their session (navigate(..., { dir: 'expand', origin: el })) and the
 * session collapses back into the same node (data-origin-id = node.id).
 */
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import { toast } from '@/ui/toast';
import { wiggle } from '@/ui/fx/motion';
import { Screen } from '@/ui/Layout';
import type { MapNode } from '@/engine/game';
import './map.css';

function pathFor(n: MapNode): string {
  if (n.kind === 'lesson') return `/lesson/${n.id}`;
  return n.kind === 'project' ? `/project/${n.world.id}` : `/boss/${n.world.id}`;
}

export function MapScreen() {
  const { game } = useGame();
  const current = game.currentNode();

  return (
    <Screen label="World map">
      <h1 className="map-ph__title">Hi, hero!</h1>
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
                <button
                  type="button"
                  className="map-ph__node"
                  data-origin-id={n.id}
                  onClick={(e) => {
                    if (!n.open) {
                      void wiggle(e.currentTarget);
                      toast('Finish the earlier steps first.', { icon: 'lock' });
                      return;
                    }
                    navigate(pathFor(n), { dir: 'expand', origin: e.currentTarget });
                  }}
                >
                  <span className="map-ph__state">{n.done ? 'done' : n.open ? 'open' : 'locked'}</span>
                  {n.kind === 'lesson' && (
                    <>
                      {n.lesson.title}
                      {n.lesson.shield && <span className="map-ph__badge">Shield</span>}
                    </>
                  )}
                  {n.kind === 'project' && <>Project: {w.project.title}</>}
                  {n.kind === 'boss' && <>Boss: {w.boss.name}</>}
                  {current?.id === n.id && <span className="map-ph__here">you are here</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Screen>
  );
}
