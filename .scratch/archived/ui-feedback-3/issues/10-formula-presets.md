# Formula presets for skills

Status: resolved
Type: task
Blocked by: 09

Spec: `../spec.md` (Skill editor and formula presets)

- Success formula and effect amount fields get a preset select that fills the field.
- Built-in presets (a few for success, a few for effects), read-only, can be duplicated.
- User presets: create, edit, delete (name, kind `success` | `effect`, formula, description), validated with the formula parser, stored on the device through the app's local storage layer (not per world).
- Presets are generic over attributes: placeholders `{A}`, `{B}`… (caster) and `{target.A}`… (target); applying a preset asks which world attribute each placeholder stands for, then writes the formula with real names. Validation substitutes a dummy attribute. "Save as preset" turns the current formula's attribute names into placeholders.

## Baseline

Test Files 179 passed, Tests 1447 passed.

## Seams

1. **Pure `formula-preset.rules.ts` (`skill/helpers/`)**: `placeholders(formula)` → caster `{A}`… and target `{target.A}`… in order; `applyPreset(preset, mapping)` → the formula with real names (`target_<name>` for targets); `validatePreset(preset)` substitutes a dummy attribute and runs the same formula validator (unknown variable, bad syntax, `rank` rejected); `toPresetFormula(formula, attributeNames)` turns world attribute names back into placeholders (same name as caster and target → same letter); `BUILT_IN_PRESETS` (≥ 2 success, ≥ 3 effect, each valid, read-only ids). Catches all the formula logic; misses storage and UI.
2. **`FormulaPresetBusiness` (`skill/business/`)** over the app's existing device storage layer (whatever the profile/settings use; no new storage tech): `$presets` = built-ins + user presets; `create`, `update`, `remove` for user presets only (built-ins refuse with an error key), `duplicate(id)` makes a user copy; invalid formulas refused; persists across a new instance.
3. **Skill editor component**: a preset select next to the success formula and each effect amount (filtered by kind); picking a preset with placeholders asks for a world attribute per placeholder (Optimus selects in a small dialog/inline), then fills the field; "Save as preset" from a formula field; a "Manage presets" dialog lists presets with create/edit/delete (built-ins: duplicate only).

## Red

- Test files: `src/app/modules/skill/helpers/formula-preset.rules.spec.ts`, `src/app/modules/skill/business/formula-preset.business.spec.ts`, `src/app/modules/skill/components/skill-editor/skill-editor.presets.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (each file)
- Contract the tests pin: `models/formula-preset.ts` exports `FormulaPreset {id,name,kind:'success'|'effect',formula,description,builtIn}`; rules export `placeholders` (tokens like `'{A}'`, `'{target.A}'`), `applyPreset(preset, mapping keyed by token)`, `validatePreset` (FormulaError | null), `toPresetFormula(formula, names)` (string), `BUILT_IN_PRESETS`; business `FormulaPresetBusiness` (storage-agnostic, tests use jsdom localStorage) has `$presets`, sync `create(draft)`, `update(id, draft)`, `remove(id)`, `duplicate(id)` returning `{ok:true,...}` or `{ok:false,errorKey}` with keys `skill.presets.errors.invalid` / `skill.presets.errors.builtIn`; component hooks are in the doc comment of the component spec.
- Failing: all tests in 3 files (suites do not compile yet, red from missing modules)
  - formula-preset.rules.spec.ts (placeholders, applyPreset, validatePreset, toPresetFormula, BUILT_IN_PRESETS: 16 tests) — `./formula-preset.rules` and `../models/formula-preset` do not exist
  - formula-preset.business.spec.ts (9 tests: list, create, invalid, update, remove, built-in refusal, duplicate, persistence) — `./formula-preset.business` does not exist
  - skill-editor.presets.spec.ts (6 tests: fill without placeholders, mapping dialog, success mapping, kind filter, save as preset, manage dialog) — `FormulaPresetBusiness` missing, and the editor has no preset hooks

## Green

- Files: src/app/modules/skill/models/formula-preset.ts, helpers/formula-preset.rules.ts, services/formula-preset-storage.service.ts, business/formula-preset.business.ts, components/formula-presets-dialog/formula-presets-dialog.component.ts, components/skill-editor/skill-editor.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: pure rules (placeholders, applyPreset, validatePreset via the existing formula validator with a dummy attribute, toPresetFormula, 7 built-ins whose name/description are i18n keys); business over a localStorage service (like sprite presets), refusing invalid formulas and built-in edits, duplicate names via i18n; editor gets a p-select + "save as preset" button inside each `.control`, an inline mapping panel (p-select per placeholder) and name form, and a "Manage presets" p-dialog (list, new, edit, duplicate, delete). FR/EN keys under `skill.presets`.
- Suite: 182 files / 1477 tests pass (baseline 179 / 1447 + the 3 new files); tsc clean; ng build no error (2 existing budget warnings).
- Open questions: none (note: the preset select keeps showing the last pick, since it acts as an action menu; picking the same preset twice in a row does nothing visible)

## Review

- Verdict: fix first
- Must fix: skill-editor.component.ts presetTools (`[ngModel]="null"` + `pickPreset`) — the select keeps the last pick, so re-applying the same preset (after editing the field, or after Cancel on the mapping panel) does nothing, which breaks "a preset select that fills the field" — reset the select after each pick (for example bind `[ngModel]` to a signal that `pickPreset` sets back to null, or use a per-target key that changes after each pick) and add a test that picks the same preset twice.
- Consider:
  - formula-preset-storage.service.ts:11 — corrupt localStorage is safe (try/catch, array check, per-entry type guards, null entries skipped, `builtIn` forced to false), but `description` is not checked, and ids are not de-duplicated or kept out of `builtin-*`; a stored duplicate id gives duplicate `@for` track keys — also check `typeof description === 'string'` (default to '') and drop entries whose id is already seen or starts with `builtin-`; add a spec for these corrupt cases.
  - formula-presets-dialog.component.ts delete button — deletes at once; docs/rules.md asks for `ConfirmationService.confirm()` on confirmations — confirm before deleting.
  - formula-presets-dialog.component.ts saveForm — `const { id, ...draft } = this.form() ?? {}` then a null check is awkward — return early first.
  - formula-preset.rules.ts toPresetFormula — more than 26 distinct attributes all collapse to `Z` — fine in practice, but note it.
  - skill-editor.component.ts confirmSave — builds the preset draft and checks the name in the component; move to the business (`saveFromFormula`) to keep game logic out of components.
- Review fixes: select resets after each pick (`writeValue(null)`); storage drops duplicate/`builtin-` ids and defaults the description; delete asks for confirmation (the delete step of the manage-dialog spec now accepts it, as nav-bar does); `saveFromFormula` moved into the business; saveForm early return; >26 attributes note; wider select/formula input and clearer mapping labels. Suite 184 files / 1481 tests.

## Answer

Pure rules (`placeholders`, `applyPreset`, `validatePreset` through the existing validator with a dummy attribute, `toPresetFormula`, 7 built-ins with i18n names), `FormulaPresetBusiness` over a localStorage service (device-level, like the sprite presets; corrupt entries, duplicate and `builtin-` ids dropped). Skill editor: a preset select beside the success formula and each amount (filtered by kind, resets after each pick), an inline mapping panel (one select per placeholder: « {A} : attribut du lanceur », « {target.A} : attribut de la cible »), "Save as preset" (built by the business), and a "Manage presets" dialog (create, edit, duplicate, delete with confirmation; built-ins duplicate only). Review: fix first → select reset, storage guards, delete confirm (the red test's delete step now accepts the confirmation, like the nav-bar spec), business method, wider select. Browser: preset without placeholder fills `roll * skillLevel`; "Selon un attribut" asks for {A} then applies; select readable. Suite: 184 files, 1481 tests, build OK.
