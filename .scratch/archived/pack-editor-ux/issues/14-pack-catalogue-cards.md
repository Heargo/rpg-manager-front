# Pack catalogue: cleaner cards, long names handled

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "pour les packs il faut un aperçu plus propre et mieux gérer les noms de pack trop longs".

## What

- Pack cards (`packs-tool-page.component.ts`, official and unofficial lists):
  - The name is clamped to two lines with an ellipsis and the full name in a tooltip (`pTooltip`); tags (language, Always on, Downloaded) move to their own line under the name so they never squeeze it.
  - The description is clamped to three lines.
  - The `dl` (author, license, size, sprites, language) becomes a compact meta line of small muted items with icons; the language is no longer repeated (tag + dl today).
  - Cards in a grid of equal height, footer actions aligned at the bottom.
- The details dialog title clamps the same way.
- 375 px: one column, no horizontal overflow with a 60-character name.

## Baseline

Test Files 326 passed (326), Tests 3237 passed (3237).

## Seams

- `PacksToolPageComponent` rendered with `TEST_PROVIDERS` (packs from the repo's existing fake catalogue/registry): a 60+ character name gets the clamp class and a `pTooltip` with the full name, tags sit on their own line under the name, description gets the 3-line clamp class, the language shows once per card, the meta line items (author, license, size, sprites, language) are present, and the details dialog title is clamped too. Catches: markup/classes/tooltip/dedup. Misses: actual visual clamping, equal heights and 375 px overflow (browser check).

## Red

- Test file: `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.cards.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/tools/pages/packs-tool-page/packs-tool-page.cards.spec.ts 2>&1 | tail -30`
- 9 failing, all on missing markup. Hooks: `data-test="pack-name"` (h3, class `line-clamp-2`, `pTooltip` = full name); `data-test="pack-tags"` after the name, holding `pack-language` and the other tags; `data-test="pack-desc"` with `line-clamp-3`; `data-test="pack-meta"` replaces the `dl`, with `data-test="pack-meta-item"` children each holding an `i.pi` icon (author, license as a link, size except built-in packs, sprites; unofficial: author, license, version); `data-test="pack-details-title"` with `line-clamp-2` in the details dialog header.
- Decision: the language shows only as the `pack-language` tag, not in the meta line.

## Review

- Verdict: ship
- Must fix: none
- Consider: packs-tool-page.component.ts (meta spans) — official and unofficial card markup duplicate the author/license meta block — extract an `ng-template` if a third list appears; packs-tool-page.component.ts (styles) — `.line-clamp-2/3` are local classes; move to `src/app/styles/` utilities if reused elsewhere; meta icon-only items rely on `title` for labels (no visible text, weak on touch) — acceptable per ticket. Visual clamping, equal heights and 375 px overflow still need the browser check.

## Answer

- Built: pack cards (official and unofficial) in `packs-tool-page.component.ts` now have the name clamped to two lines (`line-clamp-2`, `overflow-wrap: anywhere`) with the full name in a `pTooltip`, the tags on their own line under the name, the description clamped to three lines, and a compact meta line of icon items (author, license link, size except built-in packs, sprites; unofficial: author, license, version, source) in place of the `dl`. Cards are equal-height flex columns with the footer actions at the bottom. The details dialog title uses the same clamp and tooltip.
- Decision: the language shows once per card, only as the `pack-language` tag; the meta line has no language item.
- Checked: 9 new tests in `packs-tool-page.cards.spec.ts`. Full suite 327 files and 3246 tests pass (baseline 326/3237). `ng build` is clean, and review said ship. In the browser (FR and EN, with a long name injected): two-line clamp at 44 px, equal card heights, details title clamped. At 375 px: one column and no horizontal overflow. No console errors.
