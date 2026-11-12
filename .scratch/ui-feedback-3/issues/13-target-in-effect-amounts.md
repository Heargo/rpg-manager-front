# Effect amounts can read the target's attributes

Status: claimed
Type: bug
Blocked by: none

Spec: `../spec.md` (Skill editor and formula presets). Found from user feedback (2026-11-13): the built-in effect preset "Au-delà de la défense de la cible" writes `max(1, {A} - {target.A}) + skillLevel`, but effect amounts only accept the caster's variables, so the effect shows « Nom inconnu » and the skill can't be saved. The variables help also lists `target_<name>` for every formula.

- Effect amounts accept `target_<name>` (and `[target_<name with spaces>]`) like success formulas: in `validateSkill`, in `evaluateSkillAmount` (new optional target maxima in `SkillAmountScope`), in `resolveSkillUse` (the target's maxima passed to amounts) and wherever combat evaluates amounts.
- Without a target (sheet Use with no target, previews), target variables read 0... unless the preview: `previewSkillAmount` treats target maxima like the caster's (1), so a preview never fails on them.
- The built-in effect presets all validate as effect amounts (a test over `BUILT_IN_PRESETS` of kind `effect`).

## Baseline

Test Files 184 passed, Tests 1481 passed.

## Seams

1. **`skill.rules.ts`**: `validateSkill` accepts an effect amount with `target_<name>` (still rejects an unknown name); `evaluateSkillAmount` reads target maxima; `previewSkillAmount` succeeds on a target variable. Plus every effect built-in preset, applied with the world's first attribute, validates as an effect amount.
2. **`resolveSkillUse` (`skill-roll.rules.ts`)**: amounts use the target's maxima when a target is given, 0 without one.
3. **Combat rules (`combat.rules.ts`)**: a skill effect whose amount reads `target_<name>` is computed against the actual target in an encounter.
