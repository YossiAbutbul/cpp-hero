/**
 * Animated code demo (legacy CH.code.demo): the code types itself, then
 * runs step by step with the current line highlighted, a live output
 * console, variable boxes that fill / update ("?" = uninitialized garbage,
 * wobbling; "~" = moved-from husk; `vars: { x: null }` removes a box),
 * call-stack frames (`push` / `pop`), a memory view with pointer arrows and
 * object cards (`mem`, see CodeDemoViews.tsx), a themed crash (glitch +
 * corrupted console + scrambled boxes) and a shield deflect (Curlo braces, shock ring, teal sparks).
 * The picture after each step comes from demoStates() (src/content/demoState.ts).
 *
 *   <CodeDemo demo={lesson.demo} unsafe={isUnsafeDemo} onDone={() => setCanContinue(true)} />
 *
 * Controls: Run it / Step / Retype. Tapping the code (or "Skip") finishes
 * the typing; "Skip" while running jumps to the end state. Reduced motion:
 * no typing, no particles, faster steps.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoStates } from '@/content/demoState';
import type { Demo } from '@/content/schema';
import { Curlo } from '@/features/curlo/Curlo';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { SpeechBubble } from '@/features/curlo/SpeechBubble';
import { Button } from '@/ui/Button';
import { burstAt, shock } from '@/ui/fx/effects';
import { pulseClass, reduced, shake } from '@/ui/fx/motion';
import { Md } from '@/ui/Md';
import { CodeBlock } from './CodeBlock';
import { MemView, StackView, VarBoxes } from './CodeDemoViews';
import { splitLines } from './highlight';
import styles from './code.module.css';

export interface CodeDemoProps {
  demo: Pick<Demo, 'code' | 'steps'>;
  /** shows the UNSAFE badge on the code */
  unsafe?: boolean;
  /** start typing on mount (default true) */
  autoStart?: boolean;
  /** fired when the last step has run (every time) */
  onDone?: () => void;
  className?: string;
}

interface OutLine {
  text: string;
  tone?: 'dim' | 'ok' | 'bad';
}

const GLYPHS = '▒▓░#@!?%&';
const junk = () =>
  Array.from({ length: 14 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');

export function CodeDemo({ demo, unsafe, autoStart = true, onDone, className }: CodeDemoProps) {
  const steps = demo.steps;
  const total = useMemo(() => splitLines(demo.code).reduce((a, l) => a + l.length, 0), [demo.code]);
  const states = useMemo(() => demoStates(steps), [steps]);
  const usesStack = steps.some((s) => s.push);
  const usesVars = usesStack || steps.some((s) => s.vars && Object.keys(s.vars).length);
  const usesMem = steps.some((s) => s.mem);

  const [reveal, setReveal] = useState<number | undefined>(autoStart && !reduced() && total ? 0 : undefined);
  const [idx, setIdx] = useState(-1);
  const [out, setOut] = useState<OutLine[] | null>(null);
  const [scramble, setScramble] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState(
    autoStart ? 'Watch the code type itself, then run it.' : 'Press Run, or Step through one line at a time.',
  );
  const curlo = useCurloReact('happy');

  const idxRef = useRef(-1);
  const runTimer = useRef(0);
  const typeTimer = useRef(0);
  const scrambleTimer = useRef(0);
  const typedRef = useRef(reveal === undefined);
  const codeEl = useRef<HTMLDivElement>(null);
  const consoleEl = useRef<HTMLDivElement>(null);
  const miniEl = useRef<HTMLDivElement>(null);
  const rootEl = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  /* ---------- typing ---------- */
  const finishTyping = useCallback(() => {
    clearInterval(typeTimer.current);
    typedRef.current = true;
    setReveal(undefined);
    setNote((n) => (n.startsWith('Watch') ? 'Press Run, or Step through one line at a time.' : n));
  }, []);

  const beginTyping = useCallback(() => {
    clearInterval(typeTimer.current);
    typedRef.current = false;
    let n = 0;
    const stepN = Math.max(2, Math.ceil(total / 60));
    typeTimer.current = window.setInterval(() => {
      n += stepN;
      if (n >= total) finishTyping();
      else setReveal(n);
    }, 22);
  }, [total, finishTyping]);

  const startTyping = useCallback(() => {
    if (reduced() || !total) return finishTyping();
    setReveal(0);
    beginTyping();
  }, [total, finishTyping, beginTyping]);

  useEffect(() => {
    // the initial state already shows 0 characters when typing on mount
    if (autoStart && typedRef.current === false) beginTyping();
    return () => {
      clearInterval(typeTimer.current);
      clearTimeout(runTimer.current);
      clearTimeout(scrambleTimer.current);
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- execution ---------- */
  const reset = useCallback(() => {
    idxRef.current = -1;
    setIdx(-1);
    setOut(null);
    setScramble(false);
    setNote('Press Run, or Step through one line at a time.');
    curlo.react('happy');
  }, [curlo]);

  /** Apply step i; `quiet` = no motion (skip-to-end). Returns true if more steps remain. */
  const apply = useCallback(
    (i: number, quiet = false): boolean => {
      const s = steps[i];
      if (!s) return false;
      const lines: OutLine[] = [];
      if (i === 0) lines.push({ text: '$ ./hero\n', tone: 'dim' });
      idxRef.current = i;
      setIdx(i);
      setNote(s.note ?? '');
      if (!quiet) {
        const vals = [
          ...Object.values(s.vars ?? {}),
          ...Object.values(s.push?.vars ?? {}),
          ...(s.mem?.cells ?? []).map((c) => c.value),
        ];
        // a reference going away is harmless; a real cell dying is worth a worried look
        const died = s.mem?.drop.some((n) => states[i]?.cells.find((c) => c.name === n)?.ref === undefined);
        if (died) curlo.react('worried', 1200);
        else if (vals.some((v) => v === '?' || v === '~')) curlo.react('worried', 700);
        else if (s.mem?.cells.some((c) => c.layers?.some((l) => l.cut))) curlo.react('worried', 1000);
        else if (vals.length || s.push || s.pop || s.mem?.cells.some((c) => c.layers))
          curlo.react('happy', 700);
      }
      if (s.out != null && s.out !== '') lines.push({ text: String(s.out) });
      if (s.crash) {
        lines.push({ text: junk() + '\n', tone: 'bad' }, { text: `⚠ ${s.crash}\n`, tone: 'bad' });
        if (!quiet) {
          curlo.react('worried', 2200);
          pulseClass(codeEl.current, styles.glitch, 1600);
          void shake(consoleEl.current, 6);
          setScramble(true);
          clearTimeout(scrambleTimer.current);
          scrambleTimer.current = window.setTimeout(() => setScramble(false), 900);
        }
      }
      if (s.shield) {
        lines.push({ text: `🛡 ${s.shield}\n`, tone: 'ok' });
        if (!quiet) {
          curlo.react('bracing', 1500);
          const m = miniEl.current;
          const root = rootEl.current;
          if (m && root) {
            const r = m.getBoundingClientRect();
            const hr = root.getBoundingClientRect();
            shock(root, r.left - hr.left + r.width * 0.8, r.top - hr.top + r.height * 0.6);
            burstAt(m, { n: 30, colors: ['#0FA898', '#C4F1EA', '#FFC62E'] });
          }
        }
      }
      const last = i === steps.length - 1;
      if (last) {
        const crashed = steps.some((x) => x.crash) && !steps.some((x) => x.shield);
        lines.push(
          crashed
            ? { text: '[program misbehaved]\n', tone: 'bad' }
            : { text: '[exited with code 0]\n', tone: 'ok' },
        );
        if (!crashed && !quiet) curlo.react('celebrate', 1100);
      }
      setOut((o) => [...(i === 0 ? [] : (o ?? [])), ...lines]);
      if (last) onDoneRef.current?.();
      return !last;
    },
    [steps, states, curlo],
  );

  // keep the console scrolled to the newest line
  useEffect(() => {
    const c = consoleEl.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [out]);

  const step = useCallback(() => {
    if (!typedRef.current) finishTyping();
    clearTimeout(runTimer.current);
    setRunning(false);
    if (idxRef.current >= steps.length - 1) reset();
    apply(idxRef.current + 1);
  }, [apply, finishTyping, reset, steps.length]);

  const run = useCallback(() => {
    if (!typedRef.current) finishTyping();
    clearTimeout(runTimer.current);
    reset();
    setRunning(true);
    let i = 0;
    const loop = () => {
      const more = apply(i++);
      if (!more) {
        setRunning(false);
        return;
      }
      runTimer.current = window.setTimeout(loop, reduced() ? 600 : 950);
    };
    // let the reset render first
    runTimer.current = window.setTimeout(loop, 60);
  }, [apply, finishTyping, reset]);

  const skipToEnd = useCallback(() => {
    finishTyping();
    clearTimeout(runTimer.current);
    setRunning(false);
    for (let i = idxRef.current + 1; i < steps.length; i++) apply(i, true);
  }, [apply, finishTyping, steps.length]);

  const retype = useCallback(() => {
    clearTimeout(runTimer.current);
    setRunning(false);
    reset();
    setNote('Watch the code type itself, then run it.');
    startTyping();
  }, [reset, startTyping]);

  const typing = reveal !== undefined;
  const line = idx >= 0 ? steps[idx]?.line : undefined;
  const view = idx >= 0 ? states[idx] : undefined;

  return (
    <div ref={rootEl} className={[styles.demo, className].filter(Boolean).join(' ')}>
      <CodeBlock
        ref={codeEl}
        code={demo.code}
        unsafe={unsafe}
        label="Demo C++ code"
        reveal={reveal}
        highlightLines={line}
        onBodyClick={typing ? finishTyping : undefined}
      />
      <div className={styles.note}>
        <div ref={miniEl} className={styles.noteMini}>
          <Curlo {...curlo.props} />
        </div>
        <SpeechBubble className={styles.stepnote} popKey={idx}>
          <Md text={note} />
        </SpeechBubble>
      </div>
      <div className={styles.exec + (usesVars ? '' : ' ' + styles.novars)}>
        <div ref={consoleEl} className={styles.console} role="log" aria-label="Output console">
          <div className={styles.ch}>
            <i />
            <i />
            <i />
            &nbsp;Output
          </div>
          <div className={styles.out}>
            {out == null ? (
              <span className={styles.dim}>waiting to run…</span>
            ) : (
              out.map((l, k) => (
                <span
                  key={k}
                  className={
                    l.tone === 'dim'
                      ? styles.dim
                      : l.tone === 'ok'
                        ? styles.outOk
                        : l.tone === 'bad'
                          ? styles.outBad
                          : undefined
                  }
                >
                  {l.text}
                </span>
              ))
            )}
          </div>
        </div>
        {usesVars &&
          (usesStack ? (
            <StackView
              frames={view?.frames ?? [{ name: '', vars: {} }]}
              returns={view?.returns}
              scramble={scramble}
            />
          ) : (
            <VarBoxes vars={view?.frames[0]?.vars ?? {}} scramble={scramble} />
          ))}
      </div>
      {usesMem && <MemView cells={view?.cells ?? []} scramble={scramble} />}
      {steps.length > 0 && (
        <div className={styles.btns}>
          <Button variant="teal" icon="play" onClick={run} disabled={running}>
            Run it
          </Button>
          <Button variant="ghost" icon="step" onClick={step}>
            Step
          </Button>
          <Button variant="ghost" icon="retype" onClick={retype} aria-label="Retype the code">
            Retype
          </Button>
        </div>
      )}
      {(typing || running) && (
        <button type="button" className={styles.skip} onClick={typing ? finishTyping : skipToEnd}>
          {typing ? 'Skip typing' : 'Skip to the end'}
        </button>
      )}
    </div>
  );
}
