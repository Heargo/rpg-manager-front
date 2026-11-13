# Bundled grayscale sprites, demo axe, credits

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Bundled grayscale sprites)

- Copy the plain PNGs (not the `_b` variants) of `/home/hugo/Téléchargements/fantasy-items-pack/assets/` into `public/assets/sprites/`, one of each duplicate (`honey`/`honney`, `ocarina`/`occarina`, `fishing_rod`/`fishingrod`). A typed manifest lists each sprite: id (file name), FR/EN label, kind tag (weapon, armour, jewel, potion, food, tool, book, instrument, misc…).
- Colorizer: a sprite library picker (thumbnails, search by label) next to "Open an image"; picking one loads it like an opened file.
- The demo sprite is `axe.png`; remove the generated axe (`helpers/demo-sprite.ts`).
- Credits page, FR and EN: "Fantasy items pack" by Florian Sciberras, CC BY 4.0 with a link to the licence, sprites recoloured in the app.
- Check the service worker caching (the sprites are lazy assets, not prefetched).

## Baseline

Test Files 194 passed, Tests 1622 passed.

## Seams

1. **Pure helper `helpers/sprite-library.ts`**: the manifest (101 ids, FR/EN labels, item `type` and `slot` tags for H05), `spriteUrl`, `searchSprites(query, lang)`. Misses: that every PNG exists (checked by the script that wrote the manifest).
2. **`SpriteColorizerBusiness`** `loadLibrary(id)` / `loadDemo()` with `SpriteFileService` faked. Misses: real fetch and decode (browser).
3. **Colorizer page and credits page (`TEST_PROVIDERS`)**: the library dialog lists, filters and picks; credits name the pack, author and licence in both languages.

## Answer

The 101 plain sprites of the Fantasy items pack (Florian Sciberras, CC BY 4.0) are in `public/assets/sprites/` with the licence text (1.1 MB, lazy-cached by the service worker's existing `assets` group). There were no real duplicates: `honney`, `occarina` and `fishingrod` only appear as `_b` names; two plain files with typos were renamed on copy (`occarina` → `ocarina`, `fishingrod` → `fishing_rod`). Each sprite is tagged with the app's own `ItemType` and `ItemSlot` so H05 can match items directly.

The colorizer has a "Sprite library" button: a dialog with a search field (focused on open; case and accents ignored, every word must match, label or id) and a grid of thumbnails sorted by label; picking one fetches and loads it. The demo button loads `axe.png`; the generated axe (`helpers/demo-sprite.ts`) is gone. A load failure shows the existing "load failed" toast. Credits get a card in Illustrations naming the pack, its author, the licence (link) and that the app recolours the sprites.

Checked in the browser: demo axe loads (1024 px FR), library dialog, "epee" finds Épée, picking loads the sword; 375 px EN: dialog fits with 2 columns, no horizontal scroll; credits text in EN. Review step skipped. Suite: 195 files, 1632 tests (10 new); build clean.
