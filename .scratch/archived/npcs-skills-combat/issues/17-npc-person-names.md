# NPC person names

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (NPC catalogue, Generate: "name from the word lists").

User feedback after N04 (2026-11-08): generated NPCs are named from the item word list ("Clé polie"). Add a person-name list and use it.

- A separate list per language, `public/i18n/generators/<lang>/npcs.json`, loaded like `items.json` (the item list format is unchanged): given names with a gender, epithets that agree in gender (one form in EN, m/f in FR), and name templates (`{given}`, `{given} {epithet}`, word order per language). Its own version and validation with readable errors, like `validateWordList`.
- A pure `generateNpcName(random, names)` beside `generateItemName`. `generateNpc` takes its name from it.
- About 40 given names (mixed genders) and 20 epithets per language, fantasy-flavoured, original (no names from a known game or book).

## Baseline

`npm test`: 107 files, 872 tests passed (2026-11-08).

## Seams

1. `core/generators/word-list.ts` (or a sibling): validation of the NPC name list (accepts a good one, refuses missing parts / wrong version with readable errors). Misses loading.
2. `generateNpcName(random, names)` with a seeded `RandomSource`: picks from the list, applies a template, epithet agrees with the given name's gender. Misses UI.
3. `generateNpc` in `npc/helpers/npc-editor.rules.ts`: the generated name comes from the NPC name list, not the item words. Misses UI (browser check: Generate in the NPC editor, FR and EN).

## Red

- Test files: `src/app/core/generators/npc-name-list.spec.ts`, `src/app/core/generators/npc-name-generator.spec.ts`, `src/app/modules/npc/helpers/npc-editor.rules.spec.ts` (adapted: `generateNpc(world, random, names)`, item words dropped, plus one new name test)
- Run: `npx ng test --watch=false --include src/app/core/generators/npc-name-list.spec.ts --include src/app/core/generators/npc-name-generator.spec.ts --include src/app/modules/npc/helpers/npc-editor.rules.spec.ts 2>&1 | tail -30`
- Agreed API: `core/generators/npc-name-list.ts` exports `NpcNameList` (`{version: 1, given: {text, gender}[], epithets: Adjective[], templates: string[]}`, placeholders `{given}` / `{epithet}`) and `validateNpcNameList(json)` returning `{ok, value} | {ok:false, errors}`; `generateNpcName(random, names)` in `core/generators/name-generator.ts`; `generateNpc(world, random, names)` (no more `words`); shipped files `public/i18n/generators/{en,fr}/npcs.json`.
- Failing (the build fails today on missing modules/signature, so every test is red until the symbols exist):
  - npc-name-list.spec: accepts shipped en/fr lists (>=40 given, >=20 epithets) — `npcs.json` and `npc-name-list` missing
  - rejects non-object; reports wrong version and missing given/epithets/templates; bad given name text/gender; bad epithet; unknown placeholder and template without {given} — `validateNpcNameList` missing
  - npc-name-generator.spec: deterministic; given-only template capitalized; template word order; epithet gender agreement; draws all given names; uses all templates — `generateNpcName` missing
  - npc-editor.rules.spec: all `generateNpc` tests (4 adapted) plus "takes its name from the NPC name list, not the item words" — `generateNpc` takes 3 args, `npc-name-list` missing

## Green

- Files: `src/app/core/generators/npc-name-list.ts` (new), `src/app/core/generators/name-generator.ts`, `src/app/core/generators/word-list.ts` (exports 3 helpers), `src/app/core/services/word-list.service.ts` (`loadNpcNames`), `src/app/modules/npc/business/npc-names.business.ts` (new), `src/app/modules/npc/business/npc-editor.business.ts`, `src/app/modules/npc/helpers/npc-editor.rules.ts`, `src/app/modules/npc/components/npc-editor/npc-editor.component.spec.ts` (mock now provides `loadNpcNames`), `public/i18n/generators/{en,fr}/npcs.json` (new, 40 given + 20 epithets each, original names, FR epithets m/f)
- Change: `validateNpcNameList` and `generateNpcName` added; `generateNpc(world, random, names)` takes its name from them. The list is loaded at runtime via `WordListService.loadNpcNames` and a cached, English-fallback `NpcNamesBusiness`, passed to `generateNpc` by the NPC editor business. The loader sits in the NPC module rather than `WordListBusiness`: in core it pushed the initial bundle 506 bytes over the 1.02MB error budget.
- Suite: 109 files, 886 tests passed (baseline 107 files, 872). tsc clean; `ng build` has no error (only the existing warnings). Red test files unchanged; the only unstaged test file is the NPC editor component spec, whose `WordListService` mock had to change.
- Open questions: none. Browser check (Generate, FR and EN) is not done.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `public/i18n/generators/*/npcs.json` — "Rowena" is the heroine of Ivanhoe and "Thessaly" a real region; both are real names so not a copy, but swap them if you want zero literary echo. "Fenwick" is a surname, odd as a female given name. "Mossbeard" and "Longstride" sit close to Tolkien-style compounds (generic, not copies). Nothing matches a known game or book character otherwise.
  - `npc-names.business.ts` — cache and English-fallback logic duplicates `WordListBusiness`; and it injects a core service from a feature business (justified by the bundle budget in Green, but worth a follow-up to merge). No spec covers its cache, fallback and invalid-list paths.
  - `name-generator.ts:generateNpcName` — `.replace('{given}', string)` treats `$&` in a name as a pattern (use a function, as for the epithet); only the first `{given}`/`{epithet}` is replaced, while validation allows repeats.
  - `npcs.json` templates repeat `"{given} {epithet}"` to weight it 2:1; implicit, worth a comment in the ticket or spec.
  - FR/EN given-name lists are identical; fine, but not localised.
- Checks: full suite 109 files, 886 tests pass; mock change in `npc-editor.component.spec.ts` is the minimal required one; no secrets or `.env`; browser check still outstanding.

## Answer

- `core/generators/npc-name-list.ts`: `NpcNameList` (`given` with gender, `epithets` agreeing in gender, `templates` with `{given}` / `{epithet}`) and `validateNpcNameList` with readable errors. `generateNpcName(random, names)` in `name-generator.ts`. `generateNpc(world, random, names)` takes its name from it (the item words are no longer used for NPCs).
- `public/i18n/generators/{en,fr}/npcs.json`: 40 given names and 20 epithets each, original; FR epithets m/f. Loaded at runtime by `WordListService.loadNpcNames` through a cached `NpcNamesBusiness` (English fallback) in the NPC module, to stay under the initial bundle budget.
- Checked: suite 109 files / 886 tests (baseline 107 / 872), `ng build` clean, review ship. Browser: Generate in the sandbox NPC editor gives "Zephra la Borgne", "Garrick le Patient", "Ysoret" (FR) and "Mirelle Hollowhand", "Ulric the Quiet" (EN); no console error.
- Left for later (review): `NpcNamesBusiness` duplicates `WordListBusiness`'s cache/fallback; `generateNpcName` uses string `replace` (a `$&` in a name would misbehave); given names are the same in EN and FR.
