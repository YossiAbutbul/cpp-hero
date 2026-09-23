/**
 * One world's winding Pop Path: chunky circular nodes on a dotted trail, the
 * walked part drawn in tangerine. Node x positions are pure CSS
 * (calc(50% + o × min(96px, 27%))) so they are right on the very first
 * frame (the collapse-into-node transition and auto-scroll need that); the
 * SVG trail is drawn from the measured width.
 *
 * The trail remembers (per app session) how far it was drawn, so coming back
 * from a lesson animates only the new segment and pops the new current node.
 */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { MapNode } from '@/engine/game';
import { BossArt } from '@/ui/art/Art';
import { burstAt } from '@/ui/fx/effects';
import { anim, reduced } from '@/ui/fx/motion';
import { nodeKind, nodeTitle } from './nodeMeta';
import styles from './Map.module.css';

const TOP = 84;
const GAP = 118;
const BOTTOM = 86;
const OFFS = [0, -0.72, -0.12, 0.68, 0.82, 0.08, -0.55, -0.8, 0.2];

/** Per app session: how far each world's trail was drawn, and whether the map was shown yet. */
export const mapMemory = { shown: false, lit: new Map<string, number>() };

export type NodeState = 'done' | 'cur' | 'open' | 'lock';

export function nodeState(n: MapNode, cur: MapNode | null): NodeState {
  return n.done ? 'done' : cur?.id === n.id ? 'cur' : n.open ? 'open' : 'lock';
}

/** Index of the last node the trail reaches (done or current), -1 = none. */
export function litIndex(nodes: readonly MapNode[], cur: MapNode | null): number {
  let lit = -1;
  nodes.forEach((n, i) => {
    if (n.done || cur?.id === n.id) lit = i;
  });
  return lit;
}

function curve(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => {
      if (!i) return `M${p.x} ${p.y}`;
      const q = pts[i - 1]!;
      const dy = (p.y - q.y) / 2;
      return `C${q.x} ${q.y + dy} ${p.x} ${p.y - dy} ${p.x} ${p.y}`;
    })
    .join(' ');
}

export interface WorldPathProps {
  worldId: string;
  nodes: MapNode[];
  cur: MapNode | null;
  /** measured width of the path column (0 = not measured yet) */
  width: number;
  /** mirror the zig-zag (alternating worlds) */
  flip: boolean;
  /** first time the map is shown in this app session */
  firstView: boolean;
  bestOf: (lessonId: string) => number | undefined;
  onNode: (n: MapNode, el: HTMLButtonElement) => void;
}

export function WorldPath({ worldId, nodes, cur, width, flip, firstView, bestOf, onNode }: WorldPathProps) {
  const lit = litIndex(nodes, cur);
  const offs = nodes.map((n, i) => (n.kind === 'boss' || i === 0 ? 0 : (OFFS[i % OFFS.length] ?? 0) * (flip ? -1 : 1)));
  const H = TOP + Math.max(0, nodes.length - 1) * GAP + BOTTOM;
  const amp = Math.min(96, width * 0.27);
  const xy = offs.map((o, i) => ({ x: width / 2 + o * amp, y: TOP + i * GAP }));
  const root = useRef<HTMLDivElement>(null);
  const prog = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const before = useRef<SVGPathElement>(null);

  // Draw the newly walked part of the trail, then pop the new current node.
  useLayoutEffect(() => {
    if (!width) return;
    const prev = mapMemory.lit.get(worldId);
    mapMemory.lit.set(worldId, lit);
    if (prev === lit) return;
    const popCur = () => {
      const el = root.current?.querySelector<HTMLElement>('[data-current]');
      if (!el) return;
      void anim(
        el,
        [
          { transform: 'scale(.2)', opacity: 0 },
          { transform: 'scale(1.22)', opacity: 1, offset: 0.6 },
          { transform: 'scale(.94)', offset: 0.8 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 620, rm: 'fade' },
      );
      burstAt(el, { n: 50 });
    };
    if (prev === undefined && !firstView) {
      // a world that just unlocked
      if (lit === 0) window.setTimeout(popCur, 700);
      return;
    }
    const from = prev === undefined ? 0 : prev;
    if (lit <= 0 || lit < from || reduced()) {
      if (prev !== undefined && lit > prev) popCur();
      return;
    }
    const pp = prog.current;
    const gp = glow.current;
    if (!pp?.getTotalLength) return;
    let L = 0;
    let Lp = 0;
    try {
      L = pp.getTotalLength();
      Lp = from > 0 && before.current ? before.current.getTotalLength() : 0;
    } catch {
      return;
    }
    const kf = [{ strokeDashoffset: L - Lp }, { strokeDashoffset: 0 }];
    const o = { duration: prev === undefined ? 1300 : 800, delay: prev === undefined ? 300 : 380, easing: 'cubic-bezier(.3,1.1,.5,1)', fill: 'backwards' as const };
    for (const p of [pp, gp]) if (p) p.style.strokeDasharray = `${L} ${L + 40}`;
    void anim(gp, kf, o);
    void anim(pp, kf, o).then(() => {
      for (const p of [pp, gp]) if (p) p.style.strokeDasharray = '';
      if (prev !== undefined) popCur();
    });
  }, [width, lit, worldId, firstView]);

  return (
    <div ref={root} className={styles.path} style={{ height: H }}>
      {width > 0 && (
        <svg className={styles.lines} viewBox={`0 0 ${width} ${H}`} aria-hidden="true">
          <path className={styles.dots} d={curve(xy)} />
          {lit > 0 && (
            <>
              <path ref={glow} className={styles.glow} d={curve(xy.slice(0, lit + 1))} />
              <path ref={prog} className={styles.prog} d={curve(xy.slice(0, lit + 1))} />
              {(mapMemory.lit.get(worldId) ?? 0) > 0 && (
                <path ref={before} className={styles.ghost} d={curve(xy.slice(0, (mapMemory.lit.get(worldId) ?? 0) + 1))} />
              )}
            </>
          )}
        </svg>
      )}
      {nodes.map((n, i) => {
        const st = nodeState(n, cur);
        const o = offs[i] ?? 0;
        const right = o <= 0.05;
        const off = n.kind === 'boss' ? 62 : st === 'cur' ? 54 : 48;
        const best = n.kind === 'lesson' && n.done ? bestOf(n.id) : undefined;
        const pos = { '--o': o, top: TOP + i * GAP } as CSSProperties;
        const stateTxt = st === 'done' ? 'complete' : st === 'cur' ? 'you are here' : st === 'open' ? 'open' : 'locked';
        const cls = [
          styles.node,
          styles[st],
          n.kind === 'boss' ? styles.boss : '',
          n.kind === 'project' ? styles.proj : '',
          n.kind === 'lesson' && n.lesson.shield ? styles.shield : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={n.id}>
            <button
              type="button"
              className={cls}
              style={pos}
              data-origin-id={n.id}
              data-current={st === 'cur' ? '' : undefined}
              aria-label={`${nodeKind(n)}: ${nodeTitle(n)}, ${stateTxt}${best != null ? `, best ${Math.round(best * 100)}%` : ''}`}
              onClick={(e) => onNode(n, e.currentTarget)}
            >
              <NodeIcon n={n} st={st} />
            </button>
            <div
              className={[styles.label, styles['l_' + st], right ? styles.toRight : styles.toLeft].join(' ')}
              style={{ ...pos, '--off': `${off}px` } as CSSProperties}
              aria-hidden="true"
            >
              <small>
                {nodeKind(n)}
                {n.done && (best != null ? ` · ${Math.round(best * 100)}%` : ' · done')}
              </small>
              {nodeTitle(n)}
            </div>
            {st === 'cur' && (
              <div className={styles.tip} style={{ ...pos, top: TOP + i * GAP - (n.kind === 'boss' ? 62 : 52) }} aria-hidden="true">
                {n.kind === 'boss' ? 'FIGHT!' : 'START'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SVG = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="#fff" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="3" fill="#A89C8C" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#A89C8C" strokeWidth="2.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#fff" />
      <path
        d="M9 7.5Q7 7.5 7.3 10Q7.3 11.3 6 11.8Q7.3 12.3 7.3 13.6Q7 16.2 9 16.2M15 7.5Q17 7.5 16.7 10Q16.7 11.3 18 11.8Q16.7 12.3 16.7 13.6Q17 16.2 15 16.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  project: (
    <>
      <path d="M3 20l3-8 5-5 6 6-5 5z" fill="#FFC62E" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 4l6 6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
    </>
  ),
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function NodeIcon({ n, st }: { n: MapNode; st: NodeState }) {
  if (n.kind === 'boss') {
    return (
      <>
        <BossArt kind={n.world.boss.art} className={styles.bossMini} still={st === 'lock'} />
        {st === 'lock' && (
          <span className={styles.badge}>
            <Svg>{SVG.lock}</Svg>
          </span>
        )}
        {st === 'done' && (
          <span className={styles.badge + ' ' + styles.badgeOk}>
            <Svg>{SVG.check}</Svg>
          </span>
        )}
      </>
    );
  }
  const shield = n.kind === 'lesson' && n.lesson.shield;
  const main =
    st === 'lock' ? SVG.lock : n.kind === 'project' ? SVG.project : st === 'done' ? SVG.check : shield ? SVG.shield : SVG.star;
  return (
    <>
      <Svg>{main}</Svg>
      {shield && (st === 'done' || st === 'lock') && (
        <span className={styles.badge + ' ' + styles.badgeShield}>
          <Svg>{SVG.shield}</Svg>
        </span>
      )}
    </>
  );
}
