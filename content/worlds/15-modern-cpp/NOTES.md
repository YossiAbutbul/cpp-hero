# World 15 notes (for the engine / tooling owners)

## check:cpp could not run on this machine
`npm run check:cpp -- --filter w15` found no compiler: WSL has only `docker-desktop` (no Ubuntu),
there's no local g++/clang++, and the `gcc:14` Docker image isn't pulled. I didn't pull it
(that's a large download that needs the user's OK). Every predict and demo output here was
traced by hand, but **please run `npm run check:cpp -- --filter w15` once a compiler is available.**

Snippets I'd look at first:
- `w15.l2.demo`: `for (auto h : hp) { h += 5; }` has to compile warning-free. GCC shouldn't
  warn `-Wunused-but-set-variable` on a compound assignment, but that's worth confirming.
- `w15.l2.c2` (a full program): `name` / `rname` are unused structured-binding names. GCC only
  warns when *every* name in a binding is unused, so it should be clean.
- `w15.p.a3` (unsafe, compile-only): its prelude ends in `for (int i = 0; i < 1; ++i)` so the
  fragment's `continue;` is inside a loop.

## Demo visuals (optional)
- Moved-from objects are shown in `vars` as `"(moved-from)"`. A "husk" style for a box, like a
  hollow or dashed outline, would fit the Hollow Husk bug. It could be `vars: { loot: "~" }`
  or a `mem` cell flag such as `moved: true`.
- The by-value lambda capture is shown as a var `taunt: "[word=\"Boo\"]"`. A `mem` cell with a
  `ref` would be the natural way to draw a dangling `[&word]` capture (red dashed arrow after
  the frame pops). l6 uses `crash` text for it for now.

## Tags from parallel worlds
`w14.sort` and `w14.map-iterate` are also carried by W15 challenges that really use them
(l1.c2, l2.c4), so the `reviewTags` stay valid even if World 14 renames its tags.
