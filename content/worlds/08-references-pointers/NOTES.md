# World 8 notes (for the engine / schema owners)

World 8 works with today's schema: pointers show up in demo `vars` boxes as text
(`p: "→ hp"`, `p: "→ mana"`, `target: "nullptr"`, `target: "→ ??? (dangling)"`, a dead local as
`goblin: "(gone)"`). REQUIREMENTS §7 asks for **pointers drawn as arrows between memory cells**.
Here's the addition I'd like. It's optional and backward compatible, so the lessons don't need to change until it ships.

## Proposed: a `mem` field on demo steps

```yaml
steps:
  - line: 5
    note: "p stores hp's address: an arrow to hp's box."
    mem:
      cells:                         # upsert, keyed by name (like vars)
        - { name: hp,   value: "5", addr: "0x10" }     # addr optional, display only
        - { name: mana, value: "8", addr: "0x14" }
        - { name: p,    ptr: hp }                        # a pointer cell: arrow to cell "hp"
  - line: 8
    mem:
      cells:
        - { name: p, ptr: mana }     # the arrow animates from hp to mana (reseat)
  - line: 10
    mem:
      cells:
        - { name: p, ptr: null }     # arrow collapses into a "null" stub (⊘)
  - line: 9                          # shield lesson: scope end
    mem:
      drop: [goblin]                 # cell fades/crumbles; arrows into it turn red + dashed
```

Schema (zod) sketch, to add to `DemoStepSchema`:

```ts
const MemCellSchema = z.strictObject({
  name: z.string().min(1),
  value: z.string().optional(),        // "?" = garbage, as in vars
  addr: z.string().optional(),         // shown small under the cell, e.g. "0x7ffc…10"
  ptr: z.string().nullable().optional(), // target cell name; null = nullptr; absent = not a pointer
  ref: z.string().optional(),          // reference: draw as a second label on the target cell, no arrow
  group: z.string().optional(),        // cells with the same group sit side by side (arrays: loot[0..2])
});
mem: z.strictObject({
  cells: z.array(MemCellSchema).default([]),
  drop: z.array(z.string()).default([]), // cells whose lifetime ended (scope exit / return)
}).optional(),
```

Rendering rules I'd want:
- A pointer cell draws an arrow to its target. A reseat animates the arrowhead to the new target (transform only, under 400ms).
- `ptr: null` shows a short stub ending in ⊘ ("points nowhere").
- A `ref` doesn't get an arrow. It shows as an extra name tag on the target cell (`hp` / `life`), which makes "a reference is another name" visible.
- `drop` crumbles the cell. Any arrow still pointing at it turns red and dashed, and the cell becomes a "ghost" slot (the Dangling Wraith motif). Paired with `crash`, that's the dangling-pointer visual. Paired with `shield` after a `ptr: null` reset, it's the hardened one.
- `group` cells render as one contiguous strip, so `p + 1` moving to the next element reads as pointer arithmetic, and an arrow past the end of the strip can glow as UB.
- Validation: `ptr` and `ref` must name a cell that exists at that step, or one defined in an earlier step.

With `mem`, the demos in this world would add these visuals (the `vars` would stay as a fallback):
- l1: `life` as a `ref` tag on `hp`.
- l2: `hp` in `healRef` as a `ref` onto `knight`, and the copy in `healCopy` as a separate cell that gets dropped.
- l3: arrow hp → mana → null.
- l4: the `loot` strip with `p` stepping along it, plus `view` as a read-only (lock-icon) arrow.
- l5: `goblin` dropped while `target` still points at it (red, dashed), then the reset to null.

## Other notes
- **Tags from parallel worlds**: `reviewTags` may only name tags that some challenge carries. W6/W7 aren't merged yet, so some W8 challenges carry W6/W7 tags themselves where the content really uses them: `w6.params`, `w6.const-ref`, `w6.return`, `w6.scope`, `w7.vector`, `w7.at`, `w7.invalidation`. W4/W5 tags aren't used, because I couldn't confirm their names.
- **check:cpp and parallel work**: `scripts/check-cpp.ts` exits if there's any validation error anywhere in `content/`, even with `--filter`. Other worlds in progress had errors, so I ran an identical copy of the script from my scratch dir. The copy only (a) skipped that early exit when `--filter` is given and (b) used a private work dir instead of the shared `.cpp-check/`. Suggestion: with `--filter`, only refuse to run on issues in the files that match the filter, and give each run its own work dir (e.g. `.cpp-check-<pid>`) so parallel runs don't clobber each other.
- **Boss art `wraith`** and the reward ids (`pointer-goggles`, `null-deref`) are used as assigned. Challenge `bug:` fields also use the existing `dangling-pointer`, `dangling-ref` (W6) and `out-of-bounds` (W7).
