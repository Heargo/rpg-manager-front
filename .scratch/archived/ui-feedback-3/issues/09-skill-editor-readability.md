# Skill editor: readable form, variables help

Status: resolved
Type: task
Blocked by: 11

Spec: `../spec.md` (Skill editor and formula presets)

- Form grouped in sections (identity, cost and levels, roll and success, effects), helper text under fields.
- A Variables help panel: every formula variable (`roll`, `skillLevel` = niveau de compétence, `level`, caster attributes by the world's names, target attributes with the parser's syntax), what each formula is for, and examples. Text in FR and EN.

## Baseline

Test Files 177 passed, Tests 1437 passed.

## Seams

1. **Skill editor component (`skill/components/skill-editor`, `TEST_PROVIDERS`)**: the form tab shows four labelled sections (identity, cost and levels, roll and success, effects; roll and success only for an active skill), each field keeps its existing hooks and behaviour; a Variables help panel (toggle or collapsible, Optimus control) lists `roll`, `skillLevel`, `level`, every attribute of the given world by name, and the target form (`target_<name>`) with the world's first attribute as example, plus one example formula for success and one for an amount. Misses: the look (browser check).
2. **A pure helper `formulaVariables(world)` (`skill/helpers/`)**: returns the variable list (name, kind fixed/caster/target, i18n description key) used by the panel, built from the world's attributes; the same names the formula validator accepts (a test checks each listed name validates in a formula).

## Red

- Test files: `src/app/modules/skill/helpers/skill-formula-variables.spec.ts`, `src/app/modules/skill/components/skill-editor/skill-editor.readability.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (note: in this environment the build fails on `node:crypto` in `src/testing/jsdom-setup.ts` even for existing specs; I ran with a throwaway tsconfig adding `"node"` to `types`, via `--ts-config`, then deleted it)
- Hooks the green must provide: `[data-section]` = identity | cost | roll (active only) | effects; `[data-action="toggle-variables"]` opens `[data-field="variables-help"]` (absent until opened) holding `[data-variable="<name>"]` per variable and `[data-example="success"]` / `[data-example="amount"]`. Helper `formulaVariables(world)` in `skill/helpers/skill-formula-variables.ts` returns `{name, kind: 'fixed'|'caster'|'target', descriptionKey}` ordered roll, skillLevel, level, caster attrs, `target_<name>` attrs; description keys must exist in en.json and fr.json. Target syntax is `target_<name>` (validator in `skill.rules.ts`).
- Failing: 10 tests
  - helper: lists fixed, caster and target variables in order — missing module `skill-formula-variables`
  - helper: only fixed variables for a world without attributes — missing module
  - helper: every listed name validates in a formula — missing module
  - helper: description keys translated in FR and EN — missing module
  - editor: groups an active skill form in four sections — no `[data-section]` elements
  - editor: omits roll section for a passive skill — no sections
  - editor: puts each field in its section — no sections
  - editor: Variables panel closed until toggled — no toggle button
  - editor: lists fixed variables, attributes and target form — no toggle button
  - editor: example success and amount formula — no toggle button

## Green

- Files: src/app/modules/skill/helpers/skill-formula-variables.ts, src/app/modules/skill/components/skill-editor/skill-editor.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `formulaVariables(world)` helper. The form tab has four sections (`data-section`, uppercase muted h3), with a short helper text under each non-obvious field (`skill.editor.help.*`). A "Variables help" toggle opens a bordered panel: what the success formula (0 or more = succeeds) and the amount formula (a number of points) are for, examples, one line per variable. Success formula and effect amount inputs sit in a `.control` flex wrapper so G10 can add a preset select beside them. Rows wrap for mobile. Removed the unused `successHint` and `formulaHint` keys.
- Suite: 179 files, 1447 tests pass (baseline 177/1437); tsc and ng build clean; no test file changed.
- Open questions: look still needs the browser check.

## Answer

Form tab in four sections (identity, cost and levels, roll and success for active skills, effects) with muted uppercase headings and a short help line under each non-obvious field. A "Variables" toggle opens a panel: what the success formula is for (succeeds at 0 or more) and the amount formula (a number of points), an example of each with the world's first attribute, then one line per variable from the pure `formulaVariables(world)` (`roll`, `skillLevel`, `level`, caster attributes, `target_<name>`). Success formula and amount inputs sit in a `.control` wrapper ready for G10's preset select. After review: unused `help.duration` key removed; the "Example" colon moved into the translations (FR « Exemple : »). Browser: Tools skills, new skill, sections and panel shown in French. Suite: 179 files, 1447 tests, build OK.
