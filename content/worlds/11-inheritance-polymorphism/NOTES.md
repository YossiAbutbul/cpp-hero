# World 11 notes (for the engine / schema owners)

## Proposed: object cards for inheritance demos

REQUIREMENTS §7 asks for "objects as cards, inheritance as linked cards". Today World 11's
demos show objects with `vars` boxes (`k.hp_`, `k.armor_`) and `mem` cells (a `hero` pointer
arrow to a `mage` heap cell). That works, but the layers of an object are the core idea of
this world, and they aren't visible yet. Here's an optional, backward-compatible addition:

```yaml
- line: 13
  obj:
    - name: k              # card id (like a mem cell name; mem ptr arrows may target it)
      type: Knight          # card title
      layers:               # base part first, drawn as stacked/linked sub-cards
        - { class: Hero,   fields: { hp_: "30" } }
        - { class: Knight, fields: { armor_: "5" } }
```

- A later step can update fields by `name` + `class`. Adding a layer animates the derived part
  snapping onto the base part (construction order). Removing layers top-down shows destruction order.
- `slice: k -> h` would animate a copy that keeps only the `Hero` layer. The derived layer
  falls away with a `crash`. That's the object-slicing visual.
- `virtual: { attack: Knight }` on a card could highlight which layer's function a call dispatched to.

Demos that would use it: l1 (Hero/Knight layers built in order), l2 (dispatch highlight),
l5 (a slicing crash, and the destructor chain `~Mage` then `~Hero` peeling layers off).

## Other notes
- **check:cpp**: there's no C++ compiler on this machine right now. WSL only has
  `docker-desktop` (no Ubuntu distro), there's no g++/clang++ on PATH, and the `gcc:14`
  Docker image hasn't been pulled. `npm run check:cpp -- --filter w11` exits with "no C++
  compiler found". Every snippet was hand-checked against the wrapping rules in
  `scripts/lib/cpp-snippets.ts`, and every predict output was traced by hand, but it still
  needs a real run.
- **W9/W10 tags** used for interleaving: `w9.make-unique`, `w9.delete`, `w10.init-list`,
  `w10.private`, `w10.ctor`, `w10.const-method`, `w10.dtor`. They're taken from the in-progress
  W9/W10 files. If those worlds rename them, `validate` will flag the references here.
- Challenge `bug:` fields use `object-slicing` and `missing-virtual-dtor` (World 11), plus the
  existing `null-deref` and `out-of-bounds` in the project/boss defense.
