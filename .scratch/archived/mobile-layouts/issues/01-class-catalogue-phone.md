# Class catalogue on a phone, no default classes button

Status: resolved
Type: task
Blocked by: GK08 (`../../generator-kinds/issues/08-base-starter-content.md`)

Spec: `../spec.md` (Catalogues)

- At phone width the search input and "New class" button each take the full width, stacked.
- The "Add the default classes and skills" button is removed everywhere (room, Tools); the defaults come from the packs' "Import from the packs" (GK07/GK08). Assumed: the `addDefaults` business method goes too if nothing else calls it.
- Check 375 px and desktop, FR/EN.

## Baseline

`npm test`: 311 test files, 3073 tests, all passed (2026-11-17, after ML05).

## Seams

- The class catalogue component (rendered with `TEST_PROVIDERS`): catches the "Add the default classes and skills" button gone, "Import from the packs" still there, and the toolbar hooks the phone layout relies on (search, New class). Misses widths at 375 px (browser check).
- The class catalogue businesses (room and sandbox): catches the removed defaults method no longer being called, while the sandbox's initial content and world creation keep working.

## Red

- Test files: `src/app/modules/class/components/class-catalogue/class-catalogue.phone.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/class/components/class-catalogue/class-catalogue.phone.spec.ts`
- Failing: 2 tests
  - has a toolbar holding search, New class and Import from the packs as direct children, in order — no `[data-field="toolbar"]` hook on the toolbar
  - marks search and New class with the classes the phone layout targets — search input and New class button have no `search` / `create` class
- For green: the removal of the default classes button and of `addDefaults` (component, `ClassCatalogueBusiness`, `SandboxClassCatalogueBusiness`) is already done and covered by the existing `src/app/modules/class/business/class-catalogue.no-defaults.spec.ts` (passes today, nothing to rewrite). No new test added for it. Remaining for green: the toolbar hooks above and the phone CSS (search and New class full width, stacked, below 40rem); i18n leftovers for the old button, if any, are not tested.

## Green

- Files: src/app/modules/class/components/class-catalogue/class-catalogue.component.ts
- Change: added `data-field="toolbar"` on the toolbar, `search` / `create` classes on the input and New class button, and a `@media (max-width: 40rem)` rule giving both `flex: 1 1 100%; width: 100%` (stacked). Desktop styles untouched, no `[fluid]`.
- Suite: 312 files, 3075 tests, all pass (baseline 311 / 3073, +1 file, +2 tests); tsc clean; ng build no error.
- Open questions: none

## Answer

- The default classes button and its `addDefaults` methods were already gone (GK08); the existing `class-catalogue.no-defaults.spec.ts` covers it.
- Below 40rem the class catalogue's search input and New class button take the full width, stacked; desktop unchanged (media query only).
- Checked: suite green; build clean; diff reviewed by the orchestrator (small CSS change, no review agent). Browser at 375 px FR: search and New class 327 px each, stacked, no horizontal scroll.
