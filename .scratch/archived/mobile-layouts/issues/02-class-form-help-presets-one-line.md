# Class form: variables help and presets on one line

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Class form)

- In the class create / edit form, the variables help and the formula presets share one line (help on the left, presets on the right), at every width; at 375 px they still fit without overflow (labels may shorten to icons with tooltips/aria-labels).
- FR/EN.

## Baseline

`npm test`: 308 test files, 3064 tests, all passed (2026-11-17, after PE07).

## Seams

- The class form component (rendered with `TEST_PROVIDERS`): catches the variables help toggle and the presets select living in one row container (`data-test="formula-tools"`), help first, presets second, and each keeping an accessible label (aria-label / tooltip) if its text is shortened. Misses the actual one-line rendering and overflow at 375 px (browser check).

## Red

- Test files: `src/app/modules/skill/components/skill-editor/skill-editor.formula-tools.spec.ts` (note: the variables help and presets controls live in `SkillEditorComponent`'s `.toolbar`, not in the class editor, which has neither; tests target the skill editor, and use the existing "manage presets" button as the presets control since there is no presets select in the toolbar)
- Run: `npx ng test --watch=false --include src/app/modules/skill/components/skill-editor/skill-editor.formula-tools.spec.ts`
- Failing: 2 tests
  - holds the variables help toggle then the presets control in one row — no `[data-test="formula-tools"]` element yet
  - keeps an accessible name on both controls — no `[data-test="formula-tools"]` row, and the buttons have no `aria-label` yet

Note (orchestrator): the variables help and the presets control exist only in `SkillEditorComponent` (the skill form, also reached from a class's skill tree); the class form itself has neither. The quick note most likely means that form, so the ticket applies to the skill editor's formula toolbar.

## Answer

- The skill editor's formula toolbar (`data-test="formula-tools"`) keeps the variables help toggle (left) and Manage presets (right) on one line at every width; below 40rem only their icons show, each with an aria-label and tooltip (existing i18n keys).
- Target: the skill editor, not the class form (the class form has neither control; see the note above).
- Red fix: the accessible-name test first expected raw i18n keys; corrected to the English texts.
- Checked: suite green; build clean; diff reviewed by the orchestrator (small template/CSS change, no review agent). Browser at 375 px FR: both buttons on one line, no overflow, no console error.
