# Shared combat rolls and recap banner

Status: resolved
Type: task
Blocked by: 06

Spec: `../spec.md` (Rolls and results, Decisions: shared rolls)

- Every combat roll (skill, basic attack, item, initiative) plays the 3D dice overlay on every device, whatever the shared-dice toggle. Hidden NPC rolls show dice and total only.
- Recap banner, top left of the table on every device: caster, skill, targets, then dice and total once landed; stays until the GM resolves, then fades after 4 s.
- GM's result card (apply, edit, dismiss) appears once the roll has landed; with GM validation off the result applies when it lands.

## Decisions (orchestrator)

- **Which rolls**: every combat **action** that rolls dice: a skill use (basic attack included when it rolls) and an item use when it rolls. Initiative is not an action: it is not animated (its values stay in the order list as today). The user's words were "à chaque action qui déclenche un lancer de dé".
- **One shared roll per use** (not per target). The host, right where it draws the use's dice (`useSkill`/`useItem` handlers in `combat-host.business.ts`), also publishes it on the existing dice topic through `DiceHostBusiness.announce(roll)` (new): a `SharedRoll` with `by` = the caster's player (the host's player for an NPC), `count`/`sides`/`values` = the use's dice, a seed, and a new optional `combat: { casterName; skillName; targetNames: string[]; pendingIds: string[]; total: number; success: boolean }`. The values are the ones the result uses (no second draw).
- **Played on every device, whatever the shared-dice toggle**: `DiceRollBusiness.takeUnseenTableRoll` also returns a fresh combat roll made "by me" (today it skips this player's own rolls), so the caster's and the GM's devices animate it too. The overlay is the existing `app-dice-overlay`.
- **Hidden NPCs**: the shared roll carries only names, dice and total, never attributes (same as the pending view today).
- **Recap banner** `app-combat-roll-banner` (in `combat/components/`), placed top left of the table on every device (table page, both GM and player layouts) and in the Tools sandbox: "**Caster** · Skill → Target, Target", then once the roll has landed "🎲 3 + 5 = 8" and Success/Failure. It stays while any of its `pendingIds` is still pending, then fades out after **4 s**; a new combat roll replaces it. With GM validation off (no pending), it fades 4 s after landing. Keys `combat.banner.*` (FR, EN), `aria-live="polite"`.
- **Landed**: a root `CombatRollsBusiness` (`combat/business/`) follows the latest combat shared roll and exposes `$banner` and `isLanding(pendingId)`. A roll counts as landed when `DiceRollBusiness` reports that roll id `$settled`, or after a **6 s** fallback (no 3D, slow device, tests), so nothing stays hidden.
- **GM result card after landing**: the GM panel hides a pending result while `isLanding(id)` is true, then shows Apply / Edit / Dismiss as today.
- **GM validation off**: the host still applies at once (it cannot know when a device's animation ends); the banner shows the result after landing. Assumed, simpler and safe.
- **Sandbox** (no room): `SandboxCombatBusiness` feeds the same `CombatRollsBusiness` and plays the roll locally through `DiceRollBusiness.presentShared`; the banner shows above the sandbox grid.

## Baseline

Test Files 241 passed, Tests 2120 passed.

Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session; at commit, only this ticket's i18n lines are staged.

## Seams

1. **Combat over the fake peer network** (`combat.spec.ts`, `src/testing/game-device.ts`): a player's skill use publishes one shared roll with the use's values, names and pending ids on every device, also on the caster's own device (`takeUnseenTableRoll` returns it there); a use with no dice publishes nothing; initiative publishes nothing; a hidden NPC's roll carries no attributes. Misses: the 3D throw.
2. **`CombatRollsBusiness`** (with a fake clock: `vi.useFakeTimers`): banner from the latest combat roll, landing on settle or after 6 s, `isLanding` per pending id, fade 4 s after resolve (or after landing when no pending). Misses: UI.
3. **Components** (`TEST_PROVIDERS`): `app-combat-roll-banner` (caster, skill, targets; dice and total only once landed; gone after the fade) and the GM panel (a pending result hidden while landing, shown after). Misses: layout and animation (browser).

## Red

- Test files: `src/app/modules/combat/business/combat.spec.ts` (new `shared rolls` describe), `src/app/modules/combat/business/combat-rolls.business.spec.ts` (new), `src/app/modules/combat/components/combat-roll-banner/combat-roll-banner.component.spec.ts` (new), `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts` (edited)
- Run: `npx ng test --watch=false --include src/app/modules/combat/business/combat.spec.ts` (same with each other file path)
- Contract the tests fix (green must follow):
  - `SharedRoll.combat?: { casterName, skillName, targetNames, pendingIds, total, success }` (exactly these keys); `DiceRollBusiness.takeUnseenTableRoll` returns a fresh roll that has `combat` even when made by me (non-combat own rolls still skipped).
  - `CombatRollsBusiness` (`combat/business/combat-rolls.business.ts`): `$banner()` is null or `{ casterName, skillName, targetNames, result?: { values, total, success } }` (`result` only once landed); `isLanding(pendingId)`; landed = `DiceRollBusiness` shows that roll id and `$settled()`, or 6 s (setTimeout) after arrival; banner fades 4 s (setTimeout) after the last pending id is resolved, or after landing when there is none. It must be added to `GAME_DEVICE` in `src/testing/game-device.ts` (not a spec file, so left to green).
  - `app-combat-roll-banner` (`combat/components/combat-roll-banner/combat-roll-banner.component.ts`, class `CombatRollBannerComponent`, no inputs): `[data-testid="roll-banner"]` with `aria-live="polite"`, `[data-field="banner-caster"|"banner-skill"]`, one `[data-field="banner-target"]` per target, and only once landed `banner-dice`, `banner-total`, `banner-outcome[data-success]`.
  - GM panel hides `[data-testid="pending"]` while `isLanding(id)`.
- Existing tests moved to the new contract: in `combat-gm-panel.component.spec.ts`, the four `using a skill` tests (list the pending result, apply in one tap, edit then apply, dismiss) now first land the roll (`takeUnseenTableRoll` + `presentShared` + `markSettled` on the GM device) before reading the pending card; header contract updated. `table.business.spec.ts` ("shares a roll drawn by the host") is unchanged and still valid: a non-combat own roll stays skipped. No existing test needed removing.
- Not covered here (outside the agreed seams): sandbox feeding, the overlay playing the roll, banner placement in the table layouts.
- Failing: 7 test blocks
  - combat.spec `publishes one shared roll per skill use on every device...` — no roll published (`$tableRolls()` empty)
  - combat.spec `hands the roll to every device to throw, the caster own device included, once` — no roll to take
  - combat.spec `publishes the roll whatever the shared dice toggle` — `takeUnseenTableRoll` null
  - combat.spec `shows a hidden NPC roll as names, dice and total only...` — no roll / no `combat` field
  - combat-gm-panel.spec `hides the pending result while the roll is landing...` — pending card shown at once
  - `combat-rolls.business.spec.ts` (7 tests) — missing module `combat-rolls.business` (compile error)
  - `combat-roll-banner.component.spec.ts` (4 tests) — missing modules `combat-rolls.business` and `combat-roll-banner.component` (compile error)
- Already green on purpose (regression guards): combat.spec `publishes nothing for a use that rolls no dice` and `publishes nothing for the initiative rolled at the start`.

## Green

- Files: `src/app/modules/combat/business/combat-rolls.business.ts` (new), `.../combat/helpers/combat-roll.rules.ts` (new), `.../combat/components/combat-roll-banner/combat-roll-banner.component.ts` (new), `.../combat/business/combat-host.business.ts`, `.../combat/components/combat-gm-panel/combat-gm-panel.component.{ts,html}`, `.../dice/models/dice-api.ts`, `.../dice/business/dice-host.business.ts`, `.../dice/business/dice-roll.business.ts`, `.../dice/components/dice-overlay/dice-overlay.component.ts`, `.../table/pages/table-page/table-page.component.{ts,html,scss}`, `.../tools/business/sandbox-combat.business.ts`, `.../tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.ts`, `src/testing/game-device.ts`, `public/i18n/{en,fr}.json` (`combat.banner.label|success|failure`)
- Change: the host publishes one shared roll per skill use (`DiceHostBusiness.announce`, `combat` field on `SharedRoll`); `takeUnseenTableRoll` returns combat rolls made by me; the overlay throws every unseen table roll; `CombatRollsBusiness` (banner, landing, 6 s fallback, 4 s fade) feeds the banner (table page fixed top left, sandbox above the grid) and the GM panel hides pending results while landing; the sandbox has its own `CombatRollsBusiness` and plays rolls via `present` -> `presentShared`. Items do not roll dice, so no item roll.
- Suite: 243 files / 2139 tests pass (baseline 241 / 2120); 4 unhandled IndexedDB/pack-draft errors come from unrelated pack specs.
- Open questions: `table-page.component.spec.ts` shows an unstaged formatting-only diff (my prettier glob caught it); restoring it from HEAD was denied, please revert it.

## Review

- Verdict: ship. No hidden NPC attribute in the shared roll; the roll is built from the use's own log entry (no second draw); an own non-combat roll is still skipped; timers are cleared on each new roll; the 6 s fallback always lands, so the GM never loses a pending result.
- Applied after the browser check (no test change): the dice overlay hid nothing on a combat roll, so "Relancer" offered an unrelated plain roll; `presentShared` now marks combat rolls and the overlay hides the reroll for them (Close stays).
- Consider (not applied): the host keeps the announcement in a closure shared by concurrent `useSkill` calls (two overlapping uses could drop one animation); both `dice-roller` and `dice-overlay` take unseen table rolls (harmless, redundant); `skillUseRoll` relies on the last `skill` log line.
- Items: no item use rolls dice today, so only skill uses publish a roll.

## Answer

- `SharedRoll.combat` (names, pending ids, total, success; no attributes). The host publishes one shared roll per skill use that rolls (`DiceHostBusiness.announce`), with the same dice as the result. `takeUnseenTableRoll` also returns fresh combat rolls made by this device's player, so the overlay throws them on every device, whatever the shared-dice toggle; the overlay offers no reroll for them.
- `CombatRollsBusiness`: banner of the latest combat roll, landed on settle or after 6 s, `isLanding(pendingId)`, fades 4 s after the last pending result is resolved (or after landing when none). `app-combat-roll-banner` top left of the table (GM and player) and above the sandbox grid; keys `combat.banner.label|success|failure` (FR, EN). The GM panel hides a pending result while it lands. Sandbox: its own business, rolls played locally.
- Initiative is not animated (not an action). With GM validation off the host still applies at once.
- Tests: 19 new (multi-device host, business with fake timers, banner, GM panel); 4 GM panel tests now land the roll before reading the card. Suite 243 files, 2139 tests pass (baseline 2120). The run reports 4 unhandled rejections from two pack specs (`pack-update-atomic`, `pack-draft-page.lifecycle`); they happen on a clean HEAD checkout too, so they predate this ticket. Build clean.
- Browser: Tools sandbox, FR desktop: using Trait arcanique shows the banner "Yusica · Trait arcanique → Gobelin des cavernes" and a 3D d20 while the GM card stays hidden; on landing the banner adds "12 = 12 Réussite" and the card appears; after Apply the banner fades within ~4 s; the overlay shows Close only. EN mobile: "Yusica · Arcane Bolt → Cave goblin, 17 = 17 Success", no horizontal scroll. No console error. The multi-device side (other players' screens) is covered by the fake-network test.
- Not committed: a prettier-only reformat of `table-page.component.spec.ts` made by the green step (left in the working tree).
