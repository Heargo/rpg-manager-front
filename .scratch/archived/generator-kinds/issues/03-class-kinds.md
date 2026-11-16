# Class generator on kinds

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Decisions 1–5, "Classes").

- Manifest: `domains.classes.kinds` with a `CLASS_KIND_SCHEMA` (`skills?`: list of kebab-case skill kind ids).
- `generators/classes.json` version 2 (same sections as skills), validated with readable errors; `isClassWordList` and `pack-word-lists.ts` go away.
- `ClassVocabulary` pooled from the world's active packs.
- `generateClass` draws a kind; the tree prefers the world skills whose kind chain (through the skill vocabulary) contains one of the class kind's `skills`, topped up with others when fewer than 3. `CharacterClass.kind?` kept on save, export and room.
- The Pack select goes away from the class editor; `PackChoiceBusiness` and `pack-choice.ts` go away if nothing uses them any more.
- Base FR and EN: the class kinds of the spec, `classes.json` v2.
- Same seed, same active packs and same world skills → same class.

## Baseline

Test Files 279 passed, Tests 2677 passed (after GK02).

## Seams

1. **Pack validation and the class word list (`validatePack` / `listChecker('classes')` / the v2 validator)**: `domains.classes.kinds` with `skills` (list of kebab-case ids), errors on bad values and unknown fields, readable errors on a bad `classes.json` v2; real Base FR/EN.
2. **`buildClassVocabulary` + `generateClass` (pure, seeded, fixtures and real Base FR/EN, helper `baseClassVocabulary(lang)`, with `baseSkillVocabulary` for the skill chains)**: kind drawn among drawable kinds, name/description from the kind through phrases, tree from world skills whose kind chain contains a favoured skill kind, topped up when fewer than 3, `kind` on the draft, determinism.
3. **Class editor (component with `TEST_PROVIDERS`) and its save**: no Pack select; Generate from the pooled vocabularies; the saved class keeps `kind`. `PackChoiceBusiness` / `pack-choice.ts` removed when unused.

Follow GK01/GK02 (archived) names and patterns.

## Red

- Test files: `src/app/core/packs/pack.class-kinds.spec.ts`, `src/app/core/generators/class-word-list.spec.ts`, `src/app/core/generators/class-vocabulary.spec.ts`, `src/app/core/generators/class-generator.kinds.spec.ts`, `src/app/modules/class/components/class-editor/class-editor.vocabulary.spec.ts`, `src/app/modules/class/business/class-kind-save.spec.ts`; helper `src/testing/base-class-vocabulary.ts` (`baseClassVocabulary(lang)`, a separate file; the generator spec also uses `baseSkillVocabulary`).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above.
- Names the tests assume (green must provide them):
  - `core/packs/pack-kinds.ts`: `CLASS_KIND_SCHEMA` (fields `skills` only; `skills` a list of kebab-case strings, allowed on any level, never required, nearest wins), registered for `classes` in `validatePack`.
  - `core/generators/class-word-list.ts` (replaces `isClassWordList` in `pack-word-lists.ts`, which goes away with the file if empty): `CLASS_WORD_LIST_VERSION = 2`, `validateClassWordList(json, params?)` returning `{ ok: true, value, warnings } | { ok: false, errors }` (same sections as skills: top-level `templates`, `adjectives`, `suffixes`; `kinds[id].{nouns,descriptions,adjectives,suffixes,names}`; a top-level `nouns`/`descriptions` is an unknown field); `listChecker('classes')` uses it.
  - `core/generators/class-vocabulary.ts`: `buildClassVocabulary(sources: PooledSource[]): ClassVocabulary` with `kind(id) -> { id, skills: string[], chain } | undefined` (`skills` from the nearest level that has some, `[]` when none), `nouns(id)`, `descriptions(id)`, `names(id)` (nearest level), `adjectives(id)` and `suffixes(id)` (language top-level plus every level of the chain), `drawable()` (kinds with a noun on their chain), `templates()`, `params`, `conflicts`.
  - `core/business/class-vocabulary.business.ts`: `ClassVocabularyBusiness.vocabulary(): Promise<ClassVocabulary>`; `ClassEditorBusiness.random(world)` uses it plus the existing `SkillVocabularyBusiness` (the editor spec mocks both and `PackBusiness` without `wordList`).
  - `core/generators/class-generator.ts`: `generateClass(source, attributes, skills, vocabulary: ClassVocabulary, skillVocabulary: SkillVocabulary)` (synchronous; result carries `kind`). Tree: world skills whose `skill.kind` has, in `skillVocabulary.kind(kind).chain`, one of the class kind's `skills` are "preferred"; with 3 or more preferred the tree takes only preferred ones (size 3..5 as today); with fewer than 3 all preferred are kept and the tree is topped up with other skills to at least 3 (when the world has enough); skills without `kind` or of an unknown kind are never preferred. `CharacterClass.kind?: string` (and so `ClassDraft`), kept on save by spreading, and written by `classToJson`/read back by the editor.
  - `public/packs/base-{fr,en}/pack.json`: `domains.classes.kinds` exactly the spec tree, identical in FR and EN: `martial`{skills strike, shot, war-cry, toughness} → warrior, berserker, knight; `arcane`{fire-spell, frost-spell, lightning-spell, shadow-spell, focus} → mage, warlock, sorcerer; `divine`{healing, blessing, prayer} → cleric, paladin; `nature`{remedy, frost-spell, agility} → druid, ranger, shaman; `cunning`{shot, curse, agility, presence} → rogue, assassin, bard. `generators/classes.json` version 2 (top-level `templates`, `adjectives` >5, `suffixes` >5, no top-level `nouns`/`descriptions`; a noun and a description for each of the 14 leaf kinds; texts only for declared kinds; only the 14 leaves are drawable).
- Existing specs green must migrate:
  - `src/app/core/generators/class-generator.spec.ts` (v1 `ClassWordList` and `classes.json`; delete or rewrite on `baseClassVocabulary` + a skill vocabulary).
  - `src/app/modules/class/components/class-editor/class-editor.random.spec.ts` (mocks `PackBusiness.wordList` with the v1 `classes.json`; mock the two vocabulary businesses like `class-editor.vocabulary.spec.ts`).
  - `src/app/core/packs/pack.kinds.spec.ts`: "rejects kinds on a domain that has none yet" (uses `classes`; every domain has kinds now, delete it) and "points the four domains" (`domains.classes` toEqual `{ texts }` now has `kinds`).
  - `src/app/core/business/pack-creator.business.spec.ts` and anything else touching the v1 `classes.json` / `classWords` / `isClassWordList` (grep).
  - `PackChoiceBusiness` / `pack-choice.ts` have no user left once the class editor loses its select: delete `core/business/pack-choice.business.ts`, `pack-choice.business.spec.ts`, `core/packs/pack-choice.ts`, `pack-choice.spec.ts`; migrate `src/app/modules/world/business/sandbox-world.packs.spec.ts` (injects `PackChoiceBusiness.options('items')`; rewrite on `PackBusiness.packsFor('items')` or drop), `src/testing/pack-choice-fixtures.ts` and `item-generator-page.kinds.spec.ts` (imports it; check `packChoiceProviders` / `packOptionValues` still used, trim the pack-select helpers), and the `packs.choiceRandom` translation if unused.
- Failing: 6 files, all new tests (about 90):
  - pack.class-kinds.spec.ts (11 failing of 15) — `classes.kinds` rejected as "no kinds yet": accept skills on any level/override/foreign parent, reject non-list, bad ids, non-string, unknown/foreign fields, cycle; real Base FR/EN lack the class kinds.
  - class-word-list.spec.ts — `./class-word-list` does not exist (compile): v2 validator, readable errors, `listChecker('classes')`, real FR/EN `classes.json` v2.
  - class-vocabulary.spec.ts — `./class-vocabulary` does not exist (compile): favoured skills inheritance, drawable, nearest texts, additive adjectives/suffixes, pooling, real Base FR/EN.
  - class-generator.kinds.spec.ts — `generateClass` takes 4 arguments and `class-vocabulary` is missing (compile): kind drawn and kept, names/descriptions through phrases, preferred-skill tree and top-up, determinism, real Base FR/EN.
  - class-editor.vocabulary.spec.ts — `ClassVocabularyBusiness` / `class-vocabulary` missing (compile): no Pack select, Random from the pooled vocabularies, `kind` kept on save.
  - class-kind-save.spec.ts — `ClassDraft.kind` missing (compile): the catalogue save keeps `kind`.

## Green

- Files: `src/app/core/packs/pack-kinds.ts`, `pack.ts`, `pack-files.ts`; `src/app/core/generators/class-word-list.ts`, `class-vocabulary.ts`, `class-generator.ts`; `src/app/core/business/class-vocabulary.business.ts`, `pack.business.ts`; `src/app/modules/class/business/class-editor.business.ts`, `models/class.ts`; `src/app/modules/world/helpers/starter-classes.ts`; `public/packs/base-{fr,en}/pack.json` and `generators/classes.json` (v2); `public/i18n/{en,fr}.json` (`packs.choiceRandom` and `packs.choiceLabel` removed); removed `pack-word-lists.ts`, `word-list.business.ts`, `pack-choice*.ts` (business, helper and their specs); trimmed `src/testing/pack-choice-fixtures.ts` and `game-device.ts`; migrated specs `class-generator.spec.ts`, `class-editor.random.spec.ts`, `pack.kinds.spec.ts`, `sandbox-world.packs.spec.ts`.
- Change: `CLASS_KIND_SCHEMA` (skills, any level) registered in `validatePack`; v2 validator, `buildClassVocabulary` and `ClassVocabularyBusiness` mirror the skills ones; `generateClass` draws a kind, expands names/descriptions through phrases and builds the tree from the world skills whose kind chain holds a favoured skill kind (topped up under 3); `CharacterClass.kind` kept. Base FR/EN: 19 class kinds, `classes.json` v2 (14 leaves with nouns/descriptions, neutral top-level adjectives and suffixes, `{g:}` agreement in FR, no param after que/de/à). Starter skills got Base skill kinds and starter classes warrior/mage/rogue kinds.
- Suite: 283 files / 2750 tests passed (baseline 279 / 2677); `tsc -p tsconfig.spec.json` clean; `ng build` clean; no red test file modified.
- Open questions: none. Shadow Step and Arcane Ward (active buffs) were mapped to `agility` and `blessing` as the nearest favoured kinds for rogue and mage.

## Review

- Verdict: fix first
- Must fix:
  - src/app/modules/world/helpers/starter-classes.ts:440 — Shadow Step is an active skill (self, cost 3, cooldown 3, movement) but has kind `agility`, whose root `trait` is passive; the kind's type disagrees with the skill's. Poisoned Blade (line 421, damage) is `curse`, a `support` (modify) kind, an effect mismatch. Pick an active kind in the rogue's favoured set, or give the Base pack an active kind for evasion/stealth. Arcane Ward `blessing` (support, active, modify) is consistent. All other starter skills match type and effect.
  - public/packs/base-fr/generators/classes.json:190 and :290 — descriptions are gendered without `{g:}` although the same kinds have feminine nouns: warrior "S'est entraîné ... est parti" and mage "dangereux dans un coin". Generated "Mage silencieuse — Calme dans la crise, dangereux dans un coin" reads wrong. Convert to `{g:entraîné|entraînée}`, `{g:parti|partie}`, `{g:dangereux|dangereuse}`. Check the other descriptions of kinds that have feminine nouns for the same pattern (for example "A appris", "Se bat" are fine; look for participles and adjectives).
- Consider:
  - src/testing/pack-choice-fixtures.ts — file and `packChoiceProviders` keep the "pack-choice" name though PackChoiceBusiness is gone; rename to match what it provides.
  - Dangling check: no references remain to PackChoiceBusiness, pack-choice, pack-word-lists, isClassWordList, WordListBusiness, classWords, packs.choiceRandom or packs.choiceLabel in src, public or docs.
  - Sampling: 12 classes each from real Base FR and EN with the starter skills (temporary spec, deleted). Every tree contained only favoured-kind skills when 3 or more existed, and top-up behaves. EN wording is fine ("Ancient Ranger" is a little flat). Trees are repetitive with starter skills (rogue/ranger always Shadow Step, Nimble) because only 17 skills exist; not a defect.

## Answer

- Class kinds in the manifest (`CLASS_KIND_SCHEMA`: `skills`, favoured skill kinds), `classes.json` v2, pooled `ClassVocabularyBusiness`, `generateClass` on kinds: name and description through phrases, tree from the world skills whose kind chain holds a favoured skill kind (only those when there are 3 or more, topped up otherwise), `CharacterClass.kind` kept.
- Every generator is now pooled: `PackChoiceBusiness`, `pack-choice.ts`, `pack-word-lists.ts`, `WordListBusiness` and the `packs.choice*` keys are gone; the test fixture is now `src/testing/base-pack-fixtures.ts` (`baseAndExtraPackProviders`).
- Starter skills carry their Base skill kind (Poisoned Blade → strike; Shadow Step has none, no active Base kind fits), the starter classes warrior, mage and rogue.
- Review fixes: FR gender agreement in class descriptions.
- Checked: suite 283 files / 2750 tests, `ng build` clean; browser Tools classes, Random in FR, no console error.
