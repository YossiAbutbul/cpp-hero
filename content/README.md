# Editing Cpp Hero content

All lessons, challenges, projects, bosses and collectibles live here as YAML. The app
engine never hardcodes lesson text. Edit a file, save, and `npm run dev` hot-reloads it.
If something is wrong, the browser shows an error overlay naming the file and the field.

```
content/
  worlds/
    01-hello-world/
      world.yaml        id, num, title, icon, blurb, story (Curlo's lines)
      lesson-01.yaml    one lesson per file, played in file order
      ...
      lesson-06.yaml
      project.yaml      the mini-project (+ Stress Test)
      boss.yaml         the boss battle
    02-variables-types/ ...
  shared/
    bestiary.yaml       bug types (all 16 worlds)
    achievements.yaml   achievements (test = kind:arg)
    cosmetics.yaml      hats, colors, shields
    quests.yaml         daily quests (event = engine event name)
```

## Checks

```
npm run validate    schema + cross-file rules; prints  <file> › <path>: <problem>
npm run check:cpp   compiles every C++ snippet with g++ -std=c++20 -Wall -Wextra and
                    runs every predict-the-output program (byte-for-byte check)
```

Checking one world while others are being written:

```
npm run check:cpp -- --filter w9          # world 9 only (same as --filter 9 or --world w9)
npm run check:cpp -- --filter w9.l2       # one lesson (also w9.p, w9.boss, w9.l2.c3)
npm run check:cpp -- --filter w9,w10      # several (or repeat --filter)
npm run check:cpp -- --filter w9 --list   # show what would be checked, compile nothing
npm run check:cpp -- --filter w9 --keep   # keep the generated .cpp files
```

With a filter, only validation errors in the filtered world (or `content/shared/`) stop
the run; errors elsewhere are printed as warnings. Every run uses its own work directory
(`.cpp-check/<pid>-<time>/`, removed when it passes), so several people or agents can run
`check:cpp` at the same time. Compiler: WSL g++ (distro `Ubuntu`, or
`$CHECK_CPP_WSL_DISTRO`), else g++/clang++ on PATH, else Docker with an already pulled
`gcc:14` image (`$CHECK_CPP_DOCKER_IMAGE`). With none of these it only prints a warning.

`npm run build` runs `validate` first, so broken content can't ship. The full schema,
with a comment on every field, is `src/content/schema.ts`.

## YAML tips

- **Code** goes in a block literal. `|-` means "no newline at the end" (normal for code):
  ```yaml
  code: |-
    #include <iostream>

    int main() {
        std::cout << "Hi!\n";
    }
  ```
  Inside a block literal nothing is escaped: `\n` above is the two characters the learner
  sees, and a `#` is just a `#`.
- **Exact output** (predict options): `|` keeps exactly one final newline, `|-` none,
  `|+` all of them. Use a quoted string when spaces at the end of a line matter:
  `t: "Hi \n"` (in double quotes, `\n` is a real newline). Spaces and newlines are
  compared byte for byte by `check:cpp`.
- Quote text containing `: ` or starting with `#`, `*`, `&`, `!`, `{`, `[`, `'`, `"`:
  `why: "Correct: main() comes first."`
- Line numbers (`line`, `bugLine`, `dangerous`, `lineNotes`) are **0-based** lines of `code`.
- Option indexes (`answer`, `answers`) are **0-based**.

## Text length (on-screen text stays short)

| field | max words |
|---|---|
| `concept.short` | 20 |
| challenge `short`, `hints` (max 2), Curlo/boss lines, `stress.intro` | 15 |
| option / item `why` | 20 |
| demo step `note` | 12 |
| `recap` bullets | 10 |

Longer text goes in `concept.body`, `concept.pitfall` or `explain` (shown behind "Tell me more").

## Ids

Hierarchical and unique: lesson `w1.l2` (must match `lesson-02.yaml`), its challenges
`w1.l2.c1`, `w1.l2.c2` ...; project `w1.p` with steps `w1.p.s1` and stress attacks
`w1.p.a1`; boss `w1.boss` with rounds `w1.boss.r1` and defense `w1.boss.d1`; vault cards
`w1.<name>`. Challenge ids are save keys (spaced repetition), so don't rename them once
shipped.

## Tags and review

Challenge `tags` are concept names prefixed with their world: `w4.guard`, `w7.vector`.
A lesson's `reviewTags` pull older challenges back in for review. `validate` checks:

- every `reviewTags` entry is carried by some challenge in the same or an earlier world
  (never a later one);
- a tag named after another world (`w4.guard` used in World 7) must really exist in that
  world, so look the name up in its lesson files instead of guessing. This is only
  enforced once that world is finished (has a `boss.yaml`).

Each world's `story.intro` picks up where the previous world's `story.victory` ended.

## Challenge types

Every challenge has: `id`, `type`, `tags`, `prompt`, `hints`, `short`, `explain`,
optional `code`, `unsafe: true` (shows an UNSAFE badge), `bug: <bestiary id>`.
Defensive types (`bug`, `breakit`, `harden`, `review`, `edge`) also need
`sideBySide: { unsafe, hardened }`.

```yaml
# mcq: concept check
- id: w1.l1.c1
  type: mcq
  tags: [w1.main]
  prompt: Where does execution begin?
  options:
    - { t: At the first line of the file, why: "#include lines are handled while building." }
    - { t: Inside main(), why: Correct! }
  answer: 1
  hints: [Every program has one starting point.]
  short: Execution always begins inside main().
  explain: Everything else is setup for the compiler or code main() uses.

# predict: option t is the EXACT output
- type: predict
  code: |-
    #include <iostream>
    int main() { std::cout << "Hi!\n"; }
  options:
    - t: |
        Hi!
      why: Correct!
    - t: Hi!
      why: The \n is printed too.
  answer: 0
  stdin: "42\n"          # optional: input the program reads (check:cpp)

# fill: code has exactly one ___
- type: fill
  code: |-
    int ___() { return 0; }
  accept: [main]         # matched ignoring spaces around punctuation
  placeholder: function name

# write: type a whole line
- type: write
  accept: ['std::cout << "Hi\n";']
  acceptRe: ['^int gold ?(\{ ?0? ?\}|= ?0) ?;$']   # optional, tested on the normalized input
  placeholder: one line of C++

# order: lines in the CORRECT order (the app shuffles them)
- type: order
  lines: ["#include <iostream>", "int main() {", "}"]
  distractors: ["int Main() {"]

# bug: tap the buggy line, then pick the fix
- type: bug
  code: |-
    int main() {
        std::cout << "Launch!\n"
    }
  bugLine: 1
  options: [{ t: Add ; at the end, why: Correct! }, { t: Remove main, why: Worse. }]
  answer: 0
  sideBySide: { unsafe: "...", hardened: "..." }

# breakit: pick the input that breaks it
- type: breakit
  code: ...
  options: [{ t: "0", why: Divides by zero. }, { t: "5", why: Works fine. }]
  answer: 0
  sideBySide: { unsafe: "...", hardened: "..." }

# harden: code has one ___; pick the safe construct
- type: harden
  code: |-
    if (___) { std::cout << total / count; }
  options: [{ t: count != 0, why: Correct! }, { t: "true", why: Still divides by zero. }]
  answer: 0
  sideBySide: { unsafe: "...", hardened: "..." }

# review: tap every dangerous line
- type: review
  code: ...
  dangerous: [4, 5]
  lineNotes: { 4: "Single quotes: prints a number.", 5: "Division by zero is UB." }
  sideBySide: { unsafe: "...", hardened: "..." }

# edge: pick ALL inputs that expose the bug
- type: edge
  code: ...
  options: [{ t: "0", why: ... }, { t: "-1", why: ... }, { t: "7", why: ... }]
  answers: [0, 1]
  sideBySide: { unsafe: "...", hardened: "..." }

# safe: timed Safe / Unsafe round (items carry their own why)
- type: safe
  seconds: 30
  items:
    - { code: "int hp{};", safe: true, why: Initialized to 0. }
    - { code: "int hp;", safe: false, why: Garbage value; reading it is UB. }

# speed: timed mini-MCQs
- type: speed
  seconds: 45
  items:
    - { q: Which header provides std::cout?, options: ["<string>", "<iostream>"], answer: 1 }
```

## Demo steps

A lesson `demo` is `code` plus `steps`; each step highlights `line` (0-based) and may
change what is shown. Steps only list changes; everything else stays as it was.

| field | meaning |
|---|---|
| `note` | caption, at most 12 words |
| `out` | text appended to the output console |
| `vars: { hp: "3" }` | add/update variable boxes (`"?"` = garbage). `hp: null` removes the box (out of scope) |
| `push: { name: heal, vars: { hp: "3", amount: "5" } }` | a call-stack frame slides on top, with its parameters as boxes |
| `pop: true` / `pop: { returns: "8" }` | the top frame slides off (its boxes vanish); `returns` flies back to the caller |
| `mem: { cells: [...], drop: [...] }` | memory view: cells with pointer arrows (below) |
| `crash: "text"` / `shield: "text"` | crash animation (unsafe demo) / shield deflect (hardened demo) |

Order inside one step: `pop`, `push`, `vars`, `mem`. Without `push`, boxes live in one
implicit base frame, exactly as before. Once frames are in use, `vars` changes the **top**
frame. Push `main` first if you want main's boxes shown as a frame card:

```yaml
steps:
  - { line: 5, push: { name: main, vars: { hp: "3" } } }
  - { line: 6, push: { name: heal, vars: { hp: "3", amount: "5" } }, note: "Call: a new frame." }
  - { line: 1, vars: { hp: "8" } }                 # heal's hp
  - { line: 2, pop: { returns: "8" }, note: "heal's frame is gone." }
  - { line: 6, vars: { hp: "8" } }                 # main's hp
```

`mem` cells are keyed by `name` (a later step naming the same cell changes only the
fields it gives):

| cell field | meaning |
|---|---|
| `value: "5"` | shown inside the cell (`"?"` = garbage) |
| `addr: "0x10"` | small address label (display only) |
| `ptr: hp` / `ptr: null` | a pointer: arrow to cell `hp`; `null` = nullptr (stub ending in ⊘) |
| `ref: hp` | a reference: an extra name tag on `hp`, no box, no arrow (can't have value/ptr/addr/group) |
| `group: loot` | cells with the same group sit side by side (an array strip) |
| `readonly: true` | `const T*` / `const T&`: drawn with a lock |

`drop: [goblin]` ends a cell's lifetime: it becomes a ghost slot, and any arrow still
pointing at it turns red and dashed (dangling). `validate` checks that `ptr`, `ref` and
`drop` name a cell defined in this or an earlier step, that `null` only removes a box
that exists, and that `pop` has a frame to pop.

```yaml
steps:
  - line: 3
    mem: { cells: [{ name: hp, value: "5", addr: "0x10" }, { name: mana, value: "8", addr: "0x14" }] }
  - line: 4
    note: "p stores hp's address."
    mem: { cells: [{ name: p, ptr: hp }] }
  - line: 5
    mem: { cells: [{ name: p, ptr: mana }] }         # the arrow moves
  - line: 6
    mem: { cells: [{ name: p, ptr: null }] }         # nullptr
```

Keep `vars` too if you like: they still show where the memory view isn't rendered.

## C++ checker annotations

`check:cpp` wraps fragments (code without `main`) in a `main()`. Fragments get these
headers for free, so short snippets don't need visible `#include` lines: `<algorithm>`
`<array>` `<cassert>` `<climits>` `<cmath>` `<cstddef>` `<cstdint>` `<iomanip>`
`<iostream>` `<limits>` `<map>` `<memory>` `<numeric>` `<optional>` `<set>` `<stdexcept>`
`<string>` `<utility>` `<vector>` (any `#include` in the fragment is moved to the top too).

Top-level definitions work as fragments: a function, `struct`, `class` or `enum`
definition starting at column 0 (optionally after a `template <...>` line) is placed at
file scope. If the rest of the fragment is only declarations, an empty `int main() {}` is
added; if it has statements (a call, output, an assignment), those go inside `main()`
after the definitions (here the `std::cout` line runs inside `main()`):

```yaml
code: |-
  int heal(int hp, int amount) {
      return hp + amount;
  }
  std::cout << heal(3, 5);
```

When it needs more help, add these fields next to the code (the app ignores them):

| field | where | meaning |
|---|---|---|
| `expect: error` | challenge, `sideBySide`, demo, vault card, safe/speed item | intentionally broken: must NOT compile (on `sideBySide` it applies to `unsafe`) |
| `expect: warn` | same | must compile with a warning (e.g. a Shield demo) |
| `expect: clean` | same | must compile warning-free (the default for safe code) |
| `expect: skip` | same | not C++ (shell commands, compiler messages, cheat-sheet tables) |
| `prelude: "int total{7};"` | same | declarations the fragment needs (put before it) |
| `stdin: "5\n"` / `stdin: ["abc\n", "7\n"]` | predict challenge, demo | input for the run (a list = one run per input, outputs joined) |
| `programStdin` | project | input when running `program` |

Unsafe snippets (`unsafe: true`, `sideBySide.unsafe`, unsafe safe-round items) only have
to compile (warnings allowed) unless marked `expect: error`. Hardened versions must always
compile cleanly.
