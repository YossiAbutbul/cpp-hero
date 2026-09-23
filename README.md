# Cpp Hero

Learn C++ from zero. Defend your code. A game-like PWA that teaches modern C++ with a focus on safe, defensive programming.

React 18 + TypeScript + Vite, installable and offline (vite-plugin-pwa). All lessons and
challenges are YAML files in [`content/`](content/README.md), validated at build time.

## Project status (2026-09-23)

| Area | State |
| --- | --- |
| Design | Chosen: **Pop Path** (`designs/5-springboard.html`) with the **original Curlo** mascot, unchanged |
| Legacy vanilla app | Behavioral + visual reference (`legacy/`, published at https://claude.ai/artifact/TjyqcuJjayUHvTnoTU6jbv) |
| Content | **All 16 worlds done** (84 lessons, 802 challenges, 16 projects, 16 bosses). `npm run validate` clean and **`check:cpp` clean for all 16 worlds** (g++ 14 via Docker) |
| Tooling | `check:cpp`: per-run work dirs, `--filter` (world/lesson/challenge), `--list`, WSL or Docker `gcc:14`. Demo steps: `vars: null`, `push`/`pop` frames, `mem` cells + pointer arrows (`demoStates()`). Validate checks cross-world `reviewTags` |
| React screens (Phase B2) | **Done on `main`**: ChallengeRunner + all 12 types, lesson player, practice/review/arena, CodeDemo frames + memory; map, onboarding + placement, project + Stress Test, boss battle; Curlo, Vault, Bestiary, Stats, Settings. lint (0 errors), `tsc -b`, tests, build pass |
| Cloud save + deploy | **In progress on branch `wip/cloud`** (not on `main`). Security level chosen by the user: **A** = strict Firestore rules + App Check (no server-side game logic). See step 1 below |

### How to continue

When the user says **"continue according to plan"**, do these steps in order. Use parallel subagents where noted.

1. **Finish cloud save + Vercel deploy (branch `wip/cloud`).**
   - **What's on the branch:** `git merge origin/wip/cloud` into `main`. It holds work stopped mid-way: `src/cloud/*` (lazy Firebase, Google sign-in, local/cloud merge + tests, reconcile, session), `CloudCard` in Settings, the `store.ts` hook, `firestore.rules`, `tests/rules/` (rules tests via `@firebase/rules-unit-testing`), `firebase.json`, `.firebaserc` (placeholder id), `vercel.json` (headers/CSP/rewrites/caching), `.env.example`, `.env.emulator` (demo values only), and the vite/tsconfig/package changes. At the time of the WIP commit, `tsc -b` was clean and 120 tests passed.
   - **Requirements (all must hold):**
     - The app works fully offline and without login. With no `VITE_FIREBASE_*` env, cloud UI is hidden and Firebase is never loaded.
     - Merging local and cloud progress never loses or regresses progress.
     - Rules: only the owner can read/write `users/{uid}`, default deny, shape/type/size validation, monotonic progress (no decreasing XP/completions), `updatedAt == request.time`.
     - App Check is wired via env.
     - The CSP in `vercel.json` must not break the app.
   - **Remaining:**
     - Review the WIP code.
     - Run `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`.
     - Run the rules tests on the emulator (needs Java + firebase-tools; see package.json scripts).
     - Verify `npm run build && npm run preview` with the vercel.json headers (no CSP errors).
     - Play the app in the Browser pane twice: once without env (unchanged behavior) and once with emulators (`npm run emulators` + `npm run dev:emulators`), where fake Google sign-in syncs progress.
     - Write `docs/DEPLOY.md` with the user's manual steps: create the Firebase project, enable the Google provider, add authorized domains, create Firestore, `npx firebase deploy --only firestore:rules`, register and enforce App Check, import the Vercel project from GitHub, set env vars, verify.
     - Update this README, commit to `main`, push, and delete the `wip/cloud` branch.
   - **Hand-off:** end with a TLDR for the user: what's done, and exactly what they must do and how. They must create the accounts and enter the keys themselves; never do that for them.
2. **Full playtest** of all 16 worlds end to end: a full boss fight, the boss hearts-refill path, and Import/Paste/Reset in Settings (never tested by hand). Fix what breaks.
3. **Polish / follow-ups.** Can run as parallel subagents, each with its own folders:
   - Merge the duplicated session shells (`src/features/boss/session/` vs `src/features/lesson/`).
   - Move World 6 demos to `push`/`pop` and World 8 demos to `mem`.
   - Ideas from NOTES: a multi-stage boss schema (`content/worlds/16-final-boss/NOTES.md`), `obj` cards for inheritance/slicing (World 11 NOTES), moved-from "husk" boxes (World 15 NOTES).
   - Small visuals: arrows crossing stack/heap labels, wrapped order-tile indent, node labels at 360px, boss victory gap, fill hint "Close! Check spelling" shown too eagerly.

### Working notes (for Claude and humans)

- **Setup on a new machine:** Node 20.19+, `npm ci`. If node_modules gets corrupted (OneDrive sync), `rm -rf node_modules && npm ci`.
- **C++ checks:** need WSL Ubuntu with g++ or Docker with `gcc:14` (`docker pull gcc:14`). A full run takes about 25 min on Docker. Prefer per-world runs, e.g. `npm run check:cpp -- --filter w9`.
- **Parallel agents** share one working tree:
  - Each agent owns fixed folders and commits only its own paths (`git commit -m "..." -- <paths>`).
  - Never `git add -A`, `git stash`, `git reset`, `git checkout .` or `--autostash`.
  - Briefs: `docs/UI-BRIEF.md` and `docs/CONTENT-BRIEF.md`.
- **Commits:** plain messages, **no Co-Authored-By or AI attribution lines**.
- **Line endings:** some files show as modified only because of CRLF line endings. Ignore them.

User preferences that apply everywhere: short on-screen text with "Tell me more" for details; no visible scrollbars; code wraps instead of scrolling; inputs size to content; wrong answers get Try again / Show answer; sound off for now (`SOUND_ENABLED` in `src/engine/config.ts`); premium springy transitions; simple names.

To resume with Claude: open this folder in Claude Code and say _"Continue Cpp Hero from the README status"_.

## Getting started

Requires Node 20.19+ (22 recommended).

```
npm install
npm run dev          # http://localhost:5173 — editing content/*.yaml hot-reloads
```

| script                 | what it does                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | dev server with hot reload (YAML errors show in the browser overlay)                                                                                                                                                                                               |
| `npm run build`        | `validate`, type-check, production build to `dist/` (with service worker)                                                                                                                                                                                          |
| `npm run preview`      | serve `dist/` locally                                                                                                                                                                                                                                              |
| `npm test`             | Vitest unit tests (engine rules, save compatibility, content loader)                                                                                                                                                                                               |
| `npm run lint`         | ESLint (+ `npm run format` for Prettier)                                                                                                                                                                                                                           |
| `npm run validate`     | check every YAML file against the schema; lists `<file> › <path>: <problem>`                                                                                                                                                                                       |
| `npm run check:cpp`    | compile every C++ snippet (`g++ -std=c++20 -Wall -Wextra`) and run every predict-the-output program; uses WSL g++ on Windows, else g++/clang++ on PATH, else a pulled `gcc:14` Docker image. One world: `npm run check:cpp -- --filter w9` (see content/README.md) |
| `npm run legacy:build` | build the original vanilla app (`legacy/dist`, `.artifact/cpp-hero.html`)                                                                                                                                                                                          |

## Layout

- `content/` — worlds, lessons, projects, bosses, bestiary, achievements, cosmetics, quests (YAML). See [content/README.md](content/README.md).
- `src/engine/` — pure game logic (save format, XP/levels, hearts, streak, quests, achievements, SRS, answer matching). No React.
- `src/content/` — zod schema (the content format and its TypeScript types) and the loader.
- `src/app/`, `src/features/`, `src/ui/`, `src/styles/` — the React app (Phase B ports the screens).
- `scripts/` — validate, check:cpp, the one-off legacy converter, the Vite content plugin.
- `legacy/` — the original single-file vanilla-JS build, kept as the behavioral reference.
- `designs/` — Phase 1 visual/motion direction mockups (Pop Path = `5-springboard.html`).
- `docs/` — requirements and architecture (save format, content schema, text-length rules).
