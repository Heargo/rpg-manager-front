# Common tab and common words: fewer buttons and inputs

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "améliorer l'interface communs, c'est pas assez ergonomique, trop de boutons et d'inputs".

## Today

- The Common tab shows the params editor (`app-params-editor`: one block per param with its inputs and buttons always visible) then `common.json`.
- The Items tab has the common adjectives and suffixes editor (`app-common-words-editor`) with its inputs always shown.

## What

- Same pattern as the kinds and tints: a **table** (param name, entries count, a few entries as chips via `app-chip-list`) and the **right drawer** for detail / edit. "Add param" above the table. No inline inputs in the list.
- The common adjectives and suffixes get the same treatment (one row per word, or a single drawer form holding them, to decide).
- The raw `common.json` stays in the "Advanced" panel only.

## Decisions (user, 2026-11-18)

- "Communs" means both: the Common tab params and the common adjectives and suffixes of the Items tab.
- Both get the table + right drawer pattern of the kinds (PE04 drawer rules).
- Common adjectives and suffixes: one row per word (assumed), with the drawer for detail / edit.

## Baseline

332 test files passed, 3265 tests passed (develop at d9d784e).

## Seams

Spec sections: "Side panel" (right drawer, discard on close with unsaved changes), and the kinds/tints table pattern (PE04/PE05; `tints-table` is the model).

1. `app-params-editor` inputs/outputs (TEST_PROVIDERS): catches the table rows (param name, entries count, entry chips via `app-chip-list`), "Add param" above the table, row click opens the drawer detail, edit/save/delete through the drawer emitting the updated params, no inline inputs in the list. Misses the page wiring.
2. `app-common-words-editor` inputs/outputs (TEST_PROVIDERS): catches one row per common adjective / suffix, add / edit / delete through the drawer, emitted value. Misses the page wiring.
3. `pack-draft-page` component (Common tab, existing page spec style): catches that the Common tab shows the params table and that raw `common.json` is only in the "Advanced" panel. Misses drawer internals.

## Green

- Files: src/app/modules/tools/components/pack-draft/params-editor/params-editor.component.ts, src/app/modules/tools/components/pack-draft/common-words-editor/common-words-editor.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: both editors are now a table (params: name, count, `app-chip-list` of entries; words: one row per adjective or suffix with type, rarity and text) with an "Add" button above, and a right drawer holding the detail and the form. Save, delete and discard go through the drawer and `ConfirmationService`. No page change was needed: the page already keeps `common.json` in the Advanced panel. New i18n keys under `packs.creator.params.*` and `packs.creator.words.*`, in both languages.
- Suite: 333 files and 3284 tests pass (baseline 332 files, 3265 tests). tsc is clean and the build succeeds. The same 4 unhandled errors (`pack-draft-page.lifecycle.spec`, `pack-update-atomic.business.spec`) appear with and without my change.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - public/i18n/en.json + fr.json (packs.creator.params.newEntry/addEntry/remove/removeEntry/title, words.addAdjective/addSuffix/remove/suffix/tint) — keys left unused by the old inline UI — delete them (no backward compat in dev).
  - common-words-editor.component.ts (selectedId/rows) — ids are array-index based and, unlike params-editor, there is no effect closing the drawer if the selected word vanishes after an external draft change — add the same guard.
  - params-editor and common-words-editor — drawer open/close/dirty/confirm code duplicated (also in kinds/tints) — consider a shared helper once a third copy appears.
  - common-words-editor.component.ts:`word-row` / params row — clickable `tr` has no keyboard access (tabindex/Enter); check how tints-table does it.
  - pack-draft-page.common-tab.spec.ts — a few over-long lines (prettier).

## Answer

- Built: `app-params-editor` is now a table (param name, count, entries as `app-chip-list` chips) with "Add param" above it. `app-common-words-editor` is a table with one row per common adjective or suffix (type, rarity, word). Both open a right drawer for the detail and the form (Edit / Delete, Save / Cancel). Cancel or close with unsaved changes asks to discard, and Delete asks first. The list has no inline inputs. Raw `common.json` stays in the "Advanced" panel only (the page already did this).
- Decisions: one row per word (as assumed in the ticket). The params count column has its own header ("Nombre" / "Count"). I deleted the i18n keys that only the old inline UI used, and kept the ones `kind-texts-form` still uses.
- Checked:
  - Suite: 333 files and 3284 tests pass (baseline 332 / 3265). The 4 unhandled AbortErrors come from `pack-draft-page.lifecycle.spec` and `pack-update-atomic.business.spec` and also show when those files run alone. Build is clean. Review verdict: ship.
  - Browser: Common tab table, drawer detail, edit, then Cancel with the discard dialog, in FR and EN. Items words table and drawer at mobile width (full-width drawer, no horizontal scroll). No console errors. The browser check found the duplicate "Expressions" header, which green then fixed.
