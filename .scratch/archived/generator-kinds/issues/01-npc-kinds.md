# NPC generator on kinds

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1–5, "NPCs", "Generic code first").

- Generic first: the domain-free parts of `item-vocabulary.ts` (nearest-level lookup, words that add up along the chain, drawable kinds) become a shared helper; `buildItemVocabulary` uses it with no behaviour change.
- Manifest: `domains.npcs.kinds` with an `NPC_KIND_SCHEMA` (`roles` required on a root, non-empty subset of `NPC_ROLES`, a child may override; `person` boolean on a root only).
- Language file `generators/npcs.json` version 2 (top-level `given`, `epithets`, `templates`; per kind `nouns`, `descriptions`, `adjectives`, `names`), validated with readable errors (`listChecker('npcs')`); phrases checked like items.
- `NpcVocabulary` pooled from the world's active packs (texts of the world language only) through a business like `ItemVocabularyBusiness`.
- `generateNpc` draws a kind, takes its roles, names a person (given name, epithet, kind noun matching the gender) or a creature (kind noun + adjective via the kind `names`), description through `expandPhrase` with params and gender. `Npc.kind?` kept on save, export and room.
- The Pack select goes away from the NPC editor; `NpcNamesBusiness` and `npc-name-list.ts` v1 go away.
- Base FR and EN: manifests declare the NPC kinds of the spec (identical), `npcs.json` v2 with the current names and epithets moved, kind nouns, descriptions with params.
- Same seed and same active packs → same NPC.

## Baseline

Test Files 270 passed, Tests 2507 passed (after `510e3c3`).

## Seams

1. **Pack validation and the NPC word list (`validatePack` / `listChecker('npcs')` / the v2 validator)**: `domains.npcs.kinds` accepted with `roles`/`person`, schema errors (root without roles, unknown role, `person` on a child, unknown field), readable errors on a bad `npcs.json` v2. Misses the draw.
2. **`buildNpcVocabulary` + `generateNpc` (pure, seeded, on fixtures and on the real Base FR/EN, like `baseItemVocabulary`)**: kind drawn among drawable kinds, roles from the kind, person vs creature naming, noun gender matching the given name, description from the nearest level with params and agreement, `kind` on the result, determinism. Existing `item-vocabulary` specs guard the shared helper (no behaviour change). Misses the UI.
3. **NPC editor (component inputs/outputs with `TEST_PROVIDERS`) and its business save**: no Pack select; Generate fills the form from the pooled NPC vocabulary; the saved NPC keeps `kind`. Misses the room transport (the field rides along like the others).

## Red

- Test files: `src/app/core/packs/pack.npc-kinds.spec.ts`, `src/app/core/generators/npc-word-list.spec.ts`, `src/app/core/generators/npc-vocabulary.spec.ts`, `src/app/modules/npc/helpers/npc-editor.kinds.spec.ts`, `src/app/modules/npc/components/npc-editor/npc-editor.vocabulary.spec.ts`, `src/app/modules/npc/business/npc-kind-save.spec.ts`; helper `src/testing/base-vocabulary.ts` (`baseNpcVocabulary(lang)` added). Deleted the obsolete `npc-editor.pack.spec.ts`.
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above.
- Names the tests assume (green must provide them):
  - `core/packs/pack-kinds.ts`: `NPC_KIND_SCHEMA` (fields `roles`, `person`), registered for `npcs` in `validatePack`.
  - `core/generators/npc-word-list.ts` (replaces `npc-name-list.ts`): `NPC_WORD_LIST_VERSION = 2`, `validateNpcWordList(json, params?)` returning `{ ok: true, value, warnings } | { ok: false, errors }` (value: `given`, `epithets`, `templates`, `kinds[id].{nouns,descriptions,adjectives,names}`); `listChecker('npcs')` uses it. `{given}`, `{epithet}`, `{noun}` are phrase values (like `{base}`), never params; `{adjective}` is also allowed in a creature's `names`.
  - `core/generators/npc-vocabulary.ts`: `buildNpcVocabulary(sources: PooledSource[]): NpcVocabulary` with `kind(id) -> { id, roles, person, chain } | undefined` (roles nearest wins, person from the root, default true), `nouns(id)`, `descriptions(id)`, `names(id)` (nearest level), `adjectives(id)` (added along the chain), `drawable()` (kind ids: persons always, creatures need a noun on their chain), `given()`, `epithets()`, `templates()`, `params`, `conflicts`. Domain-free helper shared with `item-vocabulary.ts`: free name/location (not tested directly, the item-vocabulary specs guard it).
  - `core/business/npc-vocabulary.business.ts`: `NpcVocabularyBusiness.vocabulary(): Promise<NpcVocabulary>`.
  - `modules/npc/helpers/npc-editor.rules.ts`: `generateNpc(world, random, vocabulary, classId?)` (synchronous), result carries `kind`; `NpcEditorBusiness.generate(seed, world, classId?)` without pack; `Npc.kind?: string` (and the draft).
  - `public/packs/base-{fr,en}/pack.json`: `domains.npcs.kinds` exactly the spec tree; `generators/npcs.json` version 2 (the 40 given names and the epithets moved; kind nouns and descriptions for every leaf kind; creature kinds with `names` using `{noun}` and `adjectives`).
- Existing specs green must migrate: `npc-editor.rules.spec.ts`, `npc-skills.rules.spec.ts` (`generateNpc` takes a vocabulary), `npc-editor.component.spec.ts` (mocks `PackBusiness.wordList` with v1 names), `pack.kinds.spec.ts` "rejects kinds on a domain that has none yet" (uses `npcs`, pick another domain until skills/classes get kinds) and "points the four domains" if affected, `npc-name-list.spec.ts` and `npc-name-generator.spec.ts` (delete with the code), `pack-choice*.spec.ts` NPC parts, other specs that load the v1 `npcs.json`.
- Failing: 6 files, all new tests (about 110):
  - pack.npc-kinds.spec.ts (14 failing of 19) — `npcs.kinds` rejected as "no kinds yet": accept roles/person/override/foreign parent, reject root without roles, empty/unknown/non-list roles, bad override, person on a child, non-boolean person, unknown/item fields, cycle; real Base FR/EN lack the NPC kinds.
  - npc-word-list.spec.ts — `./npc-word-list` does not exist (compile): v2 validator, readable errors, `listChecker('npcs')`, real FR/EN `npcs.json` v2.
  - npc-vocabulary.spec.ts — `./npc-vocabulary` does not exist (compile): roles/person inheritance, drawable, nearest texts, additive adjectives, pooling across packs, real Base FR/EN.
  - npc-editor.kinds.spec.ts — `buildNpcVocabulary` missing and `generateNpc` takes a name list (compile): kind drawn and kept, roles from the kind, person vs creature naming, gender-matching noun, descriptions with params and gender, determinism, real Base FR/EN.
  - npc-editor.vocabulary.spec.ts — `NpcVocabularyBusiness` missing (compile): no Pack select, Generate from the pooled vocabulary, `kind` kept on save.
  - npc-kind-save.spec.ts — `Npc.kind` missing (compile): the catalogue save keeps `kind`.

## Green

- Files: `src/app/core/generators/{kind-lookups,npc-word-list,npc-vocabulary}.ts` (new), `src/app/core/business/npc-vocabulary.business.ts` (new), `src/app/core/generators/{item-vocabulary,phrase,name-generator}.ts`, `src/app/core/packs/{pack,pack-kinds,pack-files}.ts`, `src/app/core/business/pack.business.ts` (`npcKinds`), `src/app/modules/npc/{models/npc.ts,helpers/npc-editor.rules.ts,business/npc-editor.business.ts,components/npc-editor/npc-editor.component.ts}`, `public/packs/base-{fr,en}/{pack.json,generators/npcs.json}`, `src/testing/extra-pack.ts` (EXTRA_NPCS v2); removed `npc-name-list.ts`, `npc-names.business.ts` and their specs; migrated specs `pack.kinds`, `npc-editor.rules`, `npc-skills.rules`, `npc-editor.component`.
- Change: `kind-lookups.ts` holds the domain-free nearest/along-chain/kind-ids lookups, now used by `buildItemVocabulary` and `buildNpcVocabulary`. `NPC_KIND_SCHEMA` registered for `npcs`, `npcs.json` v2 validator, pooled `NpcVocabularyBusiness`; `generateNpc` draws a kind, takes its roles, names a person (given name, epithet, gender-matching noun) or a creature (noun + adjective), description via `expandPhrase`; Pack select removed from the NPC editor. `{given}`, `{epithet}`, `{noun}` added as phrase values. Base FR/EN: the 20 NPC kinds of the spec, `npcs.json` v2 with 40 given names and epithets moved, nouns, 3 descriptions per kind with params and `{g:…}`.
- Suite: 273 files / 2587 tests pass (baseline 270 / 2507); tsc clean, `ng build` clean; only existing specs migrated, the 6 red files untouched.
- Open questions: `PackChoiceBusiness` still serves skills/classes (its NPC option remains, unused by the editor); `Npc.kind` rides through spreads in save/export/room with no dedicated test.

## Review

- Verdict: fix first
- Must fix: `public/packs/base-fr/generators/npcs.json:253,324,349,384,428,482` — generated FR text reads wrong ("On raconte que elle a croisé…", "que un loup géant a laissé…", "à cause de un ours des cavernes", "auprès de une artisane", "Elle a été engagé", "{creature} a été aperçu" with "une vouivre") — the engine has no elision and params carry their article. Rephrase around the param ("On raconte que {g:il|elle} a croisé {creature}" -> "{g:Il|Elle} aurait croisé {creature}…"; "à cause de {creature}" -> "à cause de la rencontre avec {creature}"; "auprès de {maker}" -> "en tant qu'apprenti de {maker}" or "grâce à {maker}"; "{g:engagé|engagée}" if four-option g is plural-only use a tense without agreement; "{creature} a été aperçu" -> "on a aperçu {creature}"; "ceux que {creature} a laissés" -> "ceux qu'{creature} a laissés" impossible, so "ceux laissés sans abri par {creature}"). Check EN too, no defects seen.
- Consider:
  - `src/app/core/packs/pack.ts:3-7` and ~16 touched files fail `prettier --check` (e.g. `NPC_KIND_SCHEMA, validateKindTree,` on one line, `npc-editor.rules.ts`, `phrase.ts`) — run prettier on the changed files.
  - `src/app/modules/world/helpers/world-export.ts:~229` and `npc-editor.rules.ts:208` — `Npc.kind` is not validated on import/JSON edit (non-string passes); add a `typeof kind === 'string'` check.
  - `src/app/modules/npc/helpers/npc-editor.rules.ts:248-303` — `drawNpcTexts` is long and mixes gender, template filtering and value drawing; split into small helpers.
  - EN names: "Lunette the Bold" for a trader fine; the description "He stole a living from a famous thief" and FR "Il forge à l'ancienne, avec le cuir bouilli" read oddly (tone only).
  - `Npc.kind` through export/room has no dedicated test (already listed in open questions).
- Sampled 60 NPCs per language from real Base FR/EN (seeds s0..s59): names are fine (persons "Given, role" / "Given le Epithet" with matching gender, creatures "Ours immense", "Araignée géante sauvage"); EN descriptions all read correctly; FR defects above only. Spec otherwise covered: seams tested, Pack select removed, v1 code deleted, no secrets.

## Answer

- NPC kinds in the manifest (`NPC_KIND_SCHEMA`: `roles`, `person`), `npcs.json` v2, pooled `NpcVocabularyBusiness`, `generateNpc` on kinds (roles from the kind, person or creature naming, descriptions through the phrase engine), `Npc.kind` kept (non-string rejected on import, dropped on JSON edit). Pack select removed from the NPC editor; v1 name list and `NpcNamesBusiness` removed. Domain-free lookups moved to `kind-lookups.ts`, shared with items.
- Base FR/EN: the 20 kinds of the spec, given names and epithets kept, nouns and descriptions per kind. Review fixes applied to the FR wording (no elision before params, agreement with `{g:…}`).
- Checked: suite 273 files / 2587 tests (baseline 270 / 2507), `ng build` clean; browser Tools NPC editor, Random in FR and EN, coherent names and descriptions, no console error.
- Not done: splitting `drawNpcTexts` (review Consider); no dedicated test for `kind` through export/room.
