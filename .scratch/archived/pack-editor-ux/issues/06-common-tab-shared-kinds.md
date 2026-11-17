# Common tab: shared kinds tree table

Status: resolved
Type: task
Blocked by: 02, 04

Spec: `../spec.md` (Common v2: shared kinds, Kinds as a tree table)

- The Common tab shows the shared kinds in the same tree table and right side panel as the domain kinds (PE04): label, id, words count; Edit / Add child / Delete; the form edits the tree (manifest) and, for a pack with a language, the words, adjectives and descriptions (`common.json`).
- Neutral draft: the Common tab shows the tree only (no texts).
- The domain kind forms (PE04) get a "Shared kinds" multi-select for `shared` fits, offering the shared kinds of this draft and of the active Base packs.
- Params stay in the Common tab, below the tree.
- FR/EN, 375 px.

## Decisions carried over (PE04 / PE05 user feedback, 2026-11-17)

- Same table and drawer rules as PE04: no row actions (Edit / Add child / Delete in the drawer detail footer, "Add shared kind" above the table), parent rows marked and darker, built-in tree toggler, `blockScroll`, one-column sectioned form with `[fluid]` controls, Save / Cancel footer, discard / delete confirmations, delete removes descendants, parent suggestions exclude self and descendants. At 375 px only the label column (plus any tag) shows, no overflow.
- PE03 hid the Common tab for a neutral draft; it now shows for a neutral draft with the tree only (no params, no texts).
- PE02 review Consider taken here: the draft path passes the declared shared kind ids to `validateCommonTexts`, so texts for undeclared shared kinds show as warnings.
- Renaming a shared kind updates the domain kinds' `shared` fits and the `common.json` texts that point to it; deleting one removes it from fits and its texts (assumed, like domain kind renames and deletes).

## Baseline

`npm test`: 308 test files, 3061 tests, all passed (2026-11-17, after PE05).

## Seams

- `pack-draft-edits` helpers (pure): add / rename / remove (with descendants) shared kinds in the manifest, set a shared kind's texts in `common.json`, set a domain kind's `shared` fits; rename and remove carry over to fits and texts. Misses the UI.
- The tree table component used for shared kinds (`app-kinds-tree-table` with a `shared` domain, or a sibling component, rendered with `TEST_PROVIDERS`): tree from `parent`, columns label / id / words count, drawer detail and form editing the tree and (language draft) words, adjectives, descriptions; neutral draft shows the tree only; and the domain kind forms' "Shared kinds" multiselect offering this draft's shared kinds plus the active Base packs'. Misses 375 px (browser).
- The pack draft page (rendered): Common tab shown for a language and a neutral draft, tree above params (params hidden for neutral), warnings for texts of undeclared shared kinds.

## User request folded in (2026-11-17)

The user likes the tints table's fits cell (up to 3 chips, then "+N" with the rest in a tooltip) and wants the same for the classes kinds table's "favoured skill kinds" column (`cell-skills`). Each chip shows the skill kind's label (its noun when it has one, else its id). Reuse one shared chip-list piece for both tables rather than copying it. The same rule applies to the new shared kinds columns if any of them is a list.

## Red

- Test files: `src/app/core/packs/pack-draft-edits.shared-kinds.spec.ts` (new), `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.shared.spec.ts` (new), `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.common.spec.ts` (new), `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts` (classes skills cell, appended)
- Run: `npx ng test --watch=false --include <file>` for each file
- Failing: 38 tests (+ 13 in the edits file, which does not compile yet)
  - `pack-draft-edits.shared-kinds.spec.ts` (13 tests) — the file fails to compile: `setSharedKind`, `removeSharedKind`, `renameSharedKind`, `setSharedKindTexts`, `sharedKindTextsOf` and `setKindShared` are not exported from `pack-draft-edits`.
  - `kinds-tree-table.shared.spec.ts` (11 tests on `domain="shared"`) — the component has no shared domain: no tree rows from `draft.sharedKinds`, no `cell-words`, no texts or tree edits through the form, no rename/delete carry-over.
  - Same file, shared kinds multiselect (4 domains x 2 = 8 tests) — the domain kind forms have no `kind-shared` control (null), so no options and no `shared` fits saved.
  - `pack-draft-page.common.spec.ts` (3 tests) — no tree in the Common tab, the Common tab is hidden for a neutral draft, and `validateCommonTexts` gets no declared shared ids so there is no "shared kind ... has texts but no active pack declares it" warning.
  - `kinds-tree-table.component.spec.ts` (2 tests) — the classes `cell-skills` cell renders plain text, no `fit-item` chips or `fit-more` "+N".
- Interface assumed: `PackDraft.sharedKinds?: Record<string, { parent?: string }>`; helpers `setSharedKind(draft, id, { parent })`, `renameSharedKind`, `removeSharedKind` (descendants, texts, fits), `setSharedKindTexts(draft, id, { words, adjectives, descriptions })` (no-op for a neutral draft), `sharedKindTextsOf`, `setKindShared(draft, domain, id, ids)`; form hooks `kind-shared` (multiselect) and, for shared, `kind-new-adjective-all-m` / `add-kind-adjective-all`; `cell-words`.
- For green: `pack-draft-page.tabs.spec.ts` ("a neutral draft hides the Common tab...") asserts the Common tab is hidden for a neutral draft and must be updated, not rewritten here. The classes `cell-skills` existing assertion only checks presence, so it needed no change.

## Green

- Files: `src/app/core/packs/pack-draft.ts`, `pack-draft-edits.ts`, `src/app/core/business/pack-draft-form.business.ts`, `pack-creator.business.ts`; `src/app/modules/tools/components/pack-draft/chip-list/chip-list.component.ts` (new); `.../kinds-tree-table/{kinds-tree-table,kind-form,kind-detail,kind-texts,kind-texts-form}.component.ts|kind-fields.ts|kind-texts.ts`; `.../tints-table/tints-table.component.ts`; `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`; `public/i18n/{en,fr}.json`; `user-docs/src/content/docs/{create-pack.md,en/create-pack.md}`.
- Change: `PackDraft.sharedKinds` (built into the manifest) plus the pure helpers (`setSharedKind`, `renameSharedKind`, `removeSharedKind`, `setSharedKindTexts`, `sharedKindTextsOf`, `setKindShared`). `app-kinds-tree-table` gets `domain="shared"` (label / id / words count, texts form for words, adjectives, descriptions, fixed table layout) and every domain kind form a `kind-shared` multiselect (draft + active packs, via `knownKeys().sharedKinds`). The Common tab shows the tree for every draft (params and common.json only with a language). New `app-chip-list` is shared by the tints fits cell and the classes `cell-skills` cell. `validateDraft` passes declared shared ids to `validateCommonTexts` and shows orphan shared-kind warnings under the tree. Duplicating or editing an installed pack carries its `sharedKinds`.
- Specs touched: only `pack-draft-page.tabs.spec.ts` (neutral draft now shows Common with the tree only; the Common test no longer asserts there is no `app-kinds-tree-table`, which Common now holds). The four red specs are unchanged.
- Suite: 311 files, 3102 tests, all pass (baseline 308 files / 3061 tests, +3 new files); `tsc` clean; `ng build` no error (budget warnings only, as before).
- Open questions: the Common-file warnings "param {x} is used but not defined in this file" now also show for the draft (they came with passing declared ids); 375 px layout not checked in a browser.

## Review

- Verdict: fix first
- Must fix: src/app/core/business/pack-draft-form.business.ts:284 and src/app/core/generators/common-texts.ts:58 — the draft path now warns "param {x} is used but not defined in this file" for a draft `common.json` that uses a param defined only in an installed pack (the word lists get `known.params` for this, common does not). The Base itself is clean (`{material}` is a declared shared kind), and a Base FR/EN duplicate gives no spurious warning (ids are deduped in a Set). Fix: let `validateCommonTexts` take the known params as defined, kept separate from the declared shared ids so the orphan check still works, and pass `known.params` from `validateDraft`. Add a test for a param defined in an installed pack.
- Consider:
  - pack-draft-form.business.ts:~380 — the "Shared kinds" options come from every installed pack, not only the active ones; check that `$installed` matches "active Base packs" (otherwise filter).
  - pack-draft-page.tabs.spec.ts:57 — the old `has('app-kinds-tree-table') === false` became a `domain-npcs` absence check; weaker but keeps the intent (no word-list editors in Common). Neutral test keeps its intent too.

Checked and fine: multiselect offers draft plus installed shared kinds; rename and remove reach the `kinds`, `npcKinds`, `skillKinds` and `classKinds` fits plus the `common.json` texts and the parents; `app-chip-list` is shared by the tints fits and the classes `cell-skills` (no copy left); FR/EN keys are present; the drawer uses `blockScroll`. Not run: browser 375 px.

## Red (review round)

- Test files: `src/app/core/business/pack-draft-form.business.spec.ts` (describe "common.json warnings", business seam), `kinds-tree-table.component.spec.ts` (inherited shared kinds in the items detail)
- Failing: 2 tests
  - does not warn about a param that only an installed pack defines — `validateCommonTexts` gets no known params, so `{place}` (defined only in Base) warns.
  - shows the shared kinds a child inherits from its parent, marked as inherited, not "None" — no `detail-shared-inherited` element; the detail shows only own `shared`.
- Passing guards (already green): a param defined nowhere still warns; a text for an undeclared shared kind still warns.

## Review (re-check of the fixes)

- Verdict: ship
- Must fix: none. `validateCommonTexts` takes `knownParams` and `validateDraft` passes `known.params`, with a test in `pack-draft-form.business.spec.ts`. `detail-shared-inherited` is in, with FR/EN keys, and the kinds-tree-table spec covers it. The tools and core specs pass (1370 tests). The unhandled errors in `pack-draft-page.lifecycle.spec.ts` and `pack-update-atomic.business.spec.ts` come from other specs and did not fail a test.
- Consider: kind-detail.component.ts — `inherited` walks only the draft's own kinds, so a parent in an installed pack gives no inherited line. Installed packs as the option set is accepted (no world in the creator).

## Answer

- The Common tab shows the shared kinds tree (`app-kinds-tree-table` with `domain="shared"`: label, id, words count) for every draft, with params and `common.json` below it for a pack with a language; a neutral draft shows the tree only. The drawer edits the tree (manifest `sharedKinds`) and, with a language, the words, adjectives and descriptions. New pure helpers: `setSharedKind`, `renameSharedKind`, `removeSharedKind`, `setSharedKindTexts`, `sharedKindTextsOf`, `setKindShared`; rename and delete carry over to all four domains' `shared` fits and the texts. Duplicating an installed pack keeps its `sharedKinds`.
- Every domain kind form has a "Shared kinds" multiselect (chips) offering the draft's shared kinds and the installed packs' (the pack creator has no world, so installed = the intended set). The detail shows own and inherited ones on one line ("metal (from weapon)").
- User request folded in: one `app-chip-list` (3 chips then "+N" with a tooltip) for the tints fits and the classes' favoured skill kinds.
- The draft path passes declared shared ids and the installed packs' params to `validateCommonTexts`: texts for undeclared shared kinds warn, params defined elsewhere don't.
- Specs edited outside red: `pack-draft-page.tabs.spec.ts` (neutral draft now has a Common tab with the tree only).
- Checked: suite green (311 files); build clean; review ship after one fix round. Browser (fresh Base FR duplicate): Common tab tree with 25 kinds and words counts, no spurious warnings; classes chips; multiselect fits the drawer; inherited line in the detail (also merged into one row by me after the browser check); 375 px label column only, no overflow; no new console error.
- Left (review Consider): inherited shared kinds are only walked through the draft's own kinds, not through a parent from an installed pack.
