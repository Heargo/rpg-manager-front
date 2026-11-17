# Kinds as a tree table with a side panel

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (Kinds as a tree table, Side panel)

- In the Items, NPCs, Skills and Classes tabs, kinds show as an Optimus UI tree table built from `parent`: label, id, domain fields, row actions Edit / Add child / Delete.
- Clicking a row opens a right overlay drawer with the kind's detail; Edit switches it to the form (the fields of today's kinds editors); Save applies the edit to the draft through the existing `pack-draft-edits` helpers; Cancel or closing with changes asks to discard.
- "Add kind" in the tab toolbar adds a root; "Add child" pre-fills `parent`. Delete confirms and removes the kind and its children (assumed), validation issues show as today.
- The old card list editors (`kinds-editor`, `domain-kinds-editor`) go away.
- Drawer full width at 375 px; FR/EN.

## Baseline

`npm test`: 306 test files, 2962 tests, all passed (2026-11-17, after PE03).

## Seams

- `pack-draft-edits` helpers (pure, exported): catches deleting a kind together with its descendants, adding a root kind and a child kind (parent set), and editing a kind's fields through the existing helpers, per domain (items, NPCs, skills, classes). Misses the UI.
- The new kinds tree table component (rendered with `TEST_PROVIDERS`, inputs = the domain and its kinds, outputs = the edits; or through the pack draft page tab if the component is wired straight to the draft): catches the tree built from `parent`, the columns per domain, row click → drawer detail, Edit → form, Save emitting/applying the edit, Cancel or close with changes asking to discard, Add kind (root) / Add child (pre-filled parent), Delete confirming and saying children go too. Misses the drawer width at 375 px (browser check).

## Red

- Test files:
  - `src/app/core/packs/pack-draft-edits.kinds-tree.spec.ts`
  - `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts`
  - `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.kinds-tree.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one run per file)
- Failing: 64 tests
  - pack-draft-edits.kinds-tree (4 of 12; the other 8 guard existing behaviour):
    - removeKind removes the kind together with its descendants — descendants, their texts and sprite refs are left behind.
    - removeDomainKind removes the kind with its descendants (npcs, skills, classes) — descendants are left behind.
  - kinds-tree-table.component.spec (56 = 14 tests x items, npcs, skills, classes) — the module `./kinds-tree-table.component` (`KindsTreeTableComponent`) does not exist. Tests: tree built from parent, columns per domain, row actions, row click opens detail, Edit opens form, row Edit, Save emits edit, Cancel without changes, Cancel with changes asks to discard, closing the drawer with changes asks, Add kind (root), Add child (parent pre-filled), Delete confirms and says children go too, Delete not accepted, issue on the kind's row.
  - pack-draft-page.kinds-tree.spec (4: Items, NPCs, Skills, Classes) — the tab has no `app-kinds-tree-table` and still renders `app-kinds-editor` / `app-domain-kinds-editor`.
- Contract the component spec assumes (green must match or adjust the spec):
  - Selector `app-kinds-tree-table`, inputs `draft`, `issues`, `domain` (`'items' | 'npcs' | 'skills' | 'classes'`), output `changed`.
  - Tree rows start expanded.
  - Tree rows are `tr[data-test="kind-row-<id>"]` with `aria-level`.
  - Cells are `cell-label`, `cell-id` and `cell-<field>`: type and slot for items, roles for NPCs, type and effect for skills, skills for classes.
  - Row buttons are `edit-<id>`, `add-child-<id>`, `delete-<id>`. Toolbar button is `add-kind`.
  - The `p-drawer` holds `kind-detail` (with `detail-edit`) or `kind-form` (`kind-id`, `kind-parent`, the old domain control hooks `kind-slot`, `kind-roles`, `kind-effect`, `kind-skills`, `form-save`, `form-cancel`).
  - Closing is `p-drawer` `visibleChange` false.
  - Delete and discard go through `ConfirmationService.confirm`. The delete message mentions "child".
  - Issues use `data-test="issue"` and are filtered like today.
- Old specs green must remove or adjust (not touched):
  - `kinds-editor/kinds-editor.component.spec.ts`
  - `domain-kinds-editor/domain-kinds-editor.component.spec.ts`
  - `domain-kinds-editor/domain-kinds-editor.suffixes.spec.ts`
  - `pack-draft-page.tabs.spec.ts` (asserts `app-kinds-editor` and `app-domain-kinds-editor`)
  - Any page spec that drives the old kind editors (`pack-draft-page.component.spec.ts`, `.domains.spec.ts`, `.sprites.spec.ts`).
- The missing module breaks type-checking of the whole `ng test` bundle until green creates it.

## Green

- Files: `src/app/modules/tools/components/pack-draft/kinds-tree-table/` (`kinds-tree-table.component.ts`, `kind-texts-form.component.ts`, `kind-texts.ts`, all new); `src/app/core/packs/pack-draft-edits.ts` (removeKind / removeDomainKind take the descendants); `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`; `public/i18n/en.json`, `fr.json` (`packs.creator.kinds.*`); `user-docs/src/content/docs/create-pack.md`, `en/create-pack.md`; removed `kinds-editor/` and `domain-kinds-editor/` with their 3 specs.
- Change: `p-treetable` from `parent` (rows expanded), row actions Edit / Add child / Delete, toolbar Add kind, right `p-drawer` (`min(32rem, 100vw)`) with detail then form. The form has id, parent, the domain fields and the per-kind texts of the old editors (nouns, descriptions, name templates, adjectives, suffixes; per rarity for items, one scope for NPCs/skills/classes, no suffixes for NPCs), kept in the form and applied on Save through setKindTexts / setKindWords / setDomainKindTexts (only when edited). The detail lists the texts, the Preview button draws trial entries (with the pending form texts when editing), and the sprite-coverage line shows under the table (items) and in the detail. Texts hidden for a neutral draft. Delete and discard use `ConfirmationService`. Docs reworded (kind cards -> tree table and panel, texts and preview in the panel).
- Specs touched: `pack-draft-page.tabs.spec.ts` (selectors now `app-kinds-tree-table`; domain tabs assert exactly one table); `core/packs/pack-draft-domains.spec.ts` (removeDomainKind expects the child to go too). Red specs untouched.
- Suite: `npm test` 306 of 306 files, 3002 of 3002 tests pass (baseline 2962 + 40 new); tsc clean; `ng build` no error.
- Open questions: no spec covers the texts and preview in the drawer (checked by a throwaway test, deleted); browser check (drawer width at 375 px) not done.

## Review

- Verdict: fix first
- Must fix: kind-texts-form.component.ts / kind-texts.ts / kinds-tree-table.component.ts (drawer texts + preview) — the old editors' specs (kinds-editor, domain-kinds-editor, suffixes; ~300 lines) were deleted and nothing replaces them, so nouns/descriptions/names/adjectives/suffixes round trip (readTexts/writeTexts), "texts applied only when edited", Preview with pending form texts, and the neutral-draft hiding are untested; a bug there would silently lose user texts — add a component-seam spec (edit a noun and a suffix, Save emits a draft with them; Preview shows entries; neutral draft shows no texts) plus a small kind-texts.ts round-trip spec per domain.
- Consider: kinds-tree-table.component.ts `suggest` / parent field — a kind can be given itself or a descendant as parent, which makes the subtree vanish from the tree (no root reachable); exclude self and descendants from the suggestions and reject in canSave.
- Consider: kinds-tree-table.component.ts (970 lines) — large; the form and the drawer could be split like kind-texts-form was.
- Consider: kinds-tree-table.component.ts `remove` — closes the drawer only if the removed id is selected; a selected descendant that goes with it leaves the drawer open on a missing kind.
- Checked: capabilities of both old editors are all in the drawer (id, parent, type/slot/roles/person/effect/skills, nouns with gender/plural, descriptions, names, adjectives forms, suffixes per rarity, Preview, sprite coverage under the table and in the detail, rename through renameKind/renameDomainKind), nothing is left to Advanced JSON only. The two edited specs keep their intent (selector rename; removeDomainKind now removes the child, as the ticket and red spec say). Controls are Optimus UI (pInputText, pTextarea, p-checkbox, p-select, p-multiselect, p-autocomplete); no bare checkbox or number input. No secrets. New spec: 60/60 pass.

## User feedback (2026-11-17, after trying it)

1. The side panel must be reworked to be readable and clear to edit: too many inputs in every direction. Follow UX/UI good practice.
2. Alignment bug on some rows (e.g. a leaf like "Couronne" sits lower and is not indented like its siblings).
3. Parent rows must be told apart from final (leaf) rows: a slightly darker background for parents.
4. No actions in the table: Edit, Add child and Delete are available from the side panel only.
5. Background scroll is blocked while the side panel is open.

Decisions taken for this round (orchestrator, from the feedback and the review):
- Drawer **detail** = a read-only summary (label, id, parent, domain fields, texts summary, sprite coverage) with the actions Edit, Add child and Delete. Toolbar "Add kind" stays above the table.
- Drawer **form** = one column, labels above full-width inputs, grouped in titled sections: General (id, parent), the domain's fields, then Texts. Texts are progressively disclosed: one category at a time (an Optimus accordion, collapsed by default, or equivalent), item texts show one rarity at a time through a selector rather than every rarity at once. Save / Cancel in a footer that stays visible.
- `p-drawer` blocks the page scroll while open.
- Review Must fix: tests for the drawer texts (round trip per domain, applied only when edited, Preview with pending texts, hidden for a neutral draft).
- Review Considers taken: parent suggestions exclude the kind itself and its descendants (and Save is refused for them); removing an ancestor of the selected kind closes the drawer; the 970-line component is split (table, drawer detail, drawer form).

## Red (round 2)

- Test files (changed or new):
  - `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts` (96 tests: 24 per domain on items, npcs, skills, classes)
  - `src/app/modules/tools/components/pack-draft/kinds-tree-table/kind-texts.spec.ts` (new, 5 tests)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one run per file)
- Result: component spec 36 failed, 60 passed. kind-texts.spec 5 of 5 pass (coverage guard, no behaviour change).
- Failing, 9 tests x 4 domains = 36:
  - has no action buttons in the table rows: rows still hold `edit-/add-child-/delete-<id>` buttons.
  - marks parent rows with `data-kind-parent="true"`: attribute absent. Chosen marker: `data-kind-parent="true"` on the `tr[data-test="kind-row-<id>"]` of every kind that has children, absent or other on leaves.
  - the detail offers Edit, Add child and Delete: `detail-add-child` and `detail-delete` do not exist (`detail-edit` does).
  - the drawer blocks the page scroll: `p-drawer` `blockScroll` is not true. Read through the component instance, as a signal input or a plain property.
  - suggests no kind, itself or descendant as the parent: the suggestions of `kind-parent` still contain `folk`, `elder`, `sage` when editing `folk` (`other` is expected).
  - refuses to save a kind whose parent is one of its descendants: typing `sage` as the parent of `folk` and Save still emits.
  - Add child opens a form with the parent pre-filled and Save adds the kind under it: no `detail-add-child` in the drawer (select the kind, then press it).
  - Delete asks first, says the children go too, and removes the kind with its descendants once accepted: no `detail-delete` (select the kind, then press it).
  - Delete not accepted leaves the draft alone: no `detail-delete`.
- Updated or removed in the same spec: the old `edit-/add-child-/delete-<id>` row-button tests and "row action Edit opens the form directly" are replaced by select-row then `detail-edit` / `detail-add-child` / `detail-delete`.
- Passing as guards (they already hold; keep them green):
  - Closing the drawer when the selected kind is removed with an ancestor (the draft input changes, the drawer must close).
  - Texts in the drawer form, per domain: Save emits the edited noun and, except for NPCs, a suffix; texts are untouched when only a field is edited; Preview with pending texts, without saving; a neutral draft shows no `kind-texts`.
  - `kind-texts.ts` round trip per domain: items, npcs, skills, classes, and an unchanged draft stays unchanged.
- Hook assumptions for the texts tests, to keep when the form is reworked (the accordion and rarity selector must not hide them):
  - `kind-texts`, `kind-new-noun`, `add-noun`, `remove-noun`, `kind-descriptions`.
  - `kind-new-suffix-common` and `add-kind-suffix-common` for items, `kind-new-suffix-all` and `add-kind-suffix-all` for skills and classes.
  - They must exist in the DOM in the open form without clicking an accordion section. If green makes them lazy, adjust the spec to open the section first.
  - `preview-kind` and `preview-entry` are queried on `document`.

## Green (round 2)

- Files: `src/app/modules/tools/components/pack-draft/kinds-tree-table/`: `kinds-tree-table.component.ts` (table, drawer host, state), `kind-detail.component.ts`, `kind-form.component.ts`, `kind-texts-form.component.ts` (reworked), `kind-preview.component.ts`, `kind-fields.ts` (new); `src/app/core/packs/pack-draft-edits.ts` (`withDescendants` exported); `public/i18n/en.json`, `fr.json`.
- Change: no actions column; Edit / Add child / Delete are in the drawer footer of the detail (`detail-edit`, `detail-add-child`, `detail-delete`) with Save / Cancel in the footer of the form. Parent rows get `data-kind-parent="true"` and `--p-content-hover-background`. Alignment fixed with a flex label cell, own indent and an own chevron (no button) or a same-width spacer for leaves; collapse state kept across edits. `p-drawer` has `blockScroll`. The detail is a read-only summary (fields, texts, preview, coverage, issues). The form is one column with General / Properties / Texts sections; texts are in an `p-accordion` (nouns and descriptions open, then names, adjectives, suffixes), and item texts show one rarity at a time via a `p-select` (default common); all hooks stay in the DOM. Parent suggestions exclude the kind and its descendants and Save is refused with an error for them; removing an ancestor of the selected kind closes the drawer.
- Suite: `npm test` 307 of 307 files, 3043 of 3043 tests; tsc clean; `ng build` no error. Specs edited by me: only `pack-draft-page.tabs.spec.ts` and `core/packs/pack-draft-domains.spec.ts` (round 1); the round-2 specs are unchanged.
- Open questions: browser check (drawer 375 px, row alignment, parent background in dark mode) not done.

## Review (round 2)

- Verdict: ship
- Must fix: none
- Consider: kinds-tree-table spec — the new item rarity selector (`texts-rarity`) and the accordion sections have no assertion that switching rarity shows that rarity's suffix/names fields; add one test so a regression there is caught.
- Consider: browser check still pending (drawer at 375 px, leaf/parent row alignment, parent background in dark mode, page scroll locked); green could not verify the five feedback points visually.
- Checked: texts Must fix met (component spec 96 tests plus kind-texts.spec 5: round trip per domain, applied only when edited, Preview with pending texts, neutral draft hides texts); 101/101 pass. Considers done: parent suggestions and Save exclude self and descendants (`candidates`, `formError`, `withDescendants`), closing on ancestor removal (guard test), split into table / detail / form / preview / fields (largest file 618 lines, drawer pieces under 440). Feedback: 1 one-column form with General/Properties/Texts, accordion, rarity select, footer buttons; 2 flex label cell with built-in `p-treeTableToggler` (leaves keep its spacer); 3 `data-kind-parent` plus hover-background on parent rows; 4 no row actions, Edit/Add child/Delete in the detail footer; 5 `blockScroll` true. Controls Optimus UI only (pInputText, pTextarea, p-select, p-accordion, p-multiselect, p-checkbox, p-autocomplete). en.json and fr.json have identical key sets, no missing keys used.

## Answer

- Items, NPCs, Skills and Classes tabs show kinds in an Optimus UI tree table built from `parent` (built-in `p-treeTableToggler`), columns label, id and the domain's fields; parent rows are marked (`data-kind-parent`) with a slightly darker background; leaves align with their siblings. No actions in the table.
- Clicking a row opens a right `p-drawer` (`blockScroll`, `min(32rem, 100vw)`): a read-only detail (fields, texts, Preview, sprite coverage, issues) with Edit, Add child and Delete in its footer. The form is one column, sections General / Properties / Texts; texts in an accordion (nouns and descriptions open), item texts one rarity at a time through a select; Save / Cancel in the footer. Cancel or close with changes asks to discard; Delete confirms and removes the kind with its descendants (`removeKind` / `removeDomainKind` now take them).
- Parent suggestions exclude the kind and its descendants, Save is refused for them; removing an ancestor of the selected kind closes the drawer.
- Split into table, detail, form, texts form and preview components; old `kinds-editor` / `domain-kinds-editor` removed with their specs. Docs (create-pack FR/EN) describe the table and panel.
- Round 2 followed the user's feedback (readable panel, alignment, parent rows, no table actions, scroll lock) and the review's Must fix (texts tests). Specs edited outside the red step: `pack-draft-page.tabs.spec.ts` (selectors), `pack-draft-domains.spec.ts` (children removed with the parent); both reviewed.
- Checked: suite 307 files / 3043 tests green (baseline 306 / 2962); build clean; review round 2 ship. Browser (a Base FR duplicate): table alignment and parent rows on desktop; detail and form in FR and EN; at 375 px the drawer is full width with no horizontal scroll and the table shows the Label column only. Three layout bugs found in the browser and fixed: controls 1024 px wide in the drawer (no `.w-full` utility; now `[fluid]`), selects broken by a `display: block` override, table columns overlapping on a phone. No console error.
- Left (review Consider): no test switches the item rarity selector; the read-only detail reuses the form label "Descriptions (one per line)".

## Follow-up: missing sprite tag (2026-11-17, user request)

- Items rows whose kind is uncovered by the existing coverage rule (`PackDraftFormBusiness.coverage()`: no sprite on the kind or an ancestor, installed packs included; a sprite on a child doesn't cover its parent) show a warn `p-tag` "No sprite" / "Sans sprite" with an image icon and a tooltip, in a last right-aligned column. On a phone the tag shows its icon only. NPCs, skills and classes have no sprites, so no tag.
- On a Base FR duplicate: 40 of 123 item kinds tagged, 10 of them parents (Equipment, Head, …), consistent with the coverage message.
- Browser fixes along the way: label column 35% and tag column 8rem (fixed layout had made the label wrap under the toggler, then the tag column 8px); headers hyphenate instead of breaking mid-word; on a phone the label column takes the rest and words only break when they can't fit.
- Checked: suite 307 files / 3050 tests green; build clean; FR desktop and 375 px, no overflow, no misaligned row.
