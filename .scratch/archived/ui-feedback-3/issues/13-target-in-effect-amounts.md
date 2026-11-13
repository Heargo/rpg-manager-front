# Effect amounts can read the target's attributes

Status: resolved
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

## Red

- Test files: `src/app/modules/skill/helpers/skill.rules.spec.ts`, `src/app/modules/skill/helpers/skill-roll.rules.spec.ts`, `src/app/modules/combat/helpers/combat.rules.spec.ts`
- Run: `npx ng test --watch=false 2>&1 | tail -30` (full suite: here `--include <file>` fails to build with a `node:crypto` TS2591 error in `src/testing/jsdom-setup.ts`, even on untouched specs; without `--include` it runs fine)
- Failing: 7 tests (full suite: 3 files failed, 7 tests failed, 1481 passed, same as baseline)
  - skill.rules: validateSkill accepts target_<name> and the bracketed form, rejects an unknown target name — effect amount with `target_Life` is rejected as a formula error
  - skill.rules: evaluateSkillAmount reads the target maxima — `SkillAmountScope.targetMaxima` (new optional field, cast in the spec) is ignored, so `target_Life` is an unknown name
  - skill.rules: previewSkillAmount treats target maxima as 1 — returns an unknown-name error on `target_Life`
  - skill.rules: every built-in effect preset, applied with the first attribute, validates as an effect amount — `overTarget` (`max(1, Strength - target_Strength) + skillLevel`) is rejected
  - skill-roll.rules: uses the target maxima in the amounts — amounts don't get the target's maxima (`unknownName` error)
  - skill-roll.rules: reads the target variables as 0 without a target — `target_Defense` is an unknown name, expected amounts [6] with no error
  - combat.rules: computes the amount against the actual target of the encounter — `target_Life + 1` is not evaluated against the Goblin (expected damage 14)

## Green

- Files: src/app/modules/skill/helpers/skill.rules.ts, src/app/modules/skill/helpers/skill-roll.rules.ts
- Change: `TARGET_PREFIX` moved to skill.rules (re-exported from skill-roll.rules) with a shared `targetVariables` helper; `SkillAmountScope.targetMaxima`; `validateSkill` accepts `target_<name>` in effect amounts; `evaluateSkillAmount` reads the target maxima (0 without a target, including any `target_` name in the formula); `previewSkillAmount` passes maxima 1 for the target; `resolveSkillUse` passes the target's maxima to amounts and the success formula uses the same helper. Combat already passes the target to `resolveSkillUse`, so it needed no change.
- Suite: 184 files / 1488 tests pass (baseline 184 / 1481 + 7 new); tsc and ng build clean; no test file in the unstaged diff.
- Open questions: `skillPreview` and `character-stats` (no target) rely on evaluateSkillAmount reading `target_` names as 0; a misspelled target name is caught only by validateSkill, not at evaluation.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - skill.rules.ts:45-65 — `targetVariables` — the regex scan of `[target_...]`/`target_\w+` is redundant for valid names, since every caster attribute name already gets a `target_<name>` key (0 without a target). It only matters for misspelled names, which then read 0 instead of failing. `\w` also truncates accented bare names, harmless only because of the attribute-name loop. Drop the `formulas` parameter and the regex; the `names` loop alone gives "any known target_ name reads 0". Validation already rejects unknown names.
  - skill.rules.ts:38-41 — the doc comment is muddled ("0 for every other attribute of the caster or target_ name read by the formulas"). Reword it.
  - skill-roll.rules.ts:82 — `targetVariables({}, target?.maxima)` — passes `{}` so success formulas get exactly the old behaviour (no target gives no `target_` keys and an unknown-name error). Unchanged, but a bit cryptic.
  - No test for a bracketed `[target_Points de vie]` name in `evaluateSkillAmount`, with or without a target. Only validateSkill covers the bracketed form.

## Answer

Effect amounts accept `target_<name>` (and `[target_<name with spaces>]`) like success formulas: `validateSkill`, `evaluateSkillAmount` (new optional `targetMaxima`, each world attribute's `target_` key reads 0 without a target), `previewSkillAmount` (target maxima 1), `resolveSkillUse` (the target's maxima go to amounts too, through the shared `targetVariables` helper). Combat already passes the target to `resolveSkillUse`. A misspelled name stays an error. After review: regex scan dropped (one red test gave its caster the `Defense` attribute it reads, as a world always does), bracketed-name tests added. Same session, separate commit: the preset mapping panel is aligned (title on its own line, label above each select, buttons level with them), the preset select resets after each pick in the real UI (p-select sets its value after emitting, so the reset is repeated on the next tick), and the variables help shows names with spaces in brackets with an explanation. Browser: "Au-delà de la défense de la cible" on an effect gives `max(1, Vie - target_Vie) + skillLevel`, no error, preview "Niveau 1 : 2 · Niveau 5 : 6". Suite: 184 files, 1490 tests, build OK.
