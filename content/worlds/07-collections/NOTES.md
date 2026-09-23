# World 7 notes (for the engine/tooling owners)

- **check:cpp fragment includes.** `scripts/lib/cpp-snippets.ts` wraps fragments with
  `<iostream> <string> <limits> <cmath> <climits> <cstdint> <iomanip>` only. `<vector>`,
  `<array>` and `<stdexcept>` are not reachable transitively with libstdc++ 13, and a
  `prelude` can't carry an `#include` (it goes inside `main`). So every W7 fragment that
  uses std::vector/std::array shows an `#include <vector>` / `#include <array>` line, even in
  safe/speed round items. Suggest adding `<vector>`, `<array>`, `<stdexcept>`, `<cstddef>`
  (and later `<algorithm>`, `<map>`, `<memory>`...) to `STD_INCLUDES`; the visible includes
  could then be trimmed from short items.
- **check:cpp work dir is shared.** `.cpp-check/` is deleted and recreated per run, so two
  agents running `npm run check:cpp` at the same time clobber each other
  ("run-all.bash: No such file or directory"). A per-run temp dir (or `--work <dir>`) would fix
  it. I verified W7 with an unmodified copy of the script pointed at a private work dir:
  113 snippets, all OK.
- **Cross-world tags.** W4 tags used here are guesses (`w4.if`, `w4.guard`); W5/W6 tags are the
  ones from the brief (`w5.for`, `w5.range`, `w5.off-by-one`, `w5.signed-unsigned`,
  `w6.params`, `w6.const-ref`, `w6.return`). W7 challenges carry these tags themselves, so
  `reviewTags` validate even before those worlds land.
- **Story.** W6's `story.victory` wasn't available while writing, so W7's intro opens
  generically ("Our functions hold strong!"). Adjust if W6 ends differently.
- The project's `removeItem` uses `bag.erase(bag.begin() + slot)` ahead of World 14's
  iterator lesson; the step text explains it as "begin() + n points at slot n".

## Status (tooling pass)

- Resolved: fragments now also get `<vector>`, `<array>`, `<stdexcept>`, `<cstddef>`,
  `<algorithm>`, `<map>`, `<set>`, `<memory>`, `<numeric>`, `<optional>`, `<utility>`,
  `<cassert>` (list in content/README.md). The visible `#include` lines in short items may be
  trimmed; they are harmless if kept.
- Resolved: per-run work dir.
- Resolved: cross-world tags. `validate` now also requires a world-named tag (`w4.guard`) to be
  carried by a challenge in that world (once that world has a boss file); all W1–8 tags pass.
- Resolved: story. W6's victory now ends with a line pointing at World 7's shelves, and W7's
  intro opens with "The Scope Sentinel is gone...".
