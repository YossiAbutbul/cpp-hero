/**
 * CodeDemo state views (fed by demoStates(steps)[i] from src/content/demoState.ts):
 *   VarBoxes   variable boxes ("?" = garbage, wobbling); new/changed boxes pop in,
 *              removed ones (vars: { x: null }) disappear
 *   StackView  call-stack frames (push/pop), top frame first, with its boxes
 *   MemView    memory cells with pointer arrows: reseat animates the arrow, null
 *              shows a ⊘ stub, references are extra name tags on their target,
 *              group cells sit in one strip, dropped cells become ghost slots and
 *              arrows into them turn red + dashed (dangling), readonly = lock.
 *              Cells with `layers` are object cards: linked class parts, base
 *              first; new parts snap on, `cut` parts break off, `hit` glows.
 * A "~" value (box, cell or card field) is a moved-from husk: hollow and faded.
 * Arrows are drawn under the cells and end outside the target cell, so they
 * never cover a name or address label.
 */
import { useId, useLayoutEffect, useRef } from 'react';
import type { DemoFrameState, MemCellState } from '@/content/demoState';
import type { ObjLayer } from '@/content/schema';
import { anim, reduced, SPRING } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import codeStyles from './code.module.css';
import styles from './CodeDemoViews.module.css';

const POP = [
  { transform: 'scale(.4) rotate(-12deg)' },
  { transform: 'scale(1.25) rotate(4deg)' },
  { transform: 'scale(.94)' },
  { transform: 'none' },
];
/** A box whose contents were moved out: a quick squeeze, then it settles hollow. */
const DEFLATE = [
  { transform: 'scale(1.08)', opacity: 1 },
  { transform: 'scale(.82, .7)', opacity: 0.7, offset: 0.45 },
  { transform: 'scale(1.03, .96)', offset: 0.75 },
  { transform: 'none' },
];

/** Value marker for a moved-from object ("husk"): valid but unspecified. */
const HUSK = '~';
const HUSK_LABEL = 'moved-from (valid but unspecified)';
const HuskMark = () => (
  <span className={styles.huskMark} title={HUSK_LABEL}>
    moved
  </span>
);

/* ------------------------------------------------------------------ */

export function VarBoxes({
  vars,
  scramble,
  empty = 'No boxes yet',
}: {
  vars: Record<string, string>;
  scramble?: boolean;
  /** shown when there are no boxes (null = nothing) */
  empty?: string | null;
}) {
  const els = useRef<Record<string, HTMLDivElement | null>>({});
  const prev = useRef<Record<string, string>>({});
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = { ...vars };
    for (const [k, v] of Object.entries(vars)) {
      if (before[k] !== v) void anim(els.current[k] ?? null, v === HUSK ? DEFLATE : POP, { duration: 520 });
    }
  }, [vars]);
  const names = Object.keys(vars);
  if (!names.length) return empty ? <div className={styles.noBoxes}>{empty}</div> : null;
  return (
    <div className={codeStyles.vars} aria-label="Variables">
      {names.map((n) => {
        const v = vars[n] ?? '';
        const garbage = v === '?';
        const husk = v === HUSK;
        const cls = [
          codeStyles.vv,
          garbage ? codeStyles.garbage : husk ? styles.husk : codeStyles.full,
          scramble && !garbage && !husk ? codeStyles.scramble : '',
          v.length > 6 ? styles.long : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={n} className={codeStyles.varbox}>
            <div className={codeStyles.vl}>{n}</div>
            <div
              ref={(el) => {
                els.current[n] = el;
              }}
              className={cls}
              aria-label={`${n} = ${garbage ? 'uninitialized (garbage)' : husk ? HUSK_LABEL : v}`}
            >
              {husk ? <HuskMark /> : v}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function StackView({
  frames,
  returns,
  scramble,
}: {
  frames: DemoFrameState[];
  returns?: string;
  scramble?: boolean;
}) {
  const topEl = useRef<HTMLDivElement>(null);
  const depth = useRef(frames.length);
  useLayoutEffect(() => {
    if (frames.length > depth.current && !reduced())
      void anim(
        topEl.current,
        [
          { transform: 'translateY(-18px) scale(.9)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)', rm: 'fade' },
      );
    depth.current = frames.length;
  }, [frames.length]);
  // The implicit base frame only shows when it holds boxes (or is the only frame).
  const list = frames
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => i > 0 || f.name || Object.keys(f.vars).length > 0 || frames.length === 1)
    .reverse();
  return (
    <div className={styles.stack} aria-label="Call stack">
      {list.map(({ f, i }) => {
        const top = i === frames.length - 1;
        return (
          <div
            key={`${i}:${f.name}`}
            ref={top ? topEl : undefined}
            className={[styles.frame, top ? styles.frameTop : ''].filter(Boolean).join(' ')}
          >
            <div className={styles.frameName}>
              <span>{f.name || 'main'}()</span>
              {top && returns !== undefined && <span className={styles.ret}>↩ {returns}</span>}
            </div>
            <VarBoxes vars={f.vars} scramble={scramble} empty={null} />
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Must match .cut in CodeDemoViews.module.css (the part hangs off, torn away). */
const CUT = { transform: 'translate(10px, 7px) rotate(5deg)', opacity: 0.5 };

/**
 * Object-card layer motion between two steps (layers are matched by position):
 * a new layer snaps onto the one above it (construction order), a layer that
 * becomes `cut` shudders and drops away (slicing / destruction), a newly `hit`
 * layer pulses, and changed field values pop.
 */
function animateLayers(
  card: Element | null,
  before: readonly ObjLayer[],
  after: readonly ObjLayer[],
  delay = 0,
) {
  if (!card) return;
  after.forEach((l, i) => {
    const el = card.querySelector(`[data-layer="${i}"]`);
    const was = before[i]?.class === l.class ? before[i] : undefined;
    if (!was) {
      void anim(
        el,
        [
          { transform: 'translateY(-18px) scale(.86)', opacity: 0 },
          { transform: 'translateY(3px) scale(1.04)', opacity: 1, offset: 0.6 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 520, delay, easing: SPRING, fill: 'backwards', rm: 'fade' },
      );
    } else if (l.cut && !was.cut) {
      void anim(
        el,
        [
          { transform: 'none', opacity: 1 },
          { transform: 'translate(-3px, -2px) rotate(-2deg)', opacity: 1, offset: 0.2 },
          { transform: 'translate(3px, -1px) rotate(2deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(16px, 14px) rotate(9deg)', opacity: 0.4, offset: 0.75 },
          CUT,
        ],
        { duration: 700, delay, easing: 'ease-in-out', fill: 'backwards', rm: 'fade' },
      );
    } else if (l.hit && !was.hit) {
      void anim(el, [{ transform: 'none' }, { transform: 'scale(1.07)' }, { transform: 'none' }], {
        duration: 420,
        delay,
        easing: SPRING,
      });
    } else {
      for (const [k, v] of Object.entries(l.fields ?? {})) {
        if (was.fields?.[k] !== v) {
          const f = el?.querySelector(`[data-field="${CSS.escape(k)}"]`);
          void anim(f, v === HUSK ? DEFLATE : POP, { duration: 480, delay });
        }
      }
    }
  });
}

/** The object's current type: its last layer that isn't cut off. */
const objType = (layers: readonly ObjLayer[]) =>
  [...layers].reverse().find((l) => !l.cut)?.class ?? layers[0]!.class;

function ObjCard({
  layers,
  className,
  title,
}: {
  layers: readonly ObjLayer[];
  className: string;
  title?: string;
}) {
  return (
    <div data-box className={className}>
      <div className={styles.objType}>{title ?? objType(layers)}</div>
      {layers.map((l, i) => (
        <div
          key={i}
          data-layer={i}
          className={[
            styles.layer,
            styles[`layer${Math.min(i, 2)}`],
            l.cut ? styles.cut : '',
            l.hit ? styles.hit : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.layerClass}>
            {l.cut && <span aria-hidden="true">✂ </span>}
            {l.class}
          </span>
          {Object.entries(l.fields ?? {}).map(([k, v]) => (
            <span key={k} className={styles.field}>
              <span className={styles.fieldName}>{k}</span>
              <span
                data-field={k}
                className={[styles.fieldVal, v === '?' ? styles.garbage : v === HUSK ? styles.huskVal : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {v === HUSK ? <HuskMark /> : v}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const describeObj = (layers: readonly ObjLayer[]) =>
  `a ${objType(layers)} object: ` +
  layers
    .map((l) => {
      const f = Object.entries(l.fields ?? {})
        .map(([k, v]) => `${k} ${v === '?' ? 'garbage' : v === HUSK ? HUSK_LABEL : v}`)
        .join(', ');
      return `${l.class} part${f ? ` (${f})` : ''}${l.cut ? ' cut off' : ''}${l.hit ? ', running now' : ''}`;
    })
    .join('; ');

type Slot = { kind: 'cell'; cell: MemCellState } | { kind: 'group'; name: string; cells: MemCellState[] };

function layout(cells: MemCellState[]): Slot[] {
  const out: Slot[] = [];
  const groups = new Map<string, MemCellState[]>();
  for (const c of cells) {
    if (c.ref !== undefined) continue;
    if (c.group) {
      const g = groups.get(c.group);
      if (g) g.push(c);
      else {
        const arr = [c];
        groups.set(c.group, arr);
        out.push({ kind: 'group', name: c.group, cells: arr });
      }
    } else out.push({ kind: 'cell', cell: c });
  }
  return out;
}

export function MemView({ cells, scramble }: { cells: MemCellState[]; scramble?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const prev = useRef(new Map<string, MemCellState>());
  const refs = cells.filter((c) => c.ref !== undefined);
  const byName = new Map(cells.map((c) => [c.name, c]));
  const slots = layout(cells);
  const pointers = cells.filter(
    (c) => !c.dropped && typeof c.ptr === 'string' && byName.get(c.ptr)?.ref === undefined,
  );

  // Draw / move arrows (DOM only; runs after every render and on resize).
  useLayoutEffect(() => {
    const h = host.current;
    const s = svg.current;
    if (!h || !s) return;
    const draw = () => {
      const hr = h.getBoundingClientRect();
      s.setAttribute('width', String(hr.width));
      s.setAttribute('height', String(hr.height));
      s.querySelectorAll<SVGPathElement>('path[data-from]').forEach((p) => {
        const fromCell = h.querySelector(`[data-cell="${CSS.escape(p.dataset.from!)}"]`);
        const from = fromCell?.querySelector('[data-box]');
        const toCell = h.querySelector(`[data-cell="${CSS.escape(p.dataset.to!)}"]`);
        const to = toCell?.querySelector('[data-box]');
        if (!fromCell || !from || !toCell || !to) return;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const fc = fromCell.getBoundingClientRect();
        const tc = toCell.getBoundingClientRect();
        // Start at the pointer's dot. End outside the whole target cell (past its
        // name tags / address label), never on a label: the arrows are drawn
        // under the cells and labels have a solid backing, so text stays readable.
        const x1 = a.left + a.width / 2 - hr.left;
        const y1 = a.top + a.height / 2 - hr.top;
        // same row = the two cells overlap vertically (an object card is taller than a box)
        const sameRow = fc.top < tc.bottom - 4 && tc.top < fc.bottom - 4;
        const x2 = b.left + b.width / 2 - hr.left;
        const y2 = sameRow || tc.bottom < fc.top ? tc.bottom - hr.top + 2 : tc.top - hr.top - 2;
        const dip = sameRow ? 40 + Math.min(20, Math.abs(x2 - x1) / 8) : 0;
        const d = sameRow
          ? `M ${x1} ${y1} C ${x1} ${y1 + dip}, ${x2} ${y2 + dip}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
        p.setAttribute('d', d);
        p.style.setProperty('d', `path('${d}')`);
      });
    };
    draw();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    ro?.observe(h);
    return () => ro?.disconnect();
  });

  // Pop in new cells, crumble dropped ones.
  useLayoutEffect(() => {
    const h = host.current;
    const before = prev.current;
    const next = new Map<string, MemCellState>();
    for (const c of cells) {
      next.set(c.name, c);
      const p = before.get(c.name);
      const el = h?.querySelector(`[data-cell="${CSS.escape(c.name)}"] [data-box]`) ?? null;
      if (p && c.layers && p.layers && !c.dropped) animateLayers(el, p.layers, c.layers);
      else if (!p || p.value !== c.value || p.ptr !== c.ptr || !p.layers !== !c.layers) {
        if (!c.dropped) {
          void anim(el, c.value === HUSK ? DEFLATE : POP, { duration: 480 });
          // a card that arrives with parts already cut (a sliced copy): show them breaking off
          if (c.layers?.some((l) => l.cut))
            animateLayers(
              el,
              c.layers.map((l) => ({ ...l, cut: false })),
              c.layers,
              380,
            );
        }
      } else if (c.dropped && !p.dropped && !reduced()) {
        void anim(
          el,
          [
            { transform: 'none', opacity: 1 },
            { transform: 'rotate(-6deg) scale(1.08)', opacity: 1, offset: 0.3 },
            { transform: 'translateY(6px) scale(.9)', opacity: 0.45 },
          ],
          { duration: 420, easing: 'ease-in', rm: 'fade' },
        );
      }
    }
    prev.current = next;
  }, [cells]);

  const cellEl = (c: MemCellState) => {
    const isPtr = c.ptr !== undefined;
    // a reference whose lifetime ended is just a name that no longer exists
    const tags = refs.filter((r) => r.ref === c.name && !r.dropped);
    const garbage = c.value === '?';
    const husk = c.value === HUSK;
    const boxCls = [
      c.layers ? styles.obj : styles.box,
      isPtr ? styles.ptrBox : '',
      c.dropped ? styles.ghost : garbage ? styles.garbage : husk ? styles.huskBox : '',
      scramble && !c.dropped ? styles.scramble : '',
      c.dangling ? styles.danglingBox : '',
    ]
      .filter(Boolean)
      .join(' ');
    const label =
      `${c.name}${tags.length ? ` (also ${tags.map((t) => t.name).join(', ')})` : ''}: ` +
      (c.dropped
        ? 'gone'
        : c.layers
          ? describeObj(c.layers)
          : husk
            ? HUSK_LABEL
            : isPtr
              ? c.ptr === null
                ? 'nullptr'
                : `points to ${c.ptr}${c.dangling ? ' (dangling)' : ''}`
              : garbage
                ? 'garbage'
                : (c.value ?? ''));
    return (
      <div key={c.name} className={styles.cell} data-cell={c.name} role="img" aria-label={label}>
        <div className={styles.names}>
          <span className={styles.name}>
            {c.readonly && <Icon name="lock" />}
            {c.name}
          </span>
          {tags.map((t) => (
            <span key={t.name} className={styles.refTag} title="reference: another name">
              {t.readonly && <Icon name="lock" />}
              {t.name}
            </span>
          ))}
        </div>
        {c.layers ? (
          <ObjCard layers={c.layers} className={boxCls} title={c.dropped ? 'gone' : undefined} />
        ) : (
          <div data-box className={boxCls}>
            {c.dropped ? (
              <span className={styles.gone}>gone</span>
            ) : isPtr ? (
              c.ptr === null ? (
                <span className={styles.null}>⊘</span>
              ) : (
                <span className={styles.dot} />
              )
            ) : husk ? (
              <HuskMark />
            ) : (
              (c.value ?? '')
            )}
          </div>
        )}
        {c.addr && <div className={styles.addr}>{c.addr}</div>}
      </div>
    );
  };

  return (
    <div className={styles.mem}>
      <div className={styles.memLabel}>Memory</div>
      <div
        ref={host}
        className={[styles.memHost, pointers.length ? styles.withArrows : ''].filter(Boolean).join(' ')}
      >
        <div className={styles.cells}>
          {slots.length === 0 && <div className={styles.noBoxes}>Nothing in memory yet</div>}
          {slots.map((s) =>
            s.kind === 'cell' ? (
              cellEl(s.cell)
            ) : (
              <div
                key={`g:${s.name}`}
                className={styles.strip}
                aria-label={`${s.name} (side by side in memory)`}
              >
                {s.cells.map(cellEl)}
              </div>
            ),
          )}
        </div>
        <svg ref={svg} className={styles.arrows} aria-hidden="true">
          <defs>
            <marker
              id={`ah${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className={styles.head} />
            </marker>
            <marker
              id={`ahd${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className={styles.headBad} />
            </marker>
          </defs>
          {pointers.map((c) => (
            <path
              key={c.name}
              data-from={c.name}
              data-to={c.ptr!}
              className={[styles.arrow, c.dangling ? styles.dangling : '', c.readonly ? styles.ro : '']
                .filter(Boolean)
                .join(' ')}
              markerEnd={`url(#${c.dangling ? 'ahd' : 'ah'}${uid})`}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
