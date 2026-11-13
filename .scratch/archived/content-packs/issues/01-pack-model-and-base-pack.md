# Pack model, validation and the Base pack

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (What a pack is, Official packs)

- Pack manifest model and a pure `validatePack(json)` with readable errors (format version, id, labels, license, generators per language, sprites with `kind` `grayscale` / `masked` / `colored`, limits).
- Today's word lists and the 101 bundled sprites are described by a Base manifest (`public/packs/base/pack.json` or generated from `SPRITE_LIBRARY`); `WordListService` and the sprite library read through a pack layer instead of fixed paths. Behaviour is unchanged for the user.
- No backward compatibility needed for stored dev data.

## Decisions (orchestrator, 2026-11-13)

- Base is a real pack on disk: `public/packs/base/pack.json`, its files moved with `git mv` to `public/packs/base/generators/<lang>/{items,npcs,skills,classes}.json` and `public/packs/base/sprites/<id>.{png,json}` (from `public/i18n/generators/` and `public/assets/sprites/`). Update `scripts/generate-sprite-sets.ts`, `docs/rules.md` (word lists line) and any other path reference. No backward compatibility.
- The manifest is the source of truth for the bundled sprites: `SPRITE_LIBRARY` (the TS list) goes away; its 101 entries (id, en, fr, type, slot) move into `pack.json` with `kind: "masked"`, `image` and `materials` paths.
- File paths in a manifest are relative to the manifest, never absolute, never `..`, never a URL.
- `PackService` (core/services, HttpClient, raw JSON, no validation) replaces `WordListService` as the mocked boundary. `PackBusiness` (core/business) loads and validates the Base manifest once, exposes the sprites (with resolved URLs and `packId`) and `wordList(generator, lang, packId = 'base')` raw JSON for the existing word-list validators. `WordListBusiness`, `NpcNamesBusiness`, the colorizer and random item images go through it.

## Baseline

Test Files 201 passed, Tests 1695 passed.

## Seams

1. **Pure `validatePack(json)` and `packFileUrl(manifestUrl, path)`** (`src/app/core/packs/pack.ts`): catches manifest errors (format, id, labels, license, generators per language, sprite kinds and tags, bad paths) and runs on the real `public/packs/base/pack.json` read from disk (101 masked sprites, 4 generators × en/fr, every listed file exists). Misses how the app loads it.
2. **`PackBusiness` over a faked `PackService`**: catches that the Base manifest is loaded once and validated, sprites come out with URLs under the pack folder, word lists are fetched through the manifest per language, and an invalid manifest fails with its errors. Existing `WordListBusiness` / `NpcNamesBusiness` / sprite business tests move to faking `PackService`. Misses the real HTTP paths (covered by the build and the browser check).

## Red

- Test files:
  - New: `src/app/core/packs/pack.spec.ts` (seam 1), `src/app/core/business/pack.business.spec.ts` (seam 2), `src/testing/base-pack.ts` (helper `provideBasePack()`: `PackService` faked on the real Base manifest).
  - Rewritten: `src/app/core/business/word-list.business.spec.ts`, `src/app/modules/sprite/helpers/sprite-library.spec.ts`.
  - Retargeted (fake `PackBusiness.wordList` / `provideBasePack()`, `public/packs/base/...` paths and URLs): the 15 component/business specs that mocked `WordListService`, the generators/world/item-card specs importing word-list JSON, `sprite-colorizer.business.spec.ts`, `random-item-image.business.spec.ts`, `sprite-colorizer-page.component.spec.ts`.
- Run: `npx ng test --watch=false --include src/app/core/packs/pack.spec.ts` (same for `src/app/core/business/pack.business.spec.ts`, `src/app/core/business/word-list.business.spec.ts`, `src/app/modules/sprite/helpers/sprite-library.spec.ts`)
- API the tests assume (green must provide):
  - `core/packs/pack.ts`: `validatePack(json): {ok:true,value:Pack}|{ok:false,errors:string[]}`; `packFileUrl(manifestUrl, path)`; `Pack` has `format,id,name,description,version,author,license,licenseUrl,generators[lang][generator],sprites[]` (sprite: `id,en,fr,type,slot,kind,image,materials?`). Error strings name the offending field (`format`, `id`, `name`, `kind`, `materials`, `items`, `image`, sprite id, ...). Languages `en`/`fr` only; generators `items|npcs|skills|classes`.
  - `core/services/pack.service.ts`: `PackService.loadManifest(packId): Promise<unknown>` and `loadJson(url): Promise<unknown>`.
  - `core/business/pack.business.ts`: `PackBusiness.manifest()` (loaded once, throws with errors when invalid), `sprites()` (each: manifest fields + `packId`, `imageUrl`, `materialsUrl?`, URLs like `packs/base/sprites/axe.png`), `wordList(generator, lang, packId='base')` (rejects when the manifest has no file for it).
  - `searchSprites(sprites, query, lang)` now takes the sprite list first; `spriteUrl`/`SPRITE_LIBRARY` gone; colorizer `loadLibrary(id)` and random item images fetch `packs/base/sprites/<id>.png|json` via `PackBusiness`.
  - Files must be `git mv`ed to `public/packs/base/generators/<lang>/*.json` and `public/packs/base/sprites/*`, plus `public/packs/base/pack.json` (101 masked sprites, 8 generator files).
- Failing: all new/changed specs fail at compile (missing modules are the red; no per-test run is possible): `pack.spec.ts` (all validatePack / packFileUrl / real Base pack tests) — `./pack` and `public/packs/base/pack.json` missing; `pack.business.spec.ts` (5 tests) — `pack.service` / `pack.business` missing; `word-list.business.spec.ts` (5 tests) — `pack.service` and moved JSON missing; `sprite-library.spec.ts` (4 tests) — `searchSprites` signature and `pack.json` missing; all retargeted specs — `core/business/pack.business`, `src/testing/base-pack` -> `pack.service`, and `public/packs/base/...` missing.
- Environment note: in this checkout even the baseline fails to build specs (`TS2591 Cannot find name 'node:crypto'` in `src/testing/jsdom-setup.ts`) because `tsconfig.spec.json` has `"types": ["vitest/globals"]` without `"node"` (@types/node 26 is no longer pulled in by vitest 5.1). I verified red with `"node"` added temporarily, then reverted. `pack.spec.ts` also uses `node:fs` / `process`, so it needs that same `"node"` types entry; green should add it to `tsconfig.spec.json`. Because a missing module breaks the whole Angular test build, the full suite cannot report pass counts until green lands.

## Green

- Files: src/app/core/packs/pack.ts, src/app/core/services/pack.service.ts, src/app/core/business/pack.business.ts, word-list.business.ts, npc-names.business.ts, sprite-library.ts, sprite-colorizer.business.ts, random-item-image.business.ts, sprite-colorizer-page.component.ts, public/packs/base/** (git mv + pack.json), tsconfig.spec.json, ngsw-config.json, scripts/generate-sprite-sets.ts, docs/rules.md, .claude/agents/tdd-red.md; word-list.service.ts removed.
- Change: Added validatePack/packFileUrl, PackService and PackBusiness (Base manifest loaded once, sprites with URLs, wordList). Moved word lists and sprites (plus LICENCE.txt) to public/packs/base, generated pack.json from SPRITE_LIBRARY (101 masked sprites, 8 generator files) and dropped the TS list; WordListBusiness, NpcNamesBusiness, colorizer, random item images and the colorizer page read through PackBusiness. ngsw prefetches /packs/base/** (sprite PNGs now prefetch instead of lazy). "node" added to spec types.
- Suite: 203 files / 1720 tests pass (baseline 201 / 1695); tsc spec clean; ng build no errors (budget warnings only).
- Open questions: none

## Answer

- `core/packs/pack.ts`: `validatePack(json)` (format 1, kebab-case id, EN/FR name and description, license, generators per language among items/npcs/skills/classes, sprites with kind `grayscale`/`masked`/`colored`, item type and slot, `masked` needs materials; paths must be relative, no `..`, no URL scheme, no backslash) and `packFileUrl(manifestUrl, path)`.
- Base is a real pack: word lists and the 101 sprites (with `LICENCE.txt`) moved with `git mv` to `public/packs/base/`, `pack.json` written from the old `SPRITE_LIBRARY` (removed). `PackService` (raw JSON) replaces `WordListService` as the mocked boundary (`.claude/agents/tdd-red.md` updated); `PackBusiness` loads and validates the manifest once, exposes sprites with URLs and `wordList(generator, lang)`. Word lists, NPC names, the colorizer, its library and random item images go through it. Script and `docs/rules.md` paths updated; `tsconfig.spec.json` gets `node` types (tests read `pack.json` from disk).
- Service worker: `pack.json` and `generators/**` are prefetched with the app; sprites stay in the lazy assets group as before (fixed by the orchestrator: green had prefetched the whole pack).
- Checked in the browser (FR, 1024 px): the sprite library lists 101 sprites from `packs/base/sprites/`, the axe opens with its three materials, the item generator draws named items with descriptions; no console error after reload. No visible change, so EN and mobile were not walked. Suite: 203 files, 1720 tests (baseline 201 / 1695); build clean. Review: ship.
- Review notes left for later tickets: `wordList(..., packId)` only knows Base until K03/K05 load other manifests; the "find sprite or throw" helper is duplicated in the colorizer and random item image businesses (candidate `PackBusiness.sprite(id)`); the colorizer page swallows a failed manifest load; `sprite-library.ts` is now only a search helper.
