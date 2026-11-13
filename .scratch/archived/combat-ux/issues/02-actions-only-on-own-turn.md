# Player actions only on their own turn

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Player side)

- Player view: actions (skills, items, counters) only when the active combatant is theirs; otherwise the same combat view without actions and a "Waiting for <name>" line (FR/EN).
- Host: a player's use-skill, use-item and tick-action off turn are rejected with `combat.errors.notYourTurn`. The GM is never blocked.

## Decisions (orchestrator)

- Turn check on the host for a player's `useSkill`, `useItem` and `tickAction`: the combatant must be the active one (`enc.combatants[enc.turn]`), else `PeerApiError('rejected', 'combat.errors.notYourTurn')`. The GM (`SELF_PEER`) is never checked. `initiative` stays allowed off turn (it is typed before the first turn); `endTurn` already only acts on the active combatant; `move` is C07.
- Player view: `app-combat-actions` renders only when `myTurn()`; otherwise a `data-testid="waiting-turn"` line "En attente de {name}" / "Waiting for {name}" with the active combatant's name (`combat.waitingTurn`). Order, roll line, initiative input stay as today.

## Baseline

Test Files 229 passed, Tests 1920 passed. Working tree: `user-docs/` changes and `.scratch/images/`, `.scratch/quicknotes.md` belong to other work, left alone.

## Seams

1. **Combat over the fake peer network** (`combat.spec.ts`, `src/testing/game-device.ts`): a player's use-skill, use-item and tick-action off turn are rejected with `combat.errors.notYourTurn` and change nothing; on turn they work; the GM acts for any combatant off turn. Misses: what the screen shows.
2. **Player view component** (`combat-player-view`, `TEST_PROVIDERS`): actions shown on the player's turn; off turn no `app-combat-actions` and a waiting line naming the active combatant. Misses: layout (browser).

## Red

- Test files: `src/app/modules/combat/business/combat.spec.ts` (new describe "actions only on the own turn"), `src/app/modules/combat/components/combat-player-view/combat-player-view.component.spec.ts` (replaced "keeps the skills readable outside the turn", added two tests)
- Run: `npx ng test --watch=false --include src/app/modules/combat/business/combat.spec.ts` and `npx ng test --watch=false --include src/app/modules/combat/components/combat-player-view/combat-player-view.component.spec.ts`
- Failing: 6 tests
  - rejects a player skill off turn and changes nothing — resolves instead of rejecting with `combat.errors.notYourTurn`
  - rejects a player item off turn and changes nothing — same
  - rejects a player counter tick off turn and changes nothing — same
  - has the notYourTurn key in English and French — `combat.errors.notYourTurn` missing from en/fr
  - shows no actions off turn, but a line naming the active combatant — `app-combat-actions` still rendered, no `waiting-turn`
  - brings the actions back when the turn comes round — no `waiting-turn` line "Waiting for Ada" off turn
- Passing guards (already green, regression cover): player acts on own turn, GM acts off turn for any combatant, actions and no waiting line on own turn.

## Green

- Files: src/app/modules/combat/business/combat-host.business.ts, src/app/modules/combat/components/combat-player-view/combat-player-view.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: the host's `own` helper takes an `onTurnOnly` flag (set for useSkill, useItem, tickAction); a non-GM caller whose combatant is not `enc.combatants[enc.turn]` is rejected with `PeerApiError('rejected', 'combat.errors.notYourTurn')`. The player view renders `app-combat-actions` only on `myTurn()`, else a `waiting-turn` line with the active combatant's name. Added `combat.errors.notYourTurn` and `combat.waitingTurn` in EN and FR.
- Suite: 229 files and 1928 tests pass (baseline 229 and 1920, plus the 8 new tests). tsc and ng build are clean, and no test file is in the unstaged diff.
- Open questions: none

## Answer

- Host (`combat-host.business.ts`): the `own` route helper takes an on-turn-only flag, set for `useSkill`, `useItem` and `tickAction`; a player whose combatant is not the active one gets `combat.errors.notYourTurn` and nothing changes. The GM is never checked. `initiative`, `endTurn` and `move` unchanged (move is C07).
- Player view: `app-combat-actions` only on the player's turn; otherwise "En attente de {name}" / "Waiting for {name}" (`combat.waitingTurn`). New keys in FR and EN.
- Tests: 8 new (3 off-turn rejections, key check, on-turn and GM guards, 2 view tests). Suite 229 files, 1928 tests pass (baseline 1920). Build clean.
- Review: ship. Consider lines not applied: options object instead of a bare `true` flag, a pure `isActive(enc, id)` helper, hide the waiting line if the name is empty, GM off-turn coverage for skills and items.
- Browser: Tools combat sandbox, FR, EN and mobile: on Yusica's turn the actions show; after Next turn the player view shows "En attente de Gobelin des cavernes" / "Waiting for Cave goblin" and no actions; no horizontal scroll, no console error. The host rejection is covered by the multi-device test only (two devices share one browser profile).
