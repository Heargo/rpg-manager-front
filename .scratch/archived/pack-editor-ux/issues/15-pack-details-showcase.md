# Pack details: five assets first, the rest on demand

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "dans détails il ne faut pas tout charger, il faut prévoir dans le pack une partie détails qui expose max 5 assets visuels et permet de détailler le reste".

## Today

The details dialog lists every sprite of the pack, grouped by kind, with all images loaded (lazy, but all in the DOM).

## What

- The dialog shows at most **5 visual assets** (sprites and world images) as a showcase strip at the top.
- Below, one row per asset kind with its count ("Items: 120", "Landscapes: 9"); "Show all" on a row expands that kind's thumbnails, paginated (e.g. 24 per page). Nothing else is rendered until expanded.
- Which 5: the first 5 assets in manifest order (see Decisions).

## Decisions (user, 2026-11-18)

- No `showcase` field for now: the showcase is the first 5 visual assets in manifest order. No picker in the pack creator.
- Per-kind rows with counts and "Show all", paginated, as proposed.

## Baseline

Test Files 335 passed (335), Tests 3305 passed (3305). On `develop`.

## Seams

1. Pure helper in `src/app/core/packs/` (a `*.rules.ts`, e.g. `pack-showcase.rules.ts`): the showcase (first 5 visual assets, sprites and world images, in manifest order), the per-kind rows with counts, and a page of one kind's assets (24 per page). Catches selection order, the cap of 5, counts, page bounds; misses rendering.
2. `PacksToolPageComponent` through `TEST_PROVIDERS` (as `packs-tool-page.cards.spec.ts` does): opening a pack's details shows at most 5 showcase images, one row per kind with its count and no thumbnails, "Show all" expands that kind's first page, and paging moves to the next. Catches the wiring and that nothing is rendered until expanded; misses real image loading.

## Red

- Test files: `src/app/core/packs/pack-showcase.rules.spec.ts`, `src/app/modules/tools/pages/packs-tool-page/packs-tool-page.details.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (once per file)
- Contract the tests fix (for green): `pack-showcase.rules.ts` exports `PAGE_SIZE` (24), `showcaseOf(sprites, worldImages)` (first 5, sprites then world images, items `{id, imageUrl, ...}`), `assetKindRows(sprites, worldImages)` -> `[{kind, count}]` with kind in sprite kinds order (`grayscale|masked|colored`) then `'world'`, empty kinds left out, `assetPage(sprites, worldImages, kind, page)` -> `{items, page, pageCount, total}`, 1-based, clamped, one empty page when none. Sprites are `{id, kind, imageUrl}`, world images `{id, imageUrl}`. Component hooks (details of `base-assets`, 101 masked sprites + 9 world images): `.p-dialog [data-test="pack-showcase-item"] img` (5), `[data-test="pack-asset-row"][data-kind]` (count in text, `[data-test="pack-asset-show-all"]` button), `[data-test="pack-asset-thumb"]` with an `img` (none until expanded; 24 per page), `[data-test="pack-asset-next"]` button. The details dialog must also load the pack's world images.
- Failing: 15 tests (10 + 5)
  - rules spec, 10 tests (showcase cap/order/short pack/empty/urls, kind rows, empty rows, paging 24, kind filter, clamping, empty page) — module `./pack-showcase.rules` does not exist, so the file fails to compile
  - details spec, 5 tests (5 showcase images in manifest order, rows with counts and no thumbnails, Show all first page of 24, small kind on one page of 9, next page) — dialog renders no `pack-showcase-item` / rows / thumbs yet

## Green

- Files: src/app/core/packs/pack-showcase.rules.ts (new), src/app/core/business/pack.business.ts, src/app/modules/tools/pages/packs-tool-page/packs-tool-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: new pure rules (showcaseOf, assetKindRows, assetPage, PAGE_SIZE 24). `PackBusiness.worldImagesOf(packId)` loads one pack's world images. The details dialog now shows a 5-image showcase strip and one row per kind with a count and a "Show all" button. Show all expands a paginated thumbnail grid with prev/next; nothing else is rendered until then. Added `packs.showAll` and `packs.worldImages` in en/fr; removed the old all-sprites list and the unused sprite name helper.
- Suite: 337 files / 3320 tests pass (baseline 335 / 3305, plus the 15 new tests); tsc clean; ng build no error.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/core/business/pack.business.ts (activeIds, bundled-image loop, builtInCredits, createUrls): unrelated Prettier reformatting mixed into the diff; revert it so the ticket diff stays small.
  - pack.business.ts:394 `worldImagesOf` repeats the base-pack world-image mapping of the loop near line 371 and of `builtInCredits`; have those call it.
  - Installed (non-base) pack path of `worldImagesOf` (object URLs) has no test; only base-assets is covered.
  - packs-tool-page.component.ts template: prev/next pager buttons have no aria-label; the ":" after the kind label is hard-coded; the "Sprites" heading now also covers world images.
  - packs-tool-page.component.ts `assetPageData` falls back to `'masked'` when nothing is expanded; a null-aware shape would be clearer.
  - `openDetails` can apply a stale result if another pack is opened before the first load resolves (same as before this ticket).

## Answer

Built: pure rules `src/app/core/packs/pack-showcase.rules.ts` (`showcaseOf`, `assetKindRows`, `assetPage`, `PAGE_SIZE` 24), `PackBusiness.worldImagesOf(packId)`, and a details dialog that shows a strip of the first 5 visual assets (sprites, then world images, in manifest order), one row per kind with its count and "Show all", and a paginated grid (24 per page, prev/next) for the expanded kind only. The old all-sprites list is gone. Strings `packs.showAll`, `packs.worldImages` in en/fr.

Decisions: showcase is the first 5 assets with sprites before world images (no `showcase` field, per the ticket). One kind expanded at a time.

Checked: 15 new tests (10 rules, 5 component); suite 337 files / 3320 tests pass (baseline 335 / 3305); `ng build` clean; review: ship. Browser: Base assets details in French and English shows 5 showcase images, rows "Masked: 101" and "World images: 9", no thumbnails until Show all, then 24 per page, page 2 / 5 after Next, world images 9 on 1 / 1; mobile width lays out fine; no console error. Word-only packs show the "download to see sprites" hint as before.
