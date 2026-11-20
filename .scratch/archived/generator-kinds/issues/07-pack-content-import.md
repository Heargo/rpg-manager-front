# Pack fixed content reaches the catalogues

Status: resolved
Type: task
Blocked by: 05

Spec: `../spec.md` (Decisions 7–9).

- Activating a pack in the world rules imports its fixed items, skills and classes into the world's catalogues, using 05's import rules.
- Each catalogue (items, skills, classes) gets an "Import from the packs" action that re-runs the import for the active packs: untouched copies are updated, edited ones kept; a short notice says what was added, updated and kept.
- When the pack's content uses attributes the world doesn't have, a dialog (Optimus UI) asks the GM, for each one: map it to an existing attribute, add it to the world, or skip it. Cancel imports nothing.
- Imported entries are ordinary catalogue entries afterwards: saved, exported, sent over the room.
- Both languages, mobile width.

## Baseline

 Test Files 292 passed (292)  Tests 2879 passed (2879) (after `3f29e3f`).

## Seams

1. **Import business (new `PackContentImportBusiness` or a method of the world session business, over the repo's storage fakes)**: run 05's `planPackImport` for the world's active packs and domains, write the catalogues (keeping `packHash`), add the attributes chosen `add`, return the added / updated / kept counts and the attributes needing a choice; cancel writes nothing; activating a pack in the world rules triggers it. Misses the dialog and buttons.
2. **Attribute mapping dialog component (inputs/outputs, `TEST_PROVIDERS`)**: given the missing pack attributes and the world's attributes, emits a mapping (existing id / `add` / `skip` per attribute) or cancel. Misses the business.
3. **Catalogue pages and rule fields (component inputs/outputs, `TEST_PROVIDERS`)**: items, skills and classes catalogues show "Import from the packs", which runs the import (opening the dialog when needed) and shows the notice; activating a pack in the rule fields does the same. FR/EN keys. Misses the DOM layout (browser check).

## Red

- Test files: `src/app/modules/world/business/pack-content-import.business.spec.ts`, `src/app/modules/world/components/pack-attribute-mapping/pack-attribute-mapping.component.spec.ts`, `src/app/modules/skill/components/skill-catalogue/skill-catalogue.import.spec.ts`, `src/app/modules/class/components/class-catalogue/class-catalogue.import.spec.ts`, `src/app/modules/item/components/item-catalogue/item-catalogue.import.spec.ts`, `src/app/modules/class/pages/class-catalogue-page/class-catalogue-page.import.spec.ts`; fixture `src/testing/content-pack.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30`
- Contract the tests fix: `PackContentImportBusiness.importFromPacks({ mapping?, domains? })` (in `modules/world/business/pack-content-import.business.ts`) resolves `{ added, updated, kept, needsChoice }` and writes nothing while `needsChoice` is non-empty; `app-pack-attribute-mapping` (`modules/world/components/pack-attribute-mapping/`) with inputs `missing`, `attributes`, outputs `confirmed`, `cancelled`; catalogue components get an `importPacks` output and a `[data-action="import-packs"]` button; the class page shows the dialog and a toast; `WorldSessionBusiness.saveRules` with a newly activated pack triggers the import.
- Note: the two new-module specs do not compile until the modules exist, which breaks the whole `ng test` build (missing module = the red).
- Failing: 
  - pack-content-import.business.spec (10 tests: imports, no-op rerun, update stale copy, keep edited, domains filter, needsChoice writes nothing, add, map, skip, activation via saveRules) — module `pack-content-import.business` missing
  - pack-attribute-mapping.component.spec (4 tests: rows, default add, map/skip, cancel) — component missing
  - skill/class/item catalogue `.import.spec` (1 test each) — no `importPacks` output nor import button
  - class-catalogue-page.import.spec (2 tests: dialog then confirm imports, cancel imports nothing) — no import button

## Green

- Files: `src/app/modules/world/business/pack-content-import.business.ts` (new), `src/app/modules/world/components/pack-attribute-mapping/pack-attribute-mapping.component.ts` (new), `src/app/modules/world/business/world-session.business.ts`, `src/app/modules/world/pages/world-rules-page/world-rules-page.component.{ts,html}`, the item/skill/class catalogue components and pages, `public/i18n/en.json`, `public/i18n/fr.json` (`packImport.*`)
- Change: `importFromPacks` plans each active pack, writes nothing while `needsChoice` is non-empty, else adds the chosen attributes and merges the catalogues. `saveRules` calls `importActivated` for newly activated packs: it imports, or leaves a `$pending` choice that the rules page shows as `app-pack-attribute-mapping` (confirm imports, cancel imports nothing, toast either way). Catalogues have an `importPacks` output and an "Import from the packs" button; their pages show the dialog and a toast. The mapping select is rebuilt on each choice: Optimus's overlay leave waits for an animation frame that never comes in the full run, so the closed overlay's options stayed in the DOM and the next choose hit them.
- Suite: 298 files / 2898 tests pass, three full runs in a row (baseline 292 / 2879 plus the new specs); tsc clean, build OK, no test file modified.
- Open questions: added attributes get `baseValue = pack max ?? 10` and a linear step-1 formula. Item and skill pages are wired but have no page-level test. No browser or mobile-width check yet.

## Review

- Verdict: fix first
- Must fix:
  - item-catalogue-page.component.ts, skill-catalogue-page.component.ts, world-rules-page.component.ts — the toast, the dialog and the pending flow are wired but have no test, although seam 3 and the ticket require them for every catalogue and for activation in the rule fields (only the class page is tested) — add page-level specs (import with toast, needsChoice then confirm, cancel; rules page: activation shows the dialog, confirm/cancel/toast).
- Consider:
  - pack-attribute-mapping.component.ts:33,126-138 — the select is rebuilt on every change to work around a test-only overlay leave; this ships a hack for a jsdom artefact, drops keyboard focus from the select after each choice, and the pending epoch signal adds state. Prefer fixing in the spec (flush animation frames / close overlay) or a `@defer`-free simple fix; at least add a comment pointing to the test.
  - the three catalogue pages (class, item, skill) — `missingAttributes` + `importPacks()` + toast code copied three times; move to PackContentImportBusiness (or one shared helper) and keep the pages thin. Also the dialog is an inline panel replacing the catalogue, not a p-dialog as the ticket says; the rules-page copy sits above the tabs.
  - pack-content-import.business.ts:30,145 — `Record<string, any>`, and `merge` uses a ternary as a statement for side effects; extract a pure `mergeById` helper into core/packs.
  - pack-content-import.business.ts:38-61 — `activation` and `$pending` are hidden mutable state read once by the page (`takeActivation`); fragile if the page is closed (pending survives a world switch).
  - world-session.business.ts:88 — import failures on activation are swallowed (`.catch(() => undefined)`), so the GM gets no error toast.
  - Added attributes default `baseValue = pack max ?? 10`, linear step 1 (open question in the ticket) — confirm with the GM.
  - No browser/mobile-width check yet.

## Green (review fixes)

- Files: `core/packs/pack-content.ts` (`mergeById`, `PackEntry`), `world/business/pack-content-import.business.ts`, `world/business/pack-import-flow.business.ts` (new, shared run/confirm/cancel/toast), `world-session.business.ts` (no more swallowed error), the three catalogue pages and the rules page (thin, via the flow), `pack-attribute-mapping.component.ts` (overlay workaround removed).
- Change: `$pending` is scoped to the open world (forgotten on close or world switch). The rules page and the flow register an Angular `PendingTasks` task while a save or import runs, so `whenStable` waits for it: this was the full-run flakiness of the "asks about the missing attributes" test (the import outlasted the 20 ms settle under load). `importActivated` is a no-op when the session has no open world.
- Suite: 301 files / 2913 tests pass, three full runs; tsc clean; build OK; no test file modified.

## Review (re-check of the fixes)

- Verdict: ship
- Must fix: none
- Consider:
  - world-session.business.ts:~90 — an import failure on activation now rejects `saveRules`, so the rules page shows "saving failed" although the rules were saved; catch it in the page (or `importActivated`) and show `packImport.failed` instead.
  - pack-import-flow.business.ts — it injects `MessageService` (UI) in a business; consistent with existing pages but a toast helper would keep business UI-free.
  - Still pending: browser and mobile-width check; the added-attribute defaults (baseValue = pack max ?? 10, linear step 1) to confirm with the GM.

## Answer

- `PackContentImportBusiness` runs 05's `planPackImport` for the world's active packs and writes the catalogues (keeping `packHash`), adds the attributes chosen `add`, and writes nothing while a choice is pending. `PackImportFlowBusiness` holds the flow shared by the three catalogue pages and the rules page: run, the pending choice (keyed by world id, dropped when the world closes or changes), confirm, cancel, and the toasts.
- `app-pack-attribute-mapping`: an inline panel (Optimus `p-select` per missing attribute: add, skip or a world attribute; add by default). It replaces the catalogue while open and scrolls itself into view.
- Catalogues: "Import from the packs" (`importPacks` output). World rules: saving rules that activate a pack imports it, with the panel when needed. An import failure shows "rules saved" plus `packImport.failed` (`PackImportError`).
- Decisions: attributes added from a pack get `baseValue = pack max ?? 10` and a linear step-1 formula *(assumed)*. Pack attributes match world attributes by name first. Deleting an attribute refreshes the `packHash` of untouched imported items, so the app's own change isn't taken for a GM edit (found in the browser).
- Test-only fix: the select overlay helper `src/testing/select-overlay.ts`, in place of the earlier production workaround.
- Checked: suite 302 files / 2915 tests (baseline 292 / 2879), `ng build` clean, review `ship`. In the browser, with a temporary local pack (removed): a hosted world, FR desktop: activation → panel → add → 3 added, Arcane added, items present; re-import 0/0/0. EN mobile: class catalogue import → panel → mapped to Intelligence. No console errors. The Tools world rules page uses the sandbox world, so activation doesn't import there. The panel's smooth scroll could not be checked: the browser pane was hidden, so animation frames never ran. The player side is covered by the multi-device test only.
