# GM table: collapsible Dice, Combat, Notes

Status: resolved
Type: task
Blocked by: 05

Spec: `../spec.md` (GM layout)

- Right column (tools): Optimus UI accordion, sections Dice, Combat, Notes in that order, all open by default, open state remembered per device (localStorage, guarded).
- Combat section: round and Next turn / Undo / End, pending results, active combatant's actions, selected combatant's manual edits, the start form when no combat.
- Middle column: the grid when the world has one, else the turn order list. Mobile: sections stacked under the scene.
- Tools combat sandbox uses the same split.

## Decisions (orchestrator)

- **Split the GM panel** in two components that share state through a root business:
  - `app-combat-order` (new, `combat/components/combat-order/`): round, the combatant rows (name, initiative value/input per C01, life bar, statuses with remove, down tag, active highlight, drag and drop reorder, the select toggle). No actions, no manual edits.
  - `app-combat-gm-panel` keeps the controls: toolbar (round, Undo, Next turn, End), pending results, the **active combatant's actions** (`app-combat-actions`, no longer inside the row), the **selected combatant's manual edits** (damage, heal, add status, under a heading with its name), the end dialog, and the start form when no combat runs. Existing `data-testid`/`data-action` names stay.
  - Selection shared by `CombatSelectionBusiness` (root, `combat/business/`): `$selectedId`, `toggle(id)`, `clear()`; cleared when the encounter ends.
- **Table page, GM, desktop**: the right column (tools panel) becomes an Optimus UI `p-accordion` (`multiple`), panels in this order: `dice` (Dés / Dice), `combat` (Combat), `notes` (Notes); all open by default. The open panels are remembered per device in `localStorage` key `rpg-table-gm-tools` (array of panel values), read and written in try/catch; bad or missing value → all open.
  - Combat panel: `app-combat-gm-panel`; when the world has a grid and a combat runs, `app-combat-order` above it (the middle shows the grid).
  - Middle column (scene): while a combat runs and there is no grid, `app-combat-order` takes the illustration's place; otherwise the illustration (or grid) as today. The rest of the scene (shop target, NPCs, image upload, quick images) unchanged. The old "Combat" section at the top of the scene goes away.
- **Mobile (narrow)**: same, the accordion stacked under the scene (as the tools panel is today).
- **Tools combat sandbox**: the GM card shows `app-combat-order` then `app-combat-gm-panel` (it always shows the grid above).
- Accordion headers use existing keys (`dice.title`, `combat.title`, `table.notes.title`); the notes save state stays visible in the Notes panel.

## Baseline

Test Files 238 passed, Tests 2040 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's files are staged.

## Seams

1. **Combat components** `app-combat-order` and `app-combat-gm-panel` (`TEST_PROVIDERS`, `combat-table` fixtures; together on one test host when a test needs both): the order rows and reorder in `app-combat-order`; the active combatant's actions and the selected combatant's manual edits in the panel, selection made from the order row. Existing GM panel tests move to the split, keeping what they check. Misses: layout.
2. **Table page component** (`table-page.component.spec.ts`, `TEST_PROVIDERS`, as GM with a combat fixture): accordion panels Dice, Combat, Notes in that order, all open by default, open state restored from and saved to `localStorage`, bad stored value → all open; order list in the middle without grid, in the Combat panel with a grid. Misses: layout, mobile (browser).
3. **`CombatSelectionBusiness`** (plain class): toggle, clear, cleared when the encounter ends. Misses: UI.

## Red

- Test files:
  - `src/app/modules/combat/business/combat-selection.business.spec.ts` (new)
  - `src/app/modules/combat/components/combat-order/combat-order.component.spec.ts` (new)
  - `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts` (moved to the split)
  - `src/app/modules/table/pages/table-page/table-page.component.spec.ts` (new describe appended)
- Run: `npx ng test --watch=false --include <file>` for each file (all four; the combat ones need `combat-selection.business.ts` and `combat-order.component.ts` to build)
- Moved from the old GM panel spec (same checks): turn order/active/life bar/initiative/status/round, typed initiative, reorder, down mark, the four initiative-by-mode tests -> `combat-order` spec; manual damage/heal/status, undo + next turn stay in the panel spec, now through selection + `[data-testid="selected-edits"]` (`data-name`) with the order mounted next to the panel on a test host. Start form, active row, using a skill, pending, end dialog, optional steps unchanged. Sandbox page spec unchanged (its `sandbox-gm` card still holds the combatant rows once the order is inside it).
- Contract added by the tests: order row `data-selected="true"`; panel `[data-testid="selected-edits"][data-name]`; table page `p-accordion-panel[data-testid="gm-tool"][data-panel="dice|combat|notes"]` (open = lib `data-p-active="true"`, toggle = click its `p-accordion-header`), `localStorage['rpg-table-gm-tools']`.
- Failing:
  - combat-selection.business.spec.ts (6 tests) — module `./combat-selection.business` missing (build error)
  - combat-order.component.spec.ts (all tests: show order, remove status, type initiative, reorder, down, select toggle, holds no actions, 4 by-mode) — module `./combat-order.component` missing (build error)
  - combat-gm-panel.component.spec.ts (all tests) — imports the missing `CombatOrderComponent` / `CombatSelectionBusiness` (build error); new ones: selected-edits follow selection, dropped on end, panel alone shows no rows
  - table-page.component.spec.ts, 11 tests, assertion failures: lists panels in order; holds dice/combat/notes in panels; opens all by default; restores from localStorage; bad stored value (not JSON) opens all; non-array value opens all; header click closes and remembers; order in scene without grid; grid in scene + order in combat panel with grid; combat controls out of the scene; start form in combat panel with no combat

## Green

- Files: src/app/modules/combat/business/combat-selection.business.ts; src/app/modules/combat/components/combat-order/combat-order.component.{ts,html,scss}; src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.{ts,html}; src/app/modules/table/pages/table-page/table-page.component.{ts,html,scss}; src/app/modules/tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.ts; src/testing/game-device.ts
- Change: New root `CombatSelectionBusiness` (pick remembered with whether an encounter ran, so it drops when the encounter starts or ends) and `app-combat-order` (rows, initiative, statuses, reorder, select). The GM panel keeps toolbar, pending, active actions, selected-edits and end dialog. The table page tools column is a `p-accordion` (dice, combat, notes; open state in `localStorage['rpg-table-gm-tools']`, try/catch, bad value means all open); order replaces the illustration in the scene when a combat runs without grid, else it sits above the panel in the Combat section. Sandbox GM card shows order then panel, with its own `CombatSelectionBusiness` bound to the sandbox combat. No i18n keys added.
- Suite: 240 files / 2063 tests pass (baseline 238 / 2040); tsc clean; ng build OK (only existing budget warnings).
- Open questions: `src/testing/game-device.ts` (helper, not a spec) now lists `CombatSelectionBusiness` per device, which the red specs need. The old order styles remain unused in combat-gm-panel.component.scss. `static-pages.spec.ts` shows as unstaged-modified; it belongs to the other session.

## Review

- Verdict: ship. Moved tests check the same things (order rows in the `combat-order` spec, manual edits in the panel spec through the selection).
- Applied after review (no test change): `app-combat-order` gets `showRound` (default true), `false` where it sits next to the panel (Combat panel with a grid, Tools sandbox), so the round shows once; dead order styles removed from the panel SCSS; the Notes header is a `<span>` and the textarea has an `aria-label`.
- Consider (not applied): the open-panels storage lives in the page component (fine until a second remembered setting appears).

## Answer

- New `CombatSelectionBusiness` (root; the sandbox provides its own) and `app-combat-order` (round, rows, initiative, statuses, reorder, select). `app-combat-gm-panel` keeps the toolbar, pending results, the active combatant's actions, the selected combatant's manual edits (`selected-edits`), the end dialog and the start form.
- Table page (GM): the tools column is an Optimus UI accordion Dice, Combat, Notes, all open by default, open state in `localStorage['rpg-table-gm-tools']` (try/catch, bad value → all open). Without a grid the order replaces the illustration while a combat runs; with a grid it sits in the Combat panel. Sandbox GM card: order then panel.
- Tests: 6 selection, 10 order, panel tests moved to the split plus 3 new, 11 table page. Suite 240 files, 2063 tests pass (baseline 2040). Build clean.
- Browser: sandbox shows one "Round 1", order then controls. Real GM table on a throwaway local world "Test C06": Dés, Combat (start form), Notes, all open; collapsing Dés is remembered after reload; FR, EN and mobile (stacked under the scene), no horizontal scroll, no console error. The order in the middle during a running combat is covered by the table page tests (the throwaway world has no characters or NPCs).
