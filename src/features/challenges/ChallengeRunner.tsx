/**
 * ChallengeRunner: one challenge of any of the 12 types, fully scored.
 *
 *   <ChallengeRunner key={`${i}:${ch.id}`} challenge={ch} mode="lesson" onContinue={next} />
 *
 * Key it per queue position so a new challenge starts fresh. The runner calls
 * game.answer (XP, combo, SRS, quests; boss hearts) and game.useHint itself, shows
 * the 3 hint tiers, the feedback panel, the retry flow ("Not quite" → Try
 * again / Show answer) and the explanation (Tell me more + side-by-side for
 * defensive types). Renderers (./renderers) only own their inputs.
 */
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useGame } from '@/app/gameContext';
import type { Challenge } from '@/content/schema';
import { HINT_COST, RETRY_MODES, type SessionMode } from '@/engine/config';
import { SideBySide, UbNote } from '@/features/code';
import { CurloSays, curloLine, useCurloReact, VOICE } from '@/features/curlo';
import { Button } from '@/ui/Button';
import { Expander } from '@/ui/Expander';
import { burstAt, flash, floatText } from '@/ui/fx/effects';
import { anim, bounce, reduced, shake, slideUp } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { Md } from '@/ui/Md';
import { overlayCount } from '@/ui/overlay/overlay';
import { ActionsContext } from './actionsContext';
import { answerText, firstSentence } from './answerText';
import { RENDERERS } from './renderers';
import { isDefensive, isTimedType, TYPE_LABELS, type CheckSpec, type Outcome, type Phase } from './types';
import styles from './challenges.module.css';

export interface ChallengeResult {
  correct: boolean;
  /** right on the first try without the answer hint */
  firstTry: boolean;
  /** the answer was shown (tier-3 hint, retry, or Show answer) */
  assisted: boolean;
  hints: number;
  retried: boolean;
}

export type RunnerMode = 'lesson' | 'project' | 'stress' | 'boss' | 'practice' | 'review' | 'placement';

export interface ChallengeRunnerProps {
  challenge: Challenge;
  mode: RunnerMode;
  /** default: true except boss / placement / speed / safe */
  allowRetry?: boolean;
  /** small label above the prompt (default: the type name) */
  eyebrow?: string;
  /** fires once when the challenge is settled (after reveal) */
  onResult?: (r: ChallengeResult) => void;
  /** the user pressed Continue */
  onContinue: (r: ChallengeResult) => void;
  /** Continue button text (default "Continue") */
  continueLabel?: string;
  /** hide the hint button (default: hidden in placement) */
  noHints?: boolean;
  /** override base XP for a correct first try */
  baseXp?: number;
  /** hide Curlo's head (e.g. boss rounds show the boss instead) */
  hideCurlo?: boolean;
  /** extra content between the head and the challenge body */
  before?: ReactNode;
}

interface Final {
  res: ChallengeResult;
  out: Outcome | null;
  header: string;
  xpText?: string;
}

function engineMode(m: RunnerMode): SessionMode {
  return m === 'stress' ? 'project' : m;
}

const resolveAnchor = (a: Outcome['anchor']): Element | null =>
  a == null ? null : a instanceof Element ? a : ((a as RefObject<Element | null>).current ?? null);

export function ChallengeRunner(props: ChallengeRunnerProps) {
  const { challenge: ch, mode, eyebrow, onResult, onContinue, continueLabel, hideCurlo, before } = props;
  const { game } = useGame();
  const timed = isTimedType(ch);
  const allowRetry =
    props.allowRetry ?? (RETRY_MODES.includes(engineMode(mode)) && mode !== 'boss' && mode !== 'placement');
  const noHints = timed || (props.noHints ?? mode === 'placement');
  const actx = {
    mode: engineMode(mode),
    base: props.baseXp ?? (mode === 'stress' ? game.STRESS_XP : undefined),
  };

  const [phase, setPhase] = useState<Phase>('answer');
  const [attempt, setAttempt] = useState(0);
  const [hints, setHints] = useState(0);
  const [assisted, setAssisted] = useState(false);
  const [retried, setRetried] = useState(false);
  const [soft, setSoft] = useState<{ out: Outcome; xpText?: string } | null>(null);
  const [final, setFinal] = useState<Final | null>(null);
  const [line, setLine] = useState('');
  const curlo = useCurloReact('thinking');

  const phaseRef = useRef<Phase>('answer');
  const rootEl = useRef<HTMLDivElement>(null);
  const bodyEl = useRef<HTMLDivElement>(null);
  const resultEl = useRef<HTMLDivElement>(null);
  const headEl = useRef<HTMLDivElement>(null);
  const contBtn = useRef<HTMLButtonElement>(null);
  const tryBtn = useRef<HTMLButtonElement>(null);
  const contDone = useRef(false);

  const canSoft = allowRetry && !retried && !timed;
  const tiers = ch.hints.length + 1;

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const fxFeedback = (good: boolean, anchor: Element | null) => {
    if (good) burstAt(anchor ?? rootEl.current, { n: 90 });
    else {
      shake(rootEl.current, 9);
      if (anchor)
        void anim(
          anchor,
          [
            { transform: 'none' },
            { transform: 'translateX(-6px) rotate(-2deg)' },
            { transform: 'translateX(6px) rotate(2deg)' },
            { transform: 'none' },
          ],
          { duration: 360 },
        );
      void flash();
    }
  };

  const settle = (res: ChallengeResult, out: Outcome | null, xpText?: string) => {
    const header = res.correct
      ? res.retried
        ? 'Got it on try two!'
        : res.assisted
          ? 'Correct (with help)'
          : 'Correct!'
      : out?.score != null && out.score > 0
        ? 'Almost!'
        : 'Not quite';
    setFinal({ res, out, header, xpText });
    setSoft(null);
    go('done');
    setLine(
      res.correct
        ? game.combo >= 3 && !res.assisted
          ? curloLine('combo', { n: game.combo })
          : curloLine('correct')
        : curloLine('wrong'),
    );
    curlo.react(res.correct ? 'celebrate' : 'worried', res.correct ? 1400 : 1800);
    onResult?.(res);
  };

  const submit = (o: Outcome) => {
    if (phaseRef.current !== 'answer') return;
    fxFeedback(o.correct, resolveAnchor(o.anchor));
    if (!o.correct && canSoft && !o.noRetry) {
      game.answer(ch, { correct: false, assisted, hints }, actx);
      setRetried(true);
      setSoft({ out: o });
      go('soft');
      setLine('Not quite. Give it another go!');
      curlo.react('worried', 1400);
      return;
    }
    if (retried) {
      const r = game.answer(ch, { correct: o.correct, assisted: true, retry: true, hints }, actx);
      settle(
        { correct: o.correct, firstTry: false, assisted: true, hints, retried: true },
        o,
        r.xp > 0 ? `+${r.xp} XP` : undefined,
      );
      return;
    }
    const r = game.answer(ch, { correct: o.correct, assisted, hints, score: o.score }, actx);
    settle(
      { correct: o.correct, firstTry: o.correct && !assisted, assisted, hints, retried: false },
      o,
      r.xp > 0 ? `+${r.xp} XP` : r.heartLost ? '−1 heart' : undefined,
    );
  };

  const tryAgain = () => {
    if (phaseRef.current !== 'soft') return;
    const el = resultEl.current;
    const reset = () => {
      setSoft(null);
      setAttempt((a) => a + 1);
      go('answer');
      setLine('Try again! You’ve got this.');
      curlo.react('thinking');
      bounce(bodyEl.current);
    };
    if (el && !reduced())
      void anim(
        el,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(16px) scale(.96)' },
        ],
        {
          duration: 180,
          fill: 'forwards',
          rm: 'keep',
        },
      ).then(reset);
    else reset();
  };

  const showAnswer = () => {
    if (phaseRef.current !== 'soft' || !soft) return;
    settle({ correct: false, firstTry: false, assisted, hints, retried: false }, soft.out, soft.xpText);
  };

  const openHint = (e: MouseEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== 'answer' || hints >= tiers) return;
    const t = hints;
    const isAnswer = t === tiers - 1;
    const d = game.useHint(Math.min(t + 1, 3) as 1 | 2 | 3);
    if (d) floatText(e.currentTarget, `${d} XP`, 'neg');
    setHints(t + 1);
    if (isAnswer) setAssisted(true);
    setLine(VOICE.hint[isAnswer ? 2 : Math.min(t, 1)] ?? '');
    curlo.react('thinking');
  };

  const cont = () => {
    if (contDone.current || !final) return;
    contDone.current = true;
    onContinue(final.res);
  };

  // Result panel: slide in, scroll it fully into view, focus the main button.
  useEffect(() => {
    if (phase === 'answer') return;
    slideUp(resultEl.current);
    const t = window.setTimeout(() => {
      try {
        revealResult(resultEl.current);
      } catch {
        /* ignore */
      }
      (phase === 'done' ? contBtn.current : tryBtn.current)?.focus({ preventScroll: true });
    }, 260);
    return () => clearTimeout(t);
  }, [phase]);

  // XP float on the verdict.
  useEffect(() => {
    if (!final?.xpText) return;
    const t = window.setTimeout(
      () => floatText(resultEl.current, final.xpText!, final.xpText!.startsWith('+') ? 'pos' : 'neg'),
      120,
    );
    return () => clearTimeout(t);
  }, [final]);

  // Enter = Continue (delayed so the key that answered doesn't also continue).
  const contRef = useRef(cont);
  useEffect(() => {
    contRef.current = cont;
  });
  useEffect(() => {
    if (phase !== 'done') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || overlayCount() > 0) return;
      const tg = e.target as HTMLElement | null;
      if (tg && tg.tagName === 'BUTTON' && tg !== contBtn.current) return;
      e.preventDefault();
      contRef.current();
    };
    const t = window.setTimeout(() => document.addEventListener('keydown', onKey), 350);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [phase]);

  const actions = (c: CheckSpec | null): ReactNode => {
    if (phase !== 'answer') return null;
    const showHint = !noHints && hints < tiers;
    if (!showHint && !c) return null;
    const nextIsAnswer = hints === tiers - 1;
    return (
      <div className={styles.actions}>
        {showHint && (
          <Button variant="ghost" icon="bulb" className={styles.hintBtn} onClick={openHint}>
            {hints === 0 ? 'Hint' : nextIsAnswer ? 'Show answer' : 'Bigger hint'}
            <span className={styles.hintCost}>−{HINT_COST[Math.min(hints, 2)]} XP</span>
          </Button>
        )}
        {c && (
          <Button disabled={c.disabled} onClick={c.onClick}>
            {c.label ?? 'Check'}
          </Button>
        )}
      </div>
    );
  };

  const R = RENDERERS[ch.type];
  const prompt =
    ch.prompt ||
    (ch.type === 'safe'
      ? 'Safe or unsafe? Decide fast!'
      : ch.type === 'speed'
        ? 'Answer as many as you can!'
        : '');
  const shownHints = ch.hints.slice(0, Math.min(hints, ch.hints.length));
  const answerShown = hints >= tiers && !noHints;

  return (
    <div ref={rootEl} className={styles.chal} data-type={ch.type}>
      <div className={styles.eyebrow}>{eyebrow ?? TYPE_LABELS[ch.type]}</div>
      <div ref={headEl}>
        {hideCurlo ? (
          <div className={styles.prompt}>
            {line && <span className={styles.reactLine}>{line}</span>}
            <Md text={prompt} />
          </div>
        ) : (
          <CurloSays {...curlo.props} popKey={line || prompt}>
            {line && <span className={styles.reactLine}>{line}</span>}
            <span className={styles.prompt}>
              <Md text={prompt} />
            </span>
          </CurloSays>
        )}
      </div>
      {before}
      <div ref={bodyEl} className={styles.body}>
        <ActionsContext.Provider value={actions}>
          <R
            ch={ch}
            phase={phase}
            attempt={attempt}
            canSoft={canSoft}
            reveal={phase === 'done'}
            submit={submit}
          />
        </ActionsContext.Provider>
      </div>
      {(shownHints.length > 0 || answerShown) && (
        <div className={styles.hintbox} aria-live="polite">
          {shownHints.map((h, i) => (
            <div key={i} className={styles.hint}>
              <b>
                <Icon name="bulb" /> Hint {i + 1}:
              </b>{' '}
              <Md text={h} />
            </div>
          ))}
          {answerShown && (
            <div className={`${styles.hint} ${styles.hintAnswer}`}>
              <b>
                <Icon name="bulb" /> Answer:
              </b>{' '}
              {answerText(ch)}
              {ch.explain && (
                <div className={styles.hx}>
                  <Md text={ch.explain} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {phase === 'soft' && soft && (
        <SoftPanel
          ref={resultEl}
          tryRef={tryBtn}
          out={soft.out}
          xpText={soft.xpText}
          nudge={!soft.out.pickedWhy && !soft.out.softMsg && hints === 0 ? ch.hints[0] : undefined}
          onTry={tryAgain}
          onShow={showAnswer}
        />
      )}
      {phase === 'done' && final && (
        <ResultPanel
          ref={resultEl}
          contRef={contBtn}
          ch={ch}
          final={final}
          continueLabel={continueLabel}
          onContinue={cont}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

interface SoftProps {
  out: Outcome;
  xpText?: string;
  nudge?: string;
  tryRef: RefObject<HTMLButtonElement>;
  onTry: () => void;
  onShow: () => void;
}

const SoftPanel = forwardRef<HTMLDivElement, SoftProps>(function SoftPanel(
  { out, xpText, nudge, tryRef, onTry, onShow },
  ref,
) {
  return (
    <div ref={ref} className={`${styles.result} ${styles.bad} ${styles.soft}`} aria-live="polite">
      <div className={styles.rh}>
        <Icon name="no" />
        <span>Not quite</span>
        {xpText && <span className={styles.rxp}>{xpText}</span>}
      </div>
      {out.pickedWhy && (
        <div className={styles.rpick}>
          <Icon name="no" />
          <span>
            <Md text={out.pickedWhy} />
          </span>
        </div>
      )}
      {out.softMsg && (
        <div className={styles.rpick}>
          <Icon name="info" />
          <span>
            <Md text={out.softMsg} />
          </span>
        </div>
      )}
      {nudge && (
        <div className={styles.rpick}>
          <Icon name="bulb" />
          <span>
            <Md text={nudge} />
          </span>
        </div>
      )}
      <div className={styles.softBtns}>
        <Button ref={tryRef} variant="sun" icon="retype" onClick={onTry}>
          Try again
        </Button>
        <Button variant="ghost" onClick={onShow}>
          Show answer
        </Button>
      </div>
    </div>
  );
});

interface ResultProps {
  ch: Challenge;
  final: Final;
  continueLabel?: string;
  contRef: RefObject<HTMLButtonElement>;
  onContinue: () => void;
}

const ResultPanel = forwardRef<HTMLDivElement, ResultProps>(function ResultPanel(
  { ch, final, continueLabel, contRef, onContinue },
  ref,
) {
  const { res, out, header, xpText } = final;
  const good = res.correct;
  const short = ch.short || firstSentence(ch.explain);
  const sbs = isDefensive(ch) && ch.sideBySide ? ch.sideBySide : null;
  const sbsLines = sbs ? Math.max(sbs.unsafe.split('\n').length, sbs.hardened.split('\n').length) : 0;
  // Right answer: verdict + one line. The picked option's "why" and the code
  // comparison wait behind Tell me more (they mostly repeat the short line).
  // Wrong answer: show them, that's when they help.
  const lean = good && !res.assisted;
  const compactSbs = !!sbs && sbsLines <= 6 && !lean;
  const whyInMore = lean && !!out?.pickedWhy;
  const explainMore = ch.explain && ch.explain !== short;
  const hasMore = explainMore || whyInMore || out?.detail || (sbs && !compactSbs) || ch.unsafe || !!sbs;
  return (
    <div ref={ref} className={`${styles.result} ${good ? styles.good : styles.bad}`} aria-live="polite">
      <div className={styles.rh}>
        <Icon name={good ? 'ok' : 'no'} />
        <span>{header}</span>
        {xpText && <span className={styles.rxp}>{xpText}</span>}
      </div>
      {out?.score != null && out.total ? (
        <div className={styles.rscore}>
          {out.right} of {out.total} right
        </div>
      ) : null}
      {short && (
        <div className={styles.rshort}>
          <Md text={short} />
        </div>
      )}
      {out?.pickedWhy && !whyInMore && (
        <div className={styles.rpick}>
          <Icon name={good ? 'ok' : 'no'} />
          <span>
            <Md text={out.pickedWhy} />
          </span>
        </div>
      )}
      {out?.visible}
      {compactSbs && sbs && <SideBySide unsafe={sbs.unsafe} hardened={sbs.hardened} compact />}
      {hasMore && (
        <Expander className={styles.more}>
          {whyInMore && (
            <div className={styles.rpick}>
              <Icon name="ok" />
              <span>
                <Md text={out!.pickedWhy!} />
              </span>
            </div>
          )}
          {explainMore && (
            <div className={styles.rexp}>
              {ch.explain.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>
                  <Md text={p} />
                </p>
              ))}
            </div>
          )}
          {out?.detail}
          {sbs && !compactSbs && <SideBySide unsafe={sbs.unsafe} hardened={sbs.hardened} />}
          {(ch.unsafe || sbs) && <UbNote />}
        </Expander>
      )}
      <Button
        ref={contRef}
        variant={good ? 'teal' : 'coral'}
        iconEnd="next"
        className={styles.contBtn}
        onClick={onContinue}
      >
        {continueLabel ?? 'Continue'}
      </Button>
    </div>
  );
});

/**
 * Scroll the result panel into view with the space under it (the scroller's
 * bottom padding), i.e. to the end of the page: the panel is the last thing
 * on it. A panel taller than the screen keeps its top (the verdict) in view.
 */
function revealResult(el: HTMLElement | null) {
  if (!el) return;
  let sc = el.parentElement;
  while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
  if (!sc) return el.scrollIntoView({ block: 'end', behavior: reduced() ? 'auto' : 'smooth' });
  const panelTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
  const end = sc.scrollHeight - sc.clientHeight;
  const top = Math.min(end, Math.max(0, panelTop - 12));
  if (top > sc.scrollTop) sc.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
}
