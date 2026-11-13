# Combat protocol and host persistence

Status: resolved
Type: task
Blocked by: 12, 02, 10

Spec: `../spec.md` (Combat: Sync and storage).

Host business for the `combat/*` routes and the `combat/state` topic; encounter saved with the world and resumed after a host reload. Authorization: GM routes; a player only for their own combatant (initiative, use skill, items, move, tick action, end turn on their turn); `combat/use-skill` rolls on the host and posts a pending result; only the GM applies, edits or dismisses it. Characters' current values change on their records, NPC copies only in the encounter; NPC combatants projected with the world's NPC visibility rules (10); rewards through `grant-xp`. Tested over the fake peer network.

## Baseline

`npm test` (2026-11-13): Test Files 184 passed (184), Tests 1490 passed (1490).

## Seams

1. **Combat business over the fake peer network** (`src/testing/game-device.ts`: a host, the GM and players in one test): a GM-side/player-side `combat.business.ts` calling the `combat/*` routes, handled by a host `combat-host.business.ts`, and the `combat/state` topic. Catches: every route, authorization (GM only vs own combatant on their turn), host-side skill roll creating a pending result, apply/edit/dismiss by GM only, character current values written to the character records, NPC copies only in the encounter, `World.encounter` saved and resumed after a host reload, rewards via `grant-xp`. Misses: the exact NPC field matrix per visibility role (seam 2), UI.
2. **`combat-view.rules.ts` projection** (pure): `projectEncounter(encounter, world rules)` → the players' `combat/state` view, with NPC combatants filtered by the world's NPC visibility rules (N10). Catches: every visibility role and which fields leak. Misses: transport.

## Red

- Test files: `src/app/modules/combat/business/combat.spec.ts` (seam 1), `src/app/modules/combat/helpers/combat-view.rules.spec.ts` (seam 2)
- Run: `npx ng test --watch=false --include src/app/modules/combat/business/combat.spec.ts` and `npx ng test --watch=false --include src/app/modules/combat/helpers/combat-view.rules.spec.ts`
- Contract the tests assume (also in the header of `combat.spec.ts`): `CombatBusiness` (`combat/business/combat.business.ts`, with `CombatService` and `CombatHostBusiness` listed in `GAME_DEVICE` and started by `GameSessionBusiness`) with `$state()` (the `CombatView`, null without encounter) and `start/add/remove/reorder/edit/apply/dismiss/undo/end/initiative/useSkill/useItem/move/tickAction/endTurn`; `World.encounter?: Encounter`; `Combatant.position?: {x,y}`; `projectEncounter(encounter, world)` in `combat/helpers/combat-view.rules.ts` returning `{ round, activeId, combatants, pending, log }` (no `previous`, no `seq`). Forbidden calls reject with `PeerApiError` code `'forbidden'`. Skill dice are 1d1 so the host's crypto roll is predictable. `src/testing/game-device.ts` was not edited (importing missing files would break the whole suite); green must add the three combat providers to `GAME_DEVICE`.
- Failing: both files fail to build (missing modules `./combat.business` and `./combat-view.rules`), so every test below is red:
  - combat-view.rules.spec.ts (11 tests): keeps order/round/active/pending/log; always-shown fields; nothing else with all ticks off; each ticked field alone; default enemy visibility; union of role ticks; ally follows NPC rules; no reward/money/loot/skills/cooldowns leak; character combatant shown fully; life bar 0 — `projectEncounter` does not exist.
  - combat.spec.ts (22 tests): no encounter until start; start shows order/round/active; GM-only routes forbidden to players; add/remove NPC copy; reorder; tick action (own vs other); move token (own vs other); end turn and round wrap; use-skill creates host-rolled pending with cost on record; use-skill for another's combatant forbidden; GM-only apply (catalogue NPC unchanged); apply edited amount; GM-only dismiss; hit writes to character record; consumable heals record and leaves inventory; use-item for another forbidden; undo reverts record; hit on NPC copy leaves catalogue; NPC visibility in `combat/state`; end grants XP via grant-xp and clears encounter; end without rewards; resume after host reload; rolled initiative at start; typed initiative (own roll vs others) — `CombatBusiness` does not exist.

## Green

- Files: `src/app/modules/combat/business/combat.business.ts`, `combat-host.business.ts`, `services/combat.service.ts`, `helpers/combat-view.rules.ts`, `helpers/combat.rules.ts` (added `moveCombatant`, `setCombatantCurrents`, `withoutUndo`, `syncCharacters`, and a `roll` helper), `models/combat.ts` (`position`, `CombatView`, routes, topic), `world/models/world.ts` (`encounter?`), `play/business/game-session.business.ts`, `src/testing/game-device.ts`, `public/i18n/en.json` and `fr.json` (`combat.errors.*`)
- Change: `CombatHostBusiness` serves the 15 `combat/*` routes (GM-only vs own combatant, `endTurn` for the active combatant's player), applies the `combat.rules` functions inside `WorldSessionBusiness.update`, and writes the bar currents of character combatants to their records. It also grants XP through `grant-xp`, and publishes the players' `projectEncounter` view on `combat/state`. `CombatBusiness.$state` is the full view for the host and the watched topic for players. The encounter is saved in `World.encounter`, so it resumes after a reload.
- Suite: 186 files / 1524 tests passing (baseline 184 / 1490). `tsc` is clean and `ng build` has no error.
- Open questions: the test uses 1d1 skill dice, but `rollDie` rejects fewer than 2 sides (and `dice.spec` requires that), so `combat.rules` rolls a one-sided die locally instead of changing `rollDice`. The GM's `$state` is the full view (all NPC fields, no rewards/loot), because the test reads Goblin life numbers on the GM side.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `combat-host.business.ts` `useItem`/`finish` — `result.error` from `applyCharacterAction` goes into `PeerApiError` as a raw code, not a `combat.errors.*` key; map or add keys.
  - `combat-host.business.ts` `initiative` — a player can type initiative even when the world's mode is `rolled`; consider rejecting or confirm intended.
  - `combat-view.rules.ts` `projectEncounter` — `pending` and `log` go to players unfiltered, so a hidden NPC's damage or life numbers can show up in them. The ticket tests keep them as-is, so confirm with the spec (ticket 14/15) before the UI shows them.
  - `combat.rules.ts` `roll` — the 1-sided special case is acceptable (keeps `rollDice` and `dice.spec` intact), but it is a second dice path. Consider relaxing `rollDice` to accept 1 sided dice later.
  - `combat.rules.ts` `syncCharacters` — calls `Date.now()` inside a "pure" rules helper; pass the timestamp in.
  - `combat.business.ts` `$state` — the GM's full view is fine and documented; flag it in the glossary or spec so the UI does not reuse it for players.
  - `combat-host.business.ts` — `CharacterHostBusiness`'s grant-xp/record bump (`rev`, `updatedAt`) is duplicated in `useItem` and `finish`; extract a helper.
  - Prettier warns on `combat.rules.ts` and the three combat spec files; run `prettier --write`.

## Answer

Built `CombatHostBusiness` (host handlers for the 15 `combat/*` routes, publishing `combat/state`), `CombatBusiness` + `CombatService` (GM and player side, `$state`), and `projectEncounter` in `combat-view.rules.ts` (players' view, NPC combatants filtered by the world's NPC visibility rules). The encounter is saved as `World.encounter` and resumes after a host reload. GM-only routes are refused to players with `forbidden`; owner routes check the combatant's character `playerId`, `end-turn` only for the active combatant. `use-skill` rolls on the host and posts a pending result; only the GM applies/edits/dismisses. Character currents are written to their records; NPC copies live only in the encounter; rewards go through `grant-xp`.

Decisions: skill dice with one side are rolled in `combat.rules.ts` (`rollDice` still rejects <2 sides); the GM's `$state` is the full view (all NPC fields, no rewards/loot) and must not be reused for players.

Checked: 33 new tests over the fake peer network and the pure projection; full suite 186 files / 1524 tests (baseline 184 / 1490); `ng build` clean; review verdict ship. No UI in this ticket, so no browser check (N14 adds the UI). Open review notes to weigh in N14: `pending`/`log` reach players unfiltered (could leak a hidden NPC's numbers), typed initiative accepted even in `rolled` mode, raw error codes from `applyCharacterAction` in `use-item`/`end`.
