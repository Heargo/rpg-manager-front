# Optional combat steps in World rules

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Optional combat steps)

- `CombatRules` gets a switch per step: initiative, action counters, GM validation, defence, rewards (all on by default; no migration, dev worlds get the defaults).
- World rules Combat section (and the wizard's Rules step, Tools sandbox): one toggle per step; a step's own settings are hidden when it is off.
- Combat: initiative off = free order; action counters off = no counters on the turn; GM validation off = results apply at once (cost, effects, log, no pending result); defence off = no reduction offered; rewards off = no XP/money/loot at the end. Host and player views both follow.

## Decisions (orchestrator, from the spec)

- Model: `CombatRules.steps = { initiative, actionCounters, gmValidation, defence, rewards }`, booleans, all `true` in `defaultCombatRules`. `combatImportProblems` requires the block (no backward compatibility: dev worlds get the defaults when recreated).
- **Initiative off** = free order everywhere: one helper gives the effective mode (`steps.initiative ? initiative.mode : 'free'`), used by the host (no roll at start, typed initiative rejected like in free mode), by `CombatBusiness.$initiativeMode` and the player view (no typed input). Initiative settings are not validated while off.
- **Action counters off** = combatants are created with `actions: []`; the turn shows no counters. Action types are not validated while off.
- **GM validation off** = using a skill applies each result at once (same as the GM pressing Apply with the rolled amounts), so `encounter.pending` stays empty; cost, cooldown and log as today. The defence reduction is applied automatically when the defence step is on and the world has a defence formula.
- **Defence off** = no defence offered when applying (the GM panel hides it, the host ignores `defence: true`); the defence formula is not validated while off.
- **Rewards off** = ending a combat shows no rewards screen and gives no XP, money or loot (`rewards()` returns null; the host ignores rewards sent anyway).
- World rules Combat section (same `rule-fields` component in the wizard, the World rules page and the Tools sandbox): one toggle per step, at the top of the section; a step's own settings are hidden while it is off (initiative mode, dice and formula; action types; defence formula). Grid, movement and basic attack stay as they are.
- The Tools combat sandbox follows the same rules through the shared helpers.

## Baseline

Test Files 200 passed, Tests 1660 passed.

## Seams

1. **Pure helpers** `world/helpers/world-combat.rules.ts` (defaults, validation skipping steps that are off, import problems, effective initiative mode) and `combat/helpers/combat.rules.ts` (combatant actions, skill use applied at once without GM validation, defence ignored when off, rewards null when off). Catches every rule; misses wiring.
2. **Combat over the fake peer network** (`combat.spec.ts`, `src/testing/game-device.ts`): host start with initiative off (no rolls, typed initiative rejected), a skill use with GM validation off lands on the target with no pending result, defence ignored when off, ending with rewards off gives no XP. Misses: what the screens show.
3. **Components (`TEST_PROVIDERS`)**: `rule-fields` (a toggle per step; settings hidden when off), the GM panel (no defence option, no rewards screen when off) and the player view (no typed initiative when off). Misses: layout (browser).

## Red

- Test files: `src/app/modules/world/helpers/world-combat.rules.spec.ts`, `src/app/modules/combat/helpers/combat.rules.spec.ts`, `src/app/modules/combat/business/combat.spec.ts`, `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts`, `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts`, `src/app/modules/combat/components/combat-player-view/combat-player-view.component.spec.ts`; fixture `src/testing/combat-table.ts` (`combatTable(mode, extra?: Partial<CombatRules>)`, `extra` spread over the rules).
- Run: `npm test 2>&1 | grep -E "Test Files|Tests |FAIL|ERROR"` (single-file `--include` does not work here). The red is a compile failure of the whole suite: `CombatRules.steps`, `effectiveInitiativeMode` (world-combat.rules.ts), `combatRewards(enc, rules): RewardProposal | null` (combat.rules.ts) and a 6th optional `rules?: CombatRules` argument on `useSkill` do not exist yet. Once they exist, the tests below fail on behaviour. Existing fixtures (`rules()` in combat.spec.ts and combat-table.ts, `defaultCombatRules`, other `CombatRules` literals) will need `steps` at green.
- API chosen by the tests: `steps = { initiative, actionCounters, gmValidation, defence, rewards }`; `effectiveInitiativeMode(rules)` returns `'free'` when initiative is off; `useSkill(enc, use, skills, rolls, random, rules)` applies at once (with defence when on) if `rules.steps.gmValidation` is false; `combatRewards` returns null when rewards is off; host rejects typed initiative with `combat.errors.initiativeNotTyped` when initiative is off; rule-fields switches `#combat-step-initiative|action-counters|gm-validation|defence|rewards` (p-toggleswitch inputId).
- Failing: 30 tests, each one line
  - world-combat.rules: steps on by default — no `steps` in `defaultCombatRules`
  - world-combat.rules: effective initiative mode free when off — `effectiveInitiativeMode` missing
  - world-combat.rules: initiative settings not validated while off — validation ignores steps
  - world-combat.rules: action types not validated while off — same
  - world-combat.rules: defence formula not validated while off — same
  - world-combat.rules: other settings still validated when a step is off — `steps` missing in the type
  - world-combat.rules: import requires a valid `steps` block — `combatImportProblems` does not check it
  - combat.rules: no action counters when off — combatants always get `actions`
  - combat.rules: action counters kept when on — `steps` missing
  - combat.rules: pending result when GM validation on — `useSkill` takes no rules / `steps` missing
  - combat.rules: skill applied at once when GM validation off — still posts a pending result
  - combat.rules: applied at once without defence when both off — same
  - combat.rules: defence ignored/suggested 0 when off — `suggestDefence`/`applyPending` ignore steps
  - combat.rules: no rewards when off — `combatRewards` missing
  - combat.rules: rewards when on — `combatRewards` missing
  - combat.spec: initiative off, no roll and typed initiative refused — host still rolls and does not refuse
  - combat.spec: free order mode shown to every device when initiative off — `$initiativeMode` ignores steps
  - combat.spec: no action counters when off — actions always created
  - combat.spec: skill applied at once when GM validation off — pending result is posted
  - combat.spec: defence taken off an immediate hit — no immediate application
  - combat.spec: no defence when step off, `defence: true` ignored — host applies defence
  - combat.spec: no rewards when off — `rewards()` not null, XP granted
  - rule-fields: one switch per step, all on by default — no `#combat-step-*` controls
  - rule-fields: turning a step off updates the draft — same
  - rule-fields: initiative settings hidden when off — still rendered
  - rule-fields: action types hidden when off — still rendered
  - rule-fields: defence formula hidden when off — still rendered
  - gm-panel: no counters on the active row when action counters off — counters still shown
  - gm-panel: ends at once with no rewards dialog and no XP when rewards off — dialog still shown
  - player-view: no typed initiative when initiative off in typed mode — input still shown
  - player-view: no action counters when off — counters still shown

## Green

- Files: `src/app/modules/world/models/world.ts`, `world/helpers/world-combat.rules.ts`, `combat/helpers/combat.rules.ts`, `combat/helpers/combat-view.rules.ts`, `combat/business/combat.business.ts`, `combat/business/combat-host.business.ts`, `combat/components/combat-gm-panel/combat-gm-panel.component.ts`, `world/components/rule-fields/rule-fields.component.{ts,html}`, `tools/business/sandbox-combat.business.ts`, `public/i18n/en.json`, `public/i18n/fr.json`; fixture literals in `src/testing/combat-table.ts` and `combat/business/combat.spec.ts`
- Change: `CombatRules.steps`, `effectiveInitiativeMode`, `combatRewards`, `useSkill(..., rules?)` applying at once when GM validation is off, defence ignored when off, validation/import skip or require steps, host/business/sandbox/view follow the steps, rule-fields toggles with hidden settings, GM panel ends at once without rewards.
- Suite: 1688 passed, 3 failed (baseline 1660 passed); tsc clean, build OK.
- Open questions: (1) `combat.spec.ts` `rules()` and `combat-table.ts` `rules()` literals lacked `steps` (compile error), so I added all-true `steps` to both literals (unstaged edits to a staged spec). (2) `combatTable` needed `TestBed.resetTestingModule()` because the GM panel spec calls it after `beforeEach` already built a table. (3) 3 combat.spec tests look wrong: Goblin starts at Life 10 (attribute base 10, existing test at 545 shows 5 damage = 50%), but "applies a skill at once", "takes the defence off an immediate hit" and "offers no defence when that step is off" expect 10, 12, 10, as if it started at 15; the code gives 5, 7, 5 (10-5, 10-(5-2), 10-5).

## Orchestrator test fixes (after green)

- `combat.spec.ts` "optional steps": the Goblin starts at 10 Life and Fireball deals 5, so the expected Life is 5 (applied at once), 7 (defence 2 on an immediate hit) and 5 (defence step off), not 10 / 12 / 10. Players only see an enemy's life bar, so the "applied at once" test checks the number on the GM's device and a 50 % bar on the players'.
- Fixture `combat-table.ts`: green added `steps` to the rules literal and `TestBed.resetTestingModule()` before configuring, so a spec can build a second table after `beforeEach`; kept.
- Suite after the fixes: 200 files, 1691 tests pass; build clean.

## Review

Verdict: ship, no must-fix. Applied: the `CombatRules` doc comment moved back onto `CombatRules`, `CombatSteps` got its own. Not applied (consider): make `useSkill`'s `rules` required, a shared `grantedXp` helper for the host and the sandbox, a comment on the at-once path relying on `defenceOf` returning 0 when the step is off, an unrelated Prettier reflow of the `max-level` label.

## Answer

`CombatRules.steps` (initiative, action counters, GM validation, defence, rewards; all on by default). Off: initiative → free order everywhere (`effectiveInitiativeMode`), no roll, typed initiative refused; action counters → combatants have no `actions`; GM validation → a skill's results are applied at once (cost, cooldown, log, one undo step), with the defence taken off when that step is on and the world has a formula; defence → never offered nor applied (`defence: true` ignored); rewards → `combatRewards` / `rewards()` null, the GM panel's End ends at once, the host ignores XP sent. Validation skips the settings of steps that are off; import requires the `steps` block. World rules Combat section (wizard, World rules page, Tools sandbox share `rule-fields`): five switches after the life attribute; initiative, action types and defence settings are hidden while their step is off. The Tools combat sandbox follows the same rules.

Developed with the red / green / review subagents. Orchestrator fixes to the red tests are listed above (wrong expected Life values, enemy life seen by players as a bar only).

Checked in the browser: Tools World rules (1024 px FR) shows the five switches on; turning off initiative, action counters and defence hides their settings, movement and the rest stay; after saving, the Tools combat sandbox starts with no initiative values and no action counters. EN labels at 375 px. No console error. Pre-existing, not from this ticket: on a phone the World rules page scrolls sideways because the initiative dice row and the action type rows are wider than the screen (they fit once those steps are off).

Suite: 200 files, 1691 tests (31 new, 1660 before); build clean.
