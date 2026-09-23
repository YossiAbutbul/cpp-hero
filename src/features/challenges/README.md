# challenges

`ChallengeRunner` (exported from `index.ts`) plays one challenge of any of the 12 types with full scoring:

```tsx
<ChallengeRunner key={`${i}:${ch.id}`} challenge={ch} mode="lesson" eyebrow="Review · Fill in the blank"
  onResult={(r) => …} onContinue={(r) => next(r)} />
```

- Key it per queue position so every challenge starts fresh.
- Modes: `lesson | project | stress | boss | practice | review | placement`. `stress` scores as a
  project answer with `STRESS_XP` base. Retry ("Not quite" → Try again / Show answer) is on by default except
  boss, placement and the timed types (`safe`, `speed`). Hints (3 tiers, tier 3 = answer) are off in placement.
- The runner calls `game.answer` / `game.useHint` itself. `ChallengeResult.firstTry` = right on the first try
  without the answer hint (use it for lesson accuracy); `correct` = the final verdict (right on retry counts).
- Optional extras: `continueLabel`, `noHints`, `baseXp`, `hideCurlo` (boss), `before` (node above the body).

Files: `ChallengeRunner.tsx` (flow, hints, feedback panels), `renderers/*` (one per type, own their inputs and
report an `Outcome` via `submit`; they place `<Actions check={…} />` under their inputs), `Options.tsx`
(option grid, why lists, visible whitespace), `answerText.tsx` (tier-3 hint). Legacy reference:
`legacy/src/engine/challenges.js`.
