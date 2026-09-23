/**
 * Boss battle (#/boss/:world, immersive), port of legacy engine/boss.js:
 * dramatic entrance (dim + name card slam, tap to skip), the boss intro,
 * rounds (one HP segment per correct answer; misses make the boss taunt and
 * cost a heart; missed rounds come back until the HP is gone; timed rounds
 * are handled by the runner), the Defense Phase (hostile inputs hurled at
 * Curlo; block each by answering right), then victory, rewards through
 * game.beatBoss, and the results card. Running out of hearts offers a
 * refill round, never a dead end.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '@/app/gameContext';
import { goBack } from '@/app/navigation';
import type { Challenge, World } from '@/content/schema';
import { ChallengeRunner, TYPE_LABELS, type ChallengeResult } from '@/features/challenges';
import { CurloSays, SpeechBubble } from '@/features/curlo/SpeechBubble';
import { StoryBubbles } from '@/features/map/StoryBubbles';
import { BossArt } from '@/ui/art/Art';
import { Button } from '@/ui/Button';
import { burstAt, floatText, rain } from '@/ui/fx/effects';
import { anim, pulseClass, reduced, shake, slideUp, SPRING } from '@/ui/fx/motion';
import { plural } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { toast } from '@/ui/toast';
import { Arena, type ArenaHandle } from './session/Arena';
import { RefillRound } from './session/Refill';
import { Gain, ResultsCard } from './session/ResultsCard';
import { SessionFrame, SlidePage } from './session/SessionFrame';
import { useRefillPrompt } from './session/useRefillPrompt';
import { useSession, type SessionStats } from './session/useSession';
import { pick, shownInput, shuffled } from './session/util';
import sx from './session/session.module.css';
import styles from './boss.module.css';

type Step =
  | { k: 'intro' }
  | { k: 'round'; ch: Challenge; n: number; round: number }
  | { k: 'refill'; n: number; after: 'round' | 'defense' }
  | { k: 'defIntro' }
  | { k: 'defense'; i: number; n: number }
  | { k: 'victory' }
  | { k: 'results'; first: boolean; unlocked: World | null; stats: SessionStats };

const HIT_LINES = ['Ow! Lucky shot!', 'Grr… that stung!', 'Hmph. You’re better than I thought.', 'Not so fast!'];

export function BossScreen() {
  const { world = '' } = useParams();
  const { game } = useGame();
  const w = game.index.world[world];
  if (!w) {
    return (
      <Screen label="Boss battle" immersive>
        <p>That boss doesn’t exist (yet).</p>
        <Button onClick={() => goBack('/', { dir: 'close' })}>Back to the map</Button>
      </Screen>
    );
  }
  return <Battle key={w.id} w={w} />;
}

function Battle({ w }: { w: World }) {
  const { game, store } = useGame();
  const b = w.boss;
  const maxHp = Math.max(1, b.hp || b.rounds.length || 1);
  const defense = b.defense;
  const total = maxHp + defense.length + 1;
  const session = useSession({ noun: 'battle', quitText: 'Retreat? The boss will be back at full health next time.' });
  const refillPrompt = useRefillPrompt();

  // dev only: #/boss/w1?phase=defense|victory jumps ahead (for playtesting)
  const [jump] = useState(() => (import.meta.env.DEV ? new URLSearchParams(location.hash.split('?')[1]).get('phase') : null));
  const [step, setStep] = useState<Step>(() =>
    jump === 'defense' && defense.length ? { k: 'defIntro' } : jump === 'victory' ? { k: 'victory' } : { k: 'intro' },
  );
  const [dim, setDim] = useState(() => !reduced() && !jump);
  const [hp, setHp] = useState(jump ? 0 : maxHp);
  const hpRef = useRef(jump ? 0 : maxHp);
  const [done, setDone] = useState(0);
  const [say, setSay] = useState({ text: '', n: 0 });
  const seq = useRef(0);
  const queue = useRef({ list: b.rounds.slice(), i: 0, missed: [] as Challenge[] });
  const artEl = useRef<HTMLSpanElement>(null);
  const hpEl = useRef<HTMLDivElement>(null);
  const sayEl = useRef<HTMLDivElement>(null);
  const headEl = useRef<HTMLDivElement>(null);
  const arena = useRef<ArenaHandle>(null);
  const defIndex = useRef(0);

  const taunt = useCallback((text: string) => setSay((s) => ({ text, n: s.n + 1 })), []);
  const bossTaunt = useCallback(() => taunt(pick(b.taunt.length ? b.taunt : ['Ha! Missed me!'])), [b.taunt, taunt]);

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

  /* ---- flow ---- */
  const nextRound = useCallback(() => {
    if (hpRef.current <= 0) {
      setStep(defense.length ? { k: 'defIntro' } : { k: 'victory' });
      return;
    }
    const q = queue.current;
    if (q.i >= q.list.length) {
      q.list = shuffled(q.missed.length ? q.missed : b.rounds);
      q.missed = [];
      q.i = 0;
      toast('The boss is still standing! Round two!', { icon: 'swords' });
    }
    const ch = q.list[q.i++]!;
    setStep({ k: 'round', ch, n: ++seq.current, round: maxHp - hpRef.current + 1 });
  }, [b.rounds, defense.length, maxHp]);

  /** After a settled challenge: out of hearts → refill (or quit), else go on. */
  const afterAnswer = useCallback(
    async (then: () => void, after: 'round' | 'defense') => {
      if (store.state.hearts.n > 0) return then();
      const v = await refillPrompt();
      if (v === 'quit') session.leave();
      else setStep({ k: 'refill', n: ++seq.current, after });
    },
    [refillPrompt, session, store],
  );

  /* ---- hits and taunts ---- */
  /** hpRef is already lowered (on answer); this plays the hit. */
  const hit = useCallback(() => {
    const left = hpRef.current;
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
    taunt(left > 0 ? pick(HIT_LINES) : 'No… NO! My HP!');
  }, [taunt]);

  const boast = useCallback(() => {
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
    bossTaunt();
  }, [bossTaunt]);

  /* ---- pages ---- */
  const showHead = step.k === 'round' || (step.k === 'refill' && step.after === 'round');
  const wasHead = useRef(false);
  useLayoutEffect(() => {
    if (showHead && !wasHead.current) void slideUp(headEl.current);
    wasHead.current = showHead;
  }, [showHead]);

  let page: ReactNode = null;
  let key = step.k as string;
  switch (step.k) {
    case 'intro':
      page = (
        <Intro
          w={w}
          maxHp={maxHp}
          start={!dim}
          onFight={() => {
            taunt(pick(b.taunt.length ? b.taunt : ['Come at me!']));
            nextRound();
          }}
        />
      );
      break;
    case 'round': {
      const ch = step.ch;
      key = `r${step.n}`;
      page = (
        <ChallengeRunner
          challenge={ch}
          mode="boss"
          hideCurlo
          eyebrow={`Round ${step.round} · ${TYPE_LABELS[ch.type]}`}
          onResult={(r: ChallengeResult) => {
            session.record(r);
            if (r.correct) {
              hpRef.current = Math.max(0, hpRef.current - 1);
              setDone((d) => d + 1);
              window.setTimeout(hit, 200);
            }
            else {
              queue.current.missed.push(ch);
              window.setTimeout(boast, 200);
            }
          }}
          onContinue={() => void afterAnswer(nextRound, 'round')}
        />
      );
      break;
    }
    case 'refill':
      key = `f${step.n}`;
      page = (
        <RefillRound
          fallback={b.rounds}
          onDone={() => (step.after === 'round' ? nextRound() : setStep({ k: 'defense', i: defIndex.current, n: ++seq.current }))}
        />
      );
      break;
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
                defIndex.current = i + 1;
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
        <ResultsCard
          title="Boss defeated!"
          sub={`${b.name} won’t bug this world again.`}
          stats={step.stats}
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
      hearts
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
              <i key={i} className={[styles.seg, i >= hp ? styles.gone : ''].join(' ')} />
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
    void anim(root.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards', rm: 'keep' }).then(onDone);
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

function Intro({ w, maxHp, start, onFight }: { w: World; maxHp: number; start: boolean; onFight: () => void }) {
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
        <Icon name="heart" /> Misses cost a heart. Land {plural(maxHp, 'hit')}
        {b.defense.length ? ', then survive the Defense Phase!' : '!'}
      </p>
      <StoryBubbles lines={w.story.bossIntro} moods={['bracing', 'thinking', 'bracing']} curloSize={84} doneLabel="Fight!" onDone={onFight} />
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
      <Button block variant="teal" icon="shield" className={sx.next} onClick={onGo} data-autofocus>
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
    ).then(() => {
      burstAt(el, { n: 160 });
      rain(100);
    });
  }, []);
  const r = b.reward;
  const cos = r.cosmetic ? game.cosmeticDef(r.cosmetic) : undefined;
  const bug = r.bug ? game.bugDef(r.bug) : undefined;
  const lines = w.story.victory.length ? w.story.victory : [b.victory];
  return (
    <div className={styles.victory}>
      <BossArt ref={vb} kind={b.art} hurt className={styles.vicBoss} />
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
      <StoryBubbles lines={lines} moods={['celebrate', 'happy', 'celebrate']} curloSize={84} doneLabel={first ? 'Claim rewards' : 'Continue'} onDone={onClaim} />
    </div>
  );
}
