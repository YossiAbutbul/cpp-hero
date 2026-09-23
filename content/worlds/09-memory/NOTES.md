# World 9 notes (for the engine / schema / tooling owners)

## check:cpp has not been run on World 9 yet
On the machine this world was written on, `npm run check:cpp -- --filter w9` found no compiler
(no WSL `Ubuntu` distro, only `docker-desktop`; no native g++/clang; no `gcc:14` Docker image).
`npm run validate` is clean for `content/worlds/09-memory/`. Every predict answer and demo output
was traced by hand. Please run `npm run check:cpp -- --filter w9` where g++ is available.
Snippets to watch:
- `w9.l3.c3` (bug) and `w9.p.s4` (bug + `sideBySide.expect: error`) are meant to fail to compile
  (copying a unique_ptr).
- Unsafe snippets that may raise warnings on purpose (these are allowed): `w9.l2.c2`
  (new[] / delete mismatch), `w9.l5.c1`, `w9.l5.c4`, `w9.boss.r6` (use-after-free / double delete).

## Demo memory view usage
The demos use the new step fields: `push`/`pop` (with `pop: { returns }` in l1), `vars: null`,
and `mem` cells with pointer arrows and `drop`. `vars` are kept as a fallback.
- Heap cells are named `heap int`, `heap[0..2]` (group `scores`), `raw int`, `safe int`.
  `addr` holds the region label (`stack` / `heap`) rather than a hex address.
- l5 shows a **leak**: the owner `raw` is dropped while its target `raw int` is not, so the
  heap cell is left with no arrow pointing at it.

## Proposals (optional, backward compatible)
1. **Stack/heap regions in the memory view.** A cell field `area: stack | heap` (or treat
   `addr: stack|heap` as a region) would let the view draw two columns. Arrows would cross from
   the stack column into the heap column, which is the core picture of this world.
2. **Leak styling.** When a heap-area cell has no live pointer aimed at it (its last owner
   was dropped), draw it as "orphaned" (dimmed, maybe with a small leak-drip icon). This could be
   automatic or set with an explicit `leaked: true`. Pair it with `crash` for the leak demo.
3. **Owner vs view arrows.** Smart pointers own their target and raw `get()` pointers only
   look at it. A cell flag like `owns: true` (solid, thick arrow) vs a thin arrow for views
   would make the l5/boss "ask the owner, not the view" lesson visible.
