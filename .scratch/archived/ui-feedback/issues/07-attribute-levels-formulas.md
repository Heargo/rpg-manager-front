# Attributes with level, max, current and formulas

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Attributes (decided 2026-11-07)).

New attribute model and the formula picker in the world wizard, the safe expression parser with live preview, the character rules (spend points, use, equip, sell, item generation) moved to the new model. No backward compatibility: replace the model outright.

## Baseline

`npm test`: 88 test files, 580 tests, all passed (2026-11-07, `develop` at 7ca334f).

## Current model

`CharacterAttribute { attributeId, points, current }`; max = base value + points + equipped modifiers (`character-stats.ts`). `WorldAttribute { id, name, baseValue }`.

## Seams

Confirmed with the user (2026-11-07):

1. **`core/helpers/formula.ts`** (pure): parse and evaluate safe expressions, never with `eval` or `Function`:
   - numbers, `+ - * / ^`, unary minus, parentheses, `min max floor round sqrt`;
   - the variables `level`, `base`, `step`, `playerLevel`, and other attributes' levels by name (names with spaces or accents allowed: define how, e.g. exact attribute names, matched case-insensitively);
   - clear errors (position and message key) for bad syntax, unknown names and division by zero or non-finite results;
   - the presets compile to expressions.
2. **Character rules** (existing `character-actions.rules`, `character.rules`, `character-stats`):
   - `points` becomes `level`;
   - max = round(formula) + equipment bonuses;
   - spending a point raises the level by 1 and raises max and current by the same delta;
   - use and set-current stay capped at max;
   - existing specs are updated, with no backward compatibility.
3. **Wizard formula picker** (`TEST_PROVIDERS`): per attribute, a preset select with a step field, or Custom with an expression field; a live preview of max at levels 0 to 5; errors shown inline, which block Next.

## Presets (user, 2026-11-07)

Step is set per attribute, and max is rounded to an integer.

| Preset | Expression | Default step |
| --- | --- | --- |
| Linear | `base + level * step` | 1 |
| Steep linear | `base + level * step` | 5 |
| Diminishing | `base + step * 2 * sqrt(level)` | 1 |
| Percent | `base * (1 + level * step / 100)` | 10 |
| Custom | any expression | none |

New worlds default to Steep linear for Life and Linear for the others. `playerLevel` is 0 until U08 adds character levels. World model: `WorldAttribute` gets `formula: { preset, step } | { preset: 'custom', expression }`.

## Red

- Test files: new `src/app/core/helpers/formula.spec.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.component.spec.ts`; extended `src/app/modules/character/helpers/character-stats.spec.ts`, `character-actions.rules.spec.ts`, `character.rules.spec.ts`, `src/app/modules/world/helpers/world-draft.rules.spec.ts`, `world.factory.spec.ts`, `world-export.spec.ts`, `default-world.spec.ts`; 17 more specs updated mechanically (`points` -> `level`; `formula: { preset: 'linear', step: 1 }` on every attribute literal, which reproduces the old base + points behaviour).
- Run: `npx ng test --watch=false --include <file>` (the whole suite currently fails to compile: every failure is a missing symbol or model field, since the new `level` / `formula` fields do not exist yet).
- Naming rule for other attributes' levels: exact attribute name, matched case-insensitively. A bare word for names without spaces (`strength`, `AGILITÉ`, accents allowed); square brackets for names with spaces (`[Max life]`, `[max LIFE]`).
- Contracts the green must implement:
  - `core/helpers/formula.ts` exports `AttributeFormula` (`{ preset: 'linear'|'steep-linear'|'diminishing'|'percent'; step } | { preset: 'custom'; expression }`), `FormulaScope { level, base, playerLevel, levels?: Record<attributeName, level> }`, `FormulaError { key, position }` (0-based; keys `formula.errors.syntax | unknownName | divisionByZero | notFinite`; division error at the `/`; missing `)` and empty text report the end / 0), `evaluateFormula(formula, scope) => { ok: true, value } | { ok: false, error }` (raw, unrounded), `validateFormula(formula, attributeNames) => FormulaError | null`, `presetExpression(preset)`, `defaultStep(preset)` (1, 5, 1, 10), `formulaExpression(formula)`. `^` is right-associative and binds tighter than unary minus.
  - `WorldAttribute.formula` and `WorldDraft.attributes[].formula` are required; `CharacterAttribute.points` becomes `level`; `AttributeStat.points` becomes `level`; `max = round(formula) + bonus`; `createCharacter` starts at level 0 with current = max; `createSandboxWorld` defaults Life to steep-linear step 5, the others to linear step 1.
  - `world-draft.rules` exports `attributeFormulaErrors(draft) => (FormulaError | null)[]` (names allowed = all draft attribute names) and sets `errors.attributes = 'world.errors.formulaInvalid'`; `parseWorldExport` reports `world.attributes[i].formula is invalid`.
  - Wizard step 2 hooks (native elements, row index N from 0): `select[name="formula-preset-N"]` (values linear, steep-linear, diminishing, percent, custom), `input[name="formula-step-N"]`, `input[name="formula-expression-N"]` (custom only), `[data-testid="formula-preview-N"]` (rounded max at levels 0 to 5, space separated), `[data-testid="formula-error-N"]` (only while invalid), `[data-testid="attributes-next"]` on the step 2 Next button.
- Failing: all new and changed tests in the files above, each a compile failure on a missing symbol except the wizard spec (runtime):
  - formula.spec.ts (all tests) — `./formula` module does not exist
  - character-stats.spec.ts (existing + 4 new formula tests) — `level` / `formula` missing from the model
  - character-actions.rules.spec.ts (existing + 2 new: same-delta spend with diminishing, caps with steep-linear) — same
  - character.rules.spec.ts (existing + new level-0 formula start) — same
  - world-draft.rules.spec.ts (+ 2 new) — `attributeFormulaErrors` not exported, `formula` missing
  - world.factory.spec.ts (+ keeps each formula), world-export.spec.ts (+ rejects invalid formula), default-world.spec.ts (+ Life steep, others linear) — `formula` missing
  - world-new-page.component.spec.ts (6 tests: defaults and preview, step change, preset switch with rounded preview, custom expression field, syntax error blocks Next, unknown name blocks Next) — fail at runtime, no `select[name="formula-preset-N"]` / `attributes-next` in the wizard
  - the 17 mechanically updated specs — fail to compile until the model has `level` and `formula`

## Green

- Files: `src/app/core/helpers/formula.ts` (new); `src/app/modules/world/{models/world.ts,helpers/default-world.ts,helpers/world.factory.ts,helpers/world-draft.rules.ts,helpers/world-export.ts}`; `src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html,scss}`; `src/app/modules/character/helpers/{character-stats.ts,character-actions.rules.ts,character.rules.ts}`; `src/app/modules/character/components/character-sheet/character-sheet.component.html`; `public/i18n/{en,fr}.json`.
- Change: own recursive-descent parser (no eval/Function) with position/key errors, presets, validation. Model moved to `level` and `formula`; max = round(formula) + bonus; spending a level raises current by the max delta. Wizard step 2 has a preset select, step or expression field, hint with preset name and expression, live preview at levels 0 to 5, inline errors blocking Next, and a Custom help text. The sheet column "Points" is now "Level", next to bonus and current / max (max updates on spend). Added `formula.errors.*`, `world.formula.*` and `world.errors.formulaInvalid` in EN and FR. The item generator only reads attribute names, so it needed no change.
- Suite: 90 files / 623 tests all pass (baseline 88 / 580); tsc clean; build OK, initial bundle 969.87 kB (under 1.02 MB; the existing 500 kB budget warning remains); no unstaged spec.
- Open questions: prettier reformatted the whole existing wizard `.ts` and `.scss`, so their diff is larger than the real change. In a Custom formula, `step` is allowed as a name but evaluates to 0.

## Review

- Verdict: fix first
- Must fix:
  - `src/app/core/helpers/formula.ts:94-260` (tokenizer, `Parser`, `checkNames`, `run`) — no length or depth cap. Checked: `'('.repeat(10000)+'1'+')'.repeat(10000)` and `'-'.repeat(10000)+'1'` make `evaluateFormula` and `validateFormula` throw a `RangeError`. The `catch` rethrows anything that isn't a `FormulaFailure`, so an imported world with a deep expression crashes `parseWorldExport` (host-side validation) and the wizard preview instead of returning an error. Fix: cap the expression length (e.g. 200 characters, a `formula.errors.syntax` or new `tooLong` error at position 200) before tokenizing, and cap nesting depth in `primary`/`unary`. Add a spec with 10000 nested parens and 10000 minus signs.
  - `world-export.ts:~76` — `isValidFormula` has no cap on `expression` length. The same length cap in `validateFormula` fixes it. `step` is checked as finite, which is fine.
- Consider:
  - `formula.ts:~330` — `step` in Custom silently evaluates to 0, which hides typos and gives a wrong max with no feedback. Make it an unknown name in Custom (VARIABLES minus `step` when `preset === 'custom'`; `validateFormula` knows the preset) and say so in the help text.
  - `character-actions.rules.ts:~89-100` — the spend delta is right (current rises by exactly `after.max - stat.max`, never above max). A non-monotonic Custom formula can make the delta negative and store a negative `current` (clamped only on read), so clamp the stored value to 0. Spending also changes the max of other attributes that read this level, and their `current` is not adjusted (only clamped on read). Acceptable, but worth a line in the spec.
  - `formulaMax` returns `baseValue` when the formula fails. That is a sensible fallback, but silent.
  - Non-finite results: all arithmetic goes through `finite()`, and `9^9^9` and `0^-1` return `notFinite` (checked). `^` with huge exponents is cheap (`Math.pow`), so no DoS beyond the depth issue.
  - Expectation changes: the 17 mechanical specs only changed `points` to `level` and added `formula: linear step 1`. Values (current 11, max 3, ...) are unchanged and nothing is weakened. The diff and the removed lines in the three extended specs confirm it.
  - Prettier noise: the wizard `.ts` and `.scss` diffs are mostly formatting (+185 lines in the `.ts`). It's acceptable, but split it into a separate `style:` commit so the real change stays reviewable.

### Green, review fixes

- Files: also `src/app/core/helpers/formula.spec.ts` and `src/app/modules/world/helpers/world-export.spec.ts` (new specs only), `character-actions.rules.ts`, the wizard html, `public/i18n/{en,fr}.json`.
- Change: `formula.ts` caps expressions at 200 characters (`formula.errors.tooLong`) and parentheses/unary-minus/call nesting at 32 (`formula.errors.tooDeep`); both return errors, never throw. `step` is an unknown name in Custom (help text updated). Spend clamps current to at least 0. Error messages now take the position ("Invalid formula (character 16)" / "Formule invalide (caractère 16)"); `world.formula.position` removed. Specs added for 10000 parentheses / minus signs, deep nesting, Custom `step`, and a deep expression rejected on import.
- Suite: 90 files / 627 tests pass; tsc clean; build OK.

## Review (re-check of fixes)

- Verdict: ship
- Must fix: none
- Consider: none. I ran it: 32 nested parens pass and 33 return `tooDeep`; 10000-char and 201-char input return `tooLong` at position 200; 200 minus signs and 40 nested `min(` return an error; no `RangeError` is thrown from `evaluateFormula` or `validateFormula`. `step` in Custom returns `unknownName` at 0 and the presets still accept it. The spend clamps `current` with `Math.max(0, ...)`. The `tooLong` and `tooDeep` wording is present in the i18n files.

## Answer

- **Formulas:** `core/helpers/formula.ts` is an own recursive-descent parser (no `eval` or `Function`).
  - Numbers, `+ - * / ^`, unary minus, parentheses, `min max floor round sqrt`.
  - Variables `level`, `base`, `playerLevel` (0 until U08), `step` (presets only), and other attributes' levels by exact name, case-insensitive; names with spaces in brackets, e.g. `[Max life]`.
  - Errors with position: syntax, unknown name, division by zero, not finite, too long (over 200 characters), too deep (nesting over 32); never thrown.
  - Presets: linear, steep linear, diminishing and percent, as in the table above.
- **Model:** `WorldAttribute.formula`; `CharacterAttribute.level` replaces `points`, with no backward compatibility.
- **Rules:** max = round(formula) + equipment bonuses. Spending a point raises the level, and max and current by the same delta (current is clamped at 0 or more). Use and set-current stay capped at max. The world import rejects invalid formulas.
- **Wizard:** per attribute, a progression select and a step field (or an expression for Custom), a hint, a live preview at levels 0 to 5, inline errors that block Next, and help for Custom.
- **Sheet:** shows the level next to the bonus and current / max.
- **Checked:**
  - Suite 90 files, 627 tests (baseline 88 / 580). Build OK, initial bundle 969.87 kB.
  - Browser, wizard: the previews show "10 15 20 25 30 35" for Life and "1 2 3 4 5 6" for Linear; a Custom `base + level*2 + agilité/2` gives "1 3 5 7 9 11"; bad syntax and an unknown name show inline errors.
- **Notes:**
  - Worlds saved before this change (old `points` model) won't load correctly; there is no migration, by design.
  - The wizard `.ts` and `.scss` were reformatted by prettier in this commit.
