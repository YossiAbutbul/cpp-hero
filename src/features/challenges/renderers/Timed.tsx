/**
 * Timed rounds: safe (Safe / Unsafe? per snippet) and speed (quick mini-MCQs).
 * Start card → countdown bar → one card at a time with a stamp → summary.
 * Pass = at least 2/3 right. The timer pauses while the tab is hidden.
 * No hints and no retry (the runner enforces that for timed types).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChallengeOf, SafeItem, SpeedItem } from '@/content/schema';
import { CodeBlock } from '@/features/code';
import { Button } from '@/ui/Button';
import { burstAt } from '@/ui/fx/effects';
import { anim, EASE_OUT, popIn, reduced, shake } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { Md } from '@/ui/Md';
import { overlayCount } from '@/ui/overlay/overlay';
import { Actions } from '../Actions';
import type { RendererProps } from '../types';
import styles from '../challenges.module.css';

interface Ans {
  k: number;
  good: boolean;
}

interface TimedCfg<I> {
  items: readonly I[];
  seconds: number;
  help: string;
  key: (e: KeyboardEvent) => number | null;
  card: (it: I, choose: (k: number) => void, disabled: boolean) => ReactNode;
  isRight: (it: I, k: number) => boolean;
  recap: (it: I, a: Ans | undefined) => ReactNode;
}

function TimedRound<I>({ cfg, phase, submit }: { cfg: TimedCfg<I> } & Pick<RendererProps, 'phase' | 'submit'>) {
  const { items, seconds } = cfg;
  const total = items.length;
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(Ans | undefined)[]>([]);
  const [left, setLeft] = useState(seconds * 1000);
  const [over, setOver] = useState<null | { timeout: boolean; right: number }>(null);
  const [stamp, setStamp] = useState<Ans | null>(null);
  const cardEl = useRef<HTMLDivElement>(null);
  const stampEl = useRef<HTMLDivElement>(null);
  const wrapEl = useRef<HTMLDivElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);
  const live = useRef({ i: 0, answers: [] as (Ans | undefined)[], locked: false, over: false });

  const finish = (timeout: boolean) => {
    const L = live.current;
    if (L.over) return;
    L.over = true;
    const right = L.answers.filter((a) => a?.good).length;
    const need = Math.ceil((total * 2) / 3);
    const pass = right >= need;
    setOver({ timeout, right });
    const snapshot = L.answers.slice();
    submit({
      correct: pass,
      score: total ? right / total : 0,
      right,
      total,
      anchor: wrapEl,
      detail: (
        <>
          <ul className={styles.why}>
            {items.map((it, k) => {
              const a = snapshot[k];
              const ok = !!a?.good;
              return (
                <li key={k} className={ok ? styles.yes : styles.nope}>
                  <Icon name={ok ? 'ok' : 'no'} />
                  <div>{cfg.recap(it, a)}</div>
                </li>
              );
            })}
          </ul>
          {!pass && <p className="small muted">Get at least {need} right to pass the round.</p>}
        </>
      ),
    });
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  // countdown
  useEffect(() => {
    if (!started || over) return;
    let last = Date.now();
    let paused = document.visibilityState === 'hidden';
    const vis = () => {
      paused = document.visibilityState === 'hidden';
      last = Date.now();
    };
    const id = window.setInterval(() => {
      if (paused) return;
      const now = Date.now();
      const dt = now - last;
      last = now;
      setLeft((l) => {
        const n = l - dt;
        if (n <= 0) window.setTimeout(() => finishRef.current(true), 0);
        return Math.max(0, n);
      });
    }, 100);
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [started, over]);

  const choose = (k: number) => {
    const L = live.current;
    if (L.over || L.locked || !started) return;
    const it = items[L.i];
    if (!it) return;
    L.locked = true;
    const good = cfg.isRight(it, k);
    const a = { k, good };
    L.answers[L.i] = a;
    setAnswers(L.answers.slice());
    setStamp(a);
    window.setTimeout(
      () => {
        L.locked = false;
        L.i++;
        setStamp(null);
        setI(L.i);
        if (L.i >= total) finishRef.current(false);
      },
      reduced() ? 250 : 480,
    );
  };
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });

  // stamp fx
  useEffect(() => {
    if (!stamp) return;
    popIn(stampEl.current);
    if (stamp.good) burstAt(stampEl.current, { n: 24 });
    else shake(cardEl.current, 6);
  }, [stamp]);

  // card entrance + focus the first choice
  useEffect(() => {
    if (!started || over) return;
    const el = cardEl.current;
    void anim(
      el,
      [
        { transform: 'translateX(60px) rotate(3deg)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 260, easing: EASE_OUT, rm: 'fade' },
    );
    el?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [i, started, over]);

  // keyboard
  useEffect(() => {
    if (!started || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || overlayCount() > 0) return;
      const k = cfg.key(e);
      if (k != null) {
        e.preventDefault();
        chooseRef.current(k);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [started, over, cfg]);

  useEffect(() => {
    const t = window.setTimeout(() => startBtn.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, []);

  const p = Math.max(0, left / (seconds * 1000));
  const secs = Math.max(0, Math.ceil(left / 1000));
  const it = items[i];
  const done = !!over || phase !== 'answer';

  return (
    <div className={styles.timed}>
      <div
        className={[styles.timer, p < 0.25 ? styles.low : ''].filter(Boolean).join(' ')}
        role="timer"
        aria-label={`${secs} seconds left`}
      >
        <div className={styles.tfill} style={{ transform: `scaleX(${p})` }} />
        <span className={styles.tnum}>{secs}s</span>
      </div>
      <div className={styles.tcount} aria-live="polite">
        {over ? `${over.right} / ${total} right` : `${Math.min(i, total)} / ${total}`}
      </div>
      <div ref={wrapEl} className={styles.tcardWrap}>
        {!started ? (
          <div className={styles.tstart}>
            <p>
              <b>
                {total} quick questions, {seconds} seconds.
              </b>
              <br />
              {cfg.help}
            </p>
            <Button ref={startBtn} variant="sun" icon="bolt" onClick={() => setStarted(true)}>
              Start!
            </Button>
          </div>
        ) : done ? (
          <div className={styles.tdone}>
            <Icon name={over?.timeout ? 'clock' : 'bolt'} />
            <b>{over?.timeout ? 'Time!' : 'Done!'}</b> {over?.right ?? answers.filter((a) => a?.good).length} / {total}{' '}
            right
          </div>
        ) : it ? (
          <div ref={cardEl} key={i} className={styles.tcard}>
            {cfg.card(it, choose, !!stamp)}
            {stamp && (
              <div
                ref={stampEl}
                className={`${styles.stamp} ${stamp.good ? styles.stampOk : styles.stampBad}`}
                role="status"
              >
                <Icon name={stamp.good ? 'ok' : 'no'} />
                <span>{stamp.good ? 'Right' : 'Wrong'}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const oneLine = (code: string) =>
  code
    .split('\n')
    .map((s) => s.trim())
    .join(' ');

const SAFE_KEY = (e: KeyboardEvent) => {
  const k = e.key.toLowerCase();
  return k === 's' || k === 'arrowleft' ? 1 : k === 'u' || k === 'arrowright' ? 0 : null;
};
const SPEED_KEY = (e: KeyboardEvent) => (/^[1-8]$/.test(e.key) ? Number(e.key) - 1 : null);

export function Safe({ ch, phase, submit }: RendererProps) {
  const c = ch as ChallengeOf<'safe'>;
  const [cfg] = useState<TimedCfg<SafeItem>>(() => ({
    items: c.items,
    seconds: c.seconds || 30,
    help: 'Is each snippet safe or unsafe? Keys: S = safe, U = unsafe.',
    key: SAFE_KEY,
    card: (it, choose, disabled) => (
      <>
        <CodeBlock code={it.code} label="Snippet" />
        <div className={styles.suBtns}>
          <Button variant="teal" icon="shield" disabled={disabled} onClick={() => choose(1)}>
            Safe <kbd>S</kbd>
          </Button>
          <Button variant="coral" icon="alert" disabled={disabled} onClick={() => choose(0)}>
            Unsafe <kbd>U</kbd>
          </Button>
        </div>
      </>
    ),
    isRight: (it, k) => (k === 1) === it.safe,
    recap: (it, a) => (
      <>
        <code className={styles.snip}>{oneLine(it.code)}</code>
        <span>
          <b>{it.safe ? 'Safe.' : 'Unsafe.'}</b> {a ? null : <i>(no answer) </i>}
          <Md text={it.why} />
        </span>
      </>
    ),
  }));
  return (
    <>
      <TimedRound cfg={cfg} phase={phase} submit={submit} />
      <Actions />
    </>
  );
}

export function Speed({ ch, phase, submit }: RendererProps) {
  const c = ch as ChallengeOf<'speed'>;
  const [cfg] = useState<TimedCfg<SpeedItem>>(() => ({
    items: c.items,
    seconds: c.seconds || 45,
    help: 'Tap an answer (or press 1–4). Go go go!',
    key: SPEED_KEY,
    card: (it, choose, disabled) => (
      <>
        <div className={styles.tq}>
          <Md text={it.q} />
        </div>
        {it.code && <CodeBlock code={it.code} label="Snippet" />}
        <div className={`${styles.opts} ${styles.single} ${styles.tight} ${styles.mono}`}>
          {it.options.map((o, k) => (
            <button key={k} type="button" className={styles.opt} disabled={disabled} onClick={() => choose(k)}>
              <span className={styles.key} aria-hidden="true">
                {k + 1}
              </span>
              <span className={styles.otxt}>{o}</span>
            </button>
          ))}
        </div>
      </>
    ),
    isRight: (it, k) => k === it.answer,
    recap: (it, a) => (
      <span>
        <b>
          <Md text={it.q} />
        </b>{' '}
        Answer: <code className="i">{it.options[it.answer]}</code>
        {a && !a.good ? <span className="muted"> (you: {it.options[a.k]})</span> : null}
        {a ? null : <i> (no answer)</i>}
      </span>
    ),
  }));
  return (
    <>
      <TimedRound cfg={cfg} phase={phase} submit={submit} />
      <Actions />
    </>
  );
}
