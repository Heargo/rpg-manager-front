# Combat rules (pure) and world combat settings

Status: resolved
Type: task
Blocked by: 05, 15

Spec: `../spec.md` (Combat: World combat rules, Encounter flow).

World combat settings (life attribute, initiative mode, action types per turn, grid on/off and size, movement, basic attack, defence) with validation and export, in the World rules page Combat section and the wizard. `combat.rules.ts`: start an encounter from characters and NPC copies ("Goblin × 3"), initiative (rolled / typed / free order), turn and round progression skipping down combatants, action counters, a skill's computed effects at a rank (formula + dice text), use a skill (dice rolled with the `RandomSource`, cost and cooldown taken, a pending result), GM apply / edit then apply / dismiss of a pending result (damage with optional defence, heal capped at max, buffs with duration, notes), manual changes, one-step undo, end-of-combat reward proposal. No network, no combat UI.

Note (ui-feedback-2 ticket 13): using a skill in combat must go through `resolveSkillUse` (`skill/helpers/skill-roll.rules.ts`), not a second implementation: it takes the dice already drawn, the caster `{ level, maxima }`, the target `{ maxima }` (formula variables `target_<name>`) and the world `skillRollsEnabled` setting, and returns `{ success, rolls, total, amounts, error? }`. Combat adds cost, cooldown, defence and applying the amounts on top.

## Baseline

Test Files 171 passed, Tests 1345 passed.

## Seams

1. **World combat settings (pure world helpers: defaults, `validateWorldRules`/draft, JSON export/import)**: life attribute (required to start), initiative mode and formula, action types, grid on/size, movement, basic attack formula, defence formula; defaults as the spec table; invalid formulas or an unknown life attribute refused. Misses: the form.
2. **`combat.rules.ts` (pure, seeded `RandomSource`)**: start an encounter (characters + NPC copies "Goblin 1..3" with full current values); initiative rolled / typed / free and reorder; next turn and round wrap, skipping down combatants; action counters; skill preview at a rank (formula + dice text); use a skill through `resolveSkillUse` (cost and cooldown taken, pending result); apply (defence suggestion, heal capped at max, buffs with duration ticking at turn start), edit then apply, dismiss; manual damage/heal/status/edit/add/remove; one-step undo; end-of-combat reward proposal (XP split, money, loot). Misses: network and UI.
3. **Rule fields component (`TEST_PROVIDERS`)**: Combat section in the World rules page Rules tab and the wizard (collapsed there), editing and emitting every setting, live formula validation. Misses: layout.

## Red

- Test files: `src/app/modules/world/helpers/world-combat.rules.spec.ts` (new), `src/app/modules/combat/helpers/combat.rules.spec.ts` (new), `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts` (new describe "combat settings" appended)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one run per file)
- Failing: every test of the three files (the angular build fails on missing symbols, so each file is red as a whole, not per test):
  - `world-combat.rules.spec.ts` — missing `CombatRules` type, `World.combat`, `WorldDraft.combat`, `WorldRules.combat`, `./world-combat.rules` (`defaultCombatRules(lifeName?)`), error keys `combatLifeAttribute/combatInitiative/combatActionTypes/combatGrid/combatMovement/combatBasicAttack/combatDefence` in `WorldDraftErrors`, export parse of `world.combat`. Covers defaults, createWorld, validation, apply (rename/delete life attribute), export round-trip and refusal.
  - `combat.rules.spec.ts` — missing `combat/models/combat.ts` (`Combatant`, `Encounter`) and `combat/helpers/combat.rules.ts` (`startEncounter`, `rollInitiative`, `setInitiative`, `reorderCombatants`, `nextTurn`, `setActionUsed`, `skillPreview`, `useSkill`, `skillAvailability`, `applyPending`, `suggestDefence`, `dismissPending`, `damageCombatant`, `healCombatant`, `addStatus`, `removeStatus`, `editAttribute`, `addCombatant`, `removeCombatant`, `undo`, `proposeRewards`). Skill use must go through `resolveSkillUse`; dice are drawn from the `RandomSource` (scripted in tests), none when `skillRollsEnabled` is false.
  - `rule-fields.component.spec.ts` (combat describe, 7 tests) — missing `WorldDraft.combat` and the Combat section (`rules-section-combat`, `collapsed` input, `#combat-*` controls, `combat-error-*` live errors); the section does not exist yet.
- Notes for green: `World.combat` is required (`createWorld` sets it); `lifeAttribute` is an attribute name; encounter `turn` is an index into `combatants` (which is kept in turn order); pending results are one per target; `Combatant` has `side`, `level`, `attributes {name,current,max}`, `skills`, `cooldowns`, `actions {name,count,used}`, `effects {attribute,amount,duration}`, `statuses`, `initiative`, `down`.

## Green

- Files: src/app/modules/world/models/world.ts, helpers/{world-combat.rules,world-draft.rules,world-rules.rules,world-export,world.factory}.ts, components/rule-fields/*, pages/world-new-page/*, pages/world-rules-page/*, src/app/modules/combat/{models/combat.ts,helpers/combat.rules.ts}, public/i18n/{en,fr}.json
- Change: `CombatRules` on World/WorldDraft/WorldRules (defaults, validation, apply with life-attribute rename/delete, export check); pure `combat.rules.ts` (start, initiative, turns, skills through `resolveSkillUse`, pending apply/dismiss, undo, rewards); Combat `<details>` section in rule-fields (open on rules tab, `collapsed` in the wizard, live formula errors), wired in both pages, EN/FR strings.
- Suite: 172/173 files, 1415/1416 tests pass (baseline 171/1345); the one failure is a red-test bug (see below). tsc clean, ng build OK, no test file modified.
- Open questions: rule-fields spec "is open on the rules page and collapsed in the wizard" calls `openCombat()` twice in one test, so `TestBed.configureTestingModule` throws on the second call whatever the implementation; the test needs fixing. Also `ng test` fails here with TS2591 `node:crypto` (pre-existing, same on HEAD); I ran it with a temporary tsconfig adding `node` types, since removed.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/combat/helpers/combat.rules.ts:412-433 — skillPreview derives the "12 + 2d6" text by probing evaluateSkillAmount at roll 0 and 1 (assumes linear in roll; a non-linear amount reads wrong) — acceptable for now, note the assumption in the doc comment.
  - src/app/modules/combat/helpers/combat.rules.ts:526-536 — the log entry recomputes the roll total instead of reusing a result total (duplicated sum).
  - src/app/modules/world/helpers/world.factory.ts:90-96 — combatFor matches the life attribute with exact `===`, while validation is case-insensitive; a case-only mismatch silently clears it. Use `normalizeName`. Also, renaming the life attribute in the wizard leaves draft.combat.lifeAttribute stale (the rules page follows the rename, the wizard does not).
  - rule-fields.component.html:~93-130 — initiative errors show both the page-level `errors()["combatInitiative"]` and the live `combat-error-initiative`; a bad formula can show two messages.
  - Orchestrator's split of the "open on the rules page / collapsed in the wizard" test is fine (assertions unchanged).

Checked: turn/round wrap, down skipping (all down returns the encounter unchanged), cooldown and effect ticking at turn start, heal cap, defence floor at 0, one-step undo, floor XP split; skills go through resolveSkillUse (dice drawn once from RandomSource, none when rolls are off); combat.rules.ts has no Angular imports; life attribute rename/delete in applyWorldRules and export validation; EN/FR both updated; no secrets.

## Answer

World `combat` rules (life attribute, initiative rolled/typed/free with dice + formula, action types, grid, movement, basic attack, defence) with validation, export check and life-attribute rename/delete; Combat section in the rules page (open) and the wizard (collapsed). Pure `combat/helpers/combat.rules.ts`: start, initiative, turns and rounds, action counters, skill preview, skill use through `resolveSkillUse`, pending apply/edit/dismiss with defence suggestion, manual changes, one-step undo, reward proposal. Review: ship; follow-ups applied (case-insensitive life match, wizard follows a rename, one error message, preview linearity noted). Orchestrator: split one red test that configured TestBed twice; moved the combat i18n keys from `world.new.columns.combat` to `world.rules.combat` (labels showed raw keys; no test checks the text). Browser: Tools world rules sandbox, Combat section in FR and EN, one live error per bad formula. Worlds saved before this change have no `combat` and break the rules page: no migration (no backward compat in dev), recreate them. Suite 173/1417.
