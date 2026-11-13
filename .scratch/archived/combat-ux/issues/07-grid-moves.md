# Grid moves: GM anywhere, players on their turn

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Decisions: player movement, moves cost a movement action)

- World rules, Combat, action types: a **movement** flag per type (wizard, World rules page, sandbox). Validation and defaults updated (no backward compatibility).
- Host: a player's move is accepted only on their turn, to a reachable cell (`reachableCells`), and only if the first movement type has a use left; it ticks that type. Errors `combat.errors.notYourTurn`, `combat.errors.outOfReach`, `combat.errors.noMovementLeft`.
- GM moves any token anywhere at any time, without ticking.
- Grid: a player can drag only their own token, only on their turn; reachable cells shown.

## Decisions (orchestrator)

- **Model**: `CombatRules.actionTypes: { name; count; movement: boolean }[]` (required, no backward compatibility). Default rules: `Action` (movement false), `Movement` (movement true). `combatImportProblems` requires a boolean `movement` on each type. Combatant counters (`Combatant.actions`, `CombatantView.actions`) carry `movement` too.
- **World rules UI** (`rule-fields`, used by the wizard, World rules page and sandbox): each action type row gets a movement switch (`p-toggleswitch`, `inputId` `action-type-movement-<index>`), label key `world.rules.combat.actionMovement` ("Déplacement" / "Movement").
- **One movement action = one move of up to the combatant's movement allowance** (cells, `movementAllowance`), counted from the token's current cell. The "where the turn began" anchor in the grid goes away: reachable cells are from the current position.
- **Pure helper** `combat-grid.rules.ts`, `canMoveTo(enc, world-rules, id, cell)` → `{ ok: true, tickAction?: string } | { ok: false, error: 'outOfReach' | 'noMovementLeft' }`: the cell must be in `reachableCells(current, allowance, grid, occupied by others)`; if action counters are on and the combatant has a movement type, the first movement type must have one left and is the one ticked; with no movement type (or counters off) only the reach is checked.
- **Host** `move`: the GM (`SELF_PEER`) moves any token to any in-bounds cell at any time, no tick (bounds check kept). A player: own combatant (as today), only on their turn (`combat.errors.notYourTurn`, reuse C02's check), then `canMoveTo`; errors `combat.errors.outOfReach`, `combat.errors.noMovementLeft`; on success the position and the tick are one change (one undo step).
- **Grid component**: on a player's device (`combatantId` set) their token is draggable only on their turn; reachable cells shown from the current position, and none when no movement is left. GM device: every token draggable at any time (as today).
- **Action tabs (C03 follow-up)**: items go under the first **non-movement** type (`actionTabs`); a skill with no or unknown type also goes to the first non-movement type (first type if all are movement).
- **Starter classes** (`starter-classes.ts`): the movement skills' action type is the first type flagged `movement` (fallback: today's name match).
- New error keys in FR and EN: `combat.errors.outOfReach` ("Case hors de portée" / "That cell is out of reach"), `combat.errors.noMovementLeft` ("Plus de déplacement ce tour" / "No movement left this turn"); the movement switch label key.

## Baseline

Test Files 240 passed, Tests 2063 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's i18n lines are staged.

## Seams

1. **Pure helpers**: `canMoveTo` (`combat-grid.rules.ts`), `actionTabs` (items and untyped skills to the first non-movement type), `world-combat.rules.ts` (defaults with the flag, import requires it). Misses: wiring, UI.
2. **Combat over the fake peer network** (`combat.spec.ts`, `src/testing/game-device.ts`): player move off turn rejected; on turn to a reachable cell moves and ticks Movement; a second move with Movement at 0 rejected; out of reach rejected; GM moves anyone anywhere off turn without a tick; undo restores position and counter together. Misses: screens.
3. **Components** (`TEST_PROVIDERS`): `rule-fields` (a movement switch per action type, saved in the rules) and `combat-grid` (player token draggable only on their turn; GM any token; reachable cells from the current position, none at 0 movement). Misses: layout (browser).

## Red

- Test files: `src/app/modules/combat/helpers/combat-grid.rules.spec.ts`, `src/app/modules/combat/helpers/combat-actions.rules.spec.ts`, `src/app/modules/world/helpers/world-combat.rules.spec.ts`, `src/app/modules/world/helpers/starter-classes.spec.ts`, `src/app/modules/combat/business/combat.spec.ts`, `src/app/modules/combat/components/combat-grid/combat-grid.component.spec.ts`, `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (every spec file; the build fails as a whole until the model has `movement: boolean`, see below)
- Red state: the suite does not compile yet (`canMoveTo` is not exported from `combat-grid.rules.ts`; `movement` is not on `CombatRules.actionTypes` nor on `Combatant.actions` / `CombatantView.actions`, which every spec literal now carries). With the type and the export stubbed temporarily (reverted), 25 tests fail at runtime, each for the missing behaviour:
- Failing: 25 tests
  - canMoveTo: accepts a reachable cell and names the first movement type to tick; counts the reach from the current position; refuses a cell held by another combatant; refuses when the first movement type has no use left, even if a later one has; checks only the reach when the combatant has no movement type — no behaviour yet. Guard (passes with a stub, must hold): checks only the reach when the action counters are off.
  - actionTabs: makes one tab per action type (now returns `movement`); puts a skill without type or unknown type on the first non-movement tab.
  - world-combat.rules: defaults follow the spec table (`movement` flags); import refuses an action type without a boolean movement.
  - starter-classes: movement skill goes on the first type flagged movement, whatever its name.
  - combat.rules `keeps the action counters when the step is on`: counters carry `movement` (also asserted in the existing 'starts every action counter unused' with the flag).
  - combat.spec (grid moves): rejects a player move off turn; moves on turn to a reachable cell and ticks Movement; rejects a second move at 0 (noMovementLeft); rejects out of reach / held cell (outOfReach); counts reach from the current position (and ticks); undoes position and counter together; outOfReach / noMovementLeft keys in en and fr. Guard (passes today, must stay): GM moves any token anywhere off turn, without a tick, bounds still enforced.
  - combat-grid component: reachable cells from the current position (not the turn start); none at 0 movement; player drags only own token on their turn (`movable` class); a player's off-turn moveTo does nothing. Guards: GM drags every token at any time.
  - rule-fields: movement switch per action type (`#action-type-movement-<index>`, on for Movement, off for Action); toggling saves the flag in the rules; a new action type has `movement: false`; 'adds an action type and edits the existing ones' (existing, now expects `movement: false`).
- Contract chosen: `canMoveTo(enc, rules, id, cell)` takes the encounter (combatants with `position`, `level`, `attributes`, `actions`) and the world's `CombatRules` (`movement`, `grid`, `steps.actionCounters`).
- Existing tests moved to the new contract (same checks, `movement` flag added to every action-type or counter literal): `combat.spec.ts` rules fixture; `src/testing/combat-table.ts` rules fixture; `combat.rules.spec.ts` (action counters from the world types, two literals); `combat-view.rules.spec.ts` (two `actions`); `combat-actions.rules.spec.ts` (counters and expected tabs); `world-combat.rules.spec.ts` (defaults, validation literals, `broken` types); `skill-editor.business.spec.ts` (action types); `starter-classes.spec.ts` (world helper takes flagged types, Attaque/Déplacement now flagged); `rule-fields.component.spec.ts` ('adds an action type' expects `movement: false`). Replaced: `combat-grid.component.spec.ts` 'counts from the cell where the turn started, even after a move' (contradicted by the spec) became 'counts from the current position, not from where the turn began' plus 'shows no reachable cell once the player has no movement left'.

## Green

- Files: `src/app/modules/combat/helpers/combat-grid.rules.ts`, `combat-actions.rules.ts`, `combat.rules.ts` (`moveCounted`), `combat/business/combat-host.business.ts`, `combat/models/combat.ts`, `combat/components/combat-grid/combat-grid.component.ts`, `combat/components/combat-actions/combat-actions.component.ts`, `world/models/world.ts`, `world/helpers/world-combat.rules.ts`, `world/helpers/starter-classes.ts`, `world/components/rule-fields/rule-fields.component.{ts,html}`, `public/i18n/en.json`, `fr.json`
- Change: `movement` flag on action types and counters (defaults, import check, rule-fields switch `action-type-movement-<i>`); `canMoveTo` and `moveCounted` (position + tick as one undo step, unplaced tokens get their cell persisted); host `move`: GM anywhere, player on turn with `canMoveTo` errors; grid: draggable only on own turn, reachable from the current position and none at 0 movement; `actionTabs` falls back to first non-movement tab; starter classes use the flagged type.
- i18n keys (both files, checked with node): `combat.errors.outOfReach`, `combat.errors.noMovementLeft`, `world.rules.combat.actionMovement`.
- Suite: 238/240 files, 2086/2088 tests (baseline 240/2063 + 25 new). tsc clean, build OK.
- Open questions: 2 red tests cannot pass as written: `combat-actions.rules.spec.ts` 'makes one tab per action type' (its map destructures only name/count/used/left, yet expects `movement` in the result); `combat.rules.spec.ts` 'resets the action counters at the start of the combatant turn' (expects `{ name, count, used }` by `toEqual`, but counters now carry `movement: false`).

## Review

- Verdict: ship. Player moves are checked in order: owner or GM, turn, then `canMoveTo`; position and tick are one undo step; the GM skips turn, reach and tick (bounds kept). Moved tests keep their checks.
- Consider (not applied): a test for unplaced tokens keeping their shown cells after a move; a "move" to the token's own cell is accepted and costs a movement use; the grid repeats the "movement left" check instead of sharing one helper; with the grid off, `canMoveTo` still reads `grid.columns`/`rows` (UI hidden then).

## Answer

- Model: action types and combat counters carry `movement: boolean`; defaults Action (off) and Movement (on); import requires the flag. World rules (wizard, World rules page, sandbox): a "Action de déplacement" / "Movement action" switch per action type.
- `canMoveTo` (pure, `combat-grid.rules.ts`): reach from the current cell within the movement allowance, avoiding occupied cells; with counters on and a movement type, the first movement type must have a use left and is ticked. Host `move`: GM anywhere, any time, no tick; player only on their turn, then `canMoveTo` (`notYourTurn`, `outOfReach`, `noMovementLeft`), position and tick in one undo step. Unplaced tokens keep their default cells once anything moves.
- Grid: a player drags only their own token on their turn; reachable cells from the current position, none at 0 movement; the turn-start anchor is gone. `actionTabs`: items and untyped skills under the first non-movement type. Starter classes: movement skills use the first type flagged movement.
- Keys (FR, EN): `combat.errors.outOfReach`, `combat.errors.noMovementLeft`, `world.rules.combat.actionMovement`.
- Tests: 25 new or changed behaviours (helpers, multi-device host, grid, rule-fields); fixtures carry the flag. Suite 240 files, 2088 tests pass (baseline 2063). Build clean.
- Browser: wizard Rules step (FR desktop, EN mobile): Action off, Movement on, labels translated, no overflow. Sandbox: the GM drags Yusica off turn to the far corner, Movement stays 1/1. No console error. An existing dev world made before this ticket shows both switches off (no migration, by design). The player side (own turn, reach, 0 movement) is covered by the multi-device and grid tests (the sandbox grid is the GM's).
