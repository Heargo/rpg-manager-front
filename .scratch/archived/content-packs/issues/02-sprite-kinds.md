# Sprite kinds: grayscale, masked, colored

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (What a pack is: sprite kinds table)

- The sprite library shows a kind badge and a kind filter; sprites are grouped by pack.
- `grayscale` opens like a loaded image, `masked` opens with its materials, `colored` is refused by the colorizer with a message (decided).
- Random item images: `masked` gets random gradients per material, `grayscale` uses the automatic material guess, `colored` is used as is.

## Decisions (orchestrator, 2026-11-13)

- Library picker: each sprite shows a small kind badge (Optimus UI tag: "Niveaux de gris / Grayscale", "Avec masques / Masked", "Coloré / Colored"); a kind filter (Optimus UI select, "All kinds" default) next to the search; sprites are grouped under their pack's name (in the current language). Base is the only pack today, so one group.
- Colorizer: opening a `grayscale` sprite loads its image with no materials besides Base, exactly like "Open an image"; `masked` as today; `colored` is refused before loading, with an error message (i18n key, FR and EN) and the current sprite left untouched. Colored sprites stay listed in the picker (with their badge), so the refusal is visible.
- Random item images: `masked` as today (bundled materials, random gradient per material); `grayscale` uses the automatic material guess already used when a sprite has no JSON; `colored` stores the PNG as is (no recolouring). Every kind takes part in the pick.
- Base has only `masked` sprites: tests use a fake manifest with all three kinds; the browser check can only show the masked badge and the filter.

## Baseline

Test Files 203 passed, Tests 1720 passed.

## Seams

1. **Pure helper in `sprite-library.ts`**: `searchSprites` gains a kind filter and a `groupSpritesByPack(sprites, packs, lang)` (or one function returning groups). Catches filtering by kind and name, grouping and order. Misses the badge rendering (browser check).
2. **`SpriteColorizerBusiness.loadLibrary(id)` over a faked `PackService`** with a three-kind manifest: grayscale opens with only the Base material, masked with its materials, colored is refused with the error key and the current document unchanged. Misses the toast display.
3. **`RandomItemImageBusiness.create(item, seed)` over a faked `PackService`**: masked recoloured per material, grayscale through the automatic guess, colored stored byte-identical (or unprocessed). Misses real rendering.

## Green

- Files: src/app/modules/sprite/helpers/sprite-library.ts, src/app/modules/sprite/business/sprite-colorizer.business.ts, src/app/modules/sprite/business/random-item-image.business.ts, src/app/modules/sprite/services/sprite-file.service.ts, src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component.{ts,html,scss}, public/i18n/en.json, public/i18n/fr.json
- Change: `searchSprites` takes a kind filter and `groupSpritesByPack` is new. `loadLibrary` refuses `colored` with `Error('sprite.coloredRefused')` before any fetch and ignores the materials file for `grayscale`. Random images store `colored` PNGs as is (new `SpriteFileService.fetchBlob`) and ignore the materials file for `grayscale`. The picker has an Optimus UI kind select ("All kinds" default) under the search, sprites grouped under a pack heading, and a `p-tag` badge per sprite. The badge sits next to the tile button, not inside it, because the existing spec reads the tile's text. The refusal shows as an error toast, like `sprite.loadFailed`. Labels are in `sprite.kind.*`, `sprite.coloredRefused` and `sprite.library.{allKinds,kindFilter}`, in EN and FR.
- Suite: 203 files and 1732 tests pass (baseline 1720 tests). tsc is clean and the build succeeds. No spec file is in the unstaged diff.
- Open questions: Prettier reformatted the whole colorizer page `.ts`, `.html` and `.scss` (they were not Prettier-clean), so their diff is larger than the feature. The badge, filter and grouping layout have not been checked in a browser.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - sprite-colorizer-page.component.ts (loadSprite) — the refusal is detected by comparing `error.message` to the string 'sprite.coloredRefused' (stringly typed, duplicated in business) — export a constant or a small error class from the business.
  - sprite-colorizer-page.component.ts (libraryGroups) — no component test covers the badge, the kind filter, the grouping heading or the refusal toast (only browser check) — add a page spec if cheap.
  - random-item-image.business.ts:51 — the `library:` prefix is parsed inline in `create` and again in `load`; extract a small helper.
  - sprite-library.spec.ts / kinds-pack.ts — `as never[]` casts hide the fixture shape; a typed fixture would catch model drift.
  - The random-image grayscale test checks only that fetchText is not called and encodePng is; it does not prove the auto-guess materials are used. Acceptable.

## Answer

- `searchSprites(sprites, query, lang, kind)` filters by kind; `groupSpritesByPack(sprites, packs, lang)` groups under the pack name in pack order, empty packs left out.
- Colorizer: `grayscale` opens like a loaded image (Base material only, materials file ignored), `masked` as before, `colored` is refused before any fetch with `sprite.coloredRefused`, shown as an error toast; the open sprite is untouched.
- Random item images: `grayscale` goes through the automatic material guess, `colored` is stored as is through the new `SpriteFileService.fetchBlob`, `masked` unchanged.
- Library picker: pack heading, `p-select` kind filter ("Tous les types / All kinds"), `p-tag` badge per sprite (beside the tile button, whose text existing tests read). Labels in FR and EN. Prettier reformatted the colorizer page files.
- Checked in the browser: FR desktop shows the "Base" heading, "Avec masques" badges, the filter's four options, "Coloré" gives "Aucun sprite ne correspond"; EN at 375 px shows "Masked" badges and "All kinds", no horizontal scroll. Base has only masked sprites, so the grayscale/colored paths are covered by tests only. Suite: 203 files, 1732 tests (baseline 1720); build clean. Review: ship.
- Review notes left for later: the page compares the error message string to `sprite.coloredRefused` (export a constant or error class); no page spec covers the badge, filter, heading or toast; the `library:` prefix is parsed twice in random item images; fixtures use `as never[]` casts.
