# World 6 notes

## Demos: stack frames

The W6 demos draw the call stack with real frames (content/README.md "Demo steps"):

```yaml
steps:
  - line: 9
    push: { name: "heal", vars: { hp: "3", amount: "5" } }   # new frame on top
  - line: 3
    vars: { hp: "8" }          # while frames are in use, vars apply to the TOP frame
  - line: 4
    pop: { returns: "8" }      # top frame slides off; its boxes vanish
```

Use `pop: true` when nothing is returned, and `vars: { x: null }` to remove a box.
The old workaround (a `stack` text box, `"fn: var"` box names and `(gone)` values) is gone;
don't bring it back. `validate` checks that every `pop` has a frame to pop.

## check:cpp

- Fragments with top-level function or struct definitions are placed at file scope
  (an empty `int main() {}` is added when nothing else needs to run).
- Every run has its own work dir, so parallel runs are safe.
- `npm run check:cpp -- --filter 06-functions` should pass.
