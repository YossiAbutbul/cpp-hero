/**
 * Mini-project (#/project/:world, immersive), port of legacy engine/project.js:
 * a guided build in validated steps (the program grows on screen; progress
 * is saved per step so a quit resumes there), the finished program, then the
 * Stress Test: Curlo throws hostile input at the program, it crashes, and
 * the player hardens it until the shield deflects the attack. Ends with
 * game.completeProject and the results card.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import type { World } from '@/content/schema';
import { Arena, type ArenaHandle } from '@/features/boss/session/Arena';
import { Gain, ResultsCard } from '@/features/boss/session/ResultsCard';
import { SessionFrame, SlidePage } from '@/features/boss/session/SessionFrame';
import { useSession, type SessionStats } from '@/features/boss/session/useSession';
import { shownInput } from '@/features/boss/session/util';
import sx from '@/features/boss/session/session.module.css';
import { ChallengeRunner, TYPE_LABELS } from '@/features/challenges';
import { CodeBlock } from '@/features/code';
import { CurloSays } from '@/features/curlo/SpeechBubble';
import { Button } from '@/ui/Button';
import { Expander } from '@/ui/Expander';
import { burstAt } from '@/ui/fx/effects';
import { popIn } from '@/ui/fx/motion';
import { plural } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { toast } from '@/ui/toast';
import styles from './project.module.css';

type Step =
  | { k: 'intro' }
  | { k: 'build'; i: number; n: number }
  | { k: 'reveal' }
  | { k: 'stressIntro' }
  | { k: 'attack'; i: number; n: number; crashed: boolean }
  | { k: 'results'; first: boolean; stats: SessionStats };

export function ProjectScreen() {
  const { world = '' } = useParams();
  const { game } = useGame();
  const w = game.index.world[world];
  if (!w) {
    return (
      <Screen label="Mini-project" immersive>
        <p>That project doesn’t exist (yet).</p>
        <Button onClick={() => goBack('/', { dir: 'close' })}>Back to the map</Button>
      </Screen>
    );
  }
  return <Build key={w.id} w={w} />;
}

function Build({ w }: { w: World }) {
  const { game, store, update } = useGame();
  const p = w.project;
  const steps = p.steps;
  const attacks = p.stress.attacks;
  const [startAt] = useState(() => {
    const rec = store.state.projects[p.id];
    return rec?.done ? 0 : Math.max(0, Math.min(rec?.step ?? 0, steps.length));
  });
  const total = steps.length + attacks.length + 2;
  const [done, setDone] = useState(startAt);
  // dev only: #/project/w1?phase=stress jumps to the Stress Test (for playtesting)
  const [step, setStep] = useState<Step>(() =>
    import.meta.env.DEV && new URLSearchParams(location.hash.split('?')[1]).get('phase') === 'stress'
      ? { k: 'stressIntro' }
      : { k: 'intro' },
  );
  const seq = useRef(0);
  const arena = useRef<ArenaHandle>(null);
  const session = useSession({
    noun: 'project',
    quitText: 'Your finished build steps are saved, so you can pick up where you left off.',
  });

  const next = (s: Step) => setStep(s);
  const toBuild = (i: number) =>
    next(i >= steps.length ? { k: 'reveal' } : { k: 'build', i, n: ++seq.current });

  const finish = () => {
    const r = game.completeProject(w);
    setDone(total);
    next({ k: 'results', first: r.first, stats: session.snapshot() });
  };

  let key = step.k as string;
  let page: ReactNode = null;
  switch (step.k) {
    case 'intro':
      page = (
        <div>
          <div className={styles.eyebrow}>World {w.num} · Mini-project</div>
          <h2 className={styles.h2}>{p.title}</h2>
          <CurloSays mood="celebrate">
            <Md text={p.intro} />
          </CurloSays>
          <ol className={styles.steps}>
            {steps.map((st, i) => (
              <li key={st.id} className={i < startAt ? styles.done : undefined}>
                <Icon name={i < startAt ? 'ok' : 'project'} />
                <span>
                  Step {i + 1}: {TYPE_LABELS[st.type]}
                  {i < startAt && <span className="sr"> (done)</span>}
                </span>
              </li>
            ))}
            <li className={styles.stress}>
              <Icon name="swords" />
              <span>Stress Test: {plural(attacks.length, 'attack')}</span>
            </li>
          </ol>
          <Button block variant="teal" iconEnd="next" onClick={() => toBuild(startAt)} data-autofocus>
            {startAt > 0 ? `Resume at step ${startAt + 1}` : 'Start building'}
          </Button>
        </div>
      );
      break;
    case 'build': {
      const i = step.i;
      const ch = steps[i]!;
      key = `b${step.n}`;
      page = (
        <ChallengeRunner
          challenge={ch}
          mode="project"
          eyebrow={`Build step ${i + 1} of ${steps.length} · ${TYPE_LABELS[ch.type]}`}
          before={<Growing program={p.program} frac={i / steps.length} />}
          onResult={session.record}
          onContinue={(r) => {
            if (!r.correct) {
              toast('Let’s fix this step before moving on.', { icon: 'project' });
              next({ k: 'build', i, n: ++seq.current });
              return;
            }
            update((s) => {
              s.projects[p.id] = { done: !!s.projects[p.id]?.done, step: i + 1 };
            });
            setDone((d) => d + 1);
            toBuild(i + 1);
          }}
        />
      );
      break;
    }
    case 'reveal':
      page = (
        <Reveal
          w={w}
          onNext={() => {
            setDone((d) => d + 1);
            if (attacks.length) next({ k: 'stressIntro' });
            else finish();
          }}
        />
      );
      break;
    case 'stressIntro':
      page = (
        <div>
          <div className={styles.eyebrow}>
            <Icon name="swords" /> Stress Test
          </div>
          <h2 className={styles.h2}>Break-in attempt!</h2>
          <CurloSays mood="bracing" text={p.stress.intro} />
          <p className="muted">Users type anything. See what breaks, then harden it.</p>
          <Button
            block
            variant="coral"
            iconEnd="next"
            className={sx.next}
            onClick={() => next({ k: 'attack', i: 0, n: ++seq.current, crashed: false })}
            data-autofocus
          >
            Bring it on!
          </Button>
        </div>
      );
      break;
    case 'attack': {
      const a = attacks[step.i]!;
      const cur = step;
      key = `a${cur.i}`;
      page = (
        <>
          <div className={sx.attackHead}>
            <div className={styles.eyebrow}>
              Attack {cur.i + 1} of {attacks.length}
            </div>
            <div className={sx.dhead}>
              <span className={sx.atkLabel}>
                <Icon name="alert" />
                {a.label || 'Hostile input'}
              </span>
              <span className={sx.hostile}>{shownInput(a.input)}</span>
            </div>
            <Arena ref={arena} cellsLabel="your program" />
          </div>
          <AttackStart onMount={() => window.setTimeout(() => arena.current?.setAttack(a.input), 250)} />
          {!cur.crashed ? (
            <RunButton
              onRun={async () => {
                await arena.current?.crash();
                next({ ...cur, crashed: true });
              }}
            />
          ) : (
            <>
              <p className={sx.crashNote}>
                <Icon name="no" /> <b>Crashed!</b> The program can’t handle <code className="i">{shownInput(a.input)}</code>. Fix it
                below.
              </p>
              <ChallengeRunner
                key={cur.n}
                challenge={a.challenge}
                mode="stress"
                eyebrow={`Fix it · ${TYPE_LABELS[a.challenge.type]}`}
                onResult={(r) => {
                  session.record(r);
                  arena.current?.setAttack(a.input);
                  if (r.correct) window.setTimeout(() => void arena.current?.block(), 350);
                  else window.setTimeout(() => void arena.current?.crash(), 300);
                }}
                onContinue={(r) => {
                  if (!r.correct) {
                    toast('Still breakable! Try the fix again.', { icon: 'warn' });
                    next({ ...cur, n: ++seq.current });
                    return;
                  }
                  setDone((d) => d + 1);
                  if (cur.i + 1 >= attacks.length) finish();
                  else next({ k: 'attack', i: cur.i + 1, n: ++seq.current, crashed: false });
                }}
              />
            </>
          )}
        </>
      );
      break;
    }
    case 'results':
      page = (
        <ResultsCard
          title="Project complete!"
          sub={`The boss of World ${w.num} is awake…`}
          stats={step.stats}
          extra={
            <>
              {attacks.length > 0 && <Gain icon="shield">Stress Test passed: every attack blocked!</Gain>}
              {step.first && <Gain icon="chart">Defense stat up!</Gain>}
            </>
          }
          onContinue={session.leave}
        />
      );
      break;
  }

  return (
    <SessionFrame
      label={`Mini-project: ${p.title}`}
      progress={done / total}
      onQuit={() => void session.askQuit()}
      scrollKey={key}
    >
      <SlidePage pageKey={key}>{page}</SlidePage>
    </SessionFrame>
  );
}

/** "Your program so far": the first part of the final program. */
function Growing({ program, frac }: { program: string; frac: number }) {
  if (!program || frac <= 0) return null;
  const lines = program.split('\n');
  const n = Math.max(1, Math.round(lines.length * frac));
  const shown = lines.slice(0, n).join('\n') + (n < lines.length ? '\n// … more to build' : '');
  return (
    <div className={styles.growing}>
      <div className={styles.growHead}>
        <Icon name="project" /> Your program so far <span className={styles.pct}>({Math.round(frac * 100)}%)</span>
      </div>
      <Expander label="Show the code">
        <CodeBlock code={shown} label="Program so far" />
      </Expander>
    </div>
  );
}

function Reveal({ w, onNext }: { w: World; onNext: () => void }) {
  const p = w.project;
  const blk = useRef<HTMLDivElement>(null);
  const attacks = p.stress.attacks.length;
  useEffect(() => {
    void popIn(blk.current, 250);
    const t = window.setTimeout(() => burstAt(blk.current, { n: 80 }), 500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className={styles.done}>
      <div className={styles.eyebrow}>
        <Icon name="ok" /> Build complete
      </div>
      <h2>{p.title} works!</h2>
      <p className={styles.lead}>Here’s your whole program. Nice building!</p>
      <div ref={blk}>
        <CodeBlock code={p.program} label="Your finished program" />
      </div>
      <Button
        block
        variant={attacks ? 'coral' : 'sun'}
        iconEnd="next"
        className={sx.next}
        onClick={onNext}
        data-autofocus
      >
        {attacks ? 'Start the Stress Test' : 'Finish project'}
      </Button>
    </div>
  );
}

function RunButton({ onRun }: { onRun: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => btn.current?.focus({ preventScroll: true }), 300);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <Button
      ref={btn}
      block
      variant="coral"
      icon="play"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void onRun();
      }}
    >
      Run with this input
    </Button>
  );
}

/** Runs a callback once when an attack page mounts. */
function AttackStart({ onMount }: { onMount: () => void }) {
  const f = useRef(onMount);
  useEffect(() => {
    f.current();
  }, []);
  return null;
}
