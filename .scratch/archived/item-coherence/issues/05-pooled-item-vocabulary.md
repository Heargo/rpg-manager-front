# Item vocabulary pooled from the active packs

Status: resolved
Type: task
Blocked by: 01, 03, 04

Spec: `../spec.md` (Decisions 7, 13, Assumed: kind and tint conflicts, which kinds can be drawn).

A business that gives one merged item vocabulary for the world (replaces the one-pack `itemWords`).

The pooling is generic: a pooled kind tree per domain (inheritance, conflicts, lookups up the chain), pooled tints and pooled params are written once and parameterised by the domain schema of 01 / 03; items is the first domain to use them. NPCs, skills and classes will reuse them as is.


- Kinds and tints from every active pack (any language, neutral included); texts (kinds' nouns/descriptions/names, tints' words, adjectives, suffixes, params, templates) only from active packs in the world's language.
- Kind tree resolved across packs: `type`/`slot` inherited; conflicts settled Base first, then the world's pack order, and reported (a list the Packs/rules pages can show as a warning); kinds not reaching a typed root are dropped; cycles across packs broken and reported.
- Tints: every gradient of a tint id kept as variants.
- Lookups the generator and the image need: the chain of a kind, its nearest nouns/descriptions/names, the drawable kinds per type and slot, the kind for a noun (singular match, for hand-typed names).
- No world: the app language and its Base. A language with no active text pack falls back to the Base of that language.
- Cached per (active packs, language), invalidated when the world's packs or language change.

## Decisions (orchestrator, 2026-11-14)

- **Generic pure core** in `src/app/core/packs/pooled-domain.ts`: `poolDomain(sources, schema)` where each source is `{ packId, isBase, language?, kinds?, texts? }` in the world's pack order, already filtered to the world language for `texts`. It returns the merged tree (each kind with its resolved fields and its chain from itself to the root), the merged texts per kind (lists concatenated across packs), the top-level sections concatenated, and `conflicts: string[]` (kind declared differently; cycle across packs; kind not reaching a typed root). Rules: Base sources win a conflict, then pack order; identical declarations merge silently; dropped kinds disappear with their descendants. Tints and params pool with the same helper or a sibling one (`poolTints`: every gradient of an id kept, in order; `poolParams`: lists concatenated).
- **Items view** in `src/app/core/generators/item-vocabulary.ts` (pure): `ItemVocabulary` built from the pooled domain, with:
  - `kind(id)` → `{ id, type, slot, chain }` or `undefined`;
  - `nouns(id)`, `descriptions(id)`, `names(id, rarity)`: the nearest level of the chain that has some;
  - `drawable({ type?, slot? })`: kinds whose chain gives a noun (in the world language), filtered by type / slot;
  - `kindForName(name)`: the kind owning a noun whose text equals a word group of the name, accents and case ignored, trailing `s`/`x` dropped on both sides; the longest noun wins ("Cotte de mailles" before "Cotte");
  - `adjectives(rarity)` / `suffixes(rarity)`: untinted and tinted together, each as `{ value, tint? }`;
  - `tintDescriptions(tint)`, `gradients(tint)`, `tints()`;
  - `params`, `templates(rarity)` (pooled; Base of the language when none), `conflicts`.
- **Business**: `ItemVocabularyBusiness.vocabulary(): Promise<ItemVocabulary>` reads `ActivePacksBusiness` (packs + language; without a world: Base of the app language and the app language), loads manifests and texts through `PackBusiness`, caches per (packs, language). Texts only from packs whose `language` equals the world's; kinds, tints and sprites from all. A language with no active text pack falls back to the Base of that language for texts. Nothing switches to it yet (IC06/IC07).

## Baseline

Test Files 255 passed, Tests 2348 passed (after `2b8e1a5`).

## Seams

1. **`poolDomain` / `poolTints` / `poolParams` (pure, items schema)**: inheritance across packs, conflicts (Base wins, then order, identical merge), cycles across packs, kinds without typed root dropped with descendants, gradient variants, list concatenation. Misses loading.
2. **`ItemVocabulary` (pure, built from pooled fixtures and from the real Base FR)**: nearest nouns/descriptions/names, drawable by type/slot, `kindForName` (plural, accents, longest match), tinted adjectives/suffixes, templates. Misses loading.
3. **`ItemVocabularyBusiness` with a faked `PackService` and a world opened via `src/testing/active-packs.ts`**: FR world with `[base-fr, base-en, extra]` gets FR texts only but kinds/sprites/tints from all; a neutral pack adds kinds and tints; no world → Base of the app language; a language with no text pack → that language's Base; cache invalidated when packs or language change.

## Red

- Test files: `src/app/core/packs/pooled-domain.spec.ts`, `src/app/core/generators/item-vocabulary.spec.ts`, `src/app/core/business/item-vocabulary.business.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/packs/pooled-domain.spec.ts` (same with the two other paths)
- API the tests assume (green must provide it):
  - `pooled-domain.ts`: `PooledSource { packId, isBase, language?, kinds?, texts?, tints?, params? }`; `poolDomain(sources, ITEM_KIND_SCHEMA)` returns `{ kinds: Record<id, {type, slot, chain}>, texts: Record<kindId, merged KindTexts>, sections: Record<name, merged top-level section>, conflicts: string[] }`; `poolTints(sources)` returns `Record<id, GradientStop[][]>` (identical gradients deduplicated); `poolParams(sources)` returns `Record<name, string[]>`. A cycle across packs drops the kinds in it.
  - `item-vocabulary.ts`: `buildItemVocabulary(sources: PooledSource[])` returns the `ItemVocabulary` of the Decisions (`kind`, `nouns`, `descriptions`, `names`, `drawable` returning kind ids, `kindForName`, `adjectives`/`suffixes` as `{ value, tint? }`, `tints()`, `gradients`, `tintDescriptions`, `params`, `templates`, `conflicts`).
  - `item-vocabulary.business.ts`: `ItemVocabularyBusiness.vocabulary()`.
- Failing: all 35 tests (9 poolDomain, 2 poolTints, 1 poolParams, 16 ItemVocabulary, 7 business), each one fails to compile for now because the modules `pooled-domain`, `item-vocabulary` and `item-vocabulary.business` do not exist; no behaviour test can run until they do.

## Green

- Files: `src/app/core/packs/pooled-domain.ts`, `src/app/core/generators/item-vocabulary.ts`, `src/app/core/business/item-vocabulary.business.ts`
- Change: `pooled-domain.ts` is domain-agnostic (`poolDomain(sources, schema)` uses only `schema.fields` and `schema.check` for the root; `poolTints`, `poolParams`; deep merge concatenating lists). `item-vocabulary.ts` builds the `ItemVocabulary` view (item type/slot default, nearest nouns/descriptions/names, `kindForName` with accents/plural/longest match). `ItemVocabularyBusiness` reads `ActivePacksBusiness`, takes kinds/tints from all packs and texts/params only from packs in the world language, falls back to the Base of that language, and caches per (packs, language).
- Suite: 258 files / 2383 tests pass (baseline 255 / 2348 plus the 35 new); tsc clean; ng build clean; no test file in the unstaged diff.
- Open questions: none

## Answer

- Generic pooling in `core/packs/pooled-domain.ts` (`poolDomain(sources, schema)`, `poolTints`, `poolParams`), with no item specifics, ready for other domains. Conflicts: Base first, then pack order, identical merge; cycles and rootless kinds dropped and reported (tracked by id).
- Item view `core/generators/item-vocabulary.ts` (`buildItemVocabulary`): nearest nouns/descriptions/names along the chain, `drawable`, `kindForName` (accents, plurals, longest noun), tinted adjectives/suffixes, gradients, params, templates.
- `ItemVocabularyBusiness.vocabulary()`: kinds and tints from every active pack, texts and params only from packs in the world language (Base of that language as fallback), packs loaded in parallel, cached per (packs, language). Not used yet (IC06/IC07).
- Checked: suite 258 files / 2383 tests pass (baseline 255 / 2348). Build OK. No UI.
