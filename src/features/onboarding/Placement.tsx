/**
 * Placement quiz (legacy onboarding.placement): 3 questions per world from
 * its lessons; 2 of 3 right tests out of that world. It stops at the first
 * world that isn't passed, then game.placementUnlock opens every passed
 * world plus the next one. No hearts, no hints, no retries (mode placement).
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import type { Challenge, World } from '@/content/schema';
import { SessionFrame, SlidePage } from '@/features/boss/session/SessionFrame';
import { shuffled } from '@/features/boss/session/util';
import { ChallengeRunner, TYPE_LABELS } from '@/features/challenges';
import { WorldIcon } from '@/ui/art/Art';
import { Button } from '@/ui/Button';
import { burstAt } from '@/ui/fx/effects';
import { Icon } from '@/ui/Icon';
import { Md } from '@/ui/Md';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import styles from './onboarding.module.css';

const PER_WORLD = 3;
const TYPES = ['mcq', 'predict', 'fill', 'breakit', 'harden'];

function pickFor(w: World): Challenge[] {
  const pool = w.lessons.flatMap((l) => l.challenges).filter((c) => TYPES.includes(c.type));
  return shuffled(pool).slice(0, PER_WORLD);
}

type Step =
  | { k: 'intro'; wi: number }
  | { k: 'q'; wi: number; qi: number }
  | { k: 'res'; wi: number; ok: boolean; right: number; of: number };

export function Placement() {
  const { game, update } = useGame();
  const dialog = useDialog();
  // passing world N unlocks N+1, so the last world isn't tested
  const testable = useMemo(() => game.worlds().slice(0, -1), [game]);
  const [qs] = useState(() => testable.map(pickFor));
  const totalQ = Math.max(1, qs.reduce((n, q) => n + q.length, 0));
  const [step, setStep] = useState<Step>({ k: 'intro', wi: 0 });
  const [asked, setAsked] = useState(0);
  const right = useRef(0);
  const passed = useRef<World[]>([]);
  const resEl = useRef<HTMLDivElement>(null);

  const done = () => {
    const ps = passed.current;
    const start = ps.length ? game.placementUnlock(ps) : undefined;
    if (!ps.length) update((s) => void (s.profile.placementDone = true));
    navigate('/', { dir: 'down', replace: true });
    window.setTimeout(
      () =>
        toast(start ? `You start in World ${start.num}: ${start.title}!` : 'Starting at World 1. Let’s go!', {
          icon: 'map',
        }),
      800,
    );
  };

  const quit = async () => {
    const yes = await dialog.confirm({
      title: 'Leave the placement quiz?',
      body: <p>You can start from World 1 and play normally.</p>,
      yes: 'Leave',
      no: 'Keep going',
    });
    if (!yes) return;
    passed.current = [];
    done();
  };

  let key = '';
  let page: ReactNode = null;
  if (!testable.length) {
    page = (
      <div className={styles.placeIntro}>
        <h2 className={styles.h2}>Nothing to skip yet</h2>
        <Button block onClick={done}>
          See my map
        </Button>
      </div>
    );
  } else if (step.k === 'intro') {
    const w = testable[step.wi]!;
    const n = qs[step.wi]!.length;
    key = `i${step.wi}`;
    page = (
      <div className={styles.placeIntro}>
        <div className={styles.eyebrow}>Placement</div>
        <h2 className={styles.h2}>
          World {w.num}: {w.title}
        </h2>
        <div className={styles.worldIc} aria-hidden="true">
          <WorldIcon kind={w.icon || 'star'} />
        </div>
        <p className="muted">
          <Md text={w.blurb} />
        </p>
        {n ? (
          <p>
            Get <b>{Math.min(2, n)} of {n}</b> right to test out of this world.
          </p>
        ) : null}
        <Button
          block
          variant="teal"
          iconEnd="next"
          data-autofocus
          onClick={() => {
            right.current = 0;
            if (!n) {
              passed.current.push(w);
              setStep({ k: 'res', wi: step.wi, ok: true, right: 0, of: 0 });
            } else setStep({ k: 'q', wi: step.wi, qi: 0 });
          }}
        >
          Start
        </Button>
      </div>
    );
  } else if (step.k === 'q') {
    const w = testable[step.wi]!;
    const list = qs[step.wi]!;
    const ch = list[step.qi]!;
    key = `q${step.wi}.${step.qi}`;
    page = (
      <ChallengeRunner
        challenge={ch}
        mode="placement"
        eyebrow={`Placement · World ${w.num} · ${step.qi + 1} of ${list.length} · ${TYPE_LABELS[ch.type]}`}
        onContinue={(r) => {
          if (r.correct) right.current++;
          setAsked((a) => a + 1);
          if (step.qi + 1 < list.length) {
            setStep({ ...step, qi: step.qi + 1 });
            return;
          }
          const ok = right.current >= Math.min(2, list.length);
          if (ok) {
            passed.current.push(w);
            window.setTimeout(() => burstAt(resEl.current, { n: 80 }), 300);
          }
          setStep({ k: 'res', wi: step.wi, ok, right: right.current, of: list.length });
        }}
      />
    );
  } else {
    const w = testable[step.wi]!;
    const more = step.ok && step.wi + 1 < testable.length;
    key = `r${step.wi}`;
    page = (
      <div ref={resEl} className={styles.placeRes}>
        <div className={styles.prIc}>
          <Icon name={step.ok ? 'ok' : 'target'} />
        </div>
        <h2 className={styles.h2}>
          {step.ok ? `Tested out of World ${w.num}!` : `World ${w.num} is a good place to start`}
        </h2>
        {step.of > 0 && (
          <p className="muted">
            {step.right} of {step.of} right.
          </p>
        )}
        <Button
          block
          variant={step.ok ? 'teal' : 'primary'}
          iconEnd="next"
          className={styles.next}
          data-autofocus
          onClick={() => (more ? setStep({ k: 'intro', wi: step.wi + 1 }) : done())}
        >
          {more ? 'Next world' : 'See my map'}
        </Button>
      </div>
    );
  }

  return (
    <SessionFrame label="Placement quiz" progress={asked / totalQ} combo={false} onQuit={() => void quit()} scrollKey={key}>
      <SlidePage pageKey={key}>{page}</SlidePage>
    </SessionFrame>
  );
}
