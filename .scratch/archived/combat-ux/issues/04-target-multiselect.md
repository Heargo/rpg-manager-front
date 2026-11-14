# Target picking as a multi-select

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Turn actions, target picking)

- `p-multiselect` of the combatants, grouped by side (enemies first for harmful skills, allies first for heals), portrait or initial, life bar when visible, chips for picked ones.
- Max targets reached: other options disabled. On a grid, out-of-range combatants are disabled.
- Stays in sync with picking on the grid (`CombatTargetingBusiness`).

## Decisions (orchestrator)

- Pure helper in `combat-targeting.rules.ts`, `targetGroups(skill, casterId, combatants, grid?)`: two groups, `'enemies'` and `'allies'` (camp relative to the caster, the caster in allies). Harmful skills (target `one-enemy`/`all-enemies`, or any `damage` effect) list enemies first; others list allies first. Each option `{ id, name, portraitId?, lifePercent?, disabled }`. Out of range = `disabled` when the world has a grid, the skill has a `range` and the caster is placed (`combatantsInRange`; the caster itself always in range; unplaced targets stay enabled). Down combatants stay listed.
- `CombatTargetingBusiness.set(ids)`: replaces the picked targets; single-target skills (`one-ally`, `one-enemy`, `undefined`) keep only the last newly added id; skills not picked by the user (`self`, `all-*`) ignore it. Grid clicks keep using `toggle`, so both stay in sync through `$casting`.
- Component `app-combat-actions`: the target buttons become one Optimus UI `p-multiselect` (`group`, `display="chip"`, `filter`), option template with portrait (or initial) and a small life bar when `lifePercent` is known, `optionDisabled` for out of range. Disabled (read-only chips) for skills whose targets are not picked by the user. Confirm and Cancel unchanged. Keep `data-testid="target"` on each option.
- Group labels: `combat.targets.enemies` / `combat.targets.allies` (FR "Ennemis", "Alliés"; EN "Enemies", "Allies").

## Baseline

Test Files 235 passed, Tests 2010 passed. Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's i18n lines are staged.

## Seams

1. **Pure helper** `targetGroups` (`combat-targeting.rules.ts`): group order by harm, camps, out-of-range disabled, life percent passed through. Misses: rendering.
2. **`CombatTargetingBusiness.set`** (plain class, no TestBed needed): single-target keeps the last new id, area keeps all, `self`/`all-*` unchanged. Misses: UI.
3. **Component** `app-combat-actions` (`TEST_PROVIDERS`, `combat-table` fixtures): a multiselect with the two groups in the right order, picking sets the casting targets, confirm sends them, disabled for `all-*`. Misses: layout and the overlay look (browser).

## Red

- Test files: `combat/helpers/combat-targeting.rules.spec.ts` (new, 8), `combat/business/combat-targeting.business.spec.ts` (new, 7), `combat/components/combat-actions/combat-actions.component.spec.ts` (describe "target multi-select", 6); updated to the new contract, same checks: `combat-gm-panel.component.spec.ts` (4 tests), `combat-player-view.component.spec.ts` (2 tests). Test support: `src/testing/combat-table.ts` gains `pickTarget(host, name)` (clicks `[data-testid="targets"]` under host, then `[data-testid="target"][data-name=name]` in the document: the overlay is outside the component).
- Run: `npm test 2>&1 | grep -E "Test Files|Tests |FAIL"`.
- Contract: multiselect host `data-testid="targets"`; group labels `.p-multiselect-option-group` ("Enemies"/"Allies"); options `data-testid="target"` + `data-name`; chips `.p-multiselect-chip` inside the component; no `button[data-testid="target"]`. `targetGroups(skill, casterId, combatants, grid?)` returns `{ id: 'enemies'|'allies', options }[]`, combatants `{ id, name, side, portraitId?, lifePercent?, position? }`, `grid` = world `combat.grid` (a grid only when `enabled`). `CombatTargetingBusiness.set(ids)`.
- Failing: 26 tests (helper and business files fail to compile: `targetGroups`, `set` missing; component tests find no `[data-testid="targets"]`).

## Green

- Files: `src/app/modules/combat/helpers/combat-targeting.rules.ts`, `src/app/modules/combat/business/combat-targeting.business.ts`, `src/app/modules/combat/components/combat-actions/combat-actions.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: added `targetGroups` and `setTargets` helpers, and `CombatTargetingBusiness.set`. In `app-combat-actions`, the target buttons became a `p-multiselect` (grouped, chips, filter, option template with portrait or initial and life bar, out-of-range options disabled, read-only for self and all-* skills). i18n: `combat.targets.enemies`, `combat.targets.allies` and `combat.targets.placeholder`, checked with node at that path in both en.json and fr.json.
- Suite: 237 files and 2031 tests pass (baseline 235 files, 2010 tests). `tsc` is clean and `ng build` shows no error. `git diff --name-only` lists only `static-pages.spec.ts`, which belongs to the other session. No ticket test file is changed.
- Open questions: none. A third key, `combat.targets.placeholder`, was added beyond the two group labels.

## Review

- Verdict: ship. Moved GM panel / player view tests still check the same behaviour (only the target click changed).
- Consider (not applied): move the candidate mapping out of the component into the business; `targetGroups` could take the projected grid directly instead of an `enabled` flag; `setTargets` truncates to the last id when nothing new is added; the two group literals could share a helper; `pickTarget` could remove stale overlays first.

## Answer

- `targetGroups` (pure, `combat-targeting.rules.ts`): Enemies / Allies relative to the caster, enemies first for harmful skills (one-enemy, all-enemies or a damage effect), allies first otherwise; out of range disabled on a grid when the skill has a range and the caster is placed. `setTargets` + `CombatTargetingBusiness.set(ids)`: single-target keeps the last new pick, area keeps all, self / all-* unchanged.
- `app-combat-actions`: the target buttons are now one Optimus UI multi-select (groups, chips, filter, portrait or initial and a life bar per option), read-only for skills whose targets are preset. Grid picks stay in sync through `$casting`. New keys `combat.targets.enemies|allies|placeholder` (FR, EN).
- Tests: 21 new (8 helper, 7 business, 6 component); 6 GM panel / player view tests now pick through `pickTarget` (`src/testing/combat-table.ts`). Suite 237 files, 2031 tests pass (baseline 2010). Build clean.
- Browser: Tools combat sandbox, FR, EN and mobile: Trait arcanique lists Ennemis then Alliés with initials and life bars; picking the goblin shows its chip; Lumière guérisseuse lists Alliés first; no horizontal scroll, no console error. Out-of-range disabling is covered by the helper tests only (the sandbox skills have no range).
