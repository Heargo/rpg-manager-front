# 3D dice roller

Status: needs-triage
Type: task
Blocked by: p2p-rooms/07, 10

Spec: `../spec.md` (Dice roller).

- `core/generators/dice.ts` on top of ticket 10's `random.ts`: `rollDie`, `rollDice`, d100 split.
- `dice-roll.business.ts`: count and sides, draw with `cryptoRandomSource()`, history.
- Lazy-loaded `dice-scene` (three + `@dimforge/rapier3d-compat`): full-screen modal, walls at screen edges, headless pre-run, relabel top faces to the drawn values, visible replay, cocked/off-table re-run, skip on click, reduced motion.
- Shapes d4, d6, d8, d10, d12, d20, d100 (two d10s), other `n` per the spec table.
- Result bar: each value, coloured total, Roll again, Close.

Done when:
- Unit tests: `randomInt` rejection at boundary values with a fake source; chi-square on 600,000 rolls of d6 and d20 with the crypto source (α = 1e-6, so it doesn't flake); d100 split covers `1..100` exactly once by enumeration; relabelling always puts the drawn value on the top face and keeps labels a permutation.
- In the browser: dice bounce off all four screen edges, settle, and show the drawn values; the main bundle size doesn't grow.
