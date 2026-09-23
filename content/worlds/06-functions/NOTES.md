# World 6 notes (requests outside this folder)

## 1. Stack-frame visualization for demos (engine + schema)

The demos currently fake the call stack with ordinary `vars` boxes:

- a `stack` box whose value is the frame chain (`main > heal`),
- boxes named `"<function>: <var>"` for each frame's parameters and locals,
- the value `(gone)` when a frame is popped, because `vars` can only add or
  update boxes, never remove them,
- step notes like `push frame: heal(hp=3, amount=5)` / `pop frame: return 8`.

That works, but REQUIREMENTS §7 asks for "function calls as stack frames push/pop".
Proposed optional demo-step fields (backward compatible):

```yaml
steps:
  - line: 9
    push: { fn: "heal", args: { hp: "3", amount: "5" } }   # new frame on top, args shown as boxes
  - line: 3
    vars: { hp: "8" }          # vars apply to the TOP frame while frames are in use
  - line: 4
    pop: { returns: "8" }      # animate the top frame sliding off; the return value flies to the caller
```

Engine: render frames as stacked cards (main at the bottom), each holding its own var boxes;
`push` slides a card on, `pop` removes it (its boxes vanish, which is the point of the
lifetime lesson) and shows the return value travelling to the caller's line.
Also useful later: W8 (references: an arrow from a frame's parameter to the caller's variable),
W9 (stack vs heap), and a "dangling" crash effect when a popped frame's box is referenced.

A smaller alternative: let a `vars` value of `null` remove a box, so popped locals
can disappear instead of showing `(gone)`.

## 2. check:cpp: fragments with top-level function definitions

`wrapSnippet` puts every fragment inside `main()`, so a snippet that only defines a
function (very common in this world) fails to compile. Workarounds used here:
full programs with a one-line `main()`, or a `prelude` lambda standing in for a
function when the snippet only shows a call. A cleaner option: if a fragment
contains a top-level function definition (or an annotation like `scope: file`),
place it at file scope and generate an empty `int main() {}` after it.

## 3. check:cpp: the shared `.cpp-check/` work dir

Parallel runs of `npm run check:cpp` (several worlds written at once) delete each
other's `.cpp-check/` directory, so results go missing and every snippet reports
"got error". Suggest a per-run work dir (e.g. `.cpp-check/<pid>/` or `mkdtemp`).
World 6 passes `npm run check:cpp -- --filter 06-functions` (109 snippets:
85 clean, 18 warn, 6 error as expected; 16 programs run with matching output).

## Status (tooling pass)

- Resolved (schema): `push: { name, vars }`, `pop: true | { returns }` and `vars: null` exist on
  demo steps (content/README.md "Demo steps"); `validate` checks pops and removals. Note the
  field is `push.name`, not `fn`. The W6 demos still use the `stack` box and `(gone)` values;
  switch them to `push`/`pop` once CodeDemo renders frames (Phase B2a).
- Resolved: fragments with top-level function/struct definitions are placed at file scope
  (an empty `int main() {}` is added when nothing else needs to run).
- Resolved: per-run work dir (`.cpp-check/<pid>-<time>/`).
