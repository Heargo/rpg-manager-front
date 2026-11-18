# Dice pool and modifier

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Dice screen); user triage of ticket 04 (2026-11-18).

- A roll can mix dice types (e.g. 2d6+1d4): tapping a die adds one to the pool, each pool entry shows its count with − / + and the pool has a Clear button; the Roll button reads the pool ("Lancer 2d6+1d4+3").
- A modifier (+/−N, Optimus UI input number) adds to the total; the result shows each die, the modifier and the total.
- The pool and modifier go through the existing roll rules (pure helper), the history (shows the full notation) and the shared roll in a room (the message carries the pool and modifier; players see the same breakdown). No backward compatibility for stored history entries.
- The 3D roller throws every die of the pool.
- Combat rolls stay as the action defines them (assumed: no pool editing on the combat screen).
- FR/EN, 375 px and desktop.

## Baseline

`npm test` on develop @ a40185c: Test Files 323 passed (323), Tests 3166 passed (3166).

## Seams

1. Pure helpers: a dice pool rules helper (`dice-pool.rules.ts`: add / − / + / clear, notation "2d6+1d4+3", total with modifier) and the throw plan in `helpers/dice-plan.ts` for a whole pool. Catches pool arithmetic, notation and that every die is thrown; misses UI and network.
2. `DiceRollBusiness` over the fake peer network (`src/testing/game-device.ts`): rolling a pool with a modifier, the history entry's full notation, and the shared roll message carrying pool + modifier so a player sees the same breakdown. Misses rendering.
3. `DiceScreenComponent` inputs/outputs (`TEST_PROVIDERS`, as in `dice-screen-hosts.spec.ts`): tap a die adds to the pool, − / + / Clear, Roll label reads the pool, modifier via Optimus UI input number, result shows each die, modifier and total, FR/EN labels. Misses the 3D scene and the 375 px layout (browser check).

## Red

- Test files: `src/app/modules/dice/helpers/dice-pool.rules.spec.ts`, `src/app/modules/dice/business/dice-roll-pool.business.spec.ts`, `src/app/modules/dice/components/dice-screen/dice-screen-pool.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (once per file)
- Failing: 22 tests, none compile yet (missing exports are the red); no existing test file was edited.
  - Contract the tests fix: `helpers/dice-pool.rules.ts` exports `DicePool` (`{sides,count}[]`), `addDie`, `incrementDie`, `decrementDie` (drops entry at 0), `clearPool`, `poolNotation(pool, modifier)` ("2d6+1d4+3", "-2", no suffix at 0), `rollTotal(values, modifier)`; `helpers/dice-plan.ts` exports `planPool(groups: {sides, values}[])`; `DiceRollBusiness.rollPool(pool, modifier)` and `rollPoolAtTable(pool, modifier)`, `DiceRoll` gains `groups: {sides,count,values}[]`, `modifier`, `notation`, total includes modifier; `SharedRoll` gains `pool` (the groups) and `modifier`; `DiceScreenComponent` gets models `pool` and `modifier`, exported `DiceScreenPoolResult` (`{groups:{sides,values}[], modifier, total}`), hooks `pool`, `pool-entry`, `pool-count`, `pool-minus`, `pool-plus`, `clear-pool`, `dice-modifier`.
  - dice-pool.rules.spec (9): adds one die per tap in first-tap order; does not mutate; increments/decrements an entry; drops an entry at zero; clears; writes notation with modifier; adds modifier to the total; planPool throws every die; planPool splits a d100 — all fail on missing `./dice-pool.rules` / `planPool`.
  - dice-roll-pool.business.spec (4): rolls a mixed pool with modifier; 3D plan holds every die; history keeps full notation; shared roll carries pool + modifier and a player sees the same breakdown — fail on missing `rollPool`, `rollPoolAtTable`, `groups`, `notation`, `modifier`.
  - dice-screen-pool.spec (9): tap adds to pool; pool entries with counts; minus/plus and drop at zero; Clear; Roll label reads pool and modifier (EN); Roll label in FR ("Lancer 2d6+3"); modifier via number input; roll emitted; result shows each die, modifier and total — fail on missing `DicePool` import and `DiceScreenPoolResult` export.

## Green

- Files: `src/app/modules/dice/helpers/dice-pool.rules.ts` (new), `helpers/dice-plan.ts`, `helpers/shared-roll.ts`, `models/dice-api.ts`, `business/dice-roll.business.ts`, `business/dice-host.business.ts`, `components/dice-screen/dice-screen.component.ts`, `components/dice-roller/dice-roller.component.ts`, `pages/dice-page/dice-page.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: pure pool rules and `planPool`; `DiceRoll` has `groups`, `modifier`, `notation` and the total includes the modifier; `rollPool` / `rollPoolAtTable` (the host draws a validated pool, `SharedRoll.pool` and `modifier` are optional so combat rolls are unchanged, `count`/`sides`/`values` stay as the flattened first type). The dice screen gets `pool` and `modifier` models: a tap sets the sides and adds a die to the pool, entries with − / + and Clear, an Optimus UI number input for the modifier, the Roll label reads the pool, and the result shows notation, each die, modifier and total. The page and the table roller use the pool (`rollSelection`, `rollSelectionAtTable`); history and table rolls show the notation. New keys `dice.poolMinus`, `poolPlus`, `clear`, `modifier` in EN and FR.
- Suite: 326 files / 3188 tests passed (baseline 323 / 3166); tsc clean; ng build no error; no test file in the unstaged diff.
- Open questions: none (375 px layout of the pool row and the 3D throw of a mixed pool are for the browser check).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - dice-screen.component.ts (onDie / plus): the pool has no cap, but the host rejects more than MAX_DICE dice (shared-roll.ts:35). A big pool shared at the table fails with "invalid". Cap the pool total at MAX_DICE in `addDie` / `incrementDie`, or disable the buttons.
  - dice-roll.business.ts `rollPool`: no local bound on the pool. Same fix as above, or clamp.
  - dice-screen.component.ts: while the pool is non-empty the count input is ignored by the Roll button. This is confusing; hide it or fold it into the pool.
  - dice-page.component.ts history: the values list omits the modifier (shown only in the notation and total). Fine, but the screen result shows "2 + 5 + 3 =".
  - dice-screen.component.ts `minus`/`plus`/`empty` wrappers only call helpers; the template could call them through a single `update` method.
  - dice-host.business.ts: `payload.count as number` casts; `isValidRollRequest` already guarantees them.
  - dice-screen-pool.spec.ts: no test for a mixed pool shared when the host is offline.

## Answer

Built a mixed dice pool with a modifier. Tapping a die adds it to the pool. Each pool entry has − / + buttons, and the pool has a Clear button. An Optimus UI number input sets the modifier. The Roll button reads the full notation, e.g. "Lancer 2d6+1d4+3". The pool rules live in a pure helper (`dice-pool.rules.ts`, with `planPool`). `DiceRollBusiness` gains `rollPool` / `rollPoolAtTable`. The history and the shared roll message carry the pool and the modifier, with no backward compatibility for stored entries. The 3D roller throws every die of the pool. Combat rolls are unchanged.

Checked: 22 new tests. Suite 326 files / 3188 tests vs baseline 323 / 3166. `ng build` clean. Review: ship. Browser: FR desktop and EN at 375 px. At 375 px the history breakdown first squeezed into a one-character column; it now wraps onto its own line, rechecked at 375 px. Also fixed: the d20 chip stayed highlighted after tapping d4. No console errors. The player side of a shared roll is covered by the multi-device test, not the browser.

Review notes left for later: cap the pool at MAX_DICE (the host rejects big shared pools as invalid); the count input is ignored while the pool is non-empty; no test covers a mixed pool when the host is offline.
