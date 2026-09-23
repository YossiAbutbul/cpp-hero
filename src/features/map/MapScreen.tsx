/**
 * The Pop Path world map (#/): greeting card with the daily goal, then one
 * winding path per world (lessons → project → boss). Worlds without content
 * yet show as "coming soon".
 *
 * Tapping an open node opens its sheet (what, how long, Start); locked nodes
 * wiggle and say why. Sessions expand from the node and collapse back into
 * it (data-origin-id = node id), so the scroll position is restored
 * synchronously on mount; newly reached nodes pop and the trail draws in.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import type { MapNode } from '@/engine/game';
import { Curlo } from '@/features/curlo/Curlo';
import { curloLine } from '@/features/curlo/voice';
import { WorldIcon } from '@/ui/art/Art';
import { Button } from '@/ui/Button';
import { bounce, reduced, wiggle } from '@/ui/fx/motion';
import { plural } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Card, Eyebrow, Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { NodeSheet } from './NodeSheet';
import { lockedReason, nodeTitle, REVIEW_PATH } from './nodeMeta';
import { mapMemory } from './pathLayout';
import { comingSoon } from './plannedWorlds';
import { useStartNode } from './useStartNode';
import { WorldPath } from './WorldPath';
import styles from './Map.module.css';

export function MapScreen() {
  const { game, store } = useGame();
  const dialog = useDialog();
  const start = useStartNode();
  const s = store.state;
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const p1 = useRef<HTMLDivElement>(null);
  const p2 = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [firstView] = useState(() => !mapMemory.shown);
  const [greet, setGreet] = useState(() => curloLine('greet'));

  const worlds = game.worlds();
  const cur = game.currentNode();
  const soon = useMemo(() => comingSoon(worlds.reduce((m, w) => Math.max(m, w.num), 0)), [worlds]);
  const due = game.srsDue().length;
  const goal = s.profile.dailyGoalMin || 10;
  const mins = Math.floor(s.daily.minutes);

  // Measure the path column (the SVG trail needs pixels).
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scroll: restore where we were (so the collapse lands on the node), then
  // glide to a newly reached node; first visit centers "you are here".
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const target = () => {
      const el = sc.querySelector<HTMLElement>('[data-current]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top - sc.getBoundingClientRect().top + sc.scrollTop;
      return Math.max(0, top - sc.clientHeight / 2 + 40);
    };
    const curId = cur?.id ?? '';
    mapMemory.shown = true;
    if (mapMemory.scroll >= 0) {
      sc.scrollTop = mapMemory.scroll;
      if (mapMemory.cur !== curId) {
        const t = window.setTimeout(() => {
          const y = target();
          if (y == null) return;
          try {
            sc.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
          } catch {
            sc.scrollTop = y;
          }
        }, 520);
        mapMemory.cur = curId;
        return () => window.clearTimeout(t);
      }
    } else {
      const y = target();
      if (y != null) sc.scrollTop = y;
    }
    mapMemory.cur = curId;
    // mount-only: the map re-mounts on every visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parallax + remember the scroll position.
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    let raf = 0;
    const onScroll = () => {
      mapMemory.scroll = sc.scrollTop;
      if (reduced() || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = sc.scrollTop;
        if (p1.current) p1.current.style.transform = `translateY(${y * 0.35}px)`;
        if (p2.current) p2.current.style.transform = `translateY(${y * 0.6}px)`;
      });
    };
    onScroll();
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      sc.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // A world that just unlocked: toast + bounce its banner.
  useLayoutEffect(() => {
    const seen = mapMemory.unlocked;
    const now = worlds.filter((w) => game.worldUnlocked(w)).map((w) => w.id);
    const fresh = mapMemory.shown && seen.size ? now.filter((id) => !seen.has(id)) : [];
    now.forEach((id) => seen.add(id));
    if (!fresh.length) return;
    const t = window.setTimeout(() => {
      toast('New world unlocked!', { icon: 'map' });
      void bounce(document.getElementById(`world-${fresh[0]}`));
    }, 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNode = useCallback(
    (n: MapNode, el: HTMLButtonElement) => {
      if (!n.open) {
        void wiggle(el);
        toast(lockedReason(n, game.worldUnlocked(n.world)), { icon: 'lock' });
        return;
      }
      const sh = dialog.sheet({
        title: nodeTitle(n),
        body: (close) => (
          <NodeSheet
            node={n}
            onStart={() => {
              close();
              window.setTimeout(() => void start(n), 140);
            }}
          />
        ),
      });
      void sh.closed;
    },
    [dialog, game, start],
  );

  const bestOf = useCallback((id: string) => s.lessons[id]?.best, [s]);

  return (
    <Screen label="World map" ref={scroller} className={styles.scroll}>
      <div ref={p1} className={styles.para} aria-hidden="true">
        <div className={styles.blob} style={{ left: -40, top: 360, width: 120, height: 120, background: 'var(--sun-l)' }} />
        <div
          className={styles.blob}
          style={{ right: -30, top: 720, width: 150, height: 150, background: 'var(--teal-l)', animationDelay: '-3s' }}
        />
        <div
          className={styles.blob}
          style={{ left: 20, top: 1260, width: 90, height: 90, background: 'var(--coral-l)', animationDelay: '-5s' }}
        />
        <div
          className={styles.blob}
          style={{ right: 10, top: 1800, width: 110, height: 110, background: 'var(--sun-l)', animationDelay: '-2s' }}
        />
      </div>
      <div ref={p2} className={styles.para} aria-hidden="true">
        <span className={styles.glyph} style={{ right: 18, top: 300 }}>
          {'{ }'}
        </span>
        <span className={styles.glyph} style={{ left: 12, top: 800, animationDelay: '-4s' }}>
          ;
        </span>
        <span className={styles.glyph} style={{ right: 30, top: 1340, animationDelay: '-2s' }}>
          {'<>'}
        </span>
        <span className={styles.glyph} style={{ left: 24, top: 1900, animationDelay: '-6s' }}>
          ::
        </span>
      </div>

      <div ref={inner} className={styles.inner}>
        <Card className={styles.intro}>
          <Eyebrow>
            {s.streak.days ? `${plural(s.streak.days, 'day')} streak` : 'Welcome back'}
          </Eyebrow>
          <h1>Hi, hero!</h1>
          <p className={styles.greet} aria-live="polite">
            <b>{s.profile.name}:</b> <Md text={greet} />
          </p>
          <div
            className={styles.goalbar}
            role="progressbar"
            aria-label="Daily goal"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(mins, goal)}
          >
            <i style={{ '--p': Math.min(1, s.daily.minutes / goal) } as CSSProperties} />
            <span>
              {Math.min(mins, goal)} / {goal} min today
            </span>
          </div>
          {due > 0 && (
            <Button
              variant="sun"
              size="small"
              icon="practice"
              className={styles.reviewBtn}
              onClick={() => navigate(REVIEW_PATH, { dir: 1 })}
            >
              Review {plural(due, 'concept')}
            </Button>
          )}
          <Curlo
            className={styles.mini}
            size={112}
            pokeLabel={`Poke ${s.profile.name}`}
            onPoke={() => setGreet(curloLine('poke'))}
          />
        </Card>

        {worlds.map((w, wi) => {
          const nodes = game.nodes(w);
          const unlocked = game.worldUnlocked(w);
          const doneN = nodes.filter((n) => n.done).length;
          return (
            <section key={w.id} aria-label={`World ${w.num}: ${w.title}`}>
              <div id={`world-${w.id}`} className={[styles.unit, unlocked ? '' : styles.locked].join(' ')}>
                <div className={styles.unitIc} aria-hidden="true">
                  <WorldIcon kind={w.icon || 'star'} />
                </div>
                <div className={styles.unitT}>
                  <small>WORLD {w.num}</small>
                  <b>{w.title}</b>
                </div>
                <span className={styles.unitCount}>
                  {unlocked ? (
                    `${doneN} / ${nodes.length}`
                  ) : (
                    <>
                      <Icon name="lock" /> Locked
                    </>
                  )}
                </span>
              </div>
              {unlocked && w.blurb && (
                <p className={styles.blurb}>
                  <Md text={w.blurb} />
                </p>
              )}
              <WorldPath
                worldId={w.id}
                nodes={nodes}
                cur={cur}
                width={width}
                flip={wi % 2 === 1}
                firstView={firstView}
                bestOf={bestOf}
                onNode={onNode}
              />
            </section>
          );
        })}

        {soon.length > 0 && (
          <div className={styles.soonList}>
            {soon.slice(0, 4).map((p) => (
              <div key={p.num} className={[styles.unit, styles.soon].join(' ')} aria-label={`World ${p.num}: ${p.title}, coming soon`}>
                <div className={styles.unitIc} aria-hidden="true">
                  <WorldIcon kind={p.icon} color="#A89C8C" />
                </div>
                <div className={styles.unitT}>
                  <small>WORLD {p.num}</small>
                  <b>{p.title}</b>
                </div>
                <span className={styles.unitCount}>Soon</span>
              </div>
            ))}
            <Card className={styles.moreCard}>
              <div className={styles.moreIc} aria-hidden="true">
                <WorldIcon kind="castle" color="#A89C8C" />
              </div>
              <div>
                <b>More worlds on the way</b>
                <p className="muted small">
                  Worlds {soon[0]!.num}–{soon[soon.length - 1]!.num} are being forged. Beat every boss to be ready!
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Screen>
  );
}
