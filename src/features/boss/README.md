# boss

Boss battle: HP bar, rounds, defense phase, victory. Legacy: legacy/src/engine/boss.js.

Multi-stage bosses (optional `stages` in boss.yaml, World 16): a stage banner before each stage, the hp bar
grouped per stage, and a knock-out restarts only the current stage (or the Defense Phase). Round and stage logic
is pure, in `src/engine/boss.ts`.
