# UI brief (Phase B2: feature screens)

Three agents build feature screens in parallel on top of the B1 foundation. Read this whole file.

## Read first
- `src/ui/README.md` (all primitives, dialogs, toasts, fx, Curlo, code components, navigation), `src/app/routes.tsx`, `src/app/*` (useGame, navigate, goBack), `src/engine/*` public APIs (game.answer, useHint, finishLesson, beatBoss, completeProject, finishPractice, reviewSet, interleaveFor, tick, drainCelebrations, events), `src/content/schema.ts` (types; `ChallengeOf<'fill'>`), `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`.
- Behavioral + visual reference (approved by the user after playtesting): `legacy/src/engine/*.js`, `legacy/src/styles.css`. Match or beat it. Open it with `node legacy/build.js` then http://localhost:8765/legacy/dist/index.html (launch config "static") if you want to compare.
- Dev gallery: `#/dev/ui`.

## Binding user preferences
- Short text by default; details behind "Tell me more" (Expander).
- No visible scrollbars; code never scrolls horizontally (CodeBlock wraps).
- Inputs size to content (AutoGrowInput).
- Wrong answer (except boss rounds, timed speed/safe rounds, placement): "Not quite" + feedback on the picked option WITHOUT revealing the answer, buttons [Try again] [Show answer]; no hearts outside boss fights; correct retry = small XP (engine handles via `retry`), still goes to review; second miss or Show answer = full reveal (correct answer, short, Tell me more with explain + all whys + SideBySide for defensive types).
- Never color alone for right/wrong (icon + text).
- Sound is disabled (SOUND_ENABLED=false); don't add audio calls that bypass the flag.
- Premium springy motion, <400ms, interruptible, reduced-motion aware, timeouts so nothing stays invisible.
- Mobile-first (test 360px and desktop), keyboard accessible, visible focus.

## Ownership (only edit your files; ask via a file note if you need a shared change)
| Agent | Owns |
|---|---|
| **B2a Lessons** | `src/features/lesson/`, `src/features/challenges/`, `src/features/practice/`, and extending `src/features/code/CodeDemo*` for new demo step kinds |
| **B2b World** | `src/features/map/`, `src/features/onboarding/`, `src/features/boss/`, `src/features/project/` |
| **B2c Collection** | `src/features/curlo/` (CurloScreen + new hat/shield art only; keep the original Curlo body/CSS untouched), `src/features/vault/`, `src/features/bestiary/`, `src/features/stats/`, `src/features/settings/` |

Shared files (`src/ui`, `src/app`, `src/engine`, `src/styles`, `src/content`): avoid editing. If a tiny shared change is unavoidable (e.g. export a helper, add a route param), keep it minimal and additive, and mention it in your final reply.

## Contract between B2a and B2b
B2a exports from `src/features/challenges/index.ts`:
```ts
export interface ChallengeResult { correct: boolean; firstTry: boolean; assisted: boolean; hints: number; retried: boolean }
export interface ChallengeRunnerProps {
  challenge: Challenge;                   // any of the 12 types
  mode: 'lesson' | 'project' | 'stress' | 'boss' | 'practice' | 'review' | 'placement' | 'refill';
  allowRetry?: boolean;                   // default: true except boss/placement/speed/safe
  eyebrow?: string;                       // small label above the prompt
  onResult?: (r: ChallengeResult) => void; // fires once when the challenge is settled (after reveal)
  onContinue: (r: ChallengeResult) => void; // user pressed Continue
}
export function ChallengeRunner(props: ChallengeRunnerProps): JSX.Element;
```
The runner calls `game.answer(...)` itself with the right mode (XP, combo, SRS, quests; boss hearts) and renders hints (3 tiers via game.useHint), feedback sheet, retry flow, explanations, side-by-side. B2a should land a first working version of the runner EARLY (commit + push within the first ~30 minutes, even if some types are basic) so B2b can build boss/project on it; B2b starts with the map and onboarding and uses a temporary stub if the runner isn't there yet.

## Done means
`npm run lint`, `tsc -b`, `npm test`, `npm run build` pass; you played your screens in the Browser pane (launch config "vite", port 5173) at 360px and desktop with no console errors; you committed only your files (plain messages, no Co-Authored-By/AI attribution; retry on git index.lock; `git pull --rebase` before push) and pushed to origin main. Reply concisely: what's done, shared-file changes, known gaps.
