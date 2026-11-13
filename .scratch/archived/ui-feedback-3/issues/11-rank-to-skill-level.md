# Rank becomes skill level in the code

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Rank becomes skill level in the code)

- Formula variable `rank` → `skillLevel` (parser variables, skill roll and effect evaluation, combat rules, validation messages).
- Fields: skill `maxRank` → `maxLevel`; learned skills and class `requires` `rank` → `level`; helpers and methods renamed the same way (`rankOf` → `levelOf`, `setSkillRank` → `setSkillLevel`, …); i18n keys too.
- Default skills/classes, generators, AI prompts and JSON shapes use the new names. No backward compatibility.
- No identifier with `rank` left for skills (`grep -rn rank src` only hits unrelated words).

## Baseline

Test Files 177 passed, Tests 1434 passed.

## Seams

A rename, so the existing tests are the seams: red renames the identifiers in the specs (and the expectations on JSON shapes, prompts and formula variables), green renames the code.

1. **Skill rules (`skill/helpers/*.rules.ts`: skill points, skill roll `resolveSkillUse`, validation)**: learned skills `{ skillId, level }`, `maxLevel`, formula variable `skillLevel` (a formula using `rank` is now invalid), `set-skill` action `{ skillId, level }`.
2. **Class rules and default classes/skills/generators**: `requires: [{ skillId, level }]`; starter data and generated skills/classes use the new names; AI prompts describe `maxLevel`, `level`, `skillLevel`.
3. **Combat rules (`combat.rules.ts`)**: skill uses evaluate `skillLevel`.

## Red

- Test files: 26 existing specs renamed in place (`grep -rl "maxLevel\|skillLevel" src --include=*.spec.ts` plus the ones using `level` on skill entries), plus new tests in `src/app/modules/skill/helpers/skill.rules.spec.ts` (formula using `rank` rejected, `skillLevel` works), `src/app/modules/skill/helpers/skill-ai-prompt.spec.ts`, `src/app/modules/class/helpers/class-ai-prompt.spec.ts` (no `rank`, `"requires": [{ "skillId": string, "level": number }]`), `src/app/modules/world/business/world-library.business.spec.ts` (starter data uses `maxLevel`, `level`, `skillLevel`).
- Run: `npx ng test --watch=false 2>&1 | tail -30`
- Failing: the whole specs build fails (108 TS errors, all "property `maxLevel` / `level` / `skillLevel` does not exist on `Skill` / `SheetSkill` / `TreeRequirement` / `SkillAmountScope`), so no test runs until green renames the code. Behaviour tests that will fail on assertion once it compiles: skill.rules.spec "rejects a formula using rank while skillLevel works"; both ai-prompt "never mentions rank" tests; class-ai-prompt "describes a prerequisite as { skillId, level }"; world-library starter classes (`maxLevel`, `skillLevel`, `requires[].level`); world-export "skills[0].level must be an integer of 1 or more".

### Rename table green must apply (old -> new)

Fields and types
- `Skill.maxRank` / `SkillDraft.maxRank` -> `maxLevel`; `SKILL_MAX_RANK` -> `SKILL_MAX_LEVEL`
- `SheetSkill.rank` (learned skills, Character/Npc `skills[]`) -> `level`
- `TreeRequirement.rank` (`requires[].rank`) -> `level`
- `TreeNodeState` missing `{ kind: 'requires', skillId, rank }` -> `level`
- action `{ kind: 'set-skill', skillId, rank }` -> `level` (parse, apply)
- `SkillAmountScope.rank` (`evaluateSkillAmount(amount, { rank, level, maxima })`) -> `skillLevel`
- `previewSkillAmount` result `{ rank1, maxRank }` -> `{ level1, maxLevel }`
- `class.rules` validation field `tree.N.requires.M.rank` -> `tree.N.requires.M.level`
- world-export validation: `skills[i].rank` -> `skills[i].level`, message `<path>.level must be an integer of 1 or more`
- skill validation issue field `maxRank` -> `maxLevel`

Formula variable
- `rank` -> `skillLevel` everywhere (parser variable list in `skill.rules` validation, `evaluateSkillAmount` levels map, `skill-roll.rules` `resolveSkillUse` scope, `combat.rules` skill effects, `character-stats` passives, `skill-editor` default amounts `'rank'`, `skill-generator`, `starter-classes` amounts); a formula using `rank` becomes an unknown name (`formula` issue)

Helpers / methods / params
- `rankOf` -> `levelOf`, `withRank` -> `withLevel`, `setSkillRank` -> `setSkillLevel` (any such name), `setRank` -> `setLevel`, `newRank` -> `newLevel`, `maxRankLimit` -> `maxLevelLimit`, `ranks` input of skill-tree -> `levels`, `rank` params in `resolveSkillUse`, `useSkill`, `skillEffectsAt`, `preview(..., maxRank)` -> `level` / `maxLevel`
- starter data (`starter-classes.ts`) `maxRank` -> `maxLevel`, `requires: [key, rank]` -> `[key, level]`; skill/class generators likewise

Error i18n keys (character.errors)
- `skillMaxRank` -> `skillMaxLevel`; `invalidRank` -> `invalidLevel`

Other i18n keys and params (public/i18n en.json and fr.json)
- `class.tree.rank` -> `class.tree.level` (param `{{ rank }}` -> `{{ level }}`); `class.tree.missingRequires` param `rank` -> `level`
- `class.catalogue.maxRank` -> `maxLevel`; `class.editor.node.maxRank` -> `maxLevel`; `class.editor.fields.rank` -> `level`
- skill editor keys `maxRank` -> `maxLevel` (field label and error), preview params `rank1`/`maxRank` -> `level1`/`maxLevel`; hint texts mentioning `rank` -> `skillLevel`

DOM hooks (`data-field`)
- `max-rank` -> `max-level`, `requirement-rank` -> `requirement-level`, `new-requirement-rank` -> `new-requirement-level`, `skill-rank` -> `skill-level`; css class `.rank` / `skill-rank` -> `.level` / `skill-level`

AI prompts
- skill prompt: `maxRank` -> `maxLevel`, `rank` -> `skillLevel` (en and fr); class prompt: `requires` `{ "skillId": string, "level": number }`, no `rank` text

## Green

- Files: skill/class/character/npc/combat/world modules (rules, models, business, components), `core/generators/{skill,class}-generator.ts`, `world/helpers/starter-classes.ts`, `public/i18n/{en,fr}.json`, skill and class AI prompts.
- Change: renamed per the table (fields `maxLevel`/`level`, formula variable `skillLevel`, helpers `levelOf`/`withLevel`/`setSkillLevel`, i18n keys and params, `data-field` hooks, css `.level`/`skill-level`, preview `{ level1, maxLevel }`); hints and `success_formula` error name `skillLevel`. The combat `reorderCombatants` local `rank` was renamed `position`. `public/i18n/generators/*` held no `rank`.
- Suite: 177 files passed, 1437 tests passed (baseline 1434 + 3 new); tsc clean; ng build no error. `grep -rn -i rank src public` hits only the red specs asserting `rank` is gone.
- Open questions: none

## Answer

Renamed per the table above: fields `maxLevel` / `level`, formula variable `skillLevel` (a formula with `rank` is now invalid), helpers, i18n keys and params, DOM hooks, AI prompts, starter data and generators. No backward compatibility (old saved worlds with `rank` won't validate). Prettier re-run on 3 files the rename had unformatted. Review: ship (no `rank` left outside the specs asserting it is gone). Browser: Tools sheet skill tree shows levels (0/5), no console error. Suite: 177 files, 1437 tests (+3), build OK.
