/**
 * Onboarding (#/onboarding, immersive), port of legacy engine/onboarding.js:
 * Curlo drops in and tells the story, then name + starting look, a daily
 * goal, and an optional placement quiz. The shell sends every
 * not-yet-onboarded player here.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useGame } from '@/app/gameContext';
import { navigate } from '@/app/navigation';
import { STARTER_COLORS } from '@/engine/config';
import { SlidePage } from '@/features/boss/session/SessionFrame';
import { Curlo } from '@/features/curlo/Curlo';
import { FALLBACK_COLORS, type CurloMood } from '@/features/curlo/curloArt';
import { SpeechBubble } from '@/features/curlo/SpeechBubble';
import { useCurloReact } from '@/features/curlo/useCurloReact';
import { AutoGrowInput } from '@/ui/AutoGrowInput';
import { Button } from '@/ui/Button';
import { burstAt } from '@/ui/fx/effects';
import { anim, bounce, reduced } from '@/ui/fx/motion';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Layout';
import { Md } from '@/ui/Md';
import { toast } from '@/ui/toast';
import { Placement } from './Placement';
import styles from './onboarding.module.css';

const STORY = [
  'Hi hi hi! I’m **Curlo**, a brace-bean: half curly brace **{ }**, all heart!',
  'I live in the **Codebase**, and sneaky **bugs** keep breaking in!',
  'Learn **C++** with me, and we’ll write code no bug can break.',
  'I’ll explain, cheer, and tell terrible jokes. Ready, **Cpp Hero**?',
];
const STORY_MOODS: CurloMood[] = ['celebrate', 'worried', 'bracing', 'celebrate'];

const GOALS = [
  { min: 5, name: 'Casual', sub: 'A quick lesson a day' },
  { min: 10, name: 'Regular', sub: 'Two lessons a day' },
  { min: 20, name: 'Serious', sub: 'Level up fast' },
];

type Page = 'intro' | 'name' | 'goal' | 'offer' | 'placement';

export function OnboardingScreen() {
  const { store, update, game } = useGame();
  const p = store.state.profile;
  const [page, setPage] = useState<Page>('intro');
  const [name, setName] = useState(p.name || 'Curlo');
  const [variant, setVariant] = useState(p.variant || 'classic');
  const [goal, setGoal] = useState(p.dailyGoalMin || 10);

  const commit = () =>
    update((s) => {
      s.profile.name = name.trim().slice(0, 16) || 'Curlo';
      s.profile.variant = variant;
      s.profile.dailyGoalMin = goal;
      if (!s.cosmetics.owned.includes(variant)) s.cosmetics.owned.push(variant);
      s.cosmetics.equipped.color = variant;
      s.profile.onboarded = true;
    });

  const finish = () => {
    commit();
    navigate('/', { dir: 'up', replace: true });
    window.setTimeout(() => toast('Welcome, hero! Tap START to begin.', { icon: 'sparkle' }), 800);
  };

  if (page === 'placement') return <Placement />;

  const colorOf = (v: string) => game.cosmeticDef(v)?.color ?? FALLBACK_COLORS[v] ?? '#F2641B';

  return (
    <Screen label="Welcome to Cpp Hero" immersive className={styles.screen}>
      <div className={styles.page}>
        <SlidePage pageKey={page}>
          {page === 'intro' && <Intro variant={variant} onDone={() => setPage('name')} />}
          {page === 'name' && (
            <div>
              <div className={styles.eyebrow}>Step 1 of 3</div>
              <h2 className={styles.h2}>Name your companion</h2>
              <p className="muted">Keep Curlo or pick your own name, then choose a look.</p>
              <div className={styles.preview}>
                <Curlo mood="celebrate" reactKey={(STARTER_COLORS as readonly string[]).indexOf(variant)} cosmetics={{ color: variant, hat: null }} />
              </div>
              <label className={styles.lbl} htmlFor="ob-name">
                Name
              </label>
              <AutoGrowInput
                id="ob-name"
                variant="field"
                value={name}
                maxLength={16}
                autoComplete="off"
                onChange={(v) => setName(v.replace(/\n/g, '').slice(0, 16))}
                onEnter={() => setPage('goal')}
                data-autofocus
              />
              <div className={styles.lbl} id="ob-look">
                Look
              </div>
              <Radios
                label="ob-look"
                className={styles.variants}
                items={STARTER_COLORS.map((v) => ({
                  id: v,
                  node: (
                    <>
                      <span className={styles.swatch} style={{ background: colorOf(v) }}>
                        {v === variant && <Icon name="check" />}
                      </span>
                      <small>{game.cosmeticDef(v)?.name ?? v}</small>
                    </>
                  ),
                }))}
                value={variant}
                onChange={setVariant}
                itemClass={styles.variant}
              />
              <Button block iconEnd="next" className={styles.next} onClick={() => setPage('goal')}>
                Continue
              </Button>
            </div>
          )}
          {page === 'goal' && (
            <div>
              <div className={styles.eyebrow}>Step 2 of 3</div>
              <h2 className={styles.h2}>Pick a daily goal</h2>
              <p className="muted">A little every day beats a lot once a week. You can change it later.</p>
              <div className={styles.lbl} id="ob-goal">
                Daily goal
              </div>
              <Radios
                label="ob-goal"
                className={styles.goals}
                itemClass={styles.goal}
                items={GOALS.map((g) => ({
                  id: String(g.min),
                  node: (
                    <>
                      <b>{g.min} min</b>
                      <span>{g.name}</span>
                      <small>{g.sub}</small>
                      <Icon name="ok" className={styles.check} />
                    </>
                  ),
                }))}
                value={String(goal)}
                onChange={(v) => setGoal(Number(v))}
              />
              <Button block iconEnd="next" onClick={() => setPage('offer')}>
                Continue
              </Button>
            </div>
          )}
          {page === 'offer' && (
            <Offer
              variant={variant}
              canPlace={game.worlds().length > 1}
              onScratch={finish}
              onPlace={() => {
                commit();
                setPage('placement');
              }}
            />
          )}
        </SlidePage>
      </div>
    </Screen>
  );
}

/* ---------------- pieces ---------------- */

function Intro({ variant, onDone }: { variant: string; onDone: () => void }) {
  const [i, setI] = useState(-1);
  const curlo = useCurloReact('happy');
  const hero = useRef<HTMLDivElement>(null);
  const last = i >= STORY.length - 1;
  const react = curlo.react;

  useEffect(() => {
    void anim(
      hero.current,
      [
        { transform: 'translateY(-160%) scale(.8)', opacity: 0 },
        { transform: 'translateY(8%) scale(1.14,.84)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(-6%) scale(.95,1.06)', offset: 0.75 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 900, delay: 200, fill: 'backwards', rm: 'fade' },
    ).then(() => burstAt(hero.current, { n: 60 }));
    const t = window.setTimeout(() => setI(0), reduced() ? 0 : 700);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (i >= 0) react(STORY_MOODS[i] ?? 'happy', 1200);
  }, [i, react]);

  const next = () => (last ? onDone() : setI((k) => k + 1));
  return (
    <div>
      <div className={styles.brand}>
        <span className={styles.logo}>Cpp Hero</span>
      </div>
      <div className={styles.hero}>
        <div className={styles.halo}>
          <span className={styles.spark} style={{ left: 18, top: 40 }} />
          <span className={styles.spark} style={{ right: 22, top: 24, animationDelay: '-.8s' }} />
          <span className={styles.spark} style={{ right: 10, bottom: 52, animationDelay: '-1.6s' }} />
          <div ref={hero} className={styles.heroCurlo}>
            <Curlo {...curlo.props} cosmetics={{ color: variant }} pokeLabel="Poke Curlo" onPoke={() => undefined} />
          </div>
        </div>
      </div>
      <div className={styles.say} aria-live="polite">
        {i >= 0 && (
          <SpeechBubble tail="bottom" popKey={i}>
            <Md text={STORY[i]!} />
          </SpeechBubble>
        )}
      </div>
      <div className={styles.dots} aria-hidden="true">
        {STORY.map((_, k) => (
          <i key={k} className={k <= i ? styles.on : undefined} />
        ))}
      </div>
      <Button block size="big" iconEnd="next" onClick={next} data-autofocus>
        {last ? 'Let’s do this!' : 'Next'}
      </Button>
      <button type="button" className={styles.link} onClick={onDone}>
        Skip intro
      </button>
    </div>
  );
}

function Offer({
  variant,
  canPlace,
  onScratch,
  onPlace,
}: {
  variant: string;
  canPlace: boolean;
  onScratch: () => void;
  onPlace: () => void;
}) {
  return (
    <div>
      <div className={styles.eyebrow}>Step 3 of 3</div>
      <h2 className={styles.h2}>Know some C++ already?</h2>
      <div className={styles.previewSmall}>
        <Curlo mood="thinking" cosmetics={{ color: variant, hat: null }} />
      </div>
      <p className="muted">
        {canPlace
          ? 'Take a short placement quiz (3 questions per world) to skip worlds you know. No hearts, no pressure.'
          : 'Start from the beginning. Placement unlocks once more worlds arrive.'}
      </p>
      <div className={styles.col}>
        <Button block icon="play" onClick={onScratch} data-autofocus>
          Start from scratch
        </Button>
        {canPlace && (
          <Button block variant="ghost" icon="target" onClick={onPlace}>
            Take the placement quiz
          </Button>
        )}
      </div>
    </div>
  );
}

/** A radio group of big buttons (arrow keys move the choice, roving tabindex). */
function Radios({
  label,
  items,
  value,
  onChange,
  className,
  itemClass,
}: {
  label: string;
  items: { id: string; node: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  itemClass?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pick = (id: string, el?: Element | null) => {
    onChange(id);
    void bounce(el ?? null);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = Math.max(0, items.findIndex((x) => x.id === value));
    const n = (i + d + items.length) % items.length;
    const el = root.current?.children[n] as HTMLElement | undefined;
    pick(items[n]!.id, el);
    el?.focus();
  };
  return (
    <div ref={root} role="radiogroup" aria-labelledby={label} className={className} onKeyDown={onKey}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={it.id === value}
          tabIndex={it.id === value ? 0 : -1}
          className={itemClass}
          onClick={(e) => pick(it.id, e.currentTarget)}
        >
          {it.node}
        </button>
      ))}
    </div>
  );
}
