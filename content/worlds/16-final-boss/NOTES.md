# World 16 notes (for the engine / schema owners)

## Multi-stage boss (REQUIREMENTS §5, item 16): done

`boss.yaml` uses the optional `stages` field (schema: `BossStageSchema` in `src/content/schema.ts`,
logic: `src/engine/boss.ts`). Bosses 1-15 have no `stages` and play as one stage, unchanged.

- `hp: 10`, 12 rounds, 5 defense attacks.
  - Stage 1 · Scales of Logic (r1-r4, hp 3): Worlds 1-7
  - Stage 2 · Wings of Memory (r5-r8, hp 3): Worlds 8-11
  - Stage 3 · Fire of Abstraction (r9-r12, hp 4): Worlds 12-15, ending in a timed `speed` and a timed `safe` round
  - Defense · The Dragon's Fire (d1-d5): one hostile input per layer (empty string, negative index, huge value, nullptr, endless text)
- Each stage has its own taunts. Round prompts no longer start with the stage name (the banner and the
  "Stage 2 · Round 1" label show it).
- Screen: a springy stage banner ("Stage 2 of 3 · Wings of Memory") before each stage, the Dragon rears up on
  a new stage, the hp bar is one bar for the whole fight with a small gap between stage groups.
- Hearts: 5 per fight, carried from stage to stage. Out of hearts restarts only the current stage (its hp comes
  back, fresh 5 hearts, "Retry stage"); out of hearts in the Defense Phase restarts only the Defense Phase.
- Validation: stage round ids must list every round once, in order; stage hp must add up to the boss hp; each
  stage needs at least its hp in rounds.
- Still open (nice to have): a per-stage tint or pose for the Dragon art.

## Other notes

- **Tags**: World 16's challenges carry their own `w16.*` concept tags (`w16.ownership`, `w16.virtual`,
  `w16.exceptions`, `w16.templates`, `w16.stl`, `w16.move`, ...) plus World 1-8 tags where the code really
  uses them. The reviewTags interleave World 1-8 tags with tags from Worlds 9-15 (checked against the
  files present when this was finished) and this world's earlier `w16.*` tags.
- **Story**: the intro picks up World 15's ending ("every bug we beat was just a scale") and the Dragon's
  "I am every bug you ever fixed" taunt. If W15's victory text changes, the first intro line is the one to align.
- **Bestiary**: challenges use existing ids (`off-by-one`, `missing-default`, `use-after-free`,
  `null-deref`, `out-of-bounds`, `object-slicing`, `missing-virtual-dtor`, `broken-invariant`,
  `unconstrained-template`, `map-bracket-insert`, `dangling-capture`, `unchecked-find`, `use-after-move`,
  `signed-unsigned`, `double-delete`, `memory-leak`, `overflow`, `cin-fail`, `ub-hydra`).
  The boss reward is `ub-hydra` (its bestiary art is `spider`; a hydra illustration would suit it better).
- **Demos** use the new step fields: `push`/`pop` call frames (l1, l4) and `mem` cells with pointer
  arrows, a vector reallocation and `drop` (l2).
- **check:cpp not run yet**: this machine had no C++ compiler when World 16 was written (no WSL Ubuntu
  distro, no local g++/clang++, and the `gcc:14` Docker image wasn't pulled). `npm run validate` is clean;
  all 132 World 16 snippets were reviewed by hand, but `npm run check:cpp -- --filter w16` should be run
  once a compiler is available.
