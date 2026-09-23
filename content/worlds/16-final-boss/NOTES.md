# World 16 notes (for the engine / schema owners)

## Multi-stage boss (REQUIREMENTS §5, item 16)

The schema has no notion of boss stages, so the Undefined Dragon fakes it:

- `hp: 10` and 12 rounds (the brief's usual range is hp 6–8, 7–9 rounds), plus 5 defense attacks.
- Rounds are grouped in order and every prompt starts with its stage name:
  - Stage 1 · Scales of Logic (r1–r4): Worlds 1–7
  - Stage 2 · Wings of Memory (r5–r8): Worlds 8–11
  - Stage 3 · Fire of Abstraction (r9–r12): Worlds 12–15, ending in a timed `speed` and a timed `safe` round
  - Defense · The Dragon's Fire (d1–d5): one hostile input per layer (empty string, negative index, huge value, nullptr, endless text)

Suggested real support (optional, backward compatible):

```yaml
# boss.yaml
stages:                      # optional; absent = today's single stage
  - name: Scales of Logic
    taunt: [ "..." ]         # stage-specific taunts
    rounds: [ r1, r2, r3, r4 ]   # ids from `rounds`
    hp: 3                    # hits needed to break this stage
  - name: Wings of Memory
    ...
```

Engine ideas: a stage banner and a short "phase change" animation between stages (the Dragon changes
color or pose: `art` could accept `dragon` plus a stage index, or each stage could name its own tint); an hp
bar split into segments, one per stage; losing all hearts in a stage restarts only that stage; the defense
phase stays last as "the final fire". Validation: every stage round id must exist in `rounds`, stages must
cover all rounds in order, and the stage hp values must add up to the boss `hp`.

## Other notes

- **Tags**: World 16's challenges carry their own `w16.*` concept tags (`w16.ownership`, `w16.virtual`,
  `w16.exceptions`, `w16.templates`, `w16.stl`, `w16.move`, ...) plus World 1–8 tags where the code really
  uses them. The reviewTags interleave World 1–8 tags with tags from Worlds 9–15 (checked against the
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
