# Combat panel spacing, subtler reach area

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Improvements)

- More space between the combatants list and the Round / Undo / Next turn / End row.
- Reachable cells: lighter tint, and a short legend or tooltip ("Déplacement possible" / "Can move here").

## Decisions (orchestrator)

- **Spacing**: in the GM Combat section, the toolbar row (Round, Undo, Next turn, End) gets clear space from the combatants list above it (at least `1rem` margin, plus a thin separator like the panel's other sections), and the same gap before the action tabs below.
- **Reach area**: reachable cells get a light tint of the primary colour (about 12–15 % opacity instead of the solid block) with a slightly stronger inner border on hover; the grid gets a short legend under it while reachable cells show: a swatch + "Déplacement possible" / "Can move here" (`combat.grid.reachLegend`). Each reachable cell has a `title` with the same text.

## Baseline

Test Files 246 passed, Tests 2171 passed.

## Seams

1. **Component** `app-combat-grid` (`TEST_PROVIDERS`, `combat-table` fixtures, as the GM): the legend shows only while reachable cells exist, with the translated text; reachable cells carry the `title`. Misses: colours and spacing (browser).
2. Spacing is CSS only, checked in the browser (no test).

## Red

- Test files: `src/app/modules/combat/components/combat-grid/combat-grid.component.spec.ts` (prettier also reformatted lines that were already prettier-diffed before this ticket)
- Run: `npx ng test --watch=false --include src/app/modules/combat/components/combat-grid/combat-grid.component.spec.ts 2>&1 | tail -30`
- Failing: 2 tests (21 others pass)
  - movement allowance > labels every reachable cell with a title — reachable cells have no `title` yet (expects "Can move here", empty on non-reachable cells)
  - movement allowance > shows a legend while reachable cells exist, and hides it otherwise — no `[data-testid="reach-legend"]` element yet (expects text "Can move here", removed once no reachable cell is left)

## Green

- Files: src/app/modules/combat/components/combat-grid/combat-grid.component.ts, src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.scss, public/i18n/en.json, public/i18n/fr.json
- Change: reachable cells get a `title` (`combat.grid.reachLegend`), a 13 % primary tint and an inset border on hover. A legend with a swatch shows under the grid only while reachable cells exist. The GM toolbar gets `margin-block: 1rem`, `padding-top: 1rem` and a top border. New key added in EN and FR, checked with node.
- Suite: 246 files / 2173 tests pass (baseline 2171); build OK.
- Open questions: none (the spacing is CSS only, not checked in the browser)

## Review

- Verdict: ship. Consider (not applied): the grid spec diff is mostly a prettier reflow; the 13 % tint is repeated between the cells and the legend swatch; `[attr.title]` with null would avoid empty titles.

## Answer

- Reachable cells: a 13 % primary tint (was 28 %), an inset border on hover, a `title` "Déplacement possible" / "Can move here", and a legend with a swatch under the grid while reachable cells show (`combat.grid.reachLegend`).
- GM Combat panel: the Round / Undo / Next turn / End row has 1 rem of space and a separator line above it, and space before the action tabs.
- Tests: 2 new (legend, titles). Suite 246 files, 2173 tests pass (baseline 2171). Build clean.
- Browser: sandbox FR: the reach area is a light tint with the legend under the grid; 16 px and a separator between the combatant rows and the toolbar. No console error.
