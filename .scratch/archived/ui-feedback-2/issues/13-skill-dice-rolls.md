# Skill uses roll dice

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- World setting `skillRollsEnabled` (default true), in World rules (and the wizard defaults).
- Active skills get `roll: { count, faces }` (default 1d20) and `success: { mode: 'always' } | { mode: 'threshold', value } | { mode: 'formula', formula }`; effect amounts may use `roll`. Formula variables: `roll`, `rank`, `level`, caster attribute maxima by name, target maxima as `target_<name>` (or the parser's chosen syntax). Validated live in the skill editor.
- Pure `resolveSkillUse(skill, rank, caster, target, rolls, enabled)` → `{ success, rolls, total, amounts }`.
- The sheet's active skills get a Use button: rolls the dice (the dice overlay/roller), then shows success/failure and the amounts. No target application yet (combat tickets use the helper).
- Default skills (starter classes) get sensible rolls.

## Baseline

Test Files 151 passed, Tests 1193 passed.

## Seams

1. **`resolveSkillUse` (pure, `skill/helpers/skill-roll.rules.ts`)**: with rolls enabled: total of the given dice, success per mode (always / threshold / formula with `roll`, `rank`, `level`, caster maxima, target maxima), effect amounts evaluated with `roll`; with rolls disabled: always success, `roll` = 0; invalid formula → failure with an error, never `eval`. Also the validation of a skill's roll config (`validateSkill`).
2. **World rules + skill editor components**: the world setting "Skills roll dice" (default on, saved with the rules); the skill editor edits dice count/faces, success mode, threshold/formula with live validation.
3. **Character sheet skills tab component**: an active skill has Use; Use rolls the dice through the dice business (mocked) and shows success/failure and amounts.

## Red

- Test files:
  - `src/app/modules/skill/helpers/skill-roll.rules.spec.ts` (new)
  - `src/app/modules/world/helpers/world-skill-rolls.spec.ts` (new)
  - `src/app/modules/character/components/character-sheet/character-sheet-skill-use.spec.ts` (new)
  - `src/app/modules/skill/components/skill-editor/skill-editor.component.spec.ts` (4 tests added, `dice rolls` block)
  - `src/app/modules/world/pages/world-rules-page/world-rules-page.component.spec.ts` (1 test added)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (the bundle does not compile yet, so every run is red on the missing symbols below; the `node:crypto` error from `src/testing/jsdom-setup.ts` is pre-existing)
- Contract chosen:
  - Target variable syntax is `target_<name>` (the parser only reads bare words of letters, digits and `_`; `target.<name>` would need a parser change). A target name with no target given is an unknown name, so the use fails with an error.
  - `resolveSkillUse(skill, rank, caster: { level, maxima }, target: { maxima } | undefined, rolls: number[], enabled)` returns `{ success, rolls, total, amounts: number[], error? }`.
  - `Skill.roll?` and `Skill.success?` are optional, defaulting to 1d20 and `always`.
  - `skillRollsEnabled` goes on `World` and `WorldRules`, and on the sheet's `world` input (and `WorldInfo`).
  - `validateSkill` issue fields: `roll.count` (1 to 100), `roll.faces` (2 to 1000), `success.value` (integer), `success.formula` (code `formula`).
  - The sheet's Use calls `DiceRollBusiness.rollAtTable(count, faces)`. Hooks: `[data-use=id]`, `[data-use-result=id][data-success]`.
  - Editor hooks: `roll-count`, `roll-faces`, `success-value`, `success-formula`, `success-error`. The rules page toggle is `#skill-rolls` in the Rules tab.
- Failing: 20 tests, all of them a compile failure from missing symbols or fields (`./skill-roll.rules`/`resolveSkillUse`, `Skill.roll`, `Skill.success`, `World.skillRollsEnabled`, `WorldRules.skillRollsEnabled`), plus UI hooks that don't exist yet.
  - skill-roll.rules.spec — resolveSkillUse: totals dice, always success, amounts with roll — missing module.
  - resolveSkillUse: threshold succeeds when the total reaches it — missing module.
  - resolveSkillUse: formula with roll, rank, level, caster and target maxima — missing module.
  - resolveSkillUse: fails with an error on an invalid formula, unknown name or missing target — missing module.
  - resolveSkillUse: never evaluates code — missing module.
  - resolveSkillUse: setting off gives success and roll 0 — missing module.
  - resolveSkillUse: defaults without a roll config — missing module.
  - validateSkill roll config: accepts none and valid configs — missing `Skill.roll` and `Skill.success`.
  - validateSkill: refuses bad dice count and faces — missing field.
  - validateSkill: refuses a non-integer threshold — missing field.
  - validateSkill: refuses an invalid or unknown-name success formula — missing field.
  - validateSkill: lets an effect amount read roll — missing field.
  - world-skill-rolls.spec — default is on — missing `World.skillRollsEnabled`.
  - world-skill-rolls.spec — saved with the rules — missing `WorldRules.skillRollsEnabled`.
  - world-rules-page: Skills roll dice setting shown on and saved off — no `#skill-rolls` toggle.
  - skill-editor: shows 1d20 and always by default — no roll fields.
  - skill-editor: hides the roll fields for a passive skill — missing field.
  - skill-editor: saves edited dice and threshold — no roll fields.
  - skill-editor: validates the success formula live — no formula field.
  - character-sheet-skill-use.spec — the 4 tests (Use on learned active only; success with amounts; failure; setting off) — no `[data-use]` button and missing `skillRollsEnabled` on the sheet world.

## Green

- Files: `skill/helpers/skill-roll.rules.ts` (new), `skill/helpers/skill.rules.ts`, `skill/helpers/skill-ai-prompt.ts`, `skill/models/skill.ts`, `skill/components/skill-editor/skill-editor.component.ts`, `world/models/world.ts`, `world/helpers/world.factory.ts`, `world/helpers/world-rules.rules.ts`, `world/helpers/starter-classes.ts`, `world/components/rule-fields/*`, `world/pages/world-rules-page/*.ts`, `world/pages/world-new-page/*.ts`, `character/business/character.business.ts`, `character/components/character-sheet/*` (ts, html, scss), `public/i18n/en.json`, `fr.json`, `.scratch/npcs-skills-combat/issues/12-combat-rules.md` (note)
- Change: `resolveSkillUse` and `validateSkill` roll checks; `Skill.roll/success` and `skillRollsEnabled` (optional, on = default) on World, WorldRules, WorldDraft, WorldInfo and SheetWorld; the toggle sits in the shared rule fields (rules page `#skill-rolls`, wizard); the editor edits dice, success mode, threshold and formula with a live formula error; the sheet's Use goes through `CharacterBusiness.useSkill` (dice business, then `resolveSkillUse`). Starter attack skills got thresholds (fireball 2d6, meteor 3d6, others 1d20), supports stay always. AI prompt lists `roll` and `success`; the random skill generator is untouched (it relies on the defaults, so its seeded output stays the same).
- Suite: 154 files, 1216 tests pass (baseline 151 / 1193); tsc clean; ng build no error.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `character.business.ts:~118` — `rollAtTable` shares via the host when sharing is on and reachable; if `service.roll` rejects (host drops mid-call) `useSkill` throws and the sheet's `useSkill` has no catch, so the click silently does nothing. Fall back to the local `dice.roll` or surface the error.
  - `character-sheet.component.ts` `useSkill` — `busy()` is not set during the async roll, so a double click rolls twice; add a per-skill pending flag.
  - `skill-roll.rules.ts:~66` — a caster attribute named `rank`, `roll` or `target_x` is shadowed silently (spread order); acceptable, but a one-line doc note would help.
  - `skill.rules.ts` `parseSkillJson` — only checks that `roll` is an object; `validateSkill` catches bad fields later, so fine, but a missing `success.formula` string relies on `validateFormula` tolerating undefined; worth a test.
  - `character.business.ts` imports sit between code (existing placement of SheetWorld splits them); tidy the import block.
- Checked: `resolveSkillUse` uses the project formula parser (no eval), exposes `roll`, `rank`, `level`, caster maxima and `target_<name>`, a missing target gives an error and failure, setting off gives success, roll 0, no dice drawn (business skips the roll too). Layering component, business, rules is respected. Use is shown only with `canPlay` (so not on the read-only joined-world copy); offline, `rollAtTable` rolls locally, so the offline dice feature is not needed. Starter thresholds are sensible (about 55-75% at 1d20; 2d6 >= 6, 3d6 >= 10). Strings are in both language files.

## Answer

World setting `skillRollsEnabled` (default on, Rules tab and wizard). Skills get optional `roll` (default 1d20) and `success` (always / threshold / formula with `roll`, `rank`, `level`, caster maxima, `target_<name>`), validated live in the editor. Pure `resolveSkillUse` (project parser, no eval). Sheet Use button: rolls through the dice business (local fallback if the host roll fails, no double roll), shows success and amounts. Starter attack skills got thresholds. Combat ticket N12 notes it must use `resolveSkillUse`. Review: ship, follow-ups applied. Suite 154/1218.
