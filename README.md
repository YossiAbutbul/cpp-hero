# Cpp Hero

Learn C++ from zero. Defend your code. A game-like PWA that teaches modern C++ with a focus on safe, defensive programming.

React 18 + TypeScript + Vite, installable and offline (vite-plugin-pwa). All lessons and
challenges are YAML files in [`content/`](content/README.md), validated at build time.

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
