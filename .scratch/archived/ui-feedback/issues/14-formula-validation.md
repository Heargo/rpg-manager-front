# Custom formula validation gaps

Status: resolved
Type: bug
Blocked by: 07, 08

Found by probing the wizard (2026-11-08). Evaluation is correct (case-insensitive and bracket names, and other attributes' levels and `playerLevel` are fed by `attributeStats`); validation and preview are not.

## Bugs

1. `base + level/0` shows no error and doesn't block Next: `validateFormula` only checks syntax and names, so evaluation errors pass, and `formulaMax` silently falls back to the base value.
2. `-base + level` is accepted with a negative max (−1 at level 0).
3. The wizard preview evaluates `playerLevel` as 0, but characters start at level 1 (U08).
4. `Agilite` is an unknown name for an attribute named `Agilité`: names should match without accents too.
5. Level-curve errors are one generic message ("utilisez uniquement level, et chaque niveau doit coûter au moins 1 XP") with no position or level.

## Baseline

`npm test`: 91 test files, 679 tests, all passed (2026-11-08, `develop` at 7eefaa7).

## Seams

Confirmed with the user (2026-11-08):

1. **`core/helpers/formula.ts`** (pure):
   - names are matched case-insensitively and accent-insensitively (NFD, combining marks stripped), in evaluation and validation;
   - a new `checkAttributeFormula(formula, attributeNames)` validates by evaluating over levels 0 to 50, player levels 1 to 100, and the other attributes at those same levels;
   - it returns the first error with its key, position and level: `formula.errors.divisionByZero`, `notFinite`, or the new `formula.errors.negative` (a max below 0 at level N).
2. **World draft and import rules:**
   - `attributeFormulaErrors` and `validateWorldDraft` use the evaluating check, so it blocks Next;
   - `parseWorldExport` rejects these formulas too;
   - the curve validation returns a specific error: a syntax error or unknown name with its position, or `world.errors.levelCostTooLow` with the level.
3. **Preview helpers:** the wizard preview uses player level 1. Expose a pure `previewMax(formula, base, names)` that returns the levels 0 to 5 values, used by the wizard.

## Red

- Test files: `src/app/core/helpers/formula.spec.ts`, `src/app/modules/character/helpers/level.rules.spec.ts`, `src/app/modules/world/helpers/world-draft.rules.spec.ts`, `src/app/modules/world/helpers/world-export.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/helpers/formula.spec.ts --include src/app/modules/character/helpers/level.rules.spec.ts --include 'src/app/modules/world/helpers/*.spec.ts' 2>&1 | tail -30`
- Interface the tests assume: `checkAttributeFormula(formula, names): (FormulaError & { level?: number }) | null` and `previewMax(formula, base, names): number[]` (rounded, levels 0 to 5, playerLevel 1, other attributes at 0, `[]` on error), both exported from `core/helpers/formula.ts`; `checkLevelCurve(curve): { key: string; position?: number; level?: number } | null` exported from `level.rules.ts` (`validateLevelCurve` stays as is); `FormulaError.key` gains `formula.errors.negative`.
- Failing: the build currently fails on the missing exports `checkAttributeFormula`, `previewMax` (formula.spec) and `checkLevelCurve` (level.rules.spec), so the whole run is red until they exist. Once they do, each test below fails on its assertion:
  - formula.spec "accent-insensitive names": evaluates an unaccented name — accents are not stripped yet
  - formula.spec "accent-insensitive names": validates an unaccented name — `Agilite` reported as unknown
  - formula.spec "checkAttributeFormula": accepts presets and a formula reading another attribute — missing export
  - formula.spec "checkAttributeFormula": division by zero with position and level — missing export
  - formula.spec "checkAttributeFormula": division by zero at some player level — missing export
  - formula.spec "checkAttributeFormula": negative max with level — missing export
  - formula.spec "checkAttributeFormula": syntax and unknown names with position — missing export
  - formula.spec "checkAttributeFormula": not finite — missing export
  - formula.spec "previewMax": levels 0 to 5, playerLevel 1, other attributes at level 0, empty on failure (4 tests) — missing export
  - level.rules.spec "checkLevelCurve": accepts valid, syntax position, unknown name position, levelCostTooLow with level (4 tests) — missing export
  - world-draft.rules.spec "formulas that fail when evaluated": division by zero blocks Next, negative max blocks Next, accented sibling accepted — only syntax/names are checked today
  - world-export.spec "refuses formulas that fail when evaluated" — `parseWorldExport` accepts `base + level/0` and `level - 5`

## Green

- Files: src/app/core/helpers/formula.ts, src/app/modules/character/helpers/level.rules.ts, src/app/modules/world/helpers/world-draft.rules.ts, src/app/modules/world/helpers/world-export.ts, src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html}, public/i18n/en.json, public/i18n/fr.json
- Change: names match without case or accents; `checkAttributeFormula` (levels 0-50 x player levels 1-100, real base value, passed from draft rules and import) and `previewMax` added; `checkLevelCurve` returns key/position/level (`validateLevelCurve` kept, returns the generic key). Draft rules and import use the evaluating check; the wizard uses `previewMax` and shows position and level in formula errors, and the specific curve error. New strings: `formula.errors.negative`, `formula.atLevel`, `world.errors.levelCostTooLow` (EN and FR).
- Suite: 92 files, 707 tests, all passed (baseline 91 files, 679 tests); tsc clean; build ok; no test file in unstaged diff.
- Open questions: the negative check compares the rounded value. Spec call sites of `checkAttributeFormula` got a base argument (1); added test "uses the attribute base value".

## Review

- Verdict: fix first
- Must fix: `public/i18n/{en,fr}.json` `formula.errors.divisionByZero` + `world-new-page.component.html:140-143` — the message and the "(niveau N)" suffix are two interpolations with whitespace between, giving "(caractère 13)  (niveau 0)" — add `formula.errors.divisionByZeroAtLevel` ("Division par zéro (caractère {{ position }}, niveau {{ level }})" / "Division by zero (character {{ position }}, level {{ level }})"), have the template pick it when `level` is defined, and drop the `formula.atLevel` suffix (and its `@if`); do the same for `notFinite` or give it the level in its own text.
- Consider:
  - `formula.ts:~420` `checkAttributeFormula` — measured about 50 ms for 12 attributes with a mid-size custom formula (warm), per keystroke, since `formulaErrors` re-checks every row on any draft change (and `validateWorldDraft` repeats it). Not blocking, but memoise per row (key: formula + base + names) or break out early for formulas with no `level`/`playerLevel`/attribute reads. Sampling would lose real errors (`playerLevel - 50`), so prefer memoising; also a `Map` is allocated per inner iteration, hoist it.
  - `formula.ts` outer `try/catch` in `checkAttributeFormula` duplicates the inner one; the inner catch already handles `FormulaFailure`.
  - `world-draft.rules.ts:~19` attribute-name uniqueness ignores accents, so "Agilité" and "Agilite" both pass but now collide in the name lookup. Use the same normalisation.
  - `checkAttributeFormula` takes a third `base` argument beyond the ticket's `(formula, names)`; justified (the real base), and the ticket's Green notes it.
- Checked, fine: accents are stripped by the single `lower()` used for `levelsByName` keys (`formula.ts:366,433`), name lookup (`:325`) and `checkNames`; import passes the attribute's real `baseValue` (0 only if it isn't a number, which is already rejected); no staged expectation weakened (the only spec edits are an added base argument and one new test); no secrets, no invite-code changes.

## Green (review fixes)

- Files: formula.ts, world-draft.rules.ts (+ spec: duplicate accented names), world-new-page.component.{ts,html}, en.json, fr.json
- Change: `formula.errors.divisionByZeroAtLevel` and `notFiniteAtLevel` replace the `formula.atLevel` suffix (picked by `formulaErrorKey` when `level` is defined); attribute-name uniqueness uses the shared `normalizeName`; `checkAttributeFormula` is memoised (bounded cache keyed on formula, names, base), its maps are hoisted and the outer try/catch removed.
- Suite: 92 files, 709 tests, all passed; tsc clean; build ok.

## Answer

- **`core/helpers/formula.ts`:**
  - names match case- and accent-insensitively (`normalizeName`), in evaluation, validation and attribute-name uniqueness;
  - `checkAttributeFormula(formula, names, base)` evaluates levels 0 to 50 × player levels 1 to 100 with the real base value; it returns division by zero or not finite with position and level, or `formula.errors.negative` with the level; it is memoised (cache of 500);
  - `previewMax` previews with player level 1.
- **Level curve:** `checkLevelCurve` gives a specific error (syntax or unknown name with its position, or `world.errors.levelCostTooLow` with the level).
- **World draft and import:** use the evaluating check, so it blocks Next and rejects the import.
- **Wizard:** errors read "Division par zéro (caractère 13, niveau 0)" and "Max négatif au niveau 0".
- **Checked:**
  - Suite 92 files, 709 tests (baseline 91 / 679). `tsc` and build OK.
  - Browser probes: `base + level/0` and `-base + level` show errors and block Next; `base + playerLevel` previews 2; `base + Agilite` is accepted.
