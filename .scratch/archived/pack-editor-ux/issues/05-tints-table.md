# Items tab: tints as a table with the side panel

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Kinds as a tree table, Side panel)

- The Items tab shows tints in an Optimus UI table: name, gradient preview, fits (kind labels), Edit / Delete.
- Row click → detail in the same right drawer as kinds; Edit → the tint form (gradient stops, fits, tint words and descriptions as today's `tints-editor`). Add tint from the toolbar.
- The card list `tints-editor` goes away. FR/EN, 375 px.

## Decisions carried over from PE04 (user feedback, 2026-11-17)

- No actions in the table rows: Edit and Delete are in the drawer detail's footer; "Add tint" in the toolbar above the table.
- Same right `p-drawer` as kinds (`blockScroll`, `min(32rem, 100vw)`): read-only detail (name, gradient preview, fits, words/descriptions summary) then a one-column form with labels above full-width `[fluid]` controls, titled sections (General: name/id; Gradient: stops; Fits; Texts), Save / Cancel in a footer that stays visible; Cancel or close with changes asks to discard; Delete confirms.
- At 375 px the table keeps the name and the gradient preview only; no horizontal overflow; no label wrapping under anything.

## Baseline

`npm test`: 307 test files, 3050 tests, all passed (2026-11-17, after the PE04 follow-up).

## Seams

- The new tints table component (rendered with `TEST_PROVIDERS`, inputs like `app-kinds-tree-table`: `draft`, `issues`; output `changed`): catches rows (name, gradient preview, fits as kind labels), no row actions, row click → detail with Edit / Delete, Edit → form with stops, fits, words and descriptions, Save emitting the edit through the existing `pack-draft-edits` tint helpers, Cancel/close with changes asking to discard, Add tint, Delete confirming, `blockScroll`, issues on the tint's row, neutral draft hiding texts. Misses the 375 px layout (browser check).
- The pack draft page Items tab (rendered): catches `app-tints-table` in place of `app-tints-editor`.

## Red

- Test files: `src/app/modules/tools/components/pack-draft/tints-table/tints-table.component.spec.ts` (new, imports `TintsTableComponent` from `./tints-table.component`), `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tints-table.spec.ts` (new)
- Run: `npx ng test --watch=false --include 'src/app/modules/tools/**/*tints-table*.spec.ts' 2>&1 | tail -30` (the component spec alone stops the build on the missing `./tints-table.component`; the page spec alone runs and fails)
- Hooks the green must provide: `tint-row-<id>` (tr), `cell-name`, `cell-gradient` (inline linear-gradient), `cell-fits` (max 3 `fit-item` p-chip/p-tag with the noun else the id, then `fit-more` "+N"; no "id — noun"), toolbar `add-tint`; drawer `tint-detail` (`detail-edit`, `detail-delete`) / `tint-form` (`tint-id`, `tint-color-shadow|mid|light` driven by `ngModelChange`, `tint-fits` driven by `onChange`, `tint-adjective-<rarity>`, `tint-suffix-<rarity>`, `tint-descriptions`, `form-save`, `form-cancel`), `issue`.
- Green must update the existing `pack-draft-page.tabs.spec.ts` line 69 (`app-tints-editor` expected present) when the card editor goes away.
- Failing: 18 tests
  - TintsTableComponent (17) — module `./tints-table.component` / `TintsTableComponent` does not exist: rows with name, gradient and fits as 3 chips + "+2"; no row actions; drawer blocks scroll; row click opens read-only detail; detail offers Edit and Delete; Edit opens form with stops, fits, adjectives, descriptions; Save emits edited fits; Save emits edited gradient stop; Save emits adjectives and descriptions; Cancel without changes does not ask; Cancel with changes asks; closing drawer with changes asks; Add tint with 3 stop default gradient; Delete confirms and removes with texts; Delete not accepted leaves draft; issue on its tint row; neutral draft hides texts.
  - Page Items tab shows `app-tints-table` in place of `app-tints-editor` — the page still renders `app-tints-editor`.

## Green

- Files: `src/app/modules/tools/components/pack-draft/tints-table/{tints-table.component.ts,tint-detail.component.ts,tint-form.component.ts,tint-fields.ts}` (new); `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`; `pack-draft-page.tabs.spec.ts` (only `app-tints-editor` -> `app-tints-table`); `public/i18n/{en,fr}.json`; removed `components/pack-draft/tints-editor/` (component and its spec).
- Change: `app-tints-table` (p-table: name, gradient, fits; no row actions; narrow: extra column hidden, name auto width) with the PE04 right drawer (detail with Edit / Delete footer, one-column form in General / Gradient / Fits / Texts sections, `[fluid]` controls, discard and delete confirmations, `blockScroll`). Save goes through `renameTint` / `setTint` / `setTintFits` / `setTintTexts`; texts written only when changed. Reuses the kinds i18n keys for buttons; new tints keys added in both languages (`tints.remove` dropped). Gradient preview uses `[attr.style]` so the hex stays in the markup.
- Suite: 308 files, 3060 tests, all passed (baseline 307 / 3050); tsc clean; ng build no error.
- Open questions: no create-pack docs mention tint cards (none changed); drawer shell and confirmations were not extracted from kinds-tree-table (left untouched); 375 px layout still needs the browser check.

## Review

- Verdict: fix first
- Must fix: `tints-table/tint-form.component.ts:~40` — the old editor's tint id was a `p-autocomplete` suggesting known tint ids (`knownKeys().tints`, from the pack's parent/known packs); the form uses a plain `pInputText` and the table drops `keys.tints`, so that capability is lost without the ticket asking. Restore it as in `kind-form.component.ts:71` (autocomplete, `suggestions`, `suggest()`), keeping `[data-test="tint-id"] input` valid and the id `[fluid]`; pass the known ids from `tints-table.component.ts` (its `knownKeys` effect currently keeps only `keys.kinds`). Add a test for the suggestion.
- Consider:
  - `kinds-tree-table.component.ts:165` vs `tints-table.component.ts` — the drawer shell (header with close button, `blockScroll`/`dismissible`/width, footer buttons styling), the discard confirmation (same props, only header/message keys differ) and the delete confirmation are copied near-verbatim; also `.toolbar`, `.drawer-header`, `.buttons`, `.swatch`-like styles and `kindLabel` fits lookups. With two copies, extracting a small `app-side-drawer` (header/title, close output, body and footer slots) plus a `confirmDiscard` / `confirmDelete` helper is worth it, but as its own refactor ticket now, before a third table (e.g. Classes/Skills) copies it again. Not a blocker.
  - `tint-form.component.ts` `setColor`/`index` and `tint-fields.ts` `lines`/`parseAdjective`/`adjectiveLine` are likely also in `kind-texts.ts` / the common words editor; check for sharing.
  - `tints-table.component.ts` `save()` compares `JSON.stringify(texts)` to a re-parsed `this.initial`; keeping `initialTexts` as a field would be simpler.
  - `tint-detail.component.ts` uses `[style.background]` while the table uses `[attr.style]`; pick one.
- Checked and fine: all old editor capabilities present in the form (id/rename, shadow/mid/light stops, fits multiselect, adjectives and suffixes per rarity, descriptions, add, delete, gradient preview, issues, neutral hiding texts, kebab and new duplicate error). PE04 decisions met (no row actions, same drawer props, sections, `[fluid]` fits, footer, discard and delete confirms, narrow columns hidden). Optimus UI only (native `textarea` carries `pTextarea`, as before). i18n: every new key is in both en.json and fr.json, `tints.remove` dropped with no remaining use. `pack-draft-page.tabs.spec.ts` edit keeps its intent (only the selector). The 18 tints-table tests pass.

### Red update (review round)

- Run: `npx ng test --watch=false --include 'src/app/modules/tools/**/*tints-table*.spec.ts' 2>&1 | tail -30`
- Failing now: 2 tests (the component already exists from green)
  - shows a row per tint ... fits as 3 chips and a +2 — no `fit-item` / `fit-more` elements in the fits cell.
  - suggests the known tint ids matching what is typed in the id field of the form — `tint-id` is not a p-autocomplete with suggestions.

## Green (round 2)

- Files: `tints-table/{tints-table,tint-form,tint-detail}.component.ts`, `tint-fields.ts`, `public/i18n/{en,fr}.json`.
- Change: fits cell shows up to 3 `p-tag` chips (noun, else id) plus a `+N` tag whose tooltip lists the rest (detail keeps "id — noun"); tint id is a `p-autocomplete` fed with `knownKeys().tints`; texts form uses a rarity `p-select` (default common) for adjectives and suffixes, descriptions always shown; duplicated "Fits" label removed (aria-label kept); multiselect uses a translated `selectedItemsLabel` ("{0} kinds selected" / "{0} types sélectionnés") with `maxSelectedLabels=2`; initial texts kept in a field; gradient bound with `[attr.style]` in table, detail and form.

## Review (round 2)

- Verdict: ship
- Must fix: none. Tint id is a `p-autocomplete` fed by `knownKeys().tints` with a passing suggestion test (19 tints-table tests pass).
- Consider: the shared drawer shell / confirmations extraction remains a separate refactor ticket. Round-2 additions (fit chips, rarity select, selectedItems, rarityHint) have keys in both FR and EN. Initial texts kept in a field and `[attr.style]` is used everywhere, so those Considers are done. 375 px still needs the browser check.

## Answer

- The Items tab shows tints in an Optimus UI table: name, gradient preview, fits as up to 3 chips (kind noun, else id) then "+N" with the rest in a tooltip. No row actions; "Add tint" above the table.
- Row click opens the same right drawer as kinds (`blockScroll`): read-only detail with Edit / Delete; form with General (id, a `p-autocomplete` suggesting known tint ids), Gradient (shadow / mid / light), Fits (multiselect, translated "N kinds selected"), Texts (adjectives and suffixes one rarity at a time through a select, descriptions always visible); Save / Cancel in the footer; discard and delete confirmations. Old `tints-editor` removed.
- Round 2 after the review (tint id suggestions lost) and the browser check (7-line fit rows, all 10 rarity textareas at once, duplicate Fits label, untranslated "items selected").
- Checked: suite green (308 files); build clean; review round 2 ship. Browser: FR desktop table and form, no overflow; EN at 375 px the table shows Name and Gradient only, no horizontal scroll. The console only showed a stale hot-reload error from an earlier live edit.
- Left (review Consider): extract the drawer shell and confirmations shared with `kinds-tree-table` into one component (own refactor ticket).
