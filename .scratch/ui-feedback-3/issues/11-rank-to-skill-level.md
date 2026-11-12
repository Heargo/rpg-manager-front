# Rank becomes skill level in the code

Status: claimed
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
