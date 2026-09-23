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
| Cloud save + deploy | **Live at https://cpp-hero.vercel.app** (Vercel, auto-deploys from `main`). Firebase project `cpp-hero` (Spark, free): Google sign-in, Firestore `me-west1`, rules + indexes deployed. Sign-in and sync checked by the user on computer + phone, offline works. **App Check off on purpose** (reCAPTCHA Enterprise needs billing); set `VITE_FIREBASE_APPCHECK_SITE_KEY` in Vercel to turn it on later. Known limits: XP from two devices played offline at the same time merges by taking the higher value; the newer device's streak wins |
| Polish (done) | Boss and lesson session shells merged into `src/features/session/`. World 6 demos use `push`/`pop` frames, World 8 demos use `mem` cells |
| Hearts | **Boss fights only.** Each fight starts with 5 hearts (not saved); a wrong first try costs one; at 0 a "Knocked out!" dialog offers Try again (fresh fight, intro skipped) or Back to map. No hearts, timers or lockouts in lessons, projects, practice or placement. `save.hearts` stays in the save format for old saves and cloud sync only |
| Playtest | **Done (2026-09-23).** Automated: all 802 challenges + a fresh save through all 16 worlds (`src/playthrough.test.ts`). By hand: World 1 boss knock-out, Try again and a full win to World 2; World 16 boss opens and renders; lessons, scroll-to-feedback, Tell me more; Settings Paste (junk, broken save, valid), Import file (newer version, too big, valid, Cancel), Copy, Reset (cancel + real). Lessons show only their own questions (review lives in Practice) |

### How to continue

When the user says **"continue according to plan"**, do these steps in order. Use parallel subagents where noted.

1. **Polish / follow-ups.** Can run as parallel subagents, each with its own folders:
   - World 6 and World 8 `NOTES.md` still describe the old demo format; update them.
   - Ideas from NOTES: a multi-stage boss schema (`content/worlds/16-final-boss/NOTES.md`), `obj` cards for inheritance/slicing (World 11 NOTES), moved-from "husk" boxes (World 15 NOTES).
   - If sign-in fails on iPhone/Safari: proxy `/__/auth/*` to `cpp-hero.firebaseapp.com` in `vercel.json` and set `VITE_FIREBASE_AUTH_DOMAIN=cpp-hero.vercel.app` (see docs/DEPLOY.md).
   - Small visuals: arrows crossing stack/heap labels, wrapped order-tile indent, node labels at 360px, boss victory gap, fill hint "Close! Check spelling" shown too eagerly.

### Working notes (for Claude and humans)

- **Setup on a new machine:** Node 20.19+, `npm ci`. If node_modules gets corrupted (OneDrive sync), `rm -rf node_modules && npm ci`.
- **Firebase emulators:** need Java 21+ (`winget install Microsoft.OpenJDK.21`). Set `JAVA_HOME` to it if an older Java is on PATH. `npm run test:rules` runs the rules tests. The Browser pane turns the sign-in popup into a same-tab page, so the emulator widget fails there ("No matching frame"); sign in from the console with `signInWithCredential(auth, GoogleAuthProvider.credential('{"sub":"t1","email":"t1@example.com"}'))` instead.
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
- `src/engine/` — pure game logic (save format, XP/levels, boss hearts, streak, quests, achievements, SRS, answer matching). No React.
- `src/content/` — zod schema (the content format and its TypeScript types) and the loader.
- `src/app/`, `src/features/`, `src/ui/`, `src/styles/` — the React app (Phase B ports the screens).
- `scripts/` — validate, check:cpp, the one-off legacy converter, the Vite content plugin.
- `legacy/` — the original single-file vanilla-JS build, kept as the behavioral reference.
- `designs/` — Phase 1 visual/motion direction mockups (Pop Path = `5-springboard.html`).
- `docs/` — requirements and architecture (save format, content schema, text-length rules).
