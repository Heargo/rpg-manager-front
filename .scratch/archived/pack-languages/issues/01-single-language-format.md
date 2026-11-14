# Pack format: one language, Base split in two

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1-2, Assumed: registry, old stored packs).

- Manifest: required `language` (`en` | `fr`), `name` and `description` as strings, `generators: { items?, npcs?, skills?, classes? }` (paths), sprites with `label` instead of `en` / `fr`. `validatePack` checks the new shape and rejects the old one.
- `public/packs/base` becomes `public/packs/base-fr` and `public/packs/base-en` (same 101 sprite files, each manifest with its own labels and word lists). Registry entries `base-fr` and `base-en`, both built in, with `language` instead of `languages`.
- Everything that read `pack.name[lang]`, `sprite.en/fr` or `generators[lang]` reads the single value (pack business, sprite library, word lists, random item image, Packs page cards and details).
- Old-format stored packs and drafts are dropped by the database upgrade.
- Until 03 lands, both Bases are on (the existing device toggle keeps working).

## Decisions (orchestrator, 2026-11-13)

- **PL02 is folded in here.** The draft model, `buildPack`, `draftFromInstalled` and `duplicate` live in core and must produce the new manifest, and the editor page binds to the draft's fields, so the format can't change without them. This ticket therefore also does PL02: a draft has a `language` (select on Details, default the app language), one name, one description, one list per generator (Lists tab shows 4 slots, "Copy Base" copies from the Base of the draft's language), and one label per sprite. Duplicate keeps the language, and the " (copie)" / " (copy)" suffix follows the pack's language.
- **Interim rule until PL04:** generators, sprites and the random item image use the enabled packs **whose language is the app language** (so the app behaves as today: French app → base-fr content, with no duplicate sprites from base-en). PL04 replaces this with the world's active packs.
- `BASE_PACK_ID` gives way to the two ids `base-fr` and `base-en` (a helper gives the Base of a language). Both are always installed and enabled, and neither can be removed.
- The Packs page shows the pack's language as a tag on each card and in the details.
- The draft DB store and the packs store drop old records on upgrade (bump the DB version).

## Baseline

Test Files 230 passed, Tests 1937 passed (after `71de0e4`). Unrelated uncommitted user-docs changes are in the tree. Leave them alone.

## Seams

1. **`validatePack` (`core/packs/pack.ts`) and `buildPack` (`pack-draft.ts`)**: the new manifest is accepted, and a missing or unknown `language`, per-language `name` or `generators`, or `en` / `fr` sprite labels are rejected. A one-language draft builds a valid manifest. Misses storage and pages.
2. **`PackBusiness` / `WordListBusiness` / the sprite library over the faked `PackService` and fake-indexeddb (as their specs do today)**: `base-fr` and `base-en` are both installed, enabled and can't be removed. With the app in French, word lists and sprites come from `base-fr` only, with French labels, and in English from `base-en`. An enabled French pack adds its content in French only. Misses the pages.
3. **`PackCreatorBusiness`**: a new draft takes the app language. `draftFromInstalled` and `duplicate` of `base-en` give an English draft with English lists and labels. The duplicate suffix follows the pack's language. "Copy Base" copies from the Base of the draft's language. Install and export write the new manifest. Misses the editor template (build plus the existing page specs, updated).

## Red

- Test files (new or rewritten, all to the new format):
  - core: `src/app/core/packs/{pack,pack-draft,pack-registry,pack-choice}.spec.ts`, `src/app/core/helpers/app-database.spec.ts` (new), `src/app/core/business/{pack,pack-official,pack-unofficial,pack-concurrency,pack-update-atomic,pack-choice,pack-creator,pack-creator-colorizer,word-list}.business.spec.ts`
  - fixtures: `src/testing/{base-pack,extra-pack,kinds-pack,unofficial-pack,pack-choice-fixtures}.ts`
  - sprite: `src/app/modules/sprite/helpers/sprite-library.spec.ts`, `business/{random-item-image,random-item-image.pack,sprite-colorizer,sprite-colorizer-draft,sprite-colorizer-draft.colored}.spec.ts`, `pages/sprite-colorizer-page/sprite-colorizer-page.draft.spec.ts`
  - pages: `tools/pages/{packs-tool-page/*.spec.ts, pack-draft-page/*.spec.ts, pack-creator-page/*.spec.ts, item-generator-page/item-generator-page.pack.spec.ts}`, `item/.../item-editor.pack.spec.ts`, `npc/.../npc-editor.pack.spec.ts`, plus mechanical path/`packsFor` updates in the item, npc, class, skill, world, tools generator specs
- Run: `npx ng test --watch=false --include <file>` (e.g. `--include src/app/core/packs/pack.spec.ts`)
- Failing: whole files fail to compile today (missing `public/packs/base-fr|base-en/...` JSON, `Pack.language`, `label`, new `PackBusiness`/`PackCreatorBusiness` signatures), which is the red; `app-database.spec.ts` fails on an assertion. Behaviours covered:
  - pack.spec: language en|fr required, name/description strings, single-path `generators`, sprite `label`, old shapes rejected; real `base-fr`/`base-en` manifests (101 sprites, 4 generators, files on disk); `public/packs/base` gone
  - pack-registry.spec: `language` not `languages`, string name/description; real index lists `base-fr` + `base-en` built in
  - pack-draft.spec: `buildPack` writes language, string name, one list per generator at `generators/<generator>.json`, `label` per sprite
  - pack.business.spec: `basePackId`, both Bases installed/enabled/undeletable, sprites of the app-language Base only with `label`, `wordList(generator, packId)`
  - pack-official/unofficial/concurrency/choice specs: `packsFor(content, lang)` gives the Base of `lang` plus enabled packs of that language; a French pack adds nothing in English; fallbacks to the Base of the language, then `base-en`
  - word-list.business.spec: `itemWords()` reads `base-fr` / `base-en` by app language
  - pack-creator.business.spec: new draft takes app language, `copyBaseList(draftId, generator)` from the Base of the draft language, install/export write the new manifest, duplicate/draftFromInstalled of `base-en`/`base-fr`, copy suffix follows the pack language
  - sprite-library.spec: single-label search, `groupSpritesByPack(sprites, packs)` with string names
  - random-item-image specs: only app-language packs, no sprites of the other Base
  - packs-tool-page specs: 3 cards, `[data-test="pack-language"]` tag (text "Français"/"English"), both Bases duplicable
  - pack-draft-page specs: hooks `draft-name`, `draft-description`, `p-select[data-test="draft-language"]`, four `wordlist-<generator>` slots, `wordlist-error-<generator>`
  - app-database.spec: upgrade drops old `packs`, `packFiles`, `packDrafts` and keeps worlds
- Assumed contract (green may adjust the tests if it chooses otherwise, with a note): `basePackId(lang)` exported from `pack.business`; `PackBusiness.manifest(id)`, `wordList(generator, packId)`, `sprites()` reads the app language through `LanguageBusiness`; `InstalledPack.language`; `PreparedPack.counts.generators` is a number; draft `details.language`, `generators` keyed by generator, `DraftSprite.label`; `copyBaseList(draftId, generator)`; Base files under `public/packs/base-<lang>/` with `generators/<generator>.json` and `sprites/`; `searchSprites(sprites, query, lang, kind)` keeps `lang`, `groupSpritesByPack` drops it; `choosePack` falls back to the first candidate.

## Green

- Files: `public/packs/{base-fr,base-en}/**` and `public/packs/index.json` (old `public/packs/base` removed), `ngsw-config.json`, `docs/rules.md`, `scripts/generate-sprite-sets.ts`, `public/i18n/{en,fr}.json` (creator name/language/description/label keys, `packs.language`, `sprite.draft.label`; old per-language keys removed), core (`packs/pack.ts`, `pack-registry.ts`, `pack-draft.ts`, `pack-choice.ts`, `helpers/app-database.ts` v8, `business/pack.business.ts`, `pack-creator.business.ts`, `word-list.business.ts`, `pack-choice.business.ts`), `npc-names.business.ts`, sprite (`sprite-library.ts`, `random-item-image.business.ts`, `random-sprite.ts`, `sprite-colorizer.business.ts`, colorizer page ts/html), tools pages (packs-tool-page, pack-draft-page, pack-creator-page), `credits-page.component.ts` (only the `name[lang]` read, so it compiles).
- Change: manifest, registry, draft and sprites moved to one language (`language`, string name/description, `generators: {gen: path}`, `label`); `basePackId(lang)` / `isBasePack`, both Bases installed, enabled, undeletable; `sprites()` / `packsFor` use the Base of the app language plus enabled packs of that language; `wordList(generator, packId)`; `copyBaseList(draftId, generator)`; DB v8 clears `packs`, `packFiles`, `packDrafts`. Draft page: language p-select, one name/description, four list slots, one label per sprite. Packs page: language tag on each card and in details, via new `PackBusiness.spritesOf(id)` (details of the other-language Base) and `languageOf(id)` (word lists of a pack only in its own language, else fallback to the Base). Sprite search no longer matches by id (spec: `searchFr('sword')` is empty).
- Suite: Test Files 229 passed, 2 failed (baseline 230 passed); Tests 1968 passed, 7 failed of 1975. `tsc -p tsconfig.spec.json` clean, `ng build` OK. The 7 failures are two stale lines in specs I did not edit (see below); with those two lines fixed locally (then reverted) both files pass.
- Open questions:
  - `packs-tool-page.unofficial.spec.ts:26` expects 2 `pack-card`s, but the registry now has base-fr, base-en and extra (the updated `packs-tool-page.component.spec.ts` expects 3): change `toBe(2)` to `toBe(3)` (fixes 6 tests).
  - `sprite-colorizer-page.component.spec.ts:179` (not in the red list) still matches `/^packs\/base\/sprites\//`: should be `base-en` (test app language is English) (fixes 1 test).
  - Unrelated user work in the tree (`static-pages.spec.ts`, user-docs, i18n credits keys) left intact.

## Answer

- Packs have one `language` (`en` | `fr`), with string name and description, one list per generator and one `label` per sprite. Base is now `base-fr` and `base-en`: both are official, always installed and enabled, can't be removed, and share the same 101 sprite files. DB v8 drops old packs and drafts.
- Creator (PL02 folded in): a draft has a language (default the app language) and single fields. "Copy Base" uses the Base of the draft's language, and Duplicate keeps the language, with the suffix in that language.
- Interim until PL04: content comes from the enabled packs in the app language. The Packs page shows a language tag.
- Sprite search matches labels only, not ids (a French player typing "sword" no longer finds "Épée"). This is pinned by the spec, and the reviewer agreed.
- Checked: suite 231 files / 1975 tests pass (baseline 230 / 1937). Build OK. Browser: Packs page shows "Base (français)" and "Base (English)" with tags, and duplicating base-en opens an English draft with 4 lists and English labels.
- Left (review, Consider): `sprites()` and `spritesOf()` repeat the Base sprite mapping.
- The two stale spec lines Green reported (`packs-tool-page.unofficial.spec.ts:26` and `sprite-colorizer-page.component.spec.ts:179`) were fixed by the orchestrator. The unused `packs.lang.*` keys were removed.
