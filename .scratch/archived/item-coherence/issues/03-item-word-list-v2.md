# Item word list v2 and the Base FR/EN lists

Status: resolved
Type: task
Blocked by: 01, 02

Spec: `../spec.md` (Decisions 2, 3, 4, 9, 10, 13, Assumed: untinted adjectives, Base packs, param warnings).

- `WORD_LIST_VERSION` 2: `kinds` (`{ [kind]: { nouns?, descriptions?, names?: Partial<Record<rarity, string[]>> } }`), `tints` (`{ [tint]: { adjectives?, suffixes?, descriptions? } }`), `adjectives?` and `suffixes?` per rarity (untinted), `templates?` per rarity. All sections optional, but the file must give something.
- `bases` and `descriptions` per type go away.
- Shared language file `generators/common.json`, version 1: `params` (`{ [name]: string[] }`). Its validator is separate from the items one, since every domain will use it.
- The items validator is the generic language-file validator (`kinds` keyed by the domain's kind ids, plus top-level sections) with the items schema (kind sections `nouns`, `descriptions`, `names`; tint sections; `adjectives`, `suffixes`, `templates`). Unknown fields are errors.
- Validation with readable errors: every phrase passes the phrase engine's syntax check; templates and `names` must contain `{base}`; a template using `{suffix}` for a rarity with no suffix anywhere in the file is only a warning (another pack may give them); params used and not defined in the file are warnings, not errors.
- `base-fr` and `base-en` `generators/items.json` rewritten: every current noun under its kind (new kinds for nouns that had no sprite, declared in 01's manifests), descriptions on the roots and on some kinds, tinted adjectives/suffixes for the obvious ones (rouillé → `rust`, argenté → `silver`, des braises → `fire`, des marées → `ice`…), and a `generators/common.json` with a starting set of params (`maker`, `owner`, `place`, `event`, `material`, `creature`, `effect`). Plus the templates.

## Decisions (orchestrator, 2026-11-14)

- **Validators** (pure): `validateItemWordList(json)` replaces the v1 `validateWordList` (v2 shape, `{ ok, value, warnings } | { ok: false, errors }`), and `validateCommonTexts(json)` for `generators/common.json` (version 1, `params`). Both are built on one generic language-file validator (kind-keyed sections + top-level sections, unknown fields are errors) that a later domain can reuse with its own schema. Phrases are checked with `checkPhrase` (IC02).
- **Kinds in a language file are not checked against a tree** by the validator (the tree may come from other packs). The Base test checks that every kind of the Base files exists in the Base manifest tree.
- **Interim until IC05/IC06**: the item generator still takes a v1-shaped `WordList`. `WordListBusiness.itemWords()` builds it from the v2 file plus the pack's (and Base's) kind tree: `bases[slot or type]` = the nouns of every kind resolving to it, `descriptions[type]` = the descriptions along the chain of each kind of that type (roots included), adjectives/suffixes = untinted plus tinted, templates as given (Base fallback). Params and phrases are expanded with `expandPhrase` when the description is drawn, or simply passed through for now if that's simpler. This adapter is removed in IC06.
- `common.json` is now fetched and stored with the pack like the word lists (pack files), and `copyBase` / draft validation in the creator use the v2 validators. Old draft word lists in v1 fail validation (no migration).
- **Base content**: every current noun goes under a kind. Nouns with a sprite under that sprite's leaf; nouns without one get a new leaf in both Base manifests (`staff`, `mace`, `orb`, `grimoire`, `buckler`, `parrying-dagger`, `idol`, `lantern`, `scroll-case`, `elixir`, `brew`, `tonic`, `ration`, `ointment`, `hood`, `diadem`, `cap`, `tunic`, `robe`, `chainmail`, `doublet`, `gauntlets`, `bracers`, `mittens`, `greaves`, `hose`, `breeches`, `cuisses`, `sandals`, `sabatons`, `shoes`, `pendant`, `necklace-chain`, `torc`, `signet-ring`, `ear-pendant`… names as green sees fit, English kebab-case). Today's per-type descriptions move to the roots, a few kind-specific ones are added (potions, weapons, keys). Tinted words: at least rouillé/rusty → `rust`, argenté/silvered → `silver`, des braises/of embers → `fire`, des marées/of tides → `ice`, céleste/celestial → `arcane`, fantôme/ghostly → `shadow`. `common.json` FR and EN with `maker`, `owner`, `place`, `event`, `material`, `creature`, `effect` (5+ entries each), used in some descriptions.

## Baseline

Test Files 251 passed, Tests 2294 passed (after `8bffe48`).

## Seams

1. **`validateItemWordList` / `validateCommonTexts` (pure), including the real `public/packs/base-*/generators/{items,common}.json`**: shape, unknown fields, phrase syntax, `{base}` in templates/names, warnings for undefined params and suffix-less templates; Base files valid, every Base kind in the Base tree, every params name listed. Misses loading.
2. **`WordListBusiness.itemWords()` with a faked `PackService`** (as the pack specs do): the interim v1-shaped list from a v2 file (nouns grouped by resolved slot/type, root descriptions per type), and `generateItem` with the real Base FR gives a weapon1 name built on a weapon noun. Misses the UI.

## Red

- Test files: `src/app/core/generators/word-list.spec.ts` (rewritten for v2), `src/app/core/generators/common-texts.spec.ts` (new), `src/app/core/business/word-list.business.spec.ts` (rewritten for v2)
- Run: `npx ng test --watch=false --include src/app/core/generators/word-list.spec.ts` (same for `src/app/core/generators/common-texts.spec.ts` and `src/app/core/business/word-list.business.spec.ts`)
- Failing: 44 test definitions (23 + 11 + 10, `it.each` expands to more), none can run yet. Each file fails to compile or bundle on the missing symbols and files:
  - `word-list.spec.ts` — no `validateItemWordList` export in `./word-list`; no `public/packs/base-{en,fr}/generators/common.json`. All tests of the file: v2 shape and `WORD_LIST_VERSION` 2, unknown fields, rarity keys, nouns and adjectives paths, phrase syntax paths, `{base}` in templates and `names`, suffix-less template warning, undefined-param warnings (2nd arg `params?: readonly string[]` lists the params known elsewhere, e.g. from `common.json`), Base files valid with no warning, Base kinds in the Base manifest tree, new kinds have nouns, roots have descriptions, tints rust/silver/fire/ice/arcane/shadow, templates for every rarity.
  - `common-texts.spec.ts` — no `./common-texts` module (`validateCommonTexts`, `COMMON_TEXTS_VERSION` = 1); no `common.json` files. All tests of the file: params shape, version, unknown fields, param names, entries, phrase syntax, undefined-param warning, Base `common.json` has maker/owner/place/event/material/creature/effect with 5+ entries, Base manifests declare `"common": "generators/common.json"`.
  - `word-list.business.spec.ts` — no `common.json` files to import. All tests of the file: v2 to v1-shaped adapter (nouns grouped by slot/type, descriptions per type along kind chains, merged tinted and untinted adjectives/suffixes, templates), `generateItem` on real Base FR gives a weapon1 name starting with one of the seven current weapon nouns, plus the cache/fallback/retry tests moved to v2 (the invalid fixture is `{ version: 1 }`).
- Conventions the tests fix: validator result `{ ok: true, value, warnings } | { ok: false, errors }`; the first error for a non-object is `'the file is not a JSON object'`, a wrong version gives `'version must be 2'` (items) or `'version must be 1'` (common); other errors only need to contain their dotted path (`kinds.sword.nouns[0]`, `tints.fire.descriptions[0]`, `templates.common`…); warnings contain the param name or the `templates.<rarity>` path. A file with only `{ version }` is invalid ("gives nothing").

## Green

- Files: `src/app/core/generators/{language-file,common-texts,word-list,item-words-adapter}.ts`, `src/app/core/business/{word-list,pack,pack-creator}.business.ts`, `src/app/core/packs/{pack-files,pack-draft}.ts`, `public/packs/base-{fr,en}/{pack.json,generators/items.json,generators/common.json}`, `src/testing/{base-words,extra-pack}.ts`, plus migrated specs (item-generator, name-generator, item-card, world-draft.rules, the item-editor specs, item-editor-save, item-generator.business, sandbox-character, combat-sandbox page, world-library, pack-unofficial line 103).
- Change: generic `checkLanguageFile` (version, sections, unknown fields, phrase check) behind `validateItemWordList(json, params?)` and `validateCommonTexts`; the v1 `WordList` stays as the interim generator shape, built by `toWordList` (item-words-adapter) from the v2 file and the kind tree (`PackBusiness.itemKinds`, `commonTexts` added; descriptions/suffixes expanded 6 times with a fixed seed). `common.json` is stored with official/unofficial packs, checked in prepare and the creator (`draft.common`, `copyBaseCommon`). Base FR/EN rewritten per kind, 37 new kinds added identically to both manifests, `common` declared, 6+ tints used. Fakes of `PackBusiness` in specs now use `baseWordSources()`; `EXTRA_ITEMS` is v2.
- Suite: 251/252 files, 2331/2332 tests (baseline 251 files / 2294 tests all green). `tsc -p tsconfig.spec.json` clean, `ng build` OK. The 3 red files are unchanged.
- Open questions: `word-list.spec.ts` "rejects a v1 file" cannot pass: it builds `{ version: 1, ...valid() }` and `valid()` sets `version: 2` after the spread, so the input is a valid v2 file and the test expects `version must be 2`. It needs `{ ...valid(), version: 1 }`. Left unchanged as instructed.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - Full suite is 252 files / 2332 tests green, but vitest reports 4 unhandled errors (pack-draft-page.lifecycle.spec.ts:58 "expected '' to be 'Edited'", two IDB AbortErrors in pack-update-atomic.business.spec.ts). Check they predate this change (draft now carries `common`).
  - public/packs/base-fr/generators/items.json: plural nouns (Gants, Gantelets, Brassards, Jambières, Chausses, Braies, Bottes, Sandales, Chaussures, Mitaines...) are paired with singular adjectives ("Bottes usée", "Gants affûté"). Carried over from v1, but the rewrite could add a plural gender or avoid it (IC05).
  - Base FR/EN descriptions: `key` ("Elle ouvre...") and `potion` descriptions leak to every item/consumable type through the interim adapter (a compass or ration gets them); `shield` ("Les marques de coups...") reaches orb and grimoire, and every equipment piece. The kind-level descriptions are only safe once IC05/IC06 draw by kind. Move the gendered "Elle" lines to neutral wording or accept until IC06.
  - FR `weapon`: "Le fil garde la trace de {material}" is odd for bows and staffs; "Main-gauche" feminine is debatable (le main-gauche).
  - public/packs/base-fr/generators/items.json: potion/elixir/tonic `names` repeat the same three "{base} de {effect}" lines, and the three rarities are identical; fine but could be one shared template.
  - word-list.ts: `tints` keyed with `KIND_ID` regexp, a tint id rule deserves its own named constant.
  - Interim adapter expands phrases with a fixed seed (6 draws), so params/variants are frozen per load; fine as documented, removed in IC06.
- Spec: all items covered (v2 validator, common validator, generic language-file validator, warnings, Base rewrite with 37 kinds, tints rust/silver/fire/ice/arcane/shadow, params with 5+ entries, common stored with packs). No secrets. FR grammar sampled: agreement forms, suffix contractions (du, de l', des) and params ("de {place}" with "la côte gelée", "Valombre") read correctly.

## Answer

- v2 validators on a generic `checkLanguageFile`: `validateItemWordList(json, params?)` (kinds, tints, untinted adjectives/suffixes, templates; `{base}` required; warnings for undefined params and suffix-less templates) and `validateCommonTexts` (params). Interim `toWordList` adapter feeds today's generator from the v2 file and kind tree (removed in IC06).
- `common.json` is stored with official and unofficial packs and checked in the creator. Base FR and EN rewritten per kind, with 37 new kinds in both manifests, tinted words (rust, silver, fire, ice, arcane, shadow, steel, gold), and a `common.json` with 7 params of 5+ entries.
- Orchestrator: fixed one red test whose spread overwrote the version.
- Checked: suite 252 files / 2332 tests pass (baseline 251 / 2294). Build OK. The 4 unhandled vitest errors (draft lifecycle, IDB AbortErrors) predate IC01.
- Left, carried to IC06: plural agreement in FR, kind descriptions leaking to the whole type through the adapter.
