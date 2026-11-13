# Combat grid

Status: resolved
Type: task
Blocked by: 14

Spec: `../spec.md` (Combat: Grid (when on)).

When the world's grid is on: the grid (optional map image) in the table centre, tokens per combatant (enemy ring), players drag their own token, the GM drags any; movement allowance and skill range highlighted (not enforced); target by cell or token. `combat/move` route. No fog, walls or line of sight.

## Baseline

`npm test` (2026-11-13, after N20): Test Files 191 passed (191), Tests 1578 passed (1578).

## Decisions (orchestrator, assumed)

- Distance on the grid counts a diagonal step as 1 cell (Chebyshev). Movement and range are highlights only, never enforced, so this is cheap to change.
- Missing model pieces from the spec are added here: skill `range?` (cells, active skills, in the skill editor and JSON) and an optional grid map image on the world (`World.combat.grid.imageId?`, set in World rules → Combat with the existing image picker).
- A combatant without a position (grid turned on mid-fight, or newly added) gets the first free cell: party/allies from the left edge, enemies from the right.

## Seams

1. **`combat-grid.rules.ts`** (pure): cells reachable within the movement allowance from the turn's start cell, cells and combatants within a skill's range, occupied cells, default placement of unplaced combatants, distance. Catches: every highlight and placement rule. Misses: rendering, drag.
2. **Combat grid component** (inputs/outputs with `TEST_PROVIDERS`, over the fake peer network from `src/testing/combat-table.ts`): shown in the table centre only when the world's grid is on (list mode otherwise), map image, a token per combatant with the enemy ring, a player moves only their own token (→ `combat/move`), the GM moves any, movement cells highlighted on the active turn, targeting a skill by token or cell within range highlights. Catches: the grid flow on both sides. Misses: pointer-drag gestures themselves (moves go through the component's handler/output), layout.
3. **Skill and world rules** (`skill.rules.ts` validation/JSON, world rules validation/JSON): `range` optional, a positive whole number, active skills only, JSON round trip; grid `imageId` optional, JSON/export round trip. Catches: the model additions. Misses: the editor fields' layout (browser check).

## Red

- Test files:
  - `src/app/modules/combat/helpers/combat-grid.rules.spec.ts` (new)
  - `src/app/modules/combat/components/combat-grid/combat-grid.component.spec.ts` (new)
  - `src/app/modules/skill/helpers/skill.rules.spec.ts` (new `skill range` block)
  - `src/app/modules/world/helpers/world-combat.rules.spec.ts` (new `combat grid map image` block)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one file at a time)
- Failing: every file fails to compile today, on the missing symbols below; once they exist the behaviours are asserted.
  - combat-grid.rules.spec.ts (13 tests) — module `combat-grid.rules` missing (`cellDistance`, `reachableCells`, `cellsInRange`, `combatantsInRange`, `occupiedCells`, `placeUnplaced`; contract in the spec header; Chebyshev distance).
  - combat-grid.component.spec.ts (19 tests: grid off, grid + default placement, enemy ring, player device, map image, 3 move tests, 3 movement-highlight tests, 6 targeting tests) — `CombatGridComponent` (`app-combat-grid`) missing, and `Skill.range` missing. Contract in the spec header: inputs `combatantId?`, `skillId?`, output `targetPicked`, method `moveTo(id, cell)`, data-testids `grid`/`cell`/`token`/`grid-map`, attributes `data-reachable`, `data-in-range`, `data-enemy`. The grid size, map image and movement formula must reach player devices too.
  - skill.rules.spec.ts (5 tests: optional/positive whole number, refused when 0, negative or fractional, refused on passive, JSON round trip, refused in JSON when not a number) — `Skill.range` and its `validateSkill` / `parseSkillJson` checks missing.
  - world-combat.rules.spec.ts (5 tests: no default image, saved by `applyWorldRules`, export round trip, bad `imageId` refused on import, `worldImageIds` and `remapWorldImages` include it) — `CombatRules.grid.imageId` missing.

## Green

- Files: `src/app/modules/combat/helpers/combat-grid.rules.ts`, `src/app/modules/combat/components/combat-grid/combat-grid.component.ts` (new); `combat/models/combat.ts`, `combat/helpers/combat-view.rules.ts`; `skill/models/skill.ts`, `skill/helpers/skill.rules.ts`, `skill/components/skill-editor/skill-editor.component.ts`; `world/models/world.ts`, `world/helpers/world-combat.rules.ts`, `world/helpers/world.factory.ts`, `world/components/rule-fields/rule-fields.component.{ts,html}`; `table/pages/table-page/table-page.component.{ts,html}`; `tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.ts`, `tools/business/sandbox-combat.business.ts`; `public/i18n/{en,fr}.json`.
- Change: pure grid rules (Chebyshev); `projectEncounter` now carries `grid` (size, map) and a per-combatant `movement` to every device and places unplaced combatants at their default cell (so GM and players see the same). `app-combat-grid` renders cells, map, tokens (enemy ring), pointer-drag through `moveTo` (own token for players, any for the GM), movement/range highlights and `targetPicked`; the turn-start cell is tracked locally per turn. Skill `range?` (validation, JSON, editor `p-inputnumber`, active only) and `World.combat.grid.imageId` (validation, export, remap, World rules image picker). The grid replaces the illustration in the table centre (GM and players) when the world's grid is on and an encounter runs; the sandbox tool shows it with the sandbox world's grid forced on.
- Suite: 193 files / 1617 tests pass (baseline 191 / 1578); tsc clean; `ng build` no error (existing budget warnings only).
- Open questions: pure specs (e.g. combat-grid.rules.spec.ts alone) fail to build under `ng test --include` with a `node:crypto` types error in `src/testing/jsdom-setup.ts`, an existing issue (combat.rules.spec.ts does too); they pass in the full run. The skill `range` is not yet wired into the combat actions picker (`skillId` input of the grid is unused by a page), so targeting by cell/token is only reachable through the component's output.

## Review

- Verdict: ship
- Must fix: none. Host `combat/move` (unchanged) checks the sender (`own`) and validates whole-number bounds against the grid; the new code adds no handler. No secret, no personal data in URLs, no change to invite codes.
- Consider:
  - combat-targeting.business.ts:13 — root-provided casting survives leaving the page or ending the encounter, so a stale skill range can reappear on the next table visit; clear it on page destroy or when the encounter ends.
  - 16-combat-grid.md (Green, open question) — stale: the table page and sandbox wire `targeting.$skillId()` into the grid, so range targeting is reachable; update the note.
  - combat-view.rules.ts:33-47,79 — `world.combat?.grid.enabled` is tested three times; reuse the local `grid` and extract the `{columns, rows, imageId}` projection.
  - combat-view.rules.ts:35 — default placement is recomputed on every projection and never persisted, so when a combatant is removed, the remaining unplaced ones shift cells until moved; fine for now, persist on first projection if it surprises users.
  - combat-grid.component.ts:~300 — the turn-start cell is lost if the grid remounts mid-turn (the allowance then restarts from the current cell); acceptable given "not enforced".
  - combat-grid.rules.ts:3 / combat.ts:122 — `Cell` and the inline `{x,y}` position type are duplicated; share one type.
  - Reviewed by reading only; I did not run the suite (the ticket reports 193 files / 1617 tests green, tsc clean).

## Answer

Built `combat-grid.rules.ts` (Chebyshev distance, reachable cells from the turn's start cell, cells and combatants in range, occupied cells, default placement) and `app-combat-grid` (square cells, optional map image, a token per combatant with a red ring for enemies, pointer drag through `combat/move`: own token for players, any for the GM, movement and range highlights, target by token or cell). `projectEncounter` carries the grid size, map and each combatant's movement to every device and places unplaced combatants. The grid replaces the illustration in the table centre (GM and players) when the world's grid is on and an encounter runs, and shows in the combat sandbox (sandbox world grid forced on). Skill `range?` (validation, JSON, `p-inputnumber` for active skills, "range N" in the combat summary) and `World.combat.grid.imageId?` (validation, export/remap, image picker in World rules → Combat). `CombatTargetingBusiness` holds the skill being aimed and its targets, shared by the actions block and the grid; cleared when the encounter ends and when the table or sandbox page is destroyed.

Decisions: as in `## Decisions` above (Chebyshev, default placement left/right, model additions).

Checked: 42 new tests; full suite 193 files / 1617 tests (baseline 191 / 1578); `ng build` clean; review ship. Browser on `/tools/combat`: FR at 1024px, 10×10 board 538×538, cells 54×54, round tokens, enemy ring, 7×7 movement highlight, dragging Yusica's token moves it and the highlight stays on the turn's start cell; EN at 375px, cells 33×33, no horizontal scroll; no console errors. Found and fixed through green: tokens 1.6× their cell (page overflow), then non-square cells (16:9 frame). Not checked in the browser: a non-square grid (12×8; the board uses `aspect-ratio: columns / rows`), range highlight (no starter skill has a range; covered by the component tests), the map image, and the player side of a room (fake-network tests).

Not done (review "Consider"): default placement is recomputed per projection (unplaced tokens can shift when one is removed); turn-start cell lost if the grid remounts mid-turn; shared `Cell` type; repeated `grid.enabled` checks in `combat-view.rules.ts`.
