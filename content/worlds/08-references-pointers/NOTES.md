# World 8 notes

## Demos: memory cells and pointer arrows

The W8 demos draw memory with the `mem` field on demo steps (content/README.md "Demo steps"),
not with `vars` text like `p: "→ hp"` or `(gone)` any more:

```yaml
steps:
  - line: 5
    mem:
      cells:                                  # upsert, keyed by name
        - { name: hp, value: "5", addr: "0x10" }
        - { name: p, ptr: hp }                # pointer: arrow to cell "hp"
        - { name: life, ref: hp }             # reference: extra name tag on hp, no arrow
  - line: 8
    mem: { cells: [{ name: p, ptr: null }] }  # nullptr: short stub ending in ⊘
  - line: 9
    mem: { drop: [goblin] }                   # lifetime ends; arrows into it turn red + dashed
```

- `group` puts cells side by side as one strip (arrays; `p + 1` steps along it).
- `readonly` marks const pointers / refs (lock icon).
- `ptr`, `ref` and `drop` must name a cell from this or an earlier step (`validate` checks).
- `demoStates(steps)` in src/content/demoState.ts replays the steps and marks dangling arrows.

## Other notes

- Boss art `wraith`, rewards `pointer-goggles` / `null-deref`, and bug ids `dangling-pointer`,
  `dangling-ref` (W6), `out-of-bounds` (W7) are used as assigned.
- Some W8 challenges carry W6/W7 tags (`w6.params`, `w6.const-ref`, `w6.return`, `w6.scope`,
  `w7.vector`, `w7.at`, `w7.invalidation`) where the content really uses them.
- `check:cpp --filter w8` only blocks on validation errors in World 8 or shared data, and every
  run has its own work dir.
