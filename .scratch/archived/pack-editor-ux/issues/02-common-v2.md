# Common word list v2: shared kinds

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Common v2: shared kinds)

Decided by the user on 2026-11-17: common v2 adds **shared kinds**, a kinds tree that every generator's names and descriptions can draw from (e.g. `material` → `metal` → `iron`, `steel`; `wood` → `oak`). The editor UI is PE06; this ticket covers the format, validation and the generators.

## Format (assumed, like domain kinds and tints)

- **Tree in the manifest**: `pack.json` gets `sharedKinds: { <id>: { parent? } }`, validated with the kind tree rules (`pack-kinds.ts`). Neutral packs may declare it (the tree has no words); a `parent` from another pack is allowed, as for domain kinds.
- **Words in `common.json` v2**: `{ version: 2, params?, kinds?: { <id>: { words?: Phrase[], adjectives?: Adjective[], descriptions?: string[] } } }`. Words and adjectives carry gender/plural like item nouns and adjectives. A kind's texts add up along its chain. A text for a kind the active packs don't declare is a warning.
- **Fits**: a domain kind (items, NPCs, skills, classes) may list `shared: [<shared kind ids>]`; the list is inherited down the domain chain. No list: the domain kind takes no shared kind.
- **Use in phrases**: `{<shared root id>}` (e.g. `{material}`) in a name template, a description or a param inserts a word of the shared kind drawn for this entry; `{<root>:adjective}` inserts its adjective, agreed with the noun.

## Behaviour

- When a generator draws a domain kind with `shared` fits, it draws one shared kind (a leaf under the fitting ids, pooled from the active packs) per root and keeps it for the whole entry, so the name and the description agree ("Iron axe" / "forged in iron").
- A phrase that uses a root the entry didn't draw is skipped when a choice exists, else the placeholder is dropped with its surrounding spaces (assumed, like `{adjective}` today).
- The generated item / NPC / skill / class keeps its drawn shared kinds (like an item keeps its kind and tints), so a re-roll of the description stays coherent.
- Pooled across active packs like the other vocabularies (`pooled-domain.ts`).

## No backward compatibility

`common.json` v1 is rejected. Base FR/EN are rewritten in v2 with a starter `material` tree (metal, wood, leather, cloth, bone, stone), the Base item kinds get their `shared` fits, and a few Base templates/descriptions use `{material}`. User docs (`user-docs/`, pack format pages) describe shared kinds.

## Baseline

`npm test`: 303 test files, 2925 tests, all passed (2026-11-17, after PE01).

## Seams

- Pack validation (the exported manifest / `common.json` validators, `pack-kinds.ts` tree rules): catches `sharedKinds` tree rules (cross-pack parent allowed, neutral packs allowed), `common.json` v2 shape, v1 rejected, texts for undeclared shared kinds as warnings, domain kinds' `shared` fits referring to known shared kinds. Misses how generators use them.
- The generators (exported `generateItem` / NPC / skill / class generator functions with a seeded `RandomSource`, over pooled vocabularies from `pooled-domain.ts`): catches one shared kind drawn per root from the fitting leaves (inherited down the domain chain, none without fits), `{material}` / `{material:adjective}` in names, descriptions and params agreeing across one entry, unused-root phrases skipped or placeholder dropped, the drawn shared kinds kept on the generated entry. Misses the Base content.
- The Base FR/EN packs as loaded by the existing pack loading/validation path: catches that Base is valid v2 with the starter `material` tree, item kinds have `shared` fits and some templates use `{material}`. Misses the editor (PE06) and docs (review).

## Red

- Test files: `src/app/core/packs/pack.shared-kinds.spec.ts`, `src/app/core/generators/shared-kinds.generators.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/packs/pack.shared-kinds.spec.ts` and `npx ng test --watch=false --include src/app/core/generators/shared-kinds.generators.spec.ts`
- Failing: 29 tests (19 + 10), each failing on the missing behaviour:
  - `validatePack shared kinds` (4) — `sharedKinds` is not validated: cycles, a non-kebab parent or id, unknown fields and a non-object tree are accepted.
  - `validatePack shared fits of a domain kind` (2) — `shared` on a domain kind is not validated (no error for a non-list or a non-kebab id) and is not kept on the pack.
  - `validateCommonTexts v2` (5) — still version 1: v2 files are rejected, v1 is accepted, `kinds` is an unknown field, and there are no warnings for undeclared shared kinds.
  - `the base-fr / base-en pack, as shared kinds` (8) — Base has no `sharedKinds` tree, no item `shared` fits, and `common.json` is still v1.
  - `generateItem with shared kinds` (6) — no shared kind drawn or kept on the item, `{material}` and `{material:adjective}` not resolved from the shared tree, no skipping of undrawn roots, no cross-pack pooling.
  - `the other generators with shared kinds` (3: skill, class, NPC) — drafts have no `shared`, and the name and description do not agree on a drawn shared kind.
- Interface assumed by the tests (green may adjust, but then fix the tests):
  - `validateCommonTexts(json, declaredSharedKindIds?: string[])` gives the undeclared-kind warnings.
  - `PooledSource` gets `sharedKinds` (the manifest tree) and `sharedTexts` (the parsed `common.json` v2, `{ version: 2, kinds }`).
  - The generated item, NPC, skill and class carry `shared: Record<rootId, leafId>`, e.g. `{ material: 'iron' }`.
  - Domain kind schemas accept the `shared` field, inherited down the chain.
- Existing specs that use `common.json` v1 and will need green to update (not rewritten here): `src/app/core/generators/common-texts.spec.ts` (v1 version/`kinds` unknown-field tests; Base `params` check), `src/testing/base-vocabulary.ts` and `src/testing/base-*-vocabulary.ts` / `base-words.ts` (build `PooledSource` from `common.json`: they should pass `sharedKinds` and `sharedTexts` too), `src/app/core/business/pack-draft-form.business.spec.ts`, `src/app/core/business/pack-draft-form.domains.business.spec.ts`, `src/app/core/packs/pack-draft-edits.spec.ts`, `src/app/core/business/pack.kinds.business.spec.ts` and any spec with a `common` fixture of `version: 1`. Base's current `material` param clashes with the new `{material}` root; green should resolve it.

## Green

- Files: new `src/app/core/generators/shared-kinds.ts`; changed `common-texts.ts`, `phrase.ts`, `word-list.ts` (exports `noun`/`adjective`), `item|skill|class-generator.ts`, `npc-texts.ts`, the four `*-vocabulary.ts`, `pooled-domain.ts`, `pack.ts`, `pack-kinds.ts`, `pack-draft-edits.ts`, `pack.business.ts` and the four `*-vocabulary.business.ts`, the item/NPC/skill/class models (`shared?`), `npc-editor.rules.ts`, `src/testing/base-*vocabulary.ts`; Base FR/EN `pack.json`, `generators/common.json`, FR `items.json`, FR/EN `npcs.json`; user docs `packs.md` and `create-pack.md` (FR and `en/`).
- Change: `sharedKinds` tree in the manifest, `shared` fits on the four kind schemas (inherited by the pool), `common.json` v2 (`kinds` with words/adjectives/descriptions, undeclared-kind warnings). Generators draw one leaf per root and keep it as `shared`. The phrase engine handles `{root}` and `{root:adjective}`, and skips templates that use an undrawn root. Base gets the `material` tree (6 groups, 18 leaves), item `shared` fits, and the weapon description now uses `{material}` ("en fer"). The old Base `material` param is removed.
- Suite: 305 files, 2954 tests, all pass (baseline 303 / 2925, plus the two new red files). tsc and `ng build` are clean.
- Existing specs touched (fixtures or Base-content assertions): `common-texts.spec.ts` (v2; the old `kinds` unknown-field test now uses `colour`; Base test passes the declared shared ids; `material` dropped from the standard params), `word-list.spec.ts` (Base test passes the shared ids as defined names), `pack.kinds.spec.ts` (slot levels now `toMatchObject`, since they carry `shared`), `pack-draft-edits.spec.ts`, `item-vocabulary.business.spec.ts`, `pack-draft-form.business.spec.ts`, `params-editor.component.spec.ts` (v1 to v2 fixtures).
- Open questions: the Base NPC blacksmith description no longer uses `{material}`, to avoid changing the pinned NPC kinds. The pack-draft editor (PE06) does not yet edit `sharedKinds`, `shared` or `kinds` in common. Re-rolling a description in the draft form does not reuse the kept `shared`. Base name templates with `{material}` were left out because existing specs pin them. The `shared` field on a saved item/NPC/skill/class is not covered by world import/export checks.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `src/app/core/business/pack-draft-form.business.ts:258,419,480` and `src/app/core/packs/pack-files.ts:51` — `validateCommonTexts` is called without the declared shared ids, so the undeclared-kind warning and `{root}` as a defined name are not wired in the draft/import path. Wire it with PE06.
  - `src/app/modules/item/components/item-editor/item-editor.component.ts:52` and `item-editor.rules.ts:52` — the item editor draft (toDraft / itemToJson) drops `shared`, so an item saved through the editor loses it. Fix together with the re-roll follow-up.
  - `src/app/core/generators/item-generator.ts` — shared descriptions are pooled with tint lines, while NPC uses `descriptionPool`; `descriptionPool` could serve items too.

## Answer

- `pack.json` takes a `sharedKinds` tree (kind-tree rules, cross-pack parents and neutral packs allowed); domain kinds take `shared` fits, inherited down the chain. `common.json` is v2 (`kinds` with words, adjectives, descriptions); v1 is rejected. `validateCommonTexts(json, declaredSharedKinds?)` warns on texts for undeclared kinds.
- The generators draw one leaf per shared root from the pooled packs and keep it on the entry as `shared` (`{ material: 'iron' }`); `{root}` / `{root:adjective}` resolve in names, descriptions and params, and phrases using an undrawn root are skipped.
- Base FR/EN: starter `material` tree (metal, wood, leather, cloth, bone, stone, 18 leaves), item `shared` fits, material descriptions; the old `material` param is removed (it clashed with the root). User docs (packs, create-pack, FR and EN) describe shared kinds.
- Seven existing specs moved their `common` fixtures from v1 to v2 (reviewed: intent kept).
- Browser check (item editor, Random, FR) found "éclats de acier": the phrase engine has no elision, so the two FR lines with "de/du {material}" were rephrased to put the word after a colon. No console error.
- Suite 305 files / 2954 tests green (baseline 303 / 2925, plus the two new spec files); build clean; review ship.
- Left for later (review Consider): the draft/import path doesn't pass declared shared ids to `validateCommonTexts` yet (PE06); the item editor's draft drops `shared`, and re-rolling a description doesn't reuse it; world import doesn't validate `shared`; French elision before a shared word isn't supported by the phrase engine.
