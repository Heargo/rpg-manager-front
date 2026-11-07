# 3D dice roller

Status: resolved
Type: task
Blocked by: 10

Spec: `../spec.md` (Dice roller).

- `core/generators/dice.ts` on top of ticket 10's `random.ts`: `rollDie`, `rollDice`, d100 split.
- `dice-roll.business.ts`: count and sides, draw with `cryptoRandomSource()`, history.
- Lazy-loaded `dice-scene` (three + `@dimforge/rapier3d-compat`): full-screen modal, walls at screen edges, headless pre-run, relabel top faces to the drawn values, visible replay, cocked/off-table re-run, skip on click, reduced motion.
- Shapes d4, d6, d8, d10, d12, d20, d100 (two d10s), other `n` per the spec table.
- Result bar: each value, coloured total, Roll again, Close.

Done when:
- Unit tests: `randomInt` rejection at boundary values with a fake source; chi-square on 600,000 rolls of d6 and d20 with the crypto source (α = 1e-6, so it doesn't flake); d100 split covers `1..100` exactly once by enumeration; relabelling always puts the drawn value on the top face and keeps labels a permutation.
- In the browser: dice bounce off all four screen edges, settle, and show the drawn values; the main bundle size doesn't grow.

## Answer

- `core/generators/dice.ts`: `rollDie`/`rollDice` on the unbiased `randomInt` (crypto source in the business), `splitPercentile`/`joinPercentile` for the d100.
- `modules/dice/helpers`: `dice-shapes.ts` (d4…d20 from vertex lists, faces by a small convex hull, flat outward normals; d10 kites flat with H = a(1+cos36°)/(1−cos36°); `shapeForSides`), `dice-labels.ts` (labels per face, per vertex for the d4; `putOnTop` relabelling; `topSlot`), `dice-plan.ts` (one die per value, two for a d100, max 20 thrown; total ratio).
- `services/dice-scene.ts` (lazy, the only three.js/Rapier code): walls at the visible screen edges (from the camera frustum, above the result bar), throw from a random edge with spin, headless simulation recorded frame by frame, re-throw if a die ends tilted, relabel top faces, replay; click to skip; `prefers-reduced-motion` shows the end at once.
- `DiceRollBusiness` (count, sides, draw, current roll, history) and `/dice` page (count × d sides, d4…d100 presets, recent rolls) with the full-screen overlay (result bar: each value, total coloured red→green, Roll again, Close, Escape). "Dice" in the menu. Sharing rolls with the table comes with L06.
- Bundle: `dice-scene` is a lazy chunk (4.9 MB raw, ~1.3 MB over the network, mostly Rapier's WASM); the initial bundle grew ~1.3 KB (route + menu). The service worker prefetches all JS, so the dice also work offline at the cost of ~1.3 MB background download per install.
- Checked in the browser (production build): 3d6, 2d4 (read at the top vertex), 1d100 (30 + 8 → 38), 4d20 all land showing their drawn values; dice bounce off the edges and stay above the result bar. d8 and d12 checked by the shape tests only.
- Tests: 26 new (range, chi-square on 600,000 crypto rolls of d6 and d20 at α = 1e-6 plus a control showing a 1% bias is caught, d100 split enumeration, every shape's faces, labels/relabelling, plan and business). Suite: 190 passing.
