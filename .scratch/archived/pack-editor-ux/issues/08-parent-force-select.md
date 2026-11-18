# Kind parent: pick from the list only

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Kinds as a tree table)

From the quick notes (2026-11-18): "pour ajouter une nouvelle catégorie, le champ parent doit être autocomplete avec force select".

## What

- The **Parent** field of the kind form (`kind-form.component.ts`, `data-test="kind-parent"`) is already a `p-autocomplete`; make it `forceSelection`: a typed text that is not one of the suggestions is cleared on blur, so a kind can only get an existing kind (or no parent).
- Suggestions stay as today (this draft's kinds of the domain, minus self and descendants). Show them on focus too (`dropdown` or `completeOnFocus`, assumed), so the user sees the choices without typing.
- Clearing the field still means "root kind".
- Same rule for every domain (items, NPCs, skills, classes).

## Baseline

`npm test`: Test Files 326 passed (326), Tests 3188 passed (3188).

## Seams

- `app-kinds-tree-table` rendered with `TEST_PROVIDERS` (component inputs/outputs: the saved kind it emits): catches an unknown typed parent cleared on blur (no `parent` on save), a picked suggestion saved, suggestions shown on focus; misses the real overlay look in a browser (step 7 covers it). Applies to every domain through the shared form, so one domain's test plus a second domain's smoke test is enough.

## Green

- Files: src/app/modules/tools/components/pack-draft/kinds-tree-table/kind-form.component.ts
- Change: Parent `p-autocomplete` got `[forceSelection]="true"` and `[dropdown]="true"`. No other change.
- Suite: 3204 passed, 4 failed of 3208 (baseline 3188 all green; 16 new red tests pass). The 4 failures are the existing "refuses to save a kind whose parent is one of its descendants" (one per domain): the test types `sage` without picking it, forceSelection clears it on blur, so the form saves with no parent, `view.emitted` is not `[]` (it holds the saved draft) and the cycle error never shows. tsc clean, ng build no error, no test file modified.
- Open questions: that test must be rewritten to pick `sage` via the suggestions (it is also unreachable now, since suggestions exclude descendants, so the cycle guard can only be tested on the service/business level); routing to the test owner.

## Review

- Verdict: ship. Must fix: none.
- Consider: the "saves a picked suggestion" test leans on PrimeNG internals (a no-op `triggerEventHandler?.` on a component instance, `completeMethod` fired twice, `onOptionSelect` called directly); the forceSelection / dropdown tests read inputs (config), while the blur-clears test covers the behaviour; the rewritten descendant test no longer drives a cycle through the UI (a descendant can't be entered any more), so the cycle guard rests on lower-level tests.

## Answer

- Built: the kind form's Parent `p-autocomplete` (`kind-form.component.ts`) has `[forceSelection]="true"` and `[dropdown]="true"`. Typed text that isn't a suggestion is cleared on blur; the dropdown button shows the suggestions without typing; clearing still means root kind. The form is shared, so the rule applies to items, NPCs, skills and classes.
- Decision: `dropdown` (a visible button) rather than `completeOnFocus`. The old test "refuses to save a kind whose parent is one of its descendants" became "never saves a descendant as the parent": typing it is cleared on blur and the kind stays a root kind, since descendants are not offered.
- Tests: 5 tests per domain in `kinds-tree-table.component.spec.ts` (inside `describe.each` over the 4 domains). Suite 326 files / 3208 tests green (baseline 3188); ng build clean.
- Browser (pack creator draft, Items tab): EN desktop, unknown `zzz` cleared on blur, dropdown lists kinds, picking `consumable` fills the field and the kind saves; FR at mobile width, unknown `inconnu` cleared on blur, dropdown lists kinds with French labels. No console errors. The PrimeNG empty message "No results found" is still English in FR (pre-existing, not this ticket).
