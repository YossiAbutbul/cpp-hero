# World 5 notes (for the engine / tooling owners)

- Demo `vars`: there is no way to remove a variable box when it goes out of scope.
  In the For-loop demo (lesson-02) the header counter `round` no longer exists after
  the loop; the last step simply lists only `total`. If the engine merges `vars`
  across steps instead of replacing them, `round` will linger. A per-step way to drop
  a box (e.g. `vars: { round: null }` or a `drop: [round]` field) would make loop
  scopes visible.
- `npm run check:cpp` refuses to run while any other world has validation errors, and
  all runs share `.cpp-check/` (it is deleted at start). With several worlds written in
  parallel this blocks or clobbers checks. World 5 was checked in a copy of the repo
  containing only worlds 01-05. A `--world` option that validates/checks one folder and
  a per-run work directory would help.

## Status (tooling pass)

- Resolved: demo `vars` values can be `null` to remove a box. The For-loop demo (lesson-02)
  now drops `round` with `round: null` after the loop.
- Resolved: `check:cpp` uses a per-run work dir and `--filter w5` only needs World 5 (and
  `content/shared/`) to validate. See content/README.md "Checks".
