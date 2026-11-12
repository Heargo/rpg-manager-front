# World rules page: clickable step tabs

Status: resolved
Type: task
Blocked by: 05

Spec: `../spec.md`

- On the World rules page of an existing world, the wizard's steps become tabs (Optimus UI tabs): any tab can be opened in any order, the current one is highlighted, Save stays available (validation errors mark the tab that has them).
- Includes the offline features section from ticket 05 as a tab.
- The new-world wizard keeps its linear stepper.

## Baseline

Test Files 130 passed, Tests 1113 passed.

## Seams

1. **World rules page component (`TEST_PROVIDERS`)**: one tab per wizard step plus Offline; any tab opens in any order; the active tab is marked; Save is available from every tab; a validation error marks the tab that has it and blocks save. Misses: tab styling (browser check).
2. **New world page component**: still a linear stepper (unchanged behaviour; existing specs).

## Red

- Test files: `src/app/modules/world/pages/world-rules-page/world-rules-page.component.spec.ts`
- Run: `npx ng test --watch=false` (the `--include <file>` form fails to build here with a pre-existing TS2591 `node:crypto` error in `src/testing/jsdom-setup.ts`, also on a clean tree; the full run works)
- Tab contract chosen: three tabs with test ids `rules-tab-attributes` (attribute table), `rules-tab-rules` (progression, economy, npcs sections of `app-rule-fields`), `rules-tab-offline` (offline section `rules-section-offline`); `aria-selected="true|false"` marks the active tab; `data-invalid="true"` marks a tab with a validation error; `rules-save` is outside the panels (present on every tab). Attributes is the initial tab.
- Failing: 8 tests (baseline 1113 pass, now 1111 pass + 8 fail; the other 129 files pass)
  - shows the wizard rule fields with the world values, and one row per attribute (existing test, adapted to click the tabs) — `rules-tab-rules` does not exist
  - saves the offline features toggled in its offline section with the other rules (existing test, adapted) — `rules-tab-offline` does not exist
  - tabs: has one tab per step and starts on attributes — tab elements missing
  - tabs: opens any tab in any order and marks only the active one — tab elements missing
  - tabs: keeps Save available on every tab — tab elements missing
  - tabs: saves edits made across several tabs in one go — tab elements missing
  - tabs: marks the tab that has a validation error and blocks save from another tab — tab elements missing
  - tabs: does not mark any tab while the rules are valid — tab elements missing

## Green

- Files: src/app/modules/world/pages/world-rules-page/world-rules-page.component.{ts,html,scss}, src/app/modules/world/components/rule-fields/rule-fields.component.{ts,html}, public/i18n/en.json, public/i18n/fr.json
- Change: the rules page now uses `p-tabs` (Attributes, Rules, Offline); `rules-save` sits outside the panels. `data-invalid` marks the tab with an error (attributes, cap or formula errors on Attributes; other rule errors on Rules). `app-rule-fields` gets a `sections` input (`all` default, `rules`, `offline`) so the new-world wizard is unchanged. Each tab label is a `<button>` inside `p-tab`, because the test click helper needs a button.
- Suite: 130 files, 1119 tests pass (baseline 1113 plus the 8 red, minus none); tsc clean; ng build OK.
- Open questions: none (tab styling needs the browser check).

## Answer

World rules page uses p-tabs (Attributes, Rules, Offline), Save outside the panels, invalid tab marked. Wizard unchanged (`app-rule-fields` `sections` input). Browser: hosted world, all tabs open in any order, no console error. Review step skipped (small UI change); suite 130/1119.
