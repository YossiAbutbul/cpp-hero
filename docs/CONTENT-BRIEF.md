# Content brief (for writing a new world)

You are a senior C++ instructor and game writer writing ONE world of Cpp Hero, a game-like app teaching C++ from zero with a strong defensive-programming focus.

## Read first
- `docs/REQUIREMENTS.md` (curriculum + pedagogy), `docs/ARCHITECTURE.md` (schema concepts, text-length rules), `content/README.md` (YAML layout + tips), `src/content/schema.ts` (the binding schema, including checker fields `expect`, `prelude`, `stdin`, `programStdin`, `skip`).
- Study an existing world end to end as the model for tone, structure, density and YAML style: `content/worlds/03-operators-input/` (and skim 01, 02).

## Voice
Companion: **Curlo**, a warm, encouraging, slightly goofy tangerine jellybean that lives between two curly braces `{ }` and loves brace/semicolon puns. Story arc: Curlo's home "the Codebase" is overrun by bugs; the hero learns C++ to defend it; each world's boss is a bug lord. Continue the arc from the previous world's `story.victory`.

## Shape of a world
- `world.yaml` + 4–6 `lesson-NN.yaml` (exactly one `shield: true`, usually the last) + `project.yaml` + `boss.yaml`.
- Each lesson: concept (`short` ≤ 20 words, one-sentence `analogy`, tight `body`, `pitfall`), `demo` (code + steps with line/out/vars/notes; crash/shield steps in the shield lesson), 4–6 challenges, recap, vault cards (shield lesson's cards `defense: true`), `reviewTags` interleaving earlier worlds' tags early and this world's earlier tags later.
- Across the world: at least 8 different challenge types incl. at least 3 defensive types (`bug`, `breakit`, `harden`, `review`, `edge`, `safe`); `predict` in several lessons.
- Every challenge: `short` (≤ 15 words), `explain` (full), 2 hints, and a `why` on every option. Defensive types (except `safe`) have `sideBySide`.
- **Text is short on screen** (user requirement): follow every limit in the "Text length" table; long detail goes in `body`/`explain` (behind "Tell me more").
- Project: 4–6 guided steps, final `program`, Stress Test with 3 attacks the learner hardens against.
- Boss: hp 6–8, 7–9 rounds incl. one timed `speed` or `safe` round, defense phase with 3–4 hostile-input attacks, `taunt` lines, intro/victory strings, `reward: { xp, cosmetic, bug }` using the ids you are given.
- Ids unique and hierarchical (`w4.l2.c3`, `w4.p.s2`, `w4.boss.r5`), tags `w4.<concept>`.

## Accuracy (critical)
Modern C++17/20, `std::` prefixes, no `using namespace std`, `'\n'` over `std::endl`. Every snippet compiles except ones marked as intentionally broken (`expect` per schema). Unsafe snippets `unsafe: true`, and the text says what goes wrong and that UB doesn't guarantee a crash. Hardened versions are genuinely safe and compile warning-free with `-Wall -Wextra`. Predict answers must match real output byte for byte.

## Checks you must run until clean
- `npm run validate` (whole repo; only fix errors in YOUR world folder; if another world in progress has errors, ignore those).
- `npm run check:cpp` (g++ via WSL, 1–2 min). If it supports filtering to one world, use that; otherwise run it all and only fix your world.

## Rules for working in parallel
- Only create/edit files inside your own `content/worlds/NN-.../` folder. Do NOT edit `content/shared/*`, `src/`, `scripts/` or other worlds. If you believe the schema, a shared file or the engine needs a change (e.g. a new code-visualization step for pointers or stack frames), write it in `content/worlds/NN-.../NOTES.md` instead.
- Use only the boss `art` key and reward ids assigned to you (they already exist in shared files).
- When clean, commit ONLY your folder: `git add content/worlds/NN-...` then `git commit -m "Add World N: <title>" -- content/worlds/NN-...`, then `git push`. If git reports `index.lock` or a push rejection, wait a few seconds and retry (`git pull --rebase` then push). Plain commit messages, no Co-Authored-By or AI attribution lines.
- Reply concisely: lesson list, challenge count by type, project + boss summary, validate/check:cpp results, and any NOTES.
