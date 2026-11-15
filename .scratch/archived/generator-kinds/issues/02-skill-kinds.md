# Skill generator on kinds

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (Decisions 1–5, "Skills").

- Manifest: `domains.skills.kinds` with a `SKILL_KIND_SCHEMA` (`type` active|passive only and required on a root; `effect` damage|heal|modify only on an active chain).
- `generators/skills.json` version 2 (top-level `templates`, `adjectives`, `suffixes`; per kind `nouns`, `descriptions`, `adjectives`, `suffixes`, `names`), validated with readable errors; `isSkillWordList` goes away.
- `SkillVocabulary` pooled from the world's active packs, on the shared helper from 01.
- `generateSkill` draws a kind; type and (when set) effect come from it; name and description through `expandPhrase`. `Skill.kind?` kept on save, export and room.
- The Pack select goes away from the skill editor (and any Tools page that has one).
- Base FR and EN: the skill kinds of the spec, `skills.json` v2 with today's words sorted into kinds.
- Same seed and same active packs → same skill.

## Baseline

Test Files 273 passed, Tests 2587 passed (after `fcad97e`).

## Seams

1. **Pack validation and the skill word list (`validatePack` / `listChecker('skills')` / the v2 validator)**: `domains.skills.kinds` with `type`/`effect`, schema errors (root without type, type on a child, effect on a passive chain, unknown values or fields), readable errors on a bad `skills.json` v2; real Base FR/EN. Misses the draw.
2. **`buildSkillVocabulary` + `generateSkill` (pure, seeded, fixtures and real Base FR/EN, helper `baseSkillVocabulary(lang)`)**: kind drawn among drawable kinds, type and effect from the kind, nearest nouns/descriptions, adjectives and suffixes adding up, kind `names` first, phrases with params and gender, `kind` on the draft, determinism. Misses the UI.
3. **Skill editor (component with `TEST_PROVIDERS`) and its save**: no Pack select; Generate from the pooled vocabulary; the saved skill keeps `kind`.

Follow the names and patterns of GK01 (archived `01-npc-kinds.md`: `kind-lookups.ts`, `npc-word-list.ts`, `npc-vocabulary.ts`, `NpcVocabularyBusiness`).

## Red

- Test files: `src/app/core/packs/pack.skill-kinds.spec.ts`, `src/app/core/generators/skill-word-list.spec.ts`, `src/app/core/generators/skill-vocabulary.spec.ts`, `src/app/core/generators/skill-generator.kinds.spec.ts`, `src/app/modules/skill/components/skill-editor/skill-editor.vocabulary.spec.ts`, `src/app/modules/skill/business/skill-kind-save.spec.ts`; helper `src/testing/base-skill-vocabulary.ts` (`baseSkillVocabulary(lang)`, a separate file so `base-vocabulary.ts` and its specs keep compiling).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above.
- Names the tests assume (green must provide them):
  - `core/packs/pack-kinds.ts`: `SKILL_KIND_SCHEMA` (fields `type`, `effect`; `type` required on a root and forbidden on a child, one of `SKILL_TYPES`; `effect` one of damage|heal|modify, only on an active chain, root or child), registered for `skills` in `validatePack`.
  - `core/generators/skill-word-list.ts` (replaces `isSkillWordList` in `pack-word-lists.ts`): `SKILL_WORD_LIST_VERSION = 2`, `validateSkillWordList(json, params?)` returning `{ ok: true, value, warnings } | { ok: false, errors }` (value: `templates`, `adjectives`, `suffixes`, `kinds[id].{nouns,descriptions,adjectives,suffixes,names}`); `listChecker('skills')` uses it. `{noun}`, `{adjective}`, `{suffix}` are phrase values, never params.
  - `core/generators/skill-vocabulary.ts`: `buildSkillVocabulary(sources: PooledSource[]): SkillVocabulary` with `kind(id) -> { id, type, effect?, chain } | undefined` (type from the root, effect nearest wins, none on a passive chain; a root without type is dropped and reported in `conflicts`), `nouns(id)`, `descriptions(id)`, `names(id)` (nearest level), `adjectives(id)` and `suffixes(id)` (the language's top-level ones plus every level of the kind's chain, added up), `drawable()` (kinds with a typed root and a noun on their chain), `templates()`, `params`, `conflicts`.
  - `core/business/skill-vocabulary.business.ts`: `SkillVocabularyBusiness.vocabulary(): Promise<SkillVocabulary>`; `SkillEditorBusiness.random(world)` must use it (the spec mocks it and `PackBusiness` without `wordList`).
  - `core/generators/skill-generator.ts`: `generateSkill(source, attributes, vocabulary)` (third arg is now a `SkillVocabulary`, synchronous), result carries `kind`; type from the kind, effect from the kind or drawn among damage|heal|modify when the kind sets none; names from the kind `names` first, else the top-level `templates` (templates needing an unavailable noun/adjective/suffix skipped), adjective agreeing with the noun's gender; description from the nearest level through `expandPhrase` with params and the noun's gender. `Skill.kind?: string` and `SkillDraft` carry it (kept on save, export and room by spreading).
  - `public/packs/base-{fr,en}/pack.json`: `domains.skills.kinds` exactly the spec tree (`attack`{active,damage} → strike, shot, fire-spell, frost-spell, lightning-spell, shadow-spell; `healing`{active,heal} → prayer, remedy; `support`{active,modify} → blessing, curse, war-cry, song; `trait`{passive} → toughness, focus, agility, presence), identical in FR and EN; `generators/skills.json` version 2 (top-level `templates`, `adjectives` >5, `suffixes` >5, no top-level `nouns`/`descriptions`; a noun and a description for every leaf kind; texts only for declared kinds).
- Existing specs green must migrate: `skill-generator.spec.ts` (`generateSkill` takes a vocabulary; delete or rewrite on `baseSkillVocabulary`), `skill-editor.random.spec.ts` (mocks `PackBusiness.wordList` with the v1 `skills.json`), `pack.kinds.spec.ts` "rejects kinds on a domain that has none yet" (uses `skills`; pick `classes`) and "points the four domains" (`domains.skills` toEqual `{ texts }` now has `kinds`), `pack-choice.business.spec.ts` / `sandbox-world.packs.spec.ts` / `pack-choice-fixtures.ts` skill parts, `word-list*.spec.ts` or anything using `isSkillWordList` / the v1 `skills.json`, `class-generator.spec.ts` only if it loads `skills.json`.
- Failing: 6 files, all new tests (about 85):
  - pack.skill-kinds.spec.ts (14 failing of 18) — `skills.kinds` rejected as "no kinds yet": accept type/effect/override/foreign parent, reject root without type, type on a child, unknown type/effect, effect on a passive chain, unknown/item/NPC fields, cycle; real Base FR/EN lack the skill kinds.
  - skill-word-list.spec.ts — `./skill-word-list` does not exist (compile): v2 validator, readable errors, `listChecker('skills')`, real FR/EN `skills.json` v2.
  - skill-vocabulary.spec.ts — `./skill-vocabulary` does not exist (compile): type/effect inheritance, drawable, nearest texts, additive adjectives and suffixes, pooling across packs, real Base FR/EN.
  - skill-generator.kinds.spec.ts — `./skill-vocabulary` missing and `generateSkill` takes a word list (compile): kind drawn and kept, type and effect from the kind, kind names first, agreement, descriptions with params and gender, determinism, real Base FR/EN.
  - skill-editor.vocabulary.spec.ts — `SkillVocabularyBusiness` missing (compile): no Pack select, Random from the pooled vocabulary, `kind` kept on save.
  - skill-kind-save.spec.ts — `SkillDraft.kind` missing (compile): the catalogue save keeps `kind`.

## Green

- Files: `src/app/core/generators/skill-word-list.ts`, `skill-vocabulary.ts`, `skill-generator.ts`; `src/app/core/business/skill-vocabulary.business.ts`, `pack.business.ts`; `src/app/core/packs/pack-kinds.ts`, `pack.ts`, `pack-files.ts`; `src/app/modules/skill/business/skill-editor.business.ts`, `models/skill.ts`; removed `isSkillWordList` (`pack-word-lists.ts`) and `skillWords` (`word-list.business.ts`); `public/packs/base-{fr,en}/pack.json` and `generators/skills.json` (v2); migrated specs `skill-generator.spec.ts`, `skill-editor.random.spec.ts`, `pack.kinds.spec.ts`.
- Change: `SKILL_KIND_SCHEMA` registered for `skills`; v2 validator and `buildSkillVocabulary` on the shared pooled helpers; `generateSkill` draws a kind, takes type and effect from it, writes name and description through `expandPhrase`, and keeps `kind` (`Skill.kind?`). `SkillEditorBusiness.random` uses `SkillVocabularyBusiness` (resolved lazily through the injector, as before, so existing specs need no translate provider). Base FR/EN: the spec's skill tree and `skills.json` v2 with today's words sorted into kinds plus new nouns, adjectives, suffixes and descriptions per kind (French uses `{g:…}`, no param after "de/que/à"). The skill editor already had no Pack select.
- Suite: 279 files / 2677 tests pass (baseline 273 / 2587 plus the new specs); `tsc -p tsconfig.spec.json` clean; `ng build` clean; the only unstaged spec changes are the three migrated specs above.
- Open questions: none

## Review

- Verdict: fix first
- Must fix: `public/packs/base-fr/generators/skills.json:331` — "Personne n'en parle, tout le monde la redoute." is a shadow-spell description but every shadow-spell noun there is masculine (Siphon, Vortex, Tentacule, Voile), so it reads "Voile ténébreux ... la redoute" — use `{g:le|la}` (or the ticket's gender syntax), and grep the FR descriptions for other hard-coded le/la/il/elle.
- Consider: `src/app/modules/skill/business/skill-editor.business.ts:31` — the lazy `injector.get(SkillVocabularyBusiness)` breaks no rule in docs/rules.md (it is how this class already resolved `WordListBusiness`, unchanged), but it is a workaround: `NpcEditorBusiness` uses a plain `inject(NpcVocabularyBusiness)`. Prefer a plain `inject()` and give `skill-editor.business.spec.ts` the translate/HTTP providers (or mock `SkillVocabularyBusiness`) so the two editors match.
- Consider: Base skills.json (FR and EN) — the top-level adjectives and suffixes are added to every kind, so combos are nonsense: "Cataplasme écrasant"/"Crushing Poultice" (remedy), "Sérénité rusée", "Cunning Serenity", "Furious Heritage", "Piercing Ward of Spite", "Blessing ... of Spite", "Crushing Stoicism", "Eternal Gust of the Oath". Move aggressive adjectives and "dépit/Spite/fureur" suffixes from the top level to attack/shadow kinds, and give healing, blessing and trait kinds their own adjectives.
- Consider: FR "Tentacule" is marked `m`; the usual gender is feminine.
- Consider: Prettier fails on `pack-files.ts`, `skill-editor.random.spec.ts`, `src/testing/base-skill-vocabulary.ts`.
- Consider: `skill-vocabulary.ts:48` — `info()` casts `kind['type'] as SkillType` for a root without a type; safe only because `drawable` filters, so state the invariant.
- Sampled 90 skills (45 per language, seeded); no elision errors, adjective agreement correct, no sampling file left behind.

## Answer

- Skill kinds in the manifest (`SKILL_KIND_SCHEMA`: `type` on roots, `effect` on active chains), `skills.json` v2, pooled `SkillVocabularyBusiness`, `generateSkill` on kinds (type and effect from the kind, name and description through the phrase engine), `Skill.kind` kept. `isSkillWordList` and `WordListBusiness.skillWords` removed. The skill editor had no Pack select already.
- Base FR/EN: the 16 kinds of the spec; review fixes applied (gender agreement in FR descriptions, neutral top-level adjectives/suffixes with the aggressive ones moved to attack/curse, own words for support and trait, plain `inject()` in `SkillEditorBusiness`).
- Checked: suite 279 files / 2677 tests, `ng build` clean; browser Tools skill catalogue, Random in FR and EN, no console error.
