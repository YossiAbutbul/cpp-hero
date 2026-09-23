/**
 * Boss battle (#/boss/:world, immersive), port of legacy engine/boss.js:
 * dramatic entrance (dim + name card slam, tap to skip), the boss intro,
 * rounds (one HP segment per correct answer; misses make the boss taunt and
 * cost one of this fight's hearts; missed rounds come back until the HP is
 * gone; timed rounds are handled by the runner), the Defense Phase (hostile
 * inputs hurled at Curlo; block each by answering right), then victory,
 * rewards through game.beatBoss, and the results card. Hearts are per fight
 * (not saved): at 0 you're knocked out and can try again (intro skipped) or
 * go back to the map. A multi-stage boss (World 16) shows a stage banner
 * before each stage, and a knock-out restarts only the current stage (or the
 * Defense Phase) with fresh hearts; the stage logic lives in engine/boss.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import {
  answerRound,
  bossHp,
  bossStages,
  drawRound,
  nextStage,
  roundNumber,
  stageCleared,
  stageRound,
  startStage,
  type BossRun,
  type Stage,
} from '@/engine/boss';
import { FIGHT_HEARTS, fightAnswer } from '@/engine/hearts';
import { goBack } from '@/app/navigation';
import type { Challenge, World } from '@/content/schema';
import { ChallengeRunner, TYPE_LABELS, type ChallengeResult } from '@/features/challenges';
import { CurloSays, SpeechBubble } from '@/features/curlo/SpeechBubble';
import { curloLine } from '@/features/curlo/voice';
import { StoryBubbles } from '@/features/map/StoryBubbles';
import { Gain, Results, sessionTiles } from '@/features/session/Results';
import { SessionFrame, SlidePage } from '@/features/session/SessionFrame';
import { useSession, type SessionStats } from '@/features/session/useSession';
import { pick, shuffled } from '@/features/session/util';
import ss from '@/features/session/session.module.css';
import { BossArt } from '@/ui/art/Art';
import { Button } from '@/ui/Button';
import { burstAt, floatText, rain } from '@/ui/fx/effects';
import { anim, EASE_OUT, pulseClass, reduced, shake, slideUp, SPRING } from '@/ui/fx/motion';
import { plural } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { useDialog } from '@/ui/overlay/dialogContext';
import { toast } from '@/ui/toast';
import { Arena, type ArenaHandle } from './session/Arena';
import { shownInput } from './session/util';
import sx from './session/arena.module.css';
import styles from './boss.module.css';

type Step =
  | { k: 'intro' }
  | { k: 'stage'; idx: number; n: number; retry: boolean }
  | { k: 'round'; ch: Challenge; n: number; round: string }
  | { k: 'defIntro' }
  | { k: 'defense'; i: number; n: number }
  | { k: 'victory' }
  | { k: 'results'; first: boolean; unlocked: World | null; stats: SessionStats };

const HIT_LINES = [
  'Ow! Lucky shot!',
  'Grr… that stung!',
  'Hmph. You’re better than I thought.',
  'Not so fast!',
];

export function BossScreen() {
  const { world = '' } = useParams();
  const { game } = useGame();
  const w = game.index.world[world];
  if (!w || !game.bossUnlocked(w)) {
    return (
      <Screen label="Boss battle" immersive>
        <p>{w ? 'This boss is still locked.' : 'That boss doesn’t exist (yet).'}</p>
        <Button onClick={() => goBack('/', { dir: 'close' })}>Back to the map</Button>
      </Screen>
    );
  }
  return <Fights key={w.id} w={w} />;
}

/** A knock-out remounts the fight fresh (new key), skipping the intro. */
function Fights({ w }: { w: World }) {
  const [tries, setTries] = useState(0);
  return <Battle key={tries} w={w} rematch={tries > 0} onRetry={() => setTries((t) => t + 1)} />;
}

function Battle({ w, rematch, onRetry }: { w: World; rematch: boolean; onRetry: () => void }) {
  const { game } = useGame();
  const dialog = useDialog();
  const b = w.boss;
  const stages = useMemo(() => bossStages(b), [b]);
  const staged = stages.length > 1;
  const maxHp = bossHp(b);
  const defense = b.defense;
  const total = maxHp + defense.length + 1;
  const session = useSession({
    noun: 'battle',
    quitText: 'Retreat? The boss will be back at full health next time.',
  });

  // dev only: #/boss/w1?phase=defense|victory jumps ahead (for playtesting)
  const [jump] = useState(() =>
    import.meta.env.DEV ? new URLSearchParams(location.hash.split('?')[1]).get('phase') : null,
  );
  // a rematch after a knock-out skips the intro and starts at round 1
  const skip = rematch && b.rounds.length > 0;
  const [init] = useState((): { run: BossRun; step: Step } => {
    const run = startStage(stages, 0);
    if (skip) {
      const d = drawRound(run, stages);
      return { run: d.run, step: { k: 'round', ch: d.ch, n: 0, round: eyebrowRound(d.run, stages) } };
    }
    if (jump) return { run: { ...run, hp: 0, stageHp: 0 }, step: jumpStep(jump, defense.length > 0) };
    return { run, step: { k: 'intro' } };
  });
  const runRef = useRef(init.run);
  const [step, setStep] = useState<Step>(init.step);
  const [dim, setDim] = useState(() => !reduced() && !jump && !rematch);
  const [hearts, setHearts] = useState(FIGHT_HEARTS);
  const heartsRef = useRef(FIGHT_HEARTS);
  const [hp, setHp] = useState(init.run.hp);
  const [done, setDone] = useState(0);
  const [say, setSay] = useState(() =>
    skip ? { text: pick(b.taunt.length ? b.taunt : ['Back for more?']), n: 1 } : { text: '', n: 0 },
  );
  const seq = useRef(0);
  const artEl = useRef<HTMLSpanElement>(null);
  const hpEl = useRef<HTMLDivElement>(null);
  const sayEl = useRef<HTMLDivElement>(null);
  const headEl = useRef<HTMLDivElement>(null);
  const arena = useRef<ArenaHandle>(null);

  const taunt = useCallback((text: string) => setSay((s) => ({ text, n: s.n + 1 })), []);
  const bossTaunt = useCallback(
    () => taunt(pick(b.taunt.length ? b.taunt : ['Ha! Missed me!'])),
    [b.taunt, taunt],
  );

  useEffect(() => {
    if (!say.n) return;
    void anim(
      sayEl.current,
      [
        { transform: 'scale(.8)', opacity: 0 },
        { transform: 'scale(1.05)', opacity: 1 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 360, easing: SPRING, rm: 'fade' },
    );
  }, [say]);

  /** The boss rears up (a hit it shrugs off, or a new stage). */
  const roar = useCallback(() => {
    void anim(
      artEl.current,
      [
        { transform: 'none' },
        { transform: 'translateY(8px) scale(1.12,.9)' },
        { transform: 'translateY(-14px) scale(.95,1.08)' },
        { transform: 'none' },
      ],
      { duration: 520, easing: SPRING },
    );
  }, []);

  /** Show a stage banner (multi-stage bosses only). */
  const toStage = useCallback(
    (idx: number, retry: boolean) => {
      const st = stages[idx]!;
      setStep({ k: 'stage', idx, n: ++seq.current, retry });
      taunt(retry ? 'Back for more? This stage is mine!' : pick(st.taunt.length ? st.taunt : ['Come at me!']));
      if (idx > 0 || retry) window.setTimeout(roar, 250);
    },
    [stages, taunt, roar],
  );

  /* ---- flow ---- */
  const nextRound = useCallback(() => {
    const run = runRef.current;
    if (run.hp <= 0) {
      setStep(defense.length ? { k: 'defIntro' } : { k: 'victory' });
      return;
    }
    const ni = stageCleared(run) ? nextStage(run, stages) : null;
    if (ni != null) return toStage(ni, false);
    const d = drawRound(run, stages, shuffled);
    runRef.current = d.run;
    if (d.lap)
      toast(staged ? 'This stage still stands! Round two!' : 'The boss is still standing! Round two!', {
        icon: 'swords',
      });
    setStep({ k: 'round', ch: d.ch, n: ++seq.current, round: eyebrowRound(d.run, stages) });
  }, [defense.length, stages, staged, toStage]);

  /** Stage banner "Fight!": the stage starts at the hp it began with. */
  const enterStage = useCallback(
    (idx: number) => {
      runRef.current = startStage(stages, idx);
      nextRound();
    },
    [stages, nextRound],
  );

  /** A settled answer: a miss costs one of this fight's hearts. */
  const countHeart = useCallback((r: ChallengeResult) => {
    const f = fightAnswer(heartsRef.current, { correct: r.correct, retry: r.retried });
    heartsRef.current = f.hearts;
    if (f.lost) setHearts(f.hearts);
  }, []);

  /**
   * After Continue: out of hearts → knocked out (try again or map), else go on.
   * One stage: the whole fight starts over. Multi-stage: only this stage (or
   * the Defense Phase) starts over, with fresh hearts.
   */
  const afterAnswer = useCallback(
    async (then: () => void, phase: 'round' | 'defense') => {
      if (heartsRef.current > 0) return then();
      const what = phase === 'defense' ? 'the Defense Phase' : 'this stage';
      const v = await dialog.open<'retry' | 'map'>({
        title: 'Knocked out!',
        mood: 'worried',
        dismissValue: 'retry',
        body: (
          <>
            <p>{curloLine('knockedOut')}</p>
            <p className="muted small">
              You get {FIGHT_HEARTS} fresh hearts.{staged ? ` Only ${what} starts over.` : ''}
            </p>
          </>
        ),
        buttons: [
          { label: staged ? 'Retry stage' : 'Try again', value: 'retry', variant: 'coral', icon: 'swords' },
          { label: 'Back to map', value: 'map', variant: 'ghost' },
        ],
      });
      if (v === 'map') return session.leave();
      if (!staged) return onRetry();
      heartsRef.current = FIGHT_HEARTS;
      setHearts(FIGHT_HEARTS);
      if (phase === 'defense') {
        setDone(maxHp);
        setStep({ k: 'defIntro' });
        return;
      }
      const run = startStage(stages, runRef.current.stage);
      runRef.current = run;
      setHp(run.hp);
      setDone(maxHp - run.hp);
      toStage(run.stage, true);
    },
    [dialog, session, onRetry, staged, stages, maxHp, toStage],
  );

  /* ---- hits and taunts ---- */
  /** runRef is already lowered (on answer); this plays the hit. */
  const hit = useCallback(() => {
    const run = runRef.current;
    const left = run.hp;
    const seg = hpEl.current?.children[left] as HTMLElement | undefined;
    void anim(
      seg,
      [
        { transform: 'none' },
        { transform: 'scaleY(1.6) translateY(-4px)', opacity: 1 },
        { transform: 'translateY(10px) scale(.4) rotate(20deg)', opacity: 0 },
      ],
      { duration: 480, easing: 'ease-in' },
    ).then(() => setHp(left));
    const art = artEl.current;
    pulseClass(art, styles.hurtflash, 600);
    void shake(art, 12);
    floatText(art, '−1 HP', 'dmg');
    burstAt(art, { n: 30, colors: ['#FFC62E', '#fff', '#FF5A70'], speed: 0.8 });
    taunt(left <= 0 ? 'No… NO! My HP!' : stageCleared(run) ? 'Grr… that was only one stage!' : pick(HIT_LINES));
  }, [taunt]);

  const boast = useCallback(() => {
    roar();
    bossTaunt();
  }, [roar, bossTaunt]);

  /* ---- pages ---- */
  const showHead = step.k === 'round' || step.k === 'stage';
  const wasHead = useRef(false);
  useLayoutEffect(() => {
    if (showHead && !wasHead.current) void slideUp(headEl.current);
    wasHead.current = showHead;
  }, [showHead]);

  /** hp segments that start a new stage group (the bar empties right to left, stage 1 first) */
  const cuts = useMemo(() => {
    const out = new Set<number>();
    let left = maxHp;
    for (const s of stages.slice(0, -1)) out.add((left -= s.hp));
    return out;
  }, [stages, maxHp]);

  let page: ReactNode = null;
  let key = step.k as string;
  switch (step.k) {
    case 'intro':
      page = (
        <Intro
          w={w}
          maxHp={maxHp}
          stages={stages.length}
          start={!dim}
          onFight={() => {
            if (staged) return toStage(0, false);
            taunt(pick(b.taunt.length ? b.taunt : ['Come at me!']));
            nextRound();
          }}
        />
      );
      break;
    case 'stage': {
      const idx = step.idx;
      key = `s${step.n}`;
      page = (
        <StageIntro
          stage={stages[idx]!}
          idx={idx}
          count={stages.length}
          retry={step.retry}
          onGo={() => enterStage(idx)}
        />
      );
      break;
    }
    case 'round': {
      const ch = step.ch;
      key = `r${step.n}`;
      page = (
        <ChallengeRunner
          challenge={ch}
          mode="boss"
          hideCurlo
          eyebrow={`${step.round} · ${TYPE_LABELS[ch.type]}`}
          onResult={(r: ChallengeResult) => {
            session.record(r);
            countHeart(r);
            runRef.current = answerRound(runRef.current, ch, r.correct);
            if (r.correct) {
              setDone((d) => d + 1);
              window.setTimeout(hit, 200);
            } else window.setTimeout(boast, 200);
          }}
          onContinue={() => void afterAnswer(nextRound, 'round')}
        />
      );
      break;
    }
    case 'defIntro':
      page = <DefenseIntro onGo={() => setStep({ k: 'defense', i: 0, n: ++seq.current })} />;
      break;
    case 'defense': {
      const d = defense[step.i]!;
      key = `d${step.n}`;
      page = (
        <>
          <div className={sx.attackHead}>
            <div className={sx.dhead}>
              <span className={sx.atkLabel}>
                <Icon name="alert" />
                {d.label || 'Hostile input!'}
              </span>
              <span className={sx.hostile}>{shownInput(d.attack)}</span>
            </div>
            <Arena ref={arena} bossArt={b.art} />
          </div>
          <DefenseAttack
            onMount={() => {
              window.setTimeout(() => arena.current?.setAttack(d.attack), 300);
            }}
          />
          <ChallengeRunner
            challenge={d.challenge}
            mode="boss"
            hideCurlo
            eyebrow={`Block attack ${step.i + 1} of ${defense.length} · ${TYPE_LABELS[d.challenge.type]}`}
            onResult={(r) => {
              session.record(r);
              countHeart(r);
              if (r.correct) window.setTimeout(() => void arena.current?.block(), 250);
              else
                window.setTimeout(() => {
                  void arena.current?.crash();
                  bossTaunt();
                }, 250);
            }}
            onContinue={(r) => {
              const i = step.i;
              if (r.correct) {
                setDone((x) => x + 1);
              } else toast('It got through! Block it this time.', { icon: 'shield' });
              void afterAnswer(() => {
                const ni = r.correct ? i + 1 : i;
                setStep(ni >= defense.length ? { k: 'victory' } : { k: 'defense', i: ni, n: ++seq.current });
              }, 'defense');
            }}
          />
        </>
      );
      break;
    }
    case 'victory':
      page = (
        <Victory
          w={w}
          onClaim={() => {
            const res = game.beatBoss(w);
            setDone(total);
            setStep({ k: 'results', first: res.first, unlocked: res.unlocked, stats: session.snapshot() });
          }}
        />
      );
      break;
    case 'results':
      page = (
        <Results
          title="Boss defeated!"
          sub={`${b.name} won’t bug this world again.`}
          tiles={sessionTiles(step.stats)}
          extra={
            step.unlocked ? (
              <Gain icon="map">
                World {step.unlocked.num} unlocked: <b>{step.unlocked.title}</b>
              </Gain>
            ) : !step.first ? (
              <Gain icon="star">Rematch won! Great practice.</Gain>
            ) : null
          }
          onContinue={session.leave}
        />
      );
      break;
  }
  return (
    <SessionFrame
      label={`Boss battle: ${b.name}`}
      progress={done / total}
      hearts={{ n: hearts, max: FIGHT_HEARTS }}
      onQuit={() => void session.askQuit()}
      scrollKey={key}
      overlay={dim ? <Dim name={b.name} onDone={() => setDim(false)} /> : null}
    >
      <div ref={headEl} className={styles.head} hidden={!showHead}>
        <BossArt ref={artEl} kind={b.art} className={styles.art} />
        <div className={styles.meta}>
          <div className={styles.name}>{b.name}</div>
          <div
            ref={hpEl}
            className={styles.hpbar}
            role="meter"
            aria-label="Boss health"
            aria-valuemin={0}
            aria-valuemax={maxHp}
            aria-valuenow={hp}
            aria-valuetext={`${hp} of ${maxHp} health left`}
          >
            {Array.from({ length: maxHp }, (_, i) => (
              <i
                key={i}
                className={[styles.seg, i >= hp ? styles.gone : '', cuts.has(i) ? styles.cut : ''].join(' ')}
              />
            ))}
          </div>
          <div ref={sayEl} className={styles.say} aria-live="polite">
            {say.text}
          </div>
        </div>
      </div>
      <SlidePage pageKey={key}>{page}</SlidePage>
    </SessionFrame>
  );
}

/** Round label: "Round 3", or "Stage 2 · Round 1" in a multi-stage fight. */
function eyebrowRound(run: BossRun, stages: Stage[]): string {
  return stages.length > 1
    ? `Stage ${run.stage + 1} · Round ${stageRound(run, stages)}`
    : `Round ${roundNumber(run, stages)}`;
}

/** Dev-only phase jump (#/boss/w1?phase=defense|victory). */
function jumpStep(jump: string, hasDefense: boolean): Step {
  if (jump === 'defense' && hasDefense) return { k: 'defIntro' };
  if (jump === 'victory') return { k: 'victory' };
  return { k: 'intro' };
}

/** Runs a callback once when the defense page mounts. */
function DefenseAttack({ onMount }: { onMount: () => void }) {
  const f = useRef(onMount);
  useEffect(() => {
    f.current();
  }, []);
  return null;
}

/* ---------------- entrance ---------------- */

function Dim({ name, onDone }: { name: string; onDone: () => void }) {
  const root = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const ended = useRef(false);
  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    void anim(root.current, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      fill: 'forwards',
      rm: 'keep',
    }).then(onDone);
    window.setTimeout(onDone, 400);
  }, [onDone]);
  useEffect(() => {
    void anim(root.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, rm: 'keep' });
    void anim(
      card.current,
      [
        { transform: 'scale(2.4) rotate(-8deg)', opacity: 0 },
        { transform: 'scale(.94) rotate(1deg)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 380, delay: 120, fill: 'backwards', easing: 'ease-out' },
    ).then(() => void shake(root.current?.parentElement ?? null, 10));
    const t = window.setTimeout(end, 1150);
    return () => window.clearTimeout(t);
  }, [end]);
  return (
    <button ref={root} type="button" className={styles.dim} onClick={end} aria-label="Skip the entrance">
      <div ref={card} className={styles.dimCard}>
        <small>Boss battle</small>
        <b>{name}</b>
      </div>
    </button>
  );
}

function Intro({
  w,
  maxHp,
  stages,
  start,
  onFight,
}: {
  w: World;
  maxHp: number;
  stages: number;
  start: boolean;
  onFight: () => void;
}) {
  const b = w.boss;
  const big = useRef<HTMLSpanElement>(null);
  const banner = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  useEffect(() => {
    if (!start || played.current) return;
    played.current = true;
    void anim(
      big.current,
      [
        { transform: 'translateY(-120%) scale(.7)', opacity: 0 },
        { transform: 'translateY(6%) scale(1.1,.86)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(-4%) scale(.96,1.05)', offset: 0.75 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 900, easing: 'ease-out', rm: 'fade' },
    );
    void anim(
      banner.current,
      [
        { transform: 'scale(.3) rotate(-8deg)', opacity: 0 },
        { transform: 'scale(1.15) rotate(2deg)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 600, delay: 600, fill: 'backwards', rm: 'fade' },
    );
  }, [start]);
  return (
    <div className={styles.intro}>
      <div className={styles.stageIn}>
        <BossArt ref={big} kind={b.art} className={styles.big} label={b.name} />
        <div ref={banner} className={styles.banner}>
          <small>Boss battle · World {w.num}</small>
          <b>{b.name}</b>
        </div>
      </div>
      <SpeechBubble tone="boss" tail="none" className={styles.bossBubble}>
        <b>{b.name}:</b> <Md text={b.intro} />
      </SpeechBubble>
      <p className={`muted small ${styles.note}`}>
        <Icon name="heart" /> {FIGHT_HEARTS} hearts, a miss costs one.{' '}
        {stages > 1 ? `Break ${stages} stages` : `Land ${plural(maxHp, 'hit')}`}
        {b.defense.length ? ', then survive the Defense Phase!' : '!'}
      </p>
      <StoryBubbles
        lines={w.story.bossIntro}
        moods={['bracing', 'thinking', 'bracing']}
        curloSize={84}
        doneLabel="Fight!"
        onDone={onFight}
      />
    </div>
  );
}

function StageIntro({
  stage,
  idx,
  count,
  retry,
  onGo,
}: {
  stage: Stage;
  idx: number;
  count: number;
  retry: boolean;
  onGo: () => void;
}) {
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void anim(
      banner.current,
      [
        { transform: 'translateY(-30px) scale(.6) rotate(-4deg)', opacity: 0 },
        { transform: 'translateY(4px) scale(1.06) rotate(1deg)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 560, easing: SPRING, rm: 'fade' },
    );
  }, []);
  const last = idx === count - 1;
  const hits = plural(stage.hp, 'hit');
  return (
    <div>
      <div ref={banner} className={`${styles.phase} ${styles.stage}`}>
        <small>{retry ? `Stage ${idx + 1} · Try again` : `Stage ${idx + 1} of ${count}`}</small>
        <b>{stage.name}</b>
      </div>
      <CurloSays
        mood={retry || last ? 'bracing' : 'thinking'}
        text={
          retry
            ? `Fresh hearts! Land ${hits} to break this stage.`
            : `Land ${hits} to break this stage${last ? '. The last one!' : '!'}`
        }
      />
      <Button block variant="coral" icon="swords" className={ss.next} onClick={onGo} data-autofocus>
        Fight!
      </Button>
    </div>
  );
}

function DefenseIntro({ onGo }: { onGo: () => void }) {
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void anim(
      banner.current,
      [
        { transform: 'scale(2.2) rotate(-6deg)', opacity: 0 },
        { transform: 'scale(.95)', opacity: 1, offset: 0.7 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 600, rm: 'fade' },
    );
  }, []);
  return (
    <div>
      <div ref={banner} className={styles.phase}>
        <small>Phase 2</small>
        <b>Defense!</b>
      </div>
      <CurloSays mood="bracing" text="Hostile inputs incoming! Harden the code so my shield holds!" />
      <Button block variant="teal" icon="shield" className={ss.next} onClick={onGo} data-autofocus>
        Shields up!
      </Button>
    </div>
  );
}

function Victory({ w, onClaim }: { w: World; onClaim: () => void }) {
  const { game } = useGame();
  const b = w.boss;
  const first = !game.bossBeaten(w);
  const vb = useRef<HTMLSpanElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = vb.current;
    void anim(
      el,
      [
        { transform: 'none', opacity: 1 },
        { transform: 'rotate(-12deg) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'rotate(380deg) scale(.1)', opacity: 0 },
      ],
      { duration: 1200, delay: 500, easing: 'ease-in', fill: 'forwards', rm: 'skip' },
    ).then((a) => {
      burstAt(el, { n: 160 });
      rain(100);
      // the boss spun away: close its empty slot so the title card springs up
      // (under reduced motion it never left, so the slot stays)
      const sl = slot.current;
      if (!a || !sl) return;
      void anim(sl, [{ height: `${sl.offsetHeight}px` }, { height: '0px' }], {
        duration: 420,
        easing: EASE_OUT,
      });
      sl.style.height = '0px';
    });
  }, []);
  const r = b.reward;
  const cos = r.cosmetic ? game.cosmeticDef(r.cosmetic) : undefined;
  const bug = r.bug ? game.bugDef(r.bug) : undefined;
  const lines = w.story.victory.length ? w.story.victory : [b.victory];
  return (
    <div className={styles.victory}>
      <div ref={slot} className={styles.vicSlot}>
        <BossArt ref={vb} kind={b.art} hurt className={styles.vicBoss} />
      </div>
      <div className={`${styles.phase} ${styles.win}`}>
        <small>Victory!</small>
        <b>{b.name} defeated</b>
      </div>
      {w.story.victory.length > 0 && b.victory && (
        <SpeechBubble tone="boss" tail="none" className={styles.bossBubble}>
          <b>{b.name}:</b> <Md text={b.victory} />
        </SpeechBubble>
      )}
      {first ? (
        <div className={styles.rewards}>
          <div className={styles.eyebrow}>Rewards</div>
          {r.xp > 0 && (
            <div className={styles.reward}>
              <Icon name="bolt" />
              <b>+{r.xp} XP</b>
            </div>
          )}
          {cos && (
            <div className={styles.reward}>
              <Icon name="gift" />
              <b>{cos.name}</b>
              <span className="muted">new gear</span>
            </div>
          )}
          {bug && (
            <div className={styles.reward}>
              <Icon name="bug" />
              <b>{bug.name}</b>
              <span className="muted">bestiary</span>
            </div>
          )}
        </div>
      ) : (
        <p className="muted">Rematch won! Rewards were claimed the first time.</p>
      )}
      <StoryBubbles
        lines={lines}
        moods={['celebrate', 'happy', 'celebrate']}
        curloSize={84}
        doneLabel={first ? 'Claim rewards' : 'Continue'}
        onDone={onClaim}
      />
    </div>
  );
}
