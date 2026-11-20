# Neutral Base assets pack, sprites moved out of Base FR/EN

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (One neutral pack for the shared assets)

- New built-in neutral pack in `public/packs/` and `index.json`, holding the 101 item sprites and masks; `base-fr` and `base-en` no longer ship sprites (index descriptions and counts updated).
- New worlds activate Base FR or EN plus the neutral pack; the random image by kind and tint still finds a sprite for every Base item kind.
- Credits page and pack metadata keep the CC BY 4.0 attribution of the sprites.
- User docs (`user-docs/`) updated where they describe what Base ships.

## Baseline

`npm test`: 312 test files, 3075 tests, all passed (2026-11-17, after ML01).

## Seams

- The built-in packs as loaded and validated by the existing pack path (`public/packs/index.json`, `validatePack`, the official registry): catches a valid neutral `base-assets` pack (no language) holding the 101 sprites and masks with the CC BY 4.0 attribution, `base-fr` / `base-en` valid with no sprites, the index listing all three with updated counts, and every sprite's kind resolving once Base FR or EN and the neutral pack are both active. Misses the credits page text (review / browser).
- World defaults (the world draft / creation business): catches a new world activating Base FR or EN plus `base-assets`, and the default content keeping working.
- The random item image (by kind and tint) over the active packs (existing generator / image business seam): catches every Base item kind still getting a sprite with Base FR + `base-assets` active, and none with Base FR alone.

## Red

- Test files: `src/app/core/packs/base-assets-pack.spec.ts`, `src/app/modules/world/business/world-library.base-assets.spec.ts`, `src/app/modules/sprite/business/random-item-image.base-assets.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/packs/base-assets-pack.spec.ts --include src/app/modules/world/business/world-library.base-assets.spec.ts --include src/app/modules/sprite/business/random-item-image.base-assets.spec.ts 2>&1 | tail -30`
- Kinds split chosen: sprites reference kinds by id in `sprite.kinds`, resolved against the pack's own `domains.items.kinds` then the Bases' kinds (`PackBusiness.baseKinds`). Least disruptive: `base-assets` declares the item kinds tree its sprites need (every sprite kind reaching a root kind, standalone); Base FR/EN keep their own kinds and words (tests do not assert Base kinds absent).
- Assumptions for green: `base-assets` manifest at `public/packs/base-assets/pack.json` (sprites under `sprites/`, same file names), no `language`, name "Base assets", license CC-BY-4.0, author containing "Florian Sciberras", `builtIn: true` in `index.json`; `base-fr`/`base-en` have `sprites` 0 in index and no sprites in manifest. The random-image test serves any pack id from `public/` through a faked `PackService` (`loadManifest`, `loadRegistry`), so `base-assets` must load through `PackService.loadManifest('base-assets')` and be active from the world's packs (today `activeIds` only accepts Base ids or stored packs; `random-item-image.business` also treats non-Base packs as `own`, which the neutral pack must not be).
- Failing: 17 tests (7 + 3 + 7), 3 files
  - base-assets-pack: is a valid pack without a language; holds the 101 item sprites; keeps the CC BY 4.0 attribution; declares every kind its sprites point to; base-fr and base-en ship no sprite (2 tests); listed in the registry with updated counts — `public/packs/base-assets` does not exist, Base manifests still hold 101 sprites, index lists two packs.
  - world-library.base-assets: activates the fr Base and base-assets by default; same for en; still creates starter items of the default content — packs default is `[base-fr]` / `[base-en]` only. (The "keeps the packs a draft names" test passes on purpose, a guard.)
  - random-item-image.base-assets: draws axe / ring / helm / potion / key from base-assets (5 tests) — sprites still come from `packs/base-fr`; every sprite kind of base-assets gets a base-assets sprite — manifest missing; Base FR alone finds no sprite — a Base FR sprite is still found.
- Existing specs that assert Base FR/EN ship sprites (note for green, not rewritten): `src/app/core/business/pack-official.business.spec.ts` (`BASE_SPRITES = 101`, registry ids, installed ids `['base-fr','base-en']`), `src/testing/base-pack.ts` / `extra-pack.ts` (`baseManifest`, `BASE_ONLY_REGISTRY` sprites 101, only two Bases), `src/testing/kinds-pack.ts` (spreads `baseFr`), `src/app/modules/sprite/business/random-item-image.business.spec.ts` and `random-item-image.pack.spec.ts` (`packs/base-fr/sprites/axe.png`, `base-en` axe), `src/app/modules/world/business/world-library.business.spec.ts` (default packs `['base-fr']`/`['base-en']`), `sandbox-world.packs.spec.ts`, plus `pack.business.spec.ts`, `pack-registry.spec.ts`, `pack.spec.ts`, `credits-packs.spec.ts`, `packs-tool-page*.spec.ts` where they count Base sprites.

## Green

- Files: `public/packs/base-assets/pack.json` + `sprites/` (101 sprites and masks `git mv`'d from `base-fr`, `base-en` copies deleted), `public/packs/base-fr/pack.json`, `base-en/pack.json`, `public/packs/index.json`, `ngsw-config.json`, `src/app/core/business/pack.business.ts`, `src/app/modules/world/business/world-library.business.ts`, `sandbox-world.business.ts`, `world-new-page.component.ts`, `packs-tool-page.component.ts`, `src/testing/base-pack.ts`, `extra-pack.ts`, `unofficial-pack.ts`, `user-docs/src/content/docs/{packs,worlds}.md` and `en/{packs,worlds}.md`, and the updated specs below.
- Change: new neutral `base-assets` (no language, CC-BY-4.0, Florian Sciberras, own item kinds tree copied from Base, English sprite labels); Bases keep words/texts/content/tints, no sprites, author "RPG Manager". `BASE_PACK_IDS` now includes `base-assets` (`BASE_ASSETS_ID`), so it loads/validates through the built-in path, is installed, never `own` in the random image, cannot be removed, and its kinds join the Base fallback. `activeIds` without a world = Base of the language + `base-assets`; new worlds, the world wizard and the sandbox default to `[Base, base-assets]`. Packs page hides the language tag/row for a pack without language. Service worker caches the new folder.
- Suite: `npm test` 315 files / 3094 tests all pass (baseline 312 / 3075, +3 red files; 18 red tests green). `tsc -p tsconfig.spec.json` clean, `ng build` no error. The 4 "unhandled errors" in the run (pack-update-atomic, pack-draft-page.lifecycle) also occur on the untouched baseline.
- Specs changed (unstaged; the 3 red specs untouched): `pack-official` (registry/installed ids with `base-assets`, extra at index 3, world `['base-fr','base-assets','extra']`, no built-in removable), `pack-unofficial`, `pack-concurrency`, `pack.business.spec` (ids list, base-assets listed without language), `pack-creator.business.spec` (ids; Base copy now 0 sprites, new "copies base-assets: 101 sprites"; axe path `base-assets`; glow materials import path), `pack-creator-colorizer` (materials import path), `pack-registry.spec` (counts 0/0/101), `pack.spec` (Bases list no sprite; new base-assets describe with 101 sprites and 202 files), `pack.kinds.spec` (sprite-tree tests moved to a base-assets describe; Bases-together test now checks base-assets kinds equal Base's), `sprite-library.spec` (now over base-assets English labels; French-label search tests dropped), `random-item-image.business.spec` and `.pack.spec` (worlds include `base-assets`, URLs `packs/base-assets/...`), `sprite-colorizer.business.spec` and `sprite-colorizer-page.component.spec` (URLs), `sandbox-world.packs.spec`, `world-library.business.spec` (default packs), `packs-tool-page.component.spec` / `.unofficial.spec` (4 cards, base-assets always available, no language tag). Fixtures: `src/testing/base-pack.ts` (`builtInManifest`), `extra-pack.ts` (BASE_ASSETS entry, Bases 0 sprites), `unofficial-pack.ts` (import path).
- Open questions: sprite labels in `base-assets` are English only (the manifest has one `label`), so the French sprite library search by French names ("hache") is gone; add per-language labels later if wanted. Existing stored worlds with `['base-fr']` only lose their sprites until `base-assets` is ticked (no backward compat, per project rule).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `public/packs/base-assets/pack.json`, `src/app/modules/sprite/helpers/sprite-library.ts:6` — French users now see English sprite labels and "hache" finds nothing. This is a real regression for French users, but the spec and ticket do not cover it, and a fix needs a manifest decision. Open a follow-up ticket before release. Approach: an optional `labels: { fr, en }` on a sprite, or resolve the label from the active Base's kind nouns, with `searchSprites` folding the label of the app language and falling back to `label`. Restore the deleted French search tests with it.
  - `pack.business.ts` `activeIds` — stored worlds with `['base-fr']` lose their sprites until `base-assets` is ticked. The spec ("get the neutral pack added by the defaults") only covers defaults. The red seam also requires "none with Base FR alone", so making Base imply `base-assets` would break that test. The no-backward-compat rule agrees. Acceptable. If you want dev worlds fixed, do it once in the stored-world read (`world-library.business.ts:42`), not in `activeIds`.
  - `world-library.business.ts:49` — the line is over 120 characters and mixes two defaults. A small `defaultPacks(lang)` helper would be shared with `sandbox-world.business.ts` and `world-new-page.component.ts` (three copies of `[Base, BASE_ASSETS_ID]`).
  - `pack.business.ts` — the nested ternary building `language` is hard to read. Extract a `baseLanguage(id)` helper.
- Checks: the existing spec edits keep their intent. Counts, ids and URLs moved to `base-assets`, and the sprite-tree kind tests moved to a `base-assets` describe. The credits page keeps its static CC BY 4.0 attribution for the sprites, and the pack metadata carries author, license and licenseUrl. `ngsw-config.json` caches the new `pack.json` and `sprites/**`. User docs are updated in both languages.

## Red (review round: French sprite labels)

- `src/app/modules/sprite/helpers/sprite-library.nouns.spec.ts` (9 tests, red by compilation): `spriteLabel(sprite, vocabulary?)` returns the first noun of the sprite's first kind in the given item vocabulary, else `sprite.label`; `searchSprites(sprites, query, lang, kind, vocabulary?)` folds and sorts on it. Restores the intent of the French search tests dropped by green ("hache", "EPEE", other language doesn't match).

## Green (review round)

- Files: `src/app/core/helpers/sprite-search.ts` (new: `spriteLabel`, `searchSprites`, `fold`, moved from the sprite module), `src/app/modules/sprite/helpers/sprite-library.ts` (re-exports them, keeps `DEMO_SPRITE_ID` and `groupSpritesByPack`), `src/app/core/business/sprite-label.business.ts` (new), `sprite-colorizer-page.component.ts`, `packs-tool-page.component.ts`, `pack.business.ts`, `world-library.business.ts`, `sandbox-world.business.ts`, `world-new-page.component.ts`.
- Change: `spriteLabel(sprite, vocabulary?)` returns the first noun of the first kind, else `sprite.label`; `searchSprites` takes an optional 5th `vocabulary` (the nouns spec is unchanged and green). `SpriteLabelBusiness` (core) loads the item vocabulary of the active Base and exposes `name(sprite)` and `search(...)`; only built-in sprites (`base-assets`) take the noun, a third-party pack's sprites keep their own `label`. The colorizer page (list, tiles, default set name) and the packs details go through it, no helper import in components. The pack creator Sprites tab edits drafts' own labels and is untouched. Helpers: `defaultPacks(lang)` replaces the four `[Base, base-assets]` copies, `baseLanguage(id)` replaces the nested ternary in `pack.business.ts`.
- Suite: `npm test` 316 files / 3103 tests pass, `tsc -p tsconfig.spec.json` clean, `ng build` no error.
- Open questions: none.

## Answer

- New built-in neutral pack `base-assets` ("Base assets", no language, CC BY 4.0, sprites by Florian Sciberras): the 101 item sprites and masks moved out of Base FR (Base EN's copies deleted), with the item kinds tree its sprites need. Base FR/EN keep words, texts, content and tints, no sprites. Registry, service worker, credits and docs updated.
- `base-assets` is a built-in pack (can't be removed, not `own` for the random image). `defaultPacks(lang)` = Base of the language + `base-assets` for new worlds, the world wizard, the sandbox and the no-world default.
- Review round: built-in sprites are named and searched by the noun of their kind in the app language's Base (`SpriteLabelBusiness`, helpers in `core/helpers/sprite-search.ts`), so French users see and search "Hache"; third-party sprites keep their own label. The French search tests dropped in the first green came back as `sprite-library.nouns.spec.ts`.
- Many existing specs moved their sprite counts, ids and URLs to `base-assets` (reviewed: intent kept).
- Checked: suite 316 files / 3103 tests green; build clean; review ship. Browser FR: the sprite library lists "Base assets", "hache" finds "Hache", CC BY credit shown, no console error.
- Not done (review Consider, accepted under the no-backward-compatibility rule): stored worlds that list only `base-fr` / `base-en` lose their sprites until "Base assets" is ticked in their world rules.
