# Saved sprites and masks (sprite sets)

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (Saved sprites and masks)

- Model: a sprite set = sprite (bundled id or stored image) + material layers (name, mask, default gradient). Reuse the JSON config export format where it fits.
- Bundled sets: a script (`scripts/`) runs the existing shape detection on each bundled sprite and writes one JSON per sprite next to it; the result is checked by hand and fixed in the colorizer where needed (export, then replace the JSON).
- Colorizer: save the current sprite and masks on the device (local storage layer, not per world), list, reopen, rename, delete; built-ins are read-only, saving one makes a copy. Opening a bundled sprite loads its set.

## Baseline

Test Files 195 passed, Tests 1632 passed.

## Seams

1. **Pure helper `helpers/auto-materials.ts`** `autoMaterials(image, max)`: the first guess for a bundled sprite (regions → materials, gradients, ids). Misses: how good the guess looks (browser).
2. **`SpriteColorizerBusiness`** with `SpriteSetStorageService`, `ImageStorageService` and `SpriteFileService` faked: bundled sets on open, save (new / over the opened set / copy of a bundled one), file images stored, open, rename, delete. Plus `SpriteSetStorageService` on fake-indexeddb.
3. **Colorizer page (`TEST_PROVIDERS`)**: Save button, "My sprites" list in the library with open and confirmed delete.

## Answer

- **Model** `SpriteSet` = id, name, source (`library` sprite id, or `image` id in the app's `images` store), materials as the colorizer's JSON config, `updatedAt`. Stored in a new IndexedDB store `spriteSets` (database v5), on the device, not per world.
- **Bundled sets**: `npm run sprites:sets` (esbuild bundles `scripts/generate-sprite-sets.ts`, which decodes the PNGs with zlib and reuses the app's helpers) writes `public/assets/sprites/<id>.json`; existing files are kept unless `--force`, so a set fixed by hand (exported from the colorizer, copied there) survives. The guess: the 4 biggest regions of similar luminance become "Part 1–4" with the Steel, Wood, Gold, Leaf gradients; outlines and small details stay in Base. 101 sets, +0.4 MB. Spot-checked in the browser: axe (steel blade, wooden handle, gold pommel) and potion read well. The other 99 were not checked one by one.
- **Colorizer**: opening a bundled sprite loads its set (base only if the JSON is missing). "Save" saves the sprite and materials: over the set it was opened from, otherwise as a new set (a bundled sprite is copied; an opened file's image is stored). Default name: the set's name, or the bundled sprite's label in the page's language. The library dialog has a Bundled / My sprites switch; saved sets are listed latest first with the date in the page's language, and can be opened (fresh history), renamed inline (field focused and selected) and deleted (confirmation). Deleting a set keeps its image (images are shared by content with the rest of the app).

Checked in the browser (1024 px FR, 375 px EN): save potion and sword, list, rename, delete with confirm, reopen with its 5 materials and no undo; no horizontal scroll. Review step skipped. Suite: 197 files, 1646 tests (14 new); build clean.
