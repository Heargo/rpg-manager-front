# Place tokens before starting

Status: resolved
Type: task
Blocked by: 05, 07

Spec: `../spec.md` (Starting a combat)

- With a grid, the start form shows a setup grid with the picked characters and NPCs; the GM drags them to their cells.
- Unplaced tokens get a default cell (party on the left columns, enemies on the right), no two on one cell.
- Start sends the positions; the host keeps them (validated in bounds, no overlap).

## Decisions (orchestrator)

- **Slots**: before the encounter exists, each future token is a slot with a stable key: `character:<characterId>` and `npc:<npcId>:<n>` (n = 1..count, the copy number, same order as `startEncounter` creates them). Pure helper `startSlots(picks, characters, npcs)` in `combat-start.rules.ts` → `{ key, name, side, portraitId? }[]` (names as the encounter will name them is not required; the NPC name plus the copy number is enough).
- **Default and shown cells**: `setupTokens(slots, positions, grid)` → each slot with a cell: its chosen cell if valid, else the default from `placeUnplaced` (party from the left column, enemies from the right, no overlap). What the GM sees is what is sent: Start sends a cell for **every** slot.
- **Payload**: `EncounterPicks.positions?: Record<slotKey, { x; y }>`; `startPicks` gains a `positions` argument and passes it through (only when the world has a grid). `startEncounter` sets `position` on each created combatant from its slot key; without positions, as today (unplaced).
- **Host validation** (`parsePicks` + `startEncounter`): with the grid off, positions are ignored; with it on, every given cell must be in bounds and no two slots may share a cell, else the start is rejected (`combat.errors.badPositions`, "Placement invalide" / "Invalid placement"); unknown slot keys are ignored.
- **UI**: in the GM start form (`combat-gm-panel`), when the world's grid is on (`CombatBusiness` exposes the world's grid before a combat runs; the sandbox business too) and at least one slot is picked, a setup grid (`app-combat-setup-grid`, `data-testid="setup-grid"`, the grid image as background when set) shows the tokens (`data-testid="setup-token"`, `data-key`, initial or portrait, enemies ringed like the combat grid). The GM drags a token to a free cell (pointer events like `combat-grid`; also a `place(key, cell)` method the tests call); dropping on an occupied or out-of-bounds cell does nothing. Unpicking removes the slot and its chosen cell; changing a count keeps the cells of the remaining copies. A short hint under the grid: `combat.start.placeHint` ("Glissez les pions pour les placer" / "Drag the tokens to place them").
- No grid: the start form is unchanged.

## Baseline

Test Files 240 passed, Tests 2088 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's i18n lines are staged.

## Seams

1. **Pure helpers** (`combat-start.rules.ts`: `startSlots`, `setupTokens`, `startPicks` with positions; `combat.rules.ts`: `startEncounter` placing from positions): slot keys, defaults left/right without overlap, chosen cells kept, positions applied to the right combatants, bad positions refused. Misses: UI.
2. **Combat over the fake peer network** (`combat.spec.ts`): the GM starts with positions and every device sees the tokens there; out-of-bounds or overlapping positions are rejected with `combat.errors.badPositions`; positions ignored when the grid is off. Misses: screens.
3. **Components** (`TEST_PROVIDERS`): `app-combat-setup-grid` (tokens at default cells, `place` moves one to a free cell, occupied/out-of-bounds ignored, emits positions) and the GM panel start form (setup grid only with a grid and a pick; Start sends the shown positions). Misses: drag feel and layout (browser).

## Red

- Test files: `src/app/modules/combat/helpers/combat-start.rules.spec.ts`, `src/app/modules/combat/helpers/combat.rules.spec.ts`, `src/app/modules/combat/business/combat.spec.ts`, `src/app/modules/combat/components/combat-setup-grid/combat-setup-grid.component.spec.ts` (new), `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts`
- Run: `npx ng test --watch=false --include 'src/app/modules/combat/**/*.spec.ts' 2>&1 | tail -30` (or `--include <file>`)
- Existing tests moved: none contradict the decisions (existing `startPicks` and grid-on starts without positions still hold); new tests are appended.
- Contract the tests fix (names to create):
  - `combat-start.rules.ts`: `StartSlot { key; name; side: 'party'|'ally'|'enemy'; portraitId? }`; `startSlots(picks: StartPicks, characters: Character[], npcs: Npc[]): StartSlot[]`; `setupTokens(slots, positions: Record<string, Cell>, grid: GridSize): (StartSlot & { x: number; y: number })[]` (flat `x`, `y`); `startPicks(..., positions?)` 5th argument, `StartPicks.positions?`.
  - `combat.rules.ts`: `EncounterPicks.positions?: Record<string, {x;y}>`; `CombatError` gains `'badPositions'` (host error `combat.errors.badPositions`).
  - `app-combat-setup-grid` (`combat-setup-grid.component.ts`, class `CombatSetupGridComponent`): inputs `slots` (required), `positions` (optional); output `positionsChange: Record<slotKey, Cell>` (every slot); public `place(key, cell)`; testids `setup-grid` (`data-columns`/`data-rows`), `setup-cell` (`data-x/y`), `setup-token` (`data-key`, `data-name`, `data-x`, `data-y`, `data-enemy="true"`), `grid-map` (`data-image-id`). Grid size from the world's grid (`CombatBusiness.$grid`, also on the sandbox business, `null`/off when the grid is disabled).
  - GM panel: `[data-testid="place-hint"]` with the `combat.start.placeHint` text ("Drag the tokens to place them" in en); keys `combat.errors.badPositions` and `combat.start.placeHint` in en and fr.
  - Not covered by tests: the actual pointer drag, and the panel passing a dragged (non-default) cell to Start (no way to drag in the panel test; covered by `place` in the setup-grid spec).
- Failing: the whole combat test run fails to compile (missing symbols), so every new test is red; none run yet:
  - startPicks with positions (2) — `positions` argument/field missing
  - startSlots (3), setupTokens (5) — `startSlots`/`setupTokens` not exported
  - startEncounter with positions (5) — `positions` not in `EncounterPicks`, no `badPositions`
  - combat.spec "placing the tokens at the start" (4: positions on every device, out of bounds, overlap, en/fr keys) and "grid off ignores positions" (1) — `positions` not in `EncounterPicks`; no host handling/keys
  - combat-setup-grid spec (7) — component file missing
  - gm panel with a grid (4: hint after a pick, token per pick, unpick drops token, Start sends shown cells) — no setup grid in the form; "without a grid" (1) is a guard that already holds at runtime

## Green

- Files: `src/app/modules/combat/helpers/combat-start.rules.ts`, `helpers/combat.rules.ts`, `business/combat-host.business.ts`, `business/combat.business.ts` (`$grid`), `src/app/modules/tools/business/sandbox-combat.business.ts` (`$grid`), `components/combat-setup-grid/combat-setup-grid.component.ts` (new), `components/combat-gm-panel/combat-gm-panel.component.{ts,html}`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: `startSlots`/`setupTokens`/`startPicks(positions)`; `startEncounter` validates positions (grid on only; bounds, no overlap, else `badPositions`) and places combatants by slot key; host `parsePicks` parses `positions`. New `app-combat-setup-grid` (pointer drag + `place`), shown in the GM start form with the hint. The panel keeps dragged cells, prunes them on unpick/count change, and Start sends the shown cell of every token (dragged or default).
- i18n keys (verified with node in both en and fr): `combat.start.placeHint`, `combat.errors.badPositions`.
- Suite: 241 files / 2120 tests pass (baseline 240 / 2088); tsc clean; ng build OK. The only unstaged spec in `git diff --name-only` is `home/pages/static-pages.spec.ts`, from the other session.
- Open questions: none

## Review

- Verdict: ship. The host refuses non-integer, out-of-bounds and overlapping cells (`badPositions`) and ignores positions when the grid is off; `parsePositions` bounds the entry count and coordinates. Dragged cells reach Start (`startPositions()` sends `setupTokens(slots, placed, grid)`).
- Consider (not applied): `startEncounter` assigns the position by mutating the last pushed combatant; unknown slot keys still count for the bounds/overlap check (stricter than the spec); `pruneNpcs` relies on signal ordering (an effect or `linkedSignal` would be sturdier); the setup grid reads the grid from DI rather than an input; the in-bounds check is repeated in three places.

## Answer

- `combat-start.rules.ts`: `startSlots` (keys `character:<id>`, `npc:<npcId>:<n>`), `setupTokens` (chosen cell if valid, else the default: party left, enemies right, no overlap), `startPicks(..., positions)`. `startEncounter` places each combatant from its slot key when the grid is on and refuses bad cells (`combat.errors.badPositions`).
- `app-combat-setup-grid` in the GM start form (only with a grid and a pick): tokens with initials, enemies ringed, the grid image as background when set, drag to a free cell, hint `combat.start.placeHint`. Unpicking or lowering a count drops those cells. Start sends the shown cell of every token. `CombatBusiness.$grid` (and the sandbox business) give the world's grid before a combat runs.
- Tests: 32 new (helpers, `startEncounter`, multi-device host, setup grid, GM panel). Suite 241 files, 2120 tests pass (baseline 2088). Build clean.
- Browser: Tools sandbox, FR desktop: picking Yusica and the goblin shows a 10×10 setup grid with Yusica at (0,0) and the goblin at (9,0); dragging puts them at (4,4) and (5,4); Start opens the encounter with both tokens there. EN mobile: grid fits (287 px), hint translated, no horizontal scroll. No console error. (The browser tool's drag coordinates were scaled on two tries; scripted pointer events and a third tool drag moved the tokens.)
