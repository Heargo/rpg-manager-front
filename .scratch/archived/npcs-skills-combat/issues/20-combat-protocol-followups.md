# Combat protocol follow-ups

Status: resolved
Type: task
Blocked by: 13

Spec: `../spec.md` (Combat: Encounter flow, Sync and storage).

Review notes left by N13 (see the archived `13-combat-protocol.md`, `## Review`):

1. `projectEncounter`: `pending` and `log` reach players unfiltered, so a hidden NPC's life numbers can leak through them. The roll result itself is posted for everyone (spec step 4); strip only what the NPC's visibility rules hide (life values after a hit, for instance).
2. `combat/initiative`: a player can type their roll even when the world's initiative mode is `rolled`. Reject it outside `typed`.
3. `combat/use-item` and `combat/end`: errors from `applyCharacterAction` reach the client as raw codes; map them to `combat.errors.*` keys (EN and FR).
4. Found in the N14 browser check: using a skill doesn't tick an action counter, though the spec says counters are "ticked by hand or by using a skill".
   **Decided (user, 2026-11-13): each skill names its action type.** The skill model gets an optional action type (the name of one of the world's combat action types); the skill editor shows it as a select filled from the world's action types; the default classes and skills get sensible values. Using a skill in combat ticks that counter, or the world's first action type when the skill has none or names a type the world no longer has. Using a consumable item ticks the world's first action type. A counter at 0 doesn't block anything (reminder, not a lock). Included in skill JSON / export; no backward compatibility needed.

## Baseline

`npm test` (2026-11-13, after N14; only docs changed since): Test Files 189 passed (189), Tests 1551 passed (1551).

## Seams

1. **Combat business over the fake peer network** (`src/testing/game-device.ts`, as in `combat/business/combat.spec.ts`): typed initiative refused in `rolled` mode (and accepted in `typed`); `use-item` / `end` failures reach the client as `combat.errors.*` keys; using a skill ticks the skill's action type counter, or the world's first type when the skill has none or names an unknown type; using a consumable ticks the first type; a counter at 0 doesn't block. Catches: the protocol end to end. Misses: the view filtering matrix (seam 2), the editor (seam 3).
2. **`projectEncounter`** (pure, `combat-view.rules.ts`): `pending` and `log` keep the roll and the amount (public, spec step 4) but drop a hidden NPC's life values that its visibility rules hide; GM view unchanged. Catches: every leak path per role. Misses: transport.
3. **Skill rules / editor business** (`skill.rules.ts` validation and JSON, `SkillEditorBusiness`): the optional `actionType` field, its options from the world's combat action types, JSON / export round trip and validation, the default skills carrying sensible values. Catches: the model and editor logic. Misses: the select's layout (browser check).

## Red

- Test files: `src/app/modules/combat/business/combat.spec.ts` (extended), `src/app/modules/combat/helpers/combat-view.rules.spec.ts` (extended), `src/app/modules/skill/helpers/skill.rules.spec.ts` (extended), `src/app/modules/skill/business/skill-editor.business.spec.ts` (new), `src/app/modules/world/helpers/starter-classes.spec.ts` (new)
- Run: `npm test` (the missing `actionType` field and `actionTypeOptions` make the whole bundle fail to compile, TS2339/TS2353; a single-file `--include` run of a spec that pulls no node types also fails on `node:crypto`, as it does at baseline)
- Failing: 36 tests (7 verified by a run in `combat.spec.ts` before the model compile errors; the rest red by compile error until the symbols exist)
  - combat.spec: a skill ticks the counter of its action type; a skill without an action type ticks the first action type; a skill naming an unknown action type ticks the first; a consumable ticks the first — counters stay 0 today
  - combat.spec: item errors (`notConsumable`, `unknownItem`) reach the client as `combat.errors.*` messages — raw `character.errors.*` today; the keys `notConsumable`, `unknownItem`, `initiativeNotTyped` exist in EN and FR — missing today
  - combat.spec: typed initiative refused in `rolled` mode, player and GM, `rejected` / `combat.errors.initiativeNotTyped` — resolves today
  - combat-view.rules.spec (7): pending keeps roll/total/success/amounts/duration; names no attribute the viewer can't see (life shown by lifeBar or lifeNumbers, any attribute shown by `attributes`); a character target and the GM view unfiltered; log unchanged — `PendingEffect.attribute` is not optional / never dropped today
  - skill.rules.spec (6): `actionType` accepted when set (known or unknown name), optional, refused when blank, refused on a passive skill, JSON round trip, refused in JSON when not a string — field missing
  - skill-editor.business.spec (4): `actionTypeOptions(world)` lists the world's combat action type names in order; empty skill has none; JSON round trip; passive with an action type is an `actionType`/`invalid` issue — method and field missing
  - starter-classes.spec (3): every active starter skill names one of the world's action types, passives none; Power Strike, Fireball, Quick Stab on the first type; Shadow Step on `Movement` with the default types — field missing
- Notes: the `end` error mapping isn't tested: the only `applyCharacterAction` failure there (`invalidAmount`) is unreachable, since the host parser caps XP at the same 1,000,000. The "counter at 0 blocks nothing" case passes already (the counter is capped at its count), so it has no test. Pending-effect filtering is my reading of "drop what the visibility rules hide" (amounts stay public, no life values exist in pending/log today): the effect's `attribute` name is dropped when the viewer can't see that attribute on the hidden NPC.

## Green

- Files: `src/app/modules/combat/business/combat-host.business.ts`, `combat/helpers/combat.rules.ts` (`tickedAction`, used by `useSkill`), `combat/helpers/combat-view.rules.ts`, `combat/models/combat.ts` (`PendingEffectView`, `PendingResultView`), `combat/components/combat-gm-panel/combat-gm-panel.component.ts` (view type), `skill/models/skill.ts`, `skill/helpers/skill.rules.ts`, `skill/business/skill-editor.business.ts`, `skill/components/skill-editor/skill-editor.component.ts`, `world/helpers/starter-classes.ts`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: skills get an optional `actionType` (validated, JSON, editor `p-select` with clear, active skills only, options from the world's action types); using a skill or a consumable ticks that counter (or the first) without an extra undo step; starter skills carry action types (Shadow Step on a movement type); `initiative` is refused in `rolled` mode; `applyCharacterAction` errors (use-item and end) become `combat.errors.*` (new keys `notConsumable`, `unknownItem`, `invalidAmount`, `initiativeNotTyped`); players' pending effects drop `attribute` when hidden (typed as a view type, so the GM's pending results keep it required).
- Suite: 191 files / 1578 tests pass (baseline 189 / 1551); tsc clean; ng build no error; no unstaged test file.
- Open questions: initiative is refused only in `rolled`, not outside `typed`, because the existing GM panel spec (`free` mode) types an initiative; say if `free` should refuse too.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `combat-view.rules.ts` projectPending: re-derives the role and `shown()` visibility logic already in projectCombatant (duplicated); extract a shared `visibilityOf(target, world)` helper.
  - `skill-editor.business.ts:23-27`: lazy `Injector.get(WordListBusiness)` inside `random()` is a workaround for specs; prefer providing a stub `WordListBusiness` in the new spec and keep `inject()` as a field (matches the module pattern).
  - `starter-classes.ts` (~535): the `movement ? movementType : actionTypes[0]` ternary is evaluated twice; compute once. `Partial<Pick<World,'combat'>>` plus the optional chaining is generality only tests need; the real caller always has `combat`.
  - `skill-editor.component.ts` `actionTypeOptions`: appending an unknown current name is good (keeps a stale value visible); the `void actionType` destructure idiom repeats, fine given the file's pattern.
  - Log entries carry no life values, so leaving `log` unfiltered is correct today.

## Answer

1. Players' pending results drop an effect's `attribute` when the viewer can't see that attribute on a hidden NPC (`PendingEffectView` / `PendingResultView`); rolls and amounts stay public; the GM view is unchanged. The log carries no life values, so it stays as is.
2. `combat/initiative` is refused in `rolled` mode (`combat.errors.initiativeNotTyped`), for players and the GM. Still allowed in `free` (the GM orders by hand; an N14 GM panel test types one there).
3. `use-item` and `end` map `applyCharacterAction` errors to `combat.errors.*` (`notConsumable`, `unknownItem`, `invalidAmount`), EN and FR.
4. Skills have an optional `actionType` (validated, in the JSON, active skills only), a `p-select` in the skill editor with options from the world's action types. Using a skill ticks its type's counter, or the world's first type when it has none or an unknown one; consumables tick the first type; counters never block. Starter skills carry action types (Shadow Step on Movement).

Checked: full suite 191 files / 1578 tests (baseline 189 / 1551); `ng build` clean; review ship. Browser: skill editor on `/tools/skills`, Fireball shows "Type d'action: Action" with options Action / Movement, in FR desktop and EN at 375px (no horizontal scroll), no console errors. The combat tick, initiative and view filtering are covered by the fake-network tests.

Not done (review "Consider"): share the visibility helper between `projectPending` and `projectCombatant`; stub `WordListBusiness` in the spec instead of the lazy inject in `SkillEditorBusiness.random()`; compute the starter-skill action type once.
