# Cpp Hero

Learn C++ from zero. Defend your code. A game-like PWA that teaches modern C++ with a focus on safe, defensive programming.

React 18 + TypeScript + Vite, installable and offline (vite-plugin-pwa). All lessons and
challenges are YAML files in [`content/`](content/README.md), validated at build time.

## Project status (2026-09-23)

| Area | State |
| --- | --- |
| Design | Chosen: **Pop Path** (`designs/5-springboard.html`) with the **original Curlo** mascot, unchanged |
| Legacy vanilla app | Complete and playable for Worlds 1–3 (`legacy/`, published at https://claude.ai/artifact/TjyqcuJjayUHvTnoTU6jbv). Behavioral + visual reference for the React port |
| Content | **Worlds 1–8 done** in YAML (41 lessons, 404 challenges, 8 projects, 8 bosses), all compile-checked with g++. Worlds 9–16 not started |
| React foundation | Done on `main`: scaffold, PWA, YAML pipeline + `validate` + `check:cpp`, engine logic in TS (90 tests), UI primitives, Curlo, CodeBlock/CodeDemo, app shell, router + transitions, screen **stubs** |
| React screens | **In progress, not on `main`.** Partial work saved on branch **`wip/phase-b2`** (challenge renderers, map pieces, stats pieces, cosmetic art, check:cpp + schema fixes). The map on `main` is still a placeholder list |
| Firebase login + Vercel deploy | Planned for later, not started |

### How to continue

1. **Finish the React screens (Phase B2).** Follow [`docs/UI-BRIEF.md`](docs/UI-BRIEF.md): three parallel parts with fixed file ownership and a `ChallengeRunner` contract:
   - **B2a Lessons:** `ChallengeRunner` + all 12 challenge types, lesson player, practice/review, CodeDemo support for the new demo step kinds.
   - **B2b World:** real map, onboarding + placement, project + Stress Test, boss battle.
   - **B2c Collection:** Curlo screen (stats, evolution, wardrobe + art for new cosmetics), Vault, Bestiary, Stats, Settings.
   - Start from the partial work: `git merge wip/phase-b2` (or cherry-pick per folder). It was stopped mid-edit, so expect some files to be incomplete; run `npm run lint && npx tsc -b && npm test` and fix or drop what doesn't build.
2. **Tooling fixes** (partly on `wip/phase-b2`): per-run work dir for `check:cpp`, `--filter` only requiring the filtered world to validate, more default headers in the fragment wrapper, top-level function snippets; schema extensions for demo steps (`vars: null` removes a box, `push`/`pop` stack frames, `mem` cells + pointer arrows, see `content/worlds/08-references-pointers/NOTES.md`); fix cross-world `reviewTags` and story continuity. Writer notes: `content/worlds/*/NOTES.md`.
3. **Stage 3 content:** Worlds 9–12 (Memory, Structs & Classes, Inheritance & Polymorphism, The Citadel), then **Stage 4:** Worlds 13–16 + final boss. Brief: [`docs/CONTENT-BRIEF.md`](docs/CONTENT-BRIEF.md); one agent per world, each only touches its own folder. Boss reward cosmetics must exist in `content/shared/cosmetics.yaml` first (add them before launching writers).
4. **Later:** Firebase Auth (+ Firestore save sync, per-user security rules) and deploy to Vercel (static site; `npm run build` output).

User preferences that apply everywhere: short on-screen text with "Tell me more" for details; no visible scrollbars; code wraps instead of scrolling; inputs size to content; wrong answers get Try again / Show answer; sound off for now (`SOUND_ENABLED` in `src/engine/config.ts`); premium springy transitions; simple names.

To resume with Claude: open this folder in Claude Code and say *"Continue Cpp Hero from the README status"*.

## Getting started

Requires Node 20.19+ (22 recommended).

```
npm install
npm run dev          # http://localhost:5173 — editing content/*.yaml hot-reloads
```

| script                 | what it does                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | dev server with hot reload (YAML errors show in the browser overlay)                                                                                   |
| `npm run build`        | `validate`, type-check, production build to `dist/` (with service worker)                                                                              |
| `npm run preview`      | serve `dist/` locally                                                                                                                                  |
| `npm test`             | Vitest unit tests (engine rules, save compatibility, content loader)                                                                                   |
| `npm run lint`         | ESLint (+ `npm run format` for Prettier)                                                                                                               |
| `npm run validate`     | check every YAML file against the schema; lists `<file> › <path>: <problem>`                                                                           |
| `npm run check:cpp`    | compile every C++ snippet (`g++ -std=c++20 -Wall -Wextra`) and run every predict-the-output program; uses WSL g++ on Windows, else g++/clang++ on PATH |
| `npm run legacy:build` | build the original vanilla app (`legacy/dist`, `.artifact/cpp-hero.html`)                                                                              |

## Layout

- `content/` — worlds, lessons, projects, bosses, bestiary, achievements, cosmetics, quests (YAML). See [content/README.md](content/README.md).
- `src/engine/` — pure game logic (save format, XP/levels, hearts, streak, quests, achievements, SRS, answer matching). No React.
- `src/content/` — zod schema (the content format and its TypeScript types) and the loader.
- `src/app/`, `src/features/`, `src/ui/`, `src/styles/` — the React app (Phase B ports the screens).
- `scripts/` — validate, check:cpp, the one-off legacy converter, the Vite content plugin.
- `legacy/` — the original single-file vanilla-JS build, kept as the behavioral reference.
- `designs/` — Phase 1 visual/motion direction mockups (Pop Path = `5-springboard.html`).
- `docs/` — requirements and architecture (save format, content schema, text-length rules).
