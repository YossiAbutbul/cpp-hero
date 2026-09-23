# ui — shared foundation (Phase B1)

Presentational React components, motion helpers and the app-level hosts
they talk to. No game rules here: components get data through props;
screens talk to the engine through `useGame()` (`src/app/gameContext.ts`).

Live gallery of everything below: **`npm run dev` → `#/dev/ui`** (dev only,
compiled out of production builds; source `src/features/dev/UiGallery.tsx`).

## Where things live

| path | what |
| --- | --- |
| `src/styles/tokens.css` | Pop Path tokens (colors, `--spring`, `--elastic`, fonts, radii, `--sh`) |
| `src/styles/global.css` | base, hidden scrollbars, focus ring, text size, reduced motion, View Transition CSS, shared keyframes (`ch-flick`, `ch-spin`, `ch-glitch`, `ch-bob`, `ch-twinkle`) |
| `src/ui/*` | primitives (one component + one `*.module.css` each), barrel `@/ui` |
| `src/ui/overlay/*` | Sheet, Dialog, `useDialog()`, overlay stack / focus trap / swipe / presence |
| `src/ui/fx/*` | motion (WAAPI), effects (confetti, flash, float text, shock), celebration queue + overlay |
| `src/ui/art/*` | boss / bestiary / world-icon SVG art (ported verbatim from legacy) |
| `src/features/curlo/*` | Curlo, speech bubbles, reactions, voice lines, evolution sequence |
| `src/features/code/*` | CodeBlock, CodeDemo, SideBySide, highlighter |
| `src/app/*` | shell, router, Stage + transitions, header/HUD, tab bar, hosts |

### Styling convention

- **CSS Modules** (`Foo.module.css`, imported as `styles`) for every component.
  Only use token variables for colors. Keyframes in a module are scoped; shared
  ones are global in `global.css` (`animation: ch-flick …`).
- **Global CSS** only where class names live inside SVG markup strings:
  `src/features/curlo/curlo.css` (the verbatim Curlo block) and `src/ui/art/art.css`.
- Tiny global utilities: `.sr`, `.muted`, `.small`, `.center`, `.mono`, `code.i`, `.ic`.
- Rules: no visible scrollbars (global), code never scrolls sideways, inputs grow
  with their content (`AutoGrowInput`), transitions ≤ ~400ms, transform/opacity only.
- Root switches: `<html data-ts="s|m|l">` text size, `<html class="rm">` reduced
  motion (set by `useApplySettings`). In JS use `reduced()` / `useReducedMotion()`.

## Primitives (`import { … } from '@/ui'`)

```tsx
<Button onClick={go}>Start</Button>                     // variant: primary|tang|teal|sun|coral|ghost
<Button variant="teal" icon="play" size="small">Run</Button>   // size: md|small|big, block = full width
<IconButton icon="x" label="Close" />                  // square, size md|small
<MorphIconButton icon="settings" label="Settings" open={isOpen} />  // icon → X
<Chip icon="quest" onClick={open} label="Daily quests">1/3</Chip>  // tone: default|hot|teal|coral
<Icon name="shield" size={20} />                       // names: src/ui/icons.ts (ICON_NAMES)
<ProgressBar value={into} max={need} tone="xp" label="XP" />       // springs in; tone xp|teal|tang|coral|sky|sun
<CountUp value={xp} format={(n) => `${n} XP`} />
<Tabs label="Vault" value={tab} onChange={setTab} items={[{ id, label, icon, panel }]} />
<Expander>{longText}</Expander>                          // "Tell me more" / "Show less"
<StreakFlame days={7} />  <ComboMeter combo={c} multiplier={m} />  <Hearts n={3} max={5} />
<AutoGrowInput variant="fill|console|field" value={v} onChange={setV} label="…" onEnter={check} />
<Md text="Use `std::cout` for **output**." />           // markdown-lite from content
<Screen label="Vault"><ScreenTitle eyebrow="…">Vault</ScreenTitle><Card>…</Card></Screen>
<BossArt kind={boss.art} size={120} hurt />  <BeastArt kind="imp" locked />  <WorldIcon kind="rocket" />
```

Every screen should render inside `<Screen>` (scroll container with the 16px gutter).

## Dialogs, sheets, toasts

```tsx
const dialog = useDialog();
if (await dialog.confirm({ title: 'Reset progress?', body: <p>…</p>, danger: true })) reset();
const v = await dialog.open({ title: 'Knocked out!', mood: 'worried', body: <p>…</p>,
  buttons: [{ label: 'Try again', value: 'retry', variant: 'coral' }, { label: 'Back to map', value: 'map', variant: 'ghost' }] });
const s = dialog.sheet({ title: 'Daily streak', body: (close) => <StreakInfo … /> });  // s.close(), await s.closed
toast('New world unlocked!', { icon: 'map', ms: 2600 });                        // works anywhere
```

Declarative forms also exist: `<Sheet open onClose title>` and `<Dialog open onClose title mood actions>`.
All overlays spring in, dismiss on Escape / scrim tap / swipe-down (handle or title),
trap focus and restore it. They portal into `#overlay-root` inside the app frame.
Never use `window.confirm/alert`.

## Motion + effects (`import { fx } from '@/ui'` or `@/ui/fx`)

```ts
fx.anim(el, keyframes, { duration, easing, fill, rm: 'skip'|'fade'|'keep' })  // always resolves; never leaves elements invisible
fx.popIn(el) fx.slideUp(el) fx.bounce(el) fx.shake(el) fx.wiggle(el) fx.stagger(els) fx.springPoke(el)
fx.pulseClass(el, styles.glitch, 1600)       // re-trigger a CSS animation class
fx.burstAt(el, { n: 80 })  fx.burst(x, y)  fx.rain(140)  fx.clearConfetti()   // canvas confetti
fx.flash('var(--coral)')   fx.floatText(el, '+20 XP', 'pos')   fx.shock(host, x, y)
fx.reduced()  /  useReducedMotion()          // OS setting or in-app toggle
fx.SPRING, fx.EASE_OUT, fx.EASE_IN
```

### Celebrations

The engine queues level-ups, achievements, bugs, cosmetics, shield tiers and
evolutions; the shell shows them one at a time (tap / Enter / Esc to skip):

```ts
await fx.requestCelebrations();   // call at a calm moment (results card); resolves when all are closed
await fx.showCelebration({ type: 'levelup', level: 4 });   // show one directly
```

The shell also calls `requestCelebrations()` ~0.5 s after landing on any
non-immersive screen, so sessions only need it before their own "continue".

## Curlo (`import { … } from '@/features/curlo'`)

```tsx
<Curlo />                                   // the player's Curlo: tier, form, hat/color/shield from the save
<Curlo mood="thinking" size={78} />         // moods: happy celebrate worried thinking bracing
<Curlo form={3} tier={2} cosmetics={{ hat: 'crown', color: 'mint', shield: 'shield-circuit' }} />  // fixed preview
<Curlo onPoke={() => setLine(curloLine('poke'))} />   // squishes + random reaction
<Curlo silhouette />                        // locked look

const c = useCurloReact('thinking');         // timed moods
<Curlo {...c.props} />;  c.react('celebrate', 1100);  c.react('worried', 1400);

<CurloSays mood="thinking" text={curloLine('thinking')} />     // Curlo + bubble header
<SpeechBubble tail="left|bottom|none" tone="boss" popKey={line} text={line} />
curloLine('combo', { n: 5 })               // categories in voice.ts (all lines ≤ 15 words, tested)
<EvolutionSequence from={1} to={2} name="Curlo" onDone={…} />  // normally shown by the celebration queue
```

The SVG + CSS are the original design, verbatim. Don't redesign; add gear
through `curloArt.ts` (additive layers only).

## Code (`import { … } from '@/features/code'`)

```tsx
<CodeBlock code={ch.code} unsafe={ch.unsafe} />                // UNSAFE badge + tint
<CodeBlock code="g++ -Wall main.cpp" lang="shell" />
<CodeBlock code={ch.code} blank={<AutoGrowInput variant="fill" value={v} onChange={setV} label="Fill the blank" />} />
<CodeBlock code={src} blank={(i) => <Slot n={i} />} />           // several ___
<CodeBlock code={src} highlightLines={[2]} />
<CodeBlock code={src} onLineClick={toggle} pressedLines={picked}
           lineState={(i) => 'flagged'|'ok'|'bad'|'miss'} lineMark={(i) => <Mark/>} />   // review / bug
<CodeBlock code={hardened} safe diffAgainst={unsafe} caption="+ marks the fix" />
<CodeDemo demo={lesson.demo} unsafe={…} onDone={() => setReady(true)} />   // typing, Run/Step/Retype, vars, crash, shield
<SideBySide unsafe={sb.unsafe} hardened={sb.hardened} compact />  <UbNote />
```

Long lines wrap with a hanging indent and keep one line number; blocks only
scroll vertically (capped at 60vh; `capHeight={false}` to disable).

## App shell, routes, navigation (`src/app`)

- `useGame()` → `{ store, game, content, version, notice, update }`.
  `update((s) => { s.settings.textSize = 'l'; })` mutates the save, saves and re-renders.
  Game rules go through `game.*` (XP, answers…).
- Routes (`src/app/routes.tsx`, hash-based). `handle` = `{ tab?, panel?, immersive? }`:
  immersive screens cover the header, HUD and tab bar.
- Navigate with the transition helpers, not react-router's `navigate`:

```ts
import { navigate, goBack } from '@/app/navigation';
navigate('/vault', { dir: 1 });                                   // slide (±1; View Transitions API when available)
navigate(`/lesson/${id}`, { dir: 'expand', origin: buttonEl });   // grow from the tapped element
goBack('/', { dir: 'close' });                                     // collapse back into it (or drop down)
navigate('/boss/w1', { dir: 'up' });  navigate('/stats', { dir: 'fade', replace: true });
```

  Give tappable origins `data-origin-id` (map nodes use the node id) so the
  collapse target can be found after the screen re-renders. All transitions are
  interruptible and become a crossfade under reduced motion.
- Shell hosts (mounted once in `AppShell`): `DialogProvider`, `ToastHost`,
  `CelebrationHost`, `FxLayer`, `UpdatePrompt` ("Refresh to update"),
  storage notice + engine toasts, the 5 s visibility/idle `game.tick(5)` clock,
  and the onboarding redirect for new players.

## Screen stubs (each owned by one feature)

| route | file |
| --- | --- |
| `#/` | `src/features/map/MapScreen.tsx` (placeholder list, already wired to expand/collapse) |
| `#/curlo` | `src/features/curlo/CurloScreen.tsx` |
| `#/practice` | `src/features/practice/PracticeScreen.tsx` |
| `#/vault` | `src/features/vault/VaultScreen.tsx` |
| `#/bestiary` | `src/features/bestiary/BestiaryScreen.tsx` |
| `#/stats` | `src/features/stats/StatsScreen.tsx` |
| `#/settings` | `src/features/settings/SettingsScreen.tsx` |
| `#/lesson/:id` | `src/features/lesson/LessonScreen.tsx` |
| `#/project/:world` | `src/features/project/ProjectScreen.tsx` |
| `#/boss/:world` | `src/features/boss/BossScreen.tsx` |
| `#/onboarding` | `src/features/onboarding/OnboardingScreen.tsx` |

Stubs use `src/app/StubScreen.tsx`; drop that import once a screen is real.
