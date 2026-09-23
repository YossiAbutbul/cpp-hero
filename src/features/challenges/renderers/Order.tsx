/**
 * order: drag & drop with a lifted ghost + FLIP reflow + snap bounce, plus
 * tap (swap two lines / move between bank and program) and keyboard
 * (Enter/Space = tap, ArrowUp/Down = move the focused line).
 */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ChallengeOf } from '@/content/schema';
import { tokLine } from '@/features/code';
import { Icon } from '@/ui/Icon';
import { anim, reduced, SPRING } from '@/ui/fx/motion';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';
import codeStyles from '@/features/code/code.module.css';

interface Item {
  id: number;
  t: string;
  real: boolean;
}

function shuffleItems(c: ChallengeOf<'order'>, hasBank: boolean): Item[] {
  const all: Item[] = [
    ...c.lines.map((t, i) => ({ id: i, t, real: true })),
    ...(c.distractors ?? []).map((t, i) => ({ id: 1000 + i, t, real: false })),
  ];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  if (!hasBank && all.length > 1 && all.every((x, i) => x.t === c.lines[i])) all.push(all.shift()!);
  return all;
}

function LineCode({ text }: { text: string }) {
  const toks = tokLine(text);
  return (
    <>
      {toks.map((tk, k) =>
        tk.t === 'ws' || tk.t === 'id' || tk.t === 'lead' || tk.t === 'blank' ? (
          tk.v
        ) : (
          <span key={k} className={codeStyles['t-' + tk.t]}>
            {tk.v}
          </span>
        ),
      )}
      {!text && ' '}
    </>
  );
}

interface Drag {
  id: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  started: boolean;
  ghost: HTMLElement | null;
}

export function Order({ ch, phase, reveal, submit, actions }: RendererProps) {
  const c = ch as ChallengeOf<'order'>;
  const hasBank = (c.distractors ?? []).length > 0;
  const [items] = useState(() => shuffleItems(c, hasBank));
  const byId = (id: number) => items.find((x) => x.id === id)!;
  const [prog, setProg] = useState<number[]>(() => (hasBank ? [] : items.map((x) => x.id)));
  const [bank, setBank] = useState<number[]>(() => (hasBank ? items.map((x) => x.id) : []));
  const [sel, setSel] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [live, setLive] = useState('');
  const locked = phase !== 'answer';

  const els = useRef(new Map<number, HTMLLIElement>());
  const before = useRef<Map<number, DOMRect> | null>(null);
  const snapIds = useRef<number[]>([]);
  const progEl = useRef<HTMLOListElement>(null);
  const bankEl = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const state = useRef({ prog, bank });
  useEffect(() => {
    state.current = { prog, bank };
  });

  /** Record positions before a reorder (FLIP "first"). */
  const snapshot = () => {
    const m = new Map<number, DOMRect>();
    els.current.forEach((el, id) => m.set(id, el.getBoundingClientRect()));
    before.current = m;
  };
  const snapTile = (id: number) => snapIds.current.push(id);

  useLayoutEffect(() => {
    const b = before.current;
    before.current = null;
    const snaps = snapIds.current.splice(0);
    if (reduced()) return;
    if (b)
      els.current.forEach((el, id) => {
        const a = b.get(id);
        if (!a || id === drag.current?.id) return;
        const r = el.getBoundingClientRect();
        const dx = a.left - r.left;
        const dy = a.top - r.top;
        if (dx || dy)
          void anim(el, [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], {
            duration: 260,
            easing: SPRING,
          });
      });
    snaps.forEach((id) => {
      const el = els.current.get(id);
      if (el)
        void anim(el, [{ transform: 'scale(.94)' }, { transform: 'scale(1.05)' }, { transform: 'none' }], {
          duration: 300,
          easing: SPRING,
        });
    });
  }, [prog, bank]);

  const say = (t: string) => {
    setLive('');
    window.setTimeout(() => setLive(t), 30);
  };

  const tap = (id: number) => {
    if (locked) return;
    const { prog: p, bank: bk } = state.current;
    if (hasBank) {
      snapshot();
      snapTile(id);
      if (bk.includes(id)) {
        setBank(bk.filter((x) => x !== id));
        setProg([...p, id]);
        say(`Added at position ${p.length + 1}`);
      } else {
        setProg(p.filter((x) => x !== id));
        setBank([...bk, id]);
        say('Returned to the bank');
      }
      return;
    }
    if (sel == null) {
      setSel(id);
      say('Selected. Tap another line to swap.');
      return;
    }
    if (sel === id) {
      setSel(null);
      return;
    }
    snapshot();
    snapTile(sel);
    snapTile(id);
    const a = p.indexOf(sel);
    const b2 = p.indexOf(id);
    const next = p.slice();
    next[a] = id;
    next[b2] = sel;
    setProg(next);
    setSel(null);
    say('Swapped.');
  };

  const onKey = (e: React.KeyboardEvent, id: number) => {
    if (locked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap(id);
      return;
    }
    const p = state.current.prog;
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && p.includes(id)) {
      e.preventDefault();
      const i = p.indexOf(id);
      const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
      if (j < 0 || j >= p.length) return;
      snapshot();
      snapTile(id);
      const next = p.slice();
      next.splice(i, 1);
      next.splice(j, 0, id);
      setProg(next);
      say(`Moved to position ${j + 1}`);
      requestAnimationFrame(() => els.current.get(id)?.focus());
    }
  };

  /* ---------- pointer drag ---------- */
  const moveTo = (id: number, x: number, y: number) => {
    const { prog: p, bank: bk } = state.current;
    const br = bankEl.current?.getBoundingClientRect();
    const pr = progEl.current?.getBoundingClientRect();
    const inBank = !!br && y > br.top - 10 && y < br.bottom + 30 && x > br.left - 30 && x < br.right + 30;
    if (inBank) {
      if (!bk.includes(id)) {
        snapshot();
        setProg(p.filter((v) => v !== id));
        setBank([...bk, id]);
      }
      return;
    }
    if (hasBank && pr && y > pr.bottom + 60) return;
    const others = p.filter((v) => v !== id);
    let at = others.length;
    for (let i = 0; i < others.length; i++) {
      const r = els.current.get(others[i]!)?.getBoundingClientRect();
      if (r && y < r.top + r.height / 2) {
        at = i;
        break;
      }
    }
    const next = others.slice();
    next.splice(at, 0, id);
    if (next.join() === p.join()) return;
    snapshot();
    setProg(next);
    if (bk.includes(id)) setBank(bk.filter((v) => v !== id));
  };

  const endDrag = (cancelled: boolean) => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.started) {
      if (!cancelled) tap(d.id);
      return;
    }
    const el = els.current.get(d.id);
    const g = d.ghost;
    const done = () => {
      g?.remove();
      setDragId(null);
      snapIds.current.push(d.id);
      // re-render to play the snap
      setProg((p) => p.slice());
      const inProg = state.current.prog.includes(d.id);
      say(inProg ? `Dropped at position ${state.current.prog.indexOf(d.id) + 1}` : 'Returned to the bank');
    };
    if (g && el && !reduced()) {
      const r = el.getBoundingClientRect();
      g.style.transition = 'left .18s cubic-bezier(.34,1.56,.64,1), top .18s cubic-bezier(.34,1.56,.64,1), transform .18s';
      g.style.left = `${r.left}px`;
      g.style.top = `${r.top}px`;
      g.style.transform = 'none';
      window.setTimeout(done, 190);
    } else done();
  };
  const onUp = () => endDrag(false);
  const onCancel = () => endDrag(true);
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.started) {
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 7) return;
      const el = els.current.get(d.id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      d.started = true;
      d.dx = e.clientX - r.left;
      d.dy = e.clientY - r.top;
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.classList.add(styles.dragGhost!);
      ghost.removeAttribute('id');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.width = `${r.width}px`;
      ghost.style.left = `${r.left}px`;
      ghost.style.top = `${r.top}px`;
      document.body.appendChild(ghost);
      d.ghost = ghost;
      setSel(null);
      setDragId(d.id);
    }
    e.preventDefault();
    if (d.ghost) {
      d.ghost.style.left = `${e.clientX - d.dx}px`;
      d.ghost.style.top = `${e.clientY - d.dy}px`;
    }
    moveTo(d.id, e.clientX, e.clientY);
  };
  const onDown = (e: RPointerEvent, id: number) => {
    if (locked || (e.button != null && e.button !== 0)) return;
    drag.current = { id, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, started: false, ghost: null };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
  };
  useEffect(
    () => () => {
      drag.current?.ghost?.remove();
    },
    [],
  );

  const check = () => {
    if (locked) return;
    const got = prog.map((id) => byId(id).t.trim());
    const want = c.lines.map((l) => l.trim());
    const good = got.length === want.length && got.every((t, i) => t === want[i]);
    const inPlace = got.filter((t, i) => want[i] != null && t === want[i]).length;
    setSel(null);
    submit({
      correct: good,
      anchor: progEl.current,
      softMsg: `${inPlace} of ${want.length} lines are in the right spot${hasBank && got.length !== want.length ? ', and the line count is off.' : '.'}`,
      detail: (
        <div className={styles.accepted}>
          <b>Correct order:</b>
          <ol className={styles.ansLines}>
            {want.map((l, i) => (
              <li key={i}>
                <code className="i">{l}</code>
              </li>
            ))}
          </ol>
          {hasBank && (
            <span className="muted small">
              Not needed:{' '}
              {(c.distractors ?? []).map((d, i) => (
                <code key={i} className="i">
                  {d.trim()}
                </code>
              ))}
            </span>
          )}
        </div>
      ),
    });
  };

  const tile = (id: number, pos: number | null) => {
    const it = byId(id);
    const ok = reveal && pos != null ? c.lines[pos]?.trim() === it.t.trim() : null;
    const cls = [
      styles.tile,
      sel === id ? styles.tileSel : '',
      dragId === id ? styles.dragSrc : '',
      ok === true ? styles.tileOk : ok === false ? styles.tileBad : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <li
        key={id}
        ref={(el) => {
          if (el) els.current.set(id, el);
          else els.current.delete(id);
        }}
        className={cls}
        tabIndex={locked ? -1 : 0}
        aria-label={`${it.t.trim() || 'blank line'}${ok === true ? ' (correct position)' : ok === false ? ' (wrong position)' : ''}`}
        aria-selected={sel === id || undefined}
        onPointerDown={(e) => onDown(e, id)}
        onKeyDown={(e) => onKey(e, id)}
      >
        <span className={styles.grip} aria-hidden="true">
          <Icon name="grip" />
        </span>
        <span className={styles.tcode}>
          <LineCode text={it.t} />
        </span>
        <span className={styles.tmark}>{ok != null && <Icon name={ok ? 'ok' : 'no'} />}</span>
      </li>
    );
  };

  return (
    <div className={styles.order}>
      <div className={styles.zoneLabel}>Your program</div>
      <ol
        ref={progEl}
        className={[styles.zone, styles.prog, hasBank && !prog.length ? styles.empty : ''].filter(Boolean).join(' ')}
        aria-label="Your program (ordered)"
      >
        {prog.map((id, i) => tile(id, i))}
      </ol>
      {hasBank && (
        <>
          <div className={styles.zoneLabel}>Line bank</div>
          <div ref={bankEl} className={`${styles.zone} ${styles.bank}`} role="list" aria-label="Line bank">
            {bank.map((id) => tile(id, null))}
          </div>
        </>
      )}
      <p className={`${styles.subprompt} small muted`}>
        {hasBank
          ? 'Tap lines to add them in order (tap again to remove). Drag to reorder. Not every line belongs!'
          : 'Drag lines to reorder them, or tap two lines to swap. Keyboard: arrow keys move the focused line.'}
      </p>
      <div className="sr" aria-live="assertive">
        {live}
      </div>
      {actions({ disabled: prog.length === 0, onClick: check })}
    </div>
  );
}
