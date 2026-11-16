# Item generator draws a kind; the item keeps its kind and tint

Status: resolved
Type: task
Blocked by: 05

Spec: `../spec.md` (Decisions 2, 8, 10, Assumed: draw weights, description pool, name templates, item stores kind and tints).

- `generateItem` takes the pooled vocabulary: type (weights or GM), slot (among slots with a drawable kind, or GM), kind, noun, adjective/suffix (tinted or not), name from the kind's `names` or the language templates, description from the nearest level's pool plus the drawn tint's.
- Phrases go through the phrase engine (params from the pool, agreement with the noun's gender).
- `ItemDraft` and `Item` get optional `kind` and `tints` (the adjective's tint, then the suffix's, when they have one). They are saved, exported and sent over the room like the other fields.
- The Pack select next to the seed goes away from the item editor and the Tools item generator page; `packFor` and the item part of `PackChoiceBusiness` go away. NPC, skill and class editors keep theirs.
- Same seed and same active packs → same item.

## Carried from IC03 review (2026-11-14)

- **Plural nouns**: Base FR has plural nouns (Gants, Bottes, Jambières…) that get singular adjectives ("Bottes usée"). A noun gets an optional `plural: true`; an adjective may give `mp` / `fp` forms, otherwise the plural is the singular form plus `s` (no `s` added after `s` or `x`); `{g:…}` accepts four options `{g:m|f|mp|fp}` as well as two. Update the Base FR nouns and the irregular adjectives.
- With the interim adapter gone, kind-level descriptions (`key`, `potion`, `shield`) must only reach their own kind chain; check the Base wording once the draw is by kind.

## Decisions (orchestrator, 2026-11-14)

- `generateItem(source, vocabulary: ItemVocabulary, options)` replaces the `WordList` version. Draw order: rarity, type (weights or GM), slot (equipment only: among slots that have a drawable kind, or GM), kind (uniform among `drawable({ type, slot })`), noun (nearest nouns), adjective and suffix per the template, name template (`names(kind, rarity)` else `templates(rarity)` else `{base}`), description (pool = nearest descriptions of the kind chain + `tintDescriptions` of the drawn tints; drawn until one expands, else empty), modifiers and price as today. A type or slot with no drawable kind falls back to any drawable kind of that type, then to any.
- Name and description go through `expandPhrase` with the pooled params, the noun's gender and plural, and `{base}` / `{adjective}` / `{suffix}` values; the name is capitalised as today.
- **Plural**: `Noun.plural?: boolean`; `Adjective` may be `{ m, f, mp?, fp? }`, plural default = singular + `s` unless it ends in `s` or `x`. `expandPhrase` context gets `plural?: boolean` and `{g:…}` accepts 2 or 4 options (`m|f|mp|fp`; with 2 options the plural uses the same rule as adjectives); `checkPhrase` accepts both arities. Base FR plural nouns get `plural: true`, irregular adjectives get `mp`/`fp`.
- `ItemDraft` and `Item` get optional `kind?: string` and `tints?: string[]`, carried by save, export/import, the room and the catalogue like the other fields.
- Callers (`item-generator.business`, item catalogue, sandbox catalogue/character, starter items in world library, item editor) use `ItemVocabularyBusiness.vocabulary()`. The interim `item-words-adapter.ts`, the v1 `WordList` type for items, `WordListBusiness.itemWords` and the items part of `PackChoiceBusiness` / `packFor` go away. The Pack select disappears from the item editor and the Tools item generator page; NPC, skill and class editors keep theirs.
- Base wording: check that kind-level descriptions read right for every kind under them now that they only reach their own chain.

## Baseline

Test Files 258 passed, Tests 2383 passed (after `2768268`).

## Seams

1. **`generateItem` (pure, seeded, with `buildItemVocabulary` on fixtures and on the real Base FR/EN)**: kind consistent with type/slot, name built on a noun of that kind, kind `names` first, description from the chain or the tint, `kind` and `tints` on the draft, plural agreement ("Bottes usées"), GM-fixed type/slot, fallbacks, determinism. Also `expandPhrase`/`checkPhrase` with `plural` and 4-option `{g:…}`.
2. **Item editor (component inputs/outputs with `TEST_PROVIDERS`, as `item-editor.*.spec.ts` do) and `ItemEditorBusiness` save**: no Pack select; Generate fills the form from the pooled vocabulary; the saved item keeps `kind` and `tints`. Misses the image (IC07).
3. **Tools item generator page / `item-generator.business`**: no Pack select, generated items carry `kind` and `tints`.

## Red

- Test files: `src/app/core/generators/item-generator.spec.ts` (rewritten on `ItemVocabulary`), `src/app/core/generators/phrase.spec.ts` (plural block appended), `src/app/modules/item/components/item-editor/item-editor.vocabulary.spec.ts`, `src/app/modules/item/business/item-kind-save.spec.ts`, `src/app/modules/tools/business/item-generator.kinds.spec.ts`, `src/app/modules/tools/pages/item-generator-page/item-generator-page.kinds.spec.ts`; helper `src/testing/base-vocabulary.ts` (`baseItemVocabulary(lang)`). Deleted the obsolete `item-editor.pack.spec.ts` and `item-generator-page.pack.spec.ts`.
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above.
- Failing (all but the last file fail at compile, on the missing `kind` / `tints` fields, `plural` in `PhraseContext`, the new `generateItem` signature; the tests fail once those exist only if the behaviour is missing):
  - item-generator.spec.ts (fixture + Base fr/en + fr wording, ~30 tests) — `generateItem` takes `WordList`, `ItemDraft.kind` / `tints` missing: kind coherent with type/slot, slot among drawable slots, fixed type/slot, slot and type fallbacks, kind `names` first, language templates, `{base}` only, tints adjective-then-suffix, description from nearest chain level + tint, params and gender in descriptions, no kind description leaking to another kind, empty description, plural agreement (Bottes ardentes, Gants usés, irregular mp/fp, "gris"), modifiers, price, determinism.
  - phrase.spec.ts "plural agreement" (3) — `plural` not in `PhraseContext`; 4-option `{g:…}` rejected by `checkPhrase`.
  - item-editor.vocabulary.spec.ts (3) — no Pack select; Generate from pooled vocabulary keeps `kind` / `tints` on save; edited item keeps `kind` / `tints` (`Item.kind` missing).
  - item-kind-save.spec.ts (1) — `ItemInput` has no `kind` / `tints`.
  - item-generator.kinds.spec.ts (3) — `$pack` / `$packOptions` / `packFor` still exist; generated items have no `kind` / `tints`.
  - item-generator-page.kinds.spec.ts (1) — `[data-field="pack"]` select still rendered (runtime assertion failure).
- Note: existing specs that mock `PackBusiness` with `baseWordSources` / `baseWordList` (item-editor.component.spec, item-generator.business.spec, item-editor-save.spec, others) were left as they are; green must move them to `ItemVocabularyBusiness` when the adapter goes.

## Green

- Files: `src/app/core/generators/{item-generator,phrase,word-list,name-generator}.ts`, `src/app/core/models/item.ts`, `src/app/core/business/word-list.business.ts`, item-generator / item-catalogue / item-editor / sandbox-catalogue / sandbox-character / world-library businesses, `starter-items.ts`, `item-editor.component.ts`, `item-editor.rules.ts`, `item-generator-page.component.ts`, `public/i18n/{en,fr}.json`, `public/packs/base-{fr,en}/generators/items.json`; removed `item-words-adapter.ts`, `word-list.business.spec.ts`, `name-generator.spec.ts`; new `item-generator.names.spec.ts`; migrated 13 existing specs (PackBusiness word-list fakes replaced by an `ItemVocabularyBusiness` fake on `baseItemVocabulary`).
- Change: `generateItem(source, vocabulary, options)` draws type, slot among drawable slots, kind, noun, adjective/suffix, name (kind names, language templates, `{base}`) and description (kind chain + tint) through `expandPhrase`, keeping `kind` and `tints`. Phrase engine takes `plural` and 4-option `{g:…}`; nouns get `plural`, adjectives `mp`/`fp`. All item callers use `ItemVocabularyBusiness.vocabulary()`; Pack select, `packFor`, `$pack*`, the v1 `WordList` for items and `WordListBusiness.itemWords` are gone; the editor JSON/draft round-trips `kind` and `tints`. Base FR/EN: plural nouns flagged, irregular adjectives (`de maître`, `en écailles de wyrm`) invariant in the plural, and the weapon and shield descriptions reworded with `{g:…}` (and a fix for "de le cuir").
- Suite: 259 files / 2397 tests pass (baseline 258 / 2383); tsc spec clean; `ng build` OK. Unstaged `git diff --name-only` lists only the non-red specs migrated to `ItemVocabularyBusiness` (no red test file changed). The two red specs still import `baseWordSources` from `src/testing/base-words.ts`, so I kept it (adapter-based `baseWordList` removed).
- Open questions: `PackChoiceBusiness` stays generic over `PackGenerator` (still accepts `'items'`; its spec uses it) since NPC/skill/class use it. The editor no longer passes a pack to `RandomItemImageBusiness.create` (image side is IC07).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - Base FR wording (20+ samples): agreement is right (Chausses rouillées, Chevalière trempée, Capuche affûtée, "Elle a survécu…" for a sword, "l'arme" for an axe). Coherence gaps: tints/adjectives that do not fit the kind ("Parchemin rouillé", "Diadème affûté", "Capuche affûtée", "Onguent renforcé"), and tint descriptions are rarely picked ("Gants ardents" got the generic "On oublie vite son poids"; fire/ice/rust items mostly keep generic text). Candidates: restrict the adjective pool per kind, or weight tint descriptions first. Content question for the roadmap, not a spec gap.
  - Generic descriptions ("On oublie vite son poids", "Pour une longue route…") recur across kinds; widen the pool in a later pass.
  - `npm test` passes 259/2397 but vitest reports 4 unhandled rejections from `pack-draft-page.lifecycle.spec.ts` ("expected '' to be 'Edited'"), outside this diff; check whether pre-existing.
  - `src/testing/base-words.ts` / `baseWordSources` is still used by two red specs that also provide a now-unneeded PackBusiness word source; tidy later.
  - `item-generator.ts` `drawKind`: `vocabulary.kind(id)!` non-null assertions; `world-library.business.ts` keeps the field name `wordLists` for a vocabulary business (mysterious name).

## Answer

- `generateItem(source, vocabulary, options)` draws type, slot (among slots with a drawable kind), kind (with fallbacks), noun, adjective/suffix, name (kind `names`, else templates, else `{base}`), description (kind chain + drawn tints, through the phrase engine with params). The draft keeps `kind` and `tints`; they are saved, validated on JSON import and carried like the other fields.
- Plural: `Noun.plural`, adjectives `mp`/`fp` (default singular + `s` unless `s`/`x`), `{g:m|f|mp|fp}` and `plural` in the phrase engine. Base FR/EN plural nouns marked, weapon and shield descriptions reworded with `{g:…}`.
- All item callers use `ItemVocabularyBusiness`; the interim adapter, v1 item `WordList`, `itemWords`, `generateItemName`, `packFor` and the item Pack select are gone.
- Orchestrator: moved the "label half torn" description from the `consumable` root to `potion` (a Ration got it in the browser).
- Checked: suite 259 files / 2397 tests pass (baseline 258 / 2383). Build OK. Browser (FR): Tools item editor has no Pack select, Generate gives "Ration" with a coherent description after the fix, no console error. Review sample of 24 FR items: agreement right, kind descriptions stay in their chain.
- Left (content, follow-up): untinted adjectives don't fit every kind ("Parchemin rouillé", "Diadème affûté", "Onguent renforcé"); tint descriptions rarely picked. `src/testing/base-words.ts` still used by two specs.
