# Pack choice next to the seed

Status: resolved
Type: task
Blocked by: 01, 02

Spec: `../spec.md` (Pack choice in generation options)

- A Pack select (Optimus UI) next to the seed in the item editor, item generator page, NPC editor, skill and class generators: selected packs with content for this generator and language, plus Random.
- Random picks the pack from `<seed>:pack`: same seed and same selected packs give the same result (pure helper, seeded test).
- Missing language in the chosen pack falls back to Base. Random item images draw from the chosen pack's sprites.

## Decisions (orchestrator, 2026-11-13)

- **Pure helper** `choosePack(candidates, choice, seed)` (`core/packs/pack-choice.ts`): `candidates` are pack ids in pack order (Base first, then registry order); `choice` is a pack id or `'random'`. A named pack among the candidates is returned as is; a named pack that isn't (removed, off, no content) falls back to `base`; `'random'` picks with `seededRandomSource(`${seed}:pack`)`, and with a single candidate returns it without drawing, so existing seeds give the same results as today when only Base is installed.
- **`PackBusiness.packsFor(content, lang)`**: enabled packs having `items` / `npcs` / `skills` / `classes` for that language, or `sprites`.
- **Word lists per pack**: `WordListBusiness.itemWords(lang, packId = 'base')`, and the same `packId` parameter on the skill, class and NPC name lists (cache keyed by language and pack). A pack without that language falls back to Base in that language, then to the default language as today.
- **Random item images**: `RandomItemImageBusiness.create(item, seed, packId?)` draws from the chosen pack's sprites; with no `packId`, or a pack without sprites, from every enabled pack's sprites. The user's tagged sprite sets take part as today.
- **UI**: a `p-select` "Pack" next to the seed in the item editor, the item generator page and the NPC editor: "Aléatoire / Random" (default) then the candidate packs by name. Generate, Random and the image draw use the resolved pack. Skill and class editors have no seed field: their Random button uses `'random'` among the packs that have skills / classes, no select (assumed, keeps their forms as they are).
- With Base alone, the select shows Random and Base and every result stays identical to before.

## Baseline

Test Files 207 passed, Tests 1758 passed.

## Seams

1. **Pure `choosePack`**: named, removed/unknown → base, random deterministic per seed, single candidate draws nothing. Misses how candidates are built.
2. **Businesses over a faked `PackService` and fake-indexeddb** (K03 fixtures, `extra` pack enabled): `PackBusiness.packsFor`, `WordListBusiness.itemWords(lang, 'extra')` returns the extra list and falls back to Base for a language it lacks, `RandomItemImageBusiness.create(item, seed, 'extra')` only draws extra's sprites. Misses the UI.
3. **Generator components** (item editor, item generator page, NPC editor; `TEST_PROVIDERS`): the Pack select lists Random then the packs, defaults to Random, and generating with the same seed and a chosen pack uses that pack's words. Misses layout (browser check).

## Red

- Test files: `src/app/core/packs/pack-choice.spec.ts`, `src/app/core/business/pack-choice.business.spec.ts`, `src/app/modules/sprite/business/random-item-image.pack.spec.ts`, `src/app/modules/item/components/item-editor/item-editor.pack.spec.ts`, `src/app/modules/npc/components/npc-editor/npc-editor.pack.spec.ts`, `src/app/modules/tools/pages/item-generator-page/item-generator-page.pack.spec.ts`. Test-side support: `src/testing/pack-choice-fixtures.ts` (new), `src/testing/extra-pack.ts` (`EXTRA_ITEMS` is now a valid French items list where every item is "Zircon"; new `EXTRA_NPCS`, every NPC "Zorg").
- Run: `npx ng test --watch=false --include 'src/app/core/packs/pack-choice.spec.ts' --include src/app/core/business/pack-choice.business.spec.ts --include src/app/modules/sprite/business/random-item-image.pack.spec.ts --include 'src/app/modules/**/*.pack.spec.ts' 2>&1 | tail -30`
- Hooks the UI must expose: `p-select[data-field="pack"]` (ngModel-bound, options = pack ids, `'random'` first, default `'random'`) next to the seed in the item editor, NPC editor and item generator page. `choosePack(candidates, choice, seed)` in `core/packs/pack-choice.ts`; `PackBusiness.packsFor(content, lang)` with content `'items' | 'npcs' | 'skills' | 'classes' | 'sprites'`, async, returns pack ids, Base first; `WordListBusiness.itemWords(lang, packId?)`; `RandomItemImageBusiness.create(item, seed, packId?)`. Note: the existing item/NPC editor specs mock `PackBusiness` as `{ wordList }` only, so the green step will need to extend those mocks (e.g. `packsFor`).
- Failing: 25 tests (the three seam-2 files and `pack-choice.spec.ts` fail to compile until the symbols exist, which stops the whole bundle; the three component specs run today and fail on the missing select).
  - `pack-choice.spec.ts` (5): named pack kept; unknown/removed falls back to base; random deterministic per seed; random reaches every candidate; single candidate returned — `core/packs/pack-choice` does not exist.
  - `pack-choice.business.spec.ts` (8): `packsFor` Base alone / enabled with content / off again / sprites; `itemWords` default Base / chosen pack / language fallback to Base / cache per language and pack — `packsFor` and the `packId` parameter do not exist.
  - `random-item-image.pack.spec.ts` (3): only the chosen pack's sprites (extra), only Base's when Base chosen, same seed and pack same result — `create` takes no `packId`.
  - `item-editor.pack.spec.ts` (4), `npc-editor.pack.spec.ts` (2), `item-generator-page.pack.spec.ts` (3): options Random then packs with Random default; generating with the chosen pack uses its words ("Zircon" / "Zorg"); Base chosen avoids them — there is no `p-select[data-field="pack"]`.
- Test-side follow-up: every spec mock `{ wordList }` of `PackBusiness` now also has `packsFor: async () => ['base']` (item and NPC editor specs, skill and class random specs, world-library, combat sandbox, item-generator and sandbox-character business specs). `pack-official.business.spec.ts` compared the extra items to the old literal; it now compares to `EXTRA_ITEMS`. The K03 specs (`pack-official`, `credits-packs`, `packs-tool-page`) and all other module specs pass (1408 tests) apart from the red ones.

## Green

- Files: src/app/core/packs/pack-choice.ts, src/app/core/business/pack-choice.business.ts (new), pack.business.ts, word-list.business.ts, npc-names.business.ts, npc-editor.business.ts, item-generator.business.ts, item-editor.business.ts, skill-editor.business.ts, class-editor.business.ts, random-item-image.business.ts, item-editor, npc-editor and item-generator-page components, public/i18n/en.json and fr.json (`packs.choiceLabel`, `packs.choiceRandom`)
- Change: `choosePack` pure helper; `PackBusiness.packsFor`; `packId` (cache keyed by pack and language, fallback to Base then default language) on item/skill/class/NPC word lists; `RandomItemImageBusiness.create(item, seed, packId?)` (chosen pack's sprites, else all); new `PackChoiceBusiness` (options + resolve) behind a `p-select[data-field="pack"]` next to the seed in the item editor, NPC editor and item generator page (Random default); skill/class Random resolve `'random'` among packs with content.
- Suite: Red run 25/25; full suite 213 files, 1783 tests pass (baseline 207 / 1758 plus the new specs); tsc and ng build clean; no test file in unstaged diff.
- Open questions: `PackChoiceBusiness` reads `PackBusiness.$installed?.()` with optional chaining because the existing editor specs mock `PackBusiness` as `{ wordList, packsFor }` only (labels fall back to the pack id there).

## Answer

- `choosePack(candidates, choice, seed)` (pure; `'random'` draws from `<seed>:pack` only with several candidates; unknown → `base`), `PackBusiness.packsFor(content, lang)`, `packId` on the item, skill, class and NPC name lists (cache `${packId}:${lang}`, fallback Base then default language), `RandomItemImageBusiness.create(item, seed, packId?)`.
- `PackChoiceBusiness` feeds a `p-select[data-field="pack"]` ("Aléatoire / Random" then pack names) next to the seed in the item editor, item generator page and NPC editor. Skill and class Random buttons resolve `'random'` among packs with content, no select.
- Orchestrator fix after review: `PackChoiceBusiness` called `$installed?.()` only to tolerate partial test mocks; the 16 mocks now provide `$installed: () => []` and the code calls `$installed()`.
- Checked in the browser: FR desktop item generator shows "Pack: Aléatoire" with options Aléatoire and Base; the same seed gives the same item ("Chaussures polie") with Aléatoire and with Base. EN at 375 px: the select sits beside Reroll, no horizontal scroll. NPC editor has the select ("Random"). No console error. Only Base exists, so choosing another pack is covered by tests only. Suite: 213 files, 1783 tests (baseline 207 / 1758); build clean. Review: ship.
- **Flaky**: `pack.business.spec.ts` failed 2 tests once in four full-suite runs (sprites URLs, invalid manifest), never alone. Likely shared state (fake-indexeddb or the registry load) across files; not investigated.
- Review notes left: the `'base'` literal in `pack-choice.ts` duplicates `BASE_PACK_ID` (move the constant to `core/packs`); `PackChoiceContent` is a bare alias of `PackGenerator`; the item editor resolves the pack twice per generate.
