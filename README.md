# Cpp Hero

Learn C++ from zero. Defend your code. A game-like PWA that teaches modern C++ with a focus on safe, defensive programming.

React 18 + TypeScript + Vite, installable and offline (vite-plugin-pwa). All lessons and
challenges are YAML files in [`content/`](content/README.md), validated at build time.

## Project status (2026-09-23)

| Area | State |
| --- | --- |
| Design | Chosen: **Pop Path** (`designs/5-springboard.html`) with the **original Curlo** mascot, unchanged |
| Legacy vanilla app | Behavioral + visual reference (`legacy/`, published at https://claude.ai/artifact/TjyqcuJjayUHvTnoTU6jbv) |
| Content | **All 16 worlds written** in YAML (84 lessons, 802 challenges, 16 projects, 16 bosses), `npm run validate` clean. Worlds 1–8 were compile-checked earlier; **Worlds 9–16 have NOT been through `check:cpp` yet** (no C++ compiler on the machine they were written on) |
| Tooling | `check:cpp` has per-run work dirs, `--filter` (world/lesson/challenge), `--list`, Docker `gcc:14` fallback (untested). Demo steps support `vars: null`, `push`/`pop` frames, `mem` cells + pointer arrows (`demoStates()` helper). Validate checks cross-world `reviewTags` exist |
| React screens (Phase B2) | **Done on `main`**: ChallengeRunner + all 12 types, lesson player, practice/review/arena, CodeDemo frames + memory; world map, onboarding + placement, project + Stress Test, boss battle; Curlo, Vault, Bestiary, Stats, Settings. lint (0 errors), `tsc -b`, tests, build pass |
| Firebase login + Vercel deploy | Planned for later, not started |

### How to continue

1. **Compile-check Worlds 9–16.** Get a compiler (`docker pull gcc:14`, or WSL Ubuntu + g++), then `npm run check:cpp` (or `-- --filter w9` etc.) and fix what fails. Snippets flagged as likely trouble are listed in `content/worlds/*/NOTES.md` (e.g. `w12.l3.c5` relies on g++ `-Wterminate`).
2. **Full playtest** of all 16 worlds end to end (a full boss fight and the boss hearts-refill path were not played start to finish).
3. **Polish / follow-ups** from agent reports and NOTES.md:
   - Merge the duplicated session shells (`src/features/boss/session/` vs `src/features/lesson/`).
   - Move World 6 demos to `push`/`pop` and World 8 demos to `mem` (now that CodeDemo renders them).
   - Ideas: multi-stage boss schema (`content/worlds/16-final-boss/NOTES.md`), `obj` cards for inheritance/slicing (World 11 NOTES), moved-from "husk" boxes (World 15 NOTES).
   - Small visuals: arrows crossing stack/heap labels, wrapped order-tile indent, node labels at 360px, boss victory gap; fill hint "Close! Check spelling" shown too eagerly.
4. **Later:** Firebase Auth (+ Firestore save sync, per-user security rules) and deploy to Vercel (static site; `npm run build` output).

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
