# Side panel: clearer detail, Preview renamed and explained

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "améliore l'UX des side panels, c'est trop le bordel avec trop de texte pas assez découpé et mis en valeur (et renomme Aperçu ou ajoute un petit texte d'explication de ce bouton)".

## What

- The kind and tint detail (`kind-detail.component.ts`, `tint-detail.component.ts`) are cut into titled sections: **Identity** (label, id, parent), **Generation** (the domain fields), **Texts** (nouns, adjectives, descriptions), **Try it** (the preview). Section titles styled, light separators, values as tags / chips where they are lists (`app-chip-list`), long text lists collapsed to the first lines with "Show all".
- Empty values shown as a muted "None", not as a blank line.
- The **Preview** button (`app-kind-preview`) becomes **"Draw examples"** / **"Tirer des exemples"** , with one hint line under it: "Generates 3 entries of this kind with the current lists, nothing is saved." The drawn entries show as small cards (name bold, rarity tag, description).
- Same look in the forms: section titles matching the detail.
- 375 px checked.

## Decisions (user, 2026-11-18)

- Sections with titles as proposed (no tabs inside the drawer).
- Preview button renamed "Tirer des exemples" / "Draw examples", with the hint line under it.

## Baseline

`npm test`: Test Files 327 passed (327), Tests 3246 passed (3246). Branch `develop`.

## Seams

- **Detail components' inputs** (`kind-detail.component.ts`, `tint-detail.component.ts`, via `TEST_PROVIDERS`): given a kind / tint, the rendered panel shows the titled sections (Identity, Generation, Texts, Try it), list values as chips, a muted "None" for empty values, long text lists collapsed with "Show all". Catches structure and empty-value rendering; misses visual styling (browser check).
- **`app-kind-preview` inputs/outputs**: the button reads "Draw examples" / "Tirer des exemples", the hint line is shown, drawn entries render as cards (bold name, rarity tag, description). Catches label, hint and card content; misses look and spacing.
- **Kind / tint form components' inputs**: forms show section titles matching the detail's. Catches the titles; misses layout (375 px checked in the browser).

## Red

- Test files: `src/app/modules/tools/components/pack-draft/kinds-tree-table/kind-detail.component.spec.ts`, `kinds-tree-table/kind-preview.component.spec.ts`, `kinds-tree-table/kind-form.component.spec.ts`, `tints-table/tint-detail.component.spec.ts`, `tints-table/tint-form.component.spec.ts` (same folder `src/app/modules/tools/components/pack-draft/`)
- Run: `npx ng test --watch=false --include src/app/modules/tools/components/pack-draft/<folder>/<name>.component.spec.ts` (once per file)
- Hooks the tests define (data-test): `section-identity|generation|texts|try` each containing `section-title` (English "Identity", "Generation", "Texts", "Try it"); chips use `app-chip-list` (`fit-item`); empty value `detail-none` reading "None"; text lists `text-line` (first 3) + `show-all` button ("Show all"); preview `preview-hint`, `preview-rarity`; the kind form also has `section-try`.
- Failing: 19 tests, each one line:
  - kind-detail: sections Identity/Generation/Texts/Try it in order — no `section-*` hooks
  - kind-detail: label, id, parent under Identity — no `section-identity`
  - kind-detail: preview under Try it — no `section-try`
  - kind-detail: list field of Generation as chips — no chips
  - kind-detail: nouns under Texts as chips — no chips
  - kind-detail: empty field as muted "None" — no `detail-none`
  - kind-detail: long text list collapsed with Show all — no `text-line` / `show-all`
  - kind-detail: short text list in full, no Show all — no `text-line`
  - kind-preview: button "Draw examples" — reads "Preview"
  - kind-preview: button "Tirer des exemples" in French — reads "Aperçu"
  - kind-preview: hint line — no `preview-hint`
  - kind-preview: entry as card with bold name, rarity tag, description — no `preview-rarity`
  - tint-detail: sections Identity/Generation/Texts — no `section-*` hooks
  - tint-detail: id under Identity — no `section-identity`
  - tint-detail: fits as chips — no chips
  - tint-detail: no texts shows muted "None" under Texts — no `section-texts` / `detail-none`
  - tint-detail: long text list collapsed with Show all — no `text-line` / `show-all`
  - kind-form: same section titles as the detail — no `section-*` hooks
  - tint-form: same section titles as the detail — no `section-*` hooks

## Green

- Files: `src/app/modules/tools/components/pack-draft/detail-texts/detail-texts.component.ts` (new), `kinds-tree-table/kind-detail.component.ts`, `kind-form.component.ts`, `kind-preview.component.ts`, `tints-table/tint-detail.component.ts`, `tint-form.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: kind and tint details are cut into titled sections (Identity, Generation, Texts, Try it) with chips for lists, a muted "None" for empty values, and a shared `app-detail-texts` that collapses text lists to 3 lines with "Show all". The preview button is now "Draw examples" / "Tirer des exemples" with a hint line, and drawn entries are cards with a rarity tag. The forms use the same section titles (the kind form has a separate Try it section); new i18n keys under `packs.creator.kinds`.
- Suite: 332 files / 3265 tests pass (baseline 327 / 3246); tsc clean; ng build OK; no test file modified.
- Open questions: none. The 375 px browser check is not done. Chip lists show 3 chips then "+N" (existing `app-chip-list`), so a kind with more than 3 nouns shows the rest only in the tooltip.

## Review

- Verdict: fix first
- Must fix:
  - `detail-texts.component.ts`: the "Show all" control is a native `<button>` styled by hand; use `<p-button>` (`variant="text"`, small) keeping `data-test="show-all"`, and delete the `.show-all` CSS.
- Consider:
  - `detail-texts.component.ts`: `expanded` keyed by row label may carry over when the drawer reuses the instance for another item; reset it when `rows` changes.
  - i18n: `packs.creator.kinds.generalTitle`, `kinds.fieldsTitle`, `tints.textsTitle` now unused.
  - Tint components use `packs.creator.kinds.section*` keys; a shared `packs.creator.sections.*` namespace would name them better.
  - `kind-detail.component.ts` `shown()` / `isList()`: chip-vs-text rule could use a comment.
  - `app-chip-list` shows 3 chips then "+N" (rest in tooltip): known limit.
- Re-review after fixes (p-button for Show all, `expanded` reset on `rows` change, unused i18n keys removed): ship. Consider: `rows` is a computed, so editing a text while the drawer is open collapses expanded lists again; reset only on item change if that matters.

## Answer

- Built: kind and tint details cut into titled sections (Identity, Generation, Texts, Try it) with `app-chip-list` chips for lists, a muted "None" / "Aucun" for empty values, and a shared `app-detail-texts` that shows the first 3 text lines with a `p-button` "Show all". The Preview button is now "Draw examples" / "Tirer des exemples" with the hint line; drawn entries are cards (bold name, rarity tag, description). The kind and tint forms use the same section titles.
- Decisions: sections, not tabs (user). Tint sections reuse the `packs.creator.kinds.section*` keys. Unused keys `kinds.generalTitle`, `kinds.fieldsTitle`, `tints.textsTitle` removed. Chip lists keep `app-chip-list`'s 3 chips then "+N" limit.
- Checked: 19 new tests (5 specs), full suite 332 files / 3265 tests pass (baseline 327 / 3246), `ng build` clean. Browser: duplicated the Base (français) pack, opened a tint detail (steel) and kind details (Hache, Épée, Weapon), drew examples, opened the kind form, in French at desktop and English at 375 px. No console errors. The base data has no text list longer than 3 lines, so "Show all" is covered by the specs only.
