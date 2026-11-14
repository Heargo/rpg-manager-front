# Action tabs replace the counters

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Turn actions, Decisions: action tabs at 0)

- One tab per action type (Optimus UI tabs), label `Name (left/count)`. The selected tab lists the skills of that type (no type or unknown type = first type); basic attack and items under the first non-movement type.
- A tab at 0: its entries are disabled. GM only: a −/+ on the tab sets the count used.
- Action counters step off: no tabs, one flat list as today.
- A pure helper groups skills/items per tab (`combat-actions.rules.ts` or the existing combat-view rules).

## Decisions (orchestrator)

- Pure helper `combat/helpers/combat-actions.rules.ts`, `actionTabs(actions, skills)`: one tab per action type in the combatant's order, each `{ name, count, used, left, skills }`; a skill goes to the tab named by its `actionType`, else (none or unknown) to the first tab. Items (and anything not tied to a type) go under the first tab; the movement flag arrives with C07, which will move them to the first non-movement type.
- Component `app-combat-actions`: Optimus UI tabs (`p-tabs`, `p-tablist`, `p-tab`, `p-tabpanels`, `p-tabpanel`), label `Name (left/count)`, first tab selected. The panel lists that tab's skills (and the items on the first tab), then a "Use" button that ticks one (replaces today's counter; disabled at 0) for everyone.
- A tab at 0 (`left === 0`): its skills, items and Use button are disabled.
- GM only (`CombatBusiness.$isGameMaster`): a "−" button in the panel gives one back (used − 1, disabled at 0 used). Together with Use, that is the −/+.
- No action counters (`actions` empty, step off): no tabs, today's flat lists (skills, items).
- Targeting, skill summaries and availability stay as today. Item use does not tick (as today).

## Baseline

Test Files 233 passed, Tests 2000 passed. Working tree: `public/i18n/*.json`, `src/app/modules/home/`, `user-docs/` changes belong to another session; at commit, only this ticket's i18n hunks are staged.

## Seams

1. **Pure helper** `actionTabs` (`combat-actions.rules.ts`): grouping by `actionType`, unknown/none to the first tab, `left` computed. Misses: rendering.
2. **Component** `app-combat-actions` (`TEST_PROVIDERS`, fixtures `src/testing/combat-table.ts`): a tab per type labelled `(left/count)`, the selected tab's skills, items on the first tab, entries disabled at 0, Use ticks one, "−" only for the GM, flat lists when there are no counters. Misses: layout (browser).

## Red

- Test files: `src/app/modules/combat/helpers/combat-actions.rules.spec.ts`, `src/app/modules/combat/components/combat-actions/combat-actions.component.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/combat/helpers/combat-actions.rules.spec.ts` and `npx ng test --watch=false --include src/app/modules/combat/components/combat-actions/combat-actions.component.spec.ts`
- Failing: 9 tests (4 helper, 5 component); the sixth component test is a regression guard that passes today
  - helper (4 tests: one tab per type with left, skills by actionType, unknown/none to first tab, no tabs without counters) — `./combat-actions.rules` / `actionTabs` does not exist
  - component: one tab per action type labelled `Name (left/count)` — no `[role="tab"]` rendered
  - component: first tab skills and items, other tab skills once selected — no tabs
  - component: tab at 0 label updated and entries disabled — no tabs
  - component: GM minus button (`[data-action="untick"]`) — not rendered
  - component: no minus for a player (also expects 2 tabs) — no tabs
  - Passing guard: flat lists when action counters are off (as today)
- Contract for green: tabs are `[role="tab"]`; panel keeps `[data-testid="skill"|"item"]`, `[data-action="use-skill"|"use-item"|"tick"]`, plus `[data-action="untick"]` for the GM.

## Green

- Files: `src/app/modules/combat/helpers/combat-actions.rules.ts` (new), `src/app/modules/combat/components/combat-actions/combat-actions.component.ts`, `public/i18n/en.json` and `fr.json` (new key `combat.actions.giveBack`)
- Change: `actionTabs` helper groups skills per action type. `app-combat-actions` now shows `p-tabs` (label `Name (left/count)`, one panel for the selected tab: its skills, items on the first tab, Use button, GM-only "−" button), entries disabled at 0. It reads the counters live from the combat state (falls back to the `actions` input). Without counters it shows the flat lists.
- Suite: 2007 pass, 3 fail (baseline 2000 pass, 0 fail). The 3 failures are older specs that still expect the removed counters (`[data-testid="action-counter"]` with a tick button inside): `combat-gm-panel.component.spec.ts` "expands the active row with counters, skills and items, and ticks a counter", `combat-player-view.component.spec.ts` "shows own skills, items and counters, and only those" and "ticks an own counter and uses an own item". The 9 red tests pass; tsc clean, ng build OK, no test file in the unstaged diff.
- Open questions: those 3 specs contradict this ticket (counters replaced by tabs) and need updating to the tab contract (red step); I could not touch them.

## Review

- Verdict: fix first → fixed by the orchestrator: `giveBack` had been added under `character.items` in both files and was missing from `combat.actions` in FR; the stray keys are removed and `combat.actions.giveBack` is in EN and FR.
- Consider (not applied): a tautological `ada.id` assertion in the component spec; a "tab at 0" case for a non-first tab; `S extends { actionType?: string }` instead of a cast in `actionTabs`; `isFirst` instead of identity; the class doc comment still says "tick the action counters". The host does not check who sends a lower `used` on `tickAction`, so "GM only −" is a UI rule (a player can only act on their turn since C02).

## Answer

- `combat-actions.rules.ts` (`actionTabs`): one tab per action type, skills by `actionType`, none or unknown to the first tab, `left` computed.
- `app-combat-actions`: Optimus UI tabs labelled `Name (left/count)`; the selected tab lists its skills (items on the first tab), a Use button that ticks one, and for the GM a "−" (Rendre une action / Give one back). A tab at 0 disables its skills, items and Use. No counters (step off): today's flat lists. Counters are read live from the combat state.
- Tests: 9 new (4 helper, 5 component) plus a counters-off guard; three older GM panel / player view specs moved from counters to the tab contract without losing what they check. Suite 235 files, 2010 tests pass (baseline 2000). Build clean.
- Review: fix first (i18n key in the wrong section, missing in FR), fixed by the orchestrator. Consider lines listed in the Review block, not applied.
- Browser: Tools combat sandbox, FR, EN and mobile: tabs `Action (1/1)` / `Movement (1/1)`, Use takes Action to 0/1 and disables its 5 skills, 4 items and Use; "−" brings it back to 1/1; no horizontal scroll, no console error. On mobile the second tab sits behind the tab bar's scroll arrow (Optimus UI scrollable tabs). The player-only case (no "−") is covered by the component test (the sandbox device is the GM).
