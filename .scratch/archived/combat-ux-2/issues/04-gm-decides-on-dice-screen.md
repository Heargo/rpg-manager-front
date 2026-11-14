# GM decides on the dice screen; it closes for everyone

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (Bugs, Decisions)

- Combat roll on the GM's device: the dice screen shows the result card (per target: Apply, Edit, Dismiss) instead of Close; the Combat panel doesn't repeat it meanwhile.
- Players: no Close on a combat roll's dice screen.
- When the roll's results are all resolved (or the GM closes it when nothing is pending), the dice screen closes on every device.
- Non-combat rolls keep today's behaviour.

## Decisions (orchestrator)

- **Dice stays independent of combat**: `app-dice-overlay` gets a content slot (`<ng-content select="[diceActions]">`). When the current roll is a combat roll (`DiceRoll.combat`), the overlay shows the slot **instead of** Close, and Escape does not close it. Non-combat rolls: unchanged.
- **New `app-combat-roll-decision`** (combat module), projected into the overlay by the table page and the sandbox (`<app-dice-overlay><app-combat-roll-decision diceActions /></app-dice-overlay>`):
  - GM device, the roll has pending results: one row per pending result (target, effects), with Apply, Edit (amounts inline, then Apply) and Dismiss, reusing the GM panel's calls. Shown once the roll has landed (before: "Lancer en cours…").
  - GM device, nothing pending (GM validation off, or all resolved): a Close button that closes the roll **for everyone**.
  - Player device: no button; a short line "Le MJ décide…" / "The GM is deciding…" while results are pending.
- **Closing for everyone**: a new GM route `combat/close-roll` (`{ rollId }`) records `closedRollId` on the encounter (not an undo step) and the projected view carries it. A roll counts as closed on every device when its id is the `closedRollId` **or** all its `pendingIds` are resolved (applied or dismissed). `CombatRollsBusiness` then calls `DiceRollBusiness.close()` if that roll is the one on the overlay. The banner keeps its fade.
- **GM panel**: a pending result whose roll is on the GM's open dice screen is not shown in the panel (it is in the overlay); if the overlay isn't showing that roll (closed by the GM's Escape before D04, 3D failure), the panel shows it as today.
- Sandbox: same component; `closeRoll` is local.
- Keys (FR, EN): `combat.decision.deciding`, `combat.decision.close` (or reuse `dice.close`), and the existing pending labels.

## Baseline

Test Files 244 passed, Tests 2149 passed. Working tree: 13 combat spec files with an unstaged prettier-only diff (not part of any ticket), `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session.

## Seams

1. **Combat over the fake peer network** (`combat.spec.ts`): the GM's `closeRoll(rollId)` sets the closed roll on every device's view; a player can't call it (`forbidden`); applying or dismissing every pending result of a roll makes it closed on every device (through `CombatRollsBusiness`, which calls `DiceRollBusiness.close()` when that roll is on the overlay). Misses: UI.
2. **Components**: `app-dice-overlay` (combat roll: no Close, slot shown, Escape ignored; plain roll unchanged) and `app-combat-roll-decision` (GM: rows with Apply/Edit/Dismiss once landed, Close when nothing pending; player: deciding line, no button). Misses: layout (browser).
3. **GM panel** (`TEST_PROVIDERS`): a pending result whose roll is on the open dice screen is not listed; it is listed when the overlay shows another roll or none. Misses: layout.

## Red

- Test files:
  - `src/app/modules/combat/business/combat.spec.ts` (new `describe` "closing the roll of a combat action for everyone", in "shared rolls")
  - `src/app/modules/dice/components/dice-overlay/dice-overlay.component.spec.ts` (new file)
  - `src/app/modules/combat/components/combat-roll-decision/combat-roll-decision.component.spec.ts` (new file)
  - `src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.spec.ts` (edited; it already carried the unstaged prettier-only diff)
- Names the green step must use: `CombatBusiness.closeRoll(rollId)` (route `combat/close-roll`), `CombatView.closedRollId`, `CombatRollDecisionComponent` in `combat/components/combat-roll-decision/combat-roll-decision.component.ts`. Hooks: overlay buttons `[data-action="close-dice"]` (and `again-dice` for Again) on the button or the `p-button` host, slot `[diceActions]`; decision `[data-testid="decision"]`, `[data-action="apply|edit|dismiss|apply-edited|close-roll"]`, `[data-testid="edit-amount"]`, `[data-testid="deciding"]` ("The GM is deciding…", key `combat.decision.deciding`; Close reuses `dice.close`). The spec says only the table page and the sandbox project the component; the tests mount it standalone.
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one per file above)
- Existing tests moved to the new contract (same checks, plus the GM closes its dice screen first so the panel is where the result waits), all in the GM panel spec "using a skill": `cast` helper (used by "picks the skill and its target, lists the pending result…", "applies a pending result in one tap", "edits the amount, then applies", "dismisses a pending result…") and "hides the pending result while the roll is landing, then shows apply, edit and dismiss". Header contract comment updated.
- Failing:
  - combat.spec.ts: the whole file does not compile, `closeRoll` missing on `CombatBusiness` and `closedRollId` missing on `CombatView`. Its 6 new tests: GM close sets `closedRollId` on every view; player `closeRoll` is `forbidden`; GM close closes every device's dice screen; applying the last pending result closes every screen; dismissing it does too; closing a combat roll leaves a plain roll on another device's screen.
  - combat-roll-decision.component.spec.ts (9 tests): does not compile, module and `closedRollId` missing. Tests: nothing while dice move; GM rows with apply/edit/dismiss and no close; apply; edit then apply; dismiss; GM validation off Close closes for everyone; player "deciding" line with no button; deciding line gone once resolved.
  - dice-overlay.component.spec.ts, 4 failing by assertion: slot shown instead of Close on a combat roll (slot not projected, `close-dice` hook absent); Escape ignored on a combat roll (closes it today); plain roll keeps Close and no slot (hook `close-dice` absent); plain roll closes with Escape and the Close button (hook absent).
  - combat-gm-panel.component.spec.ts, 2 failing by assertion: pending result not listed while its roll is on the open dice screen (listed today); listed again once the dice screen is closed (first check, hidden while open, fails). "Lists it when the screen shows another roll" passes already, as a guard.
- Because of the compile errors, the full suite does not build until green; the other 240 test files are untouched. Baseline otherwise 244 files / 2149 tests.
- prettier run on exactly the 4 files above. It also reformatted one pre-existing unformatted statement in `combat.spec.ts` (the `shared` cast in the NPC roll test).

## Green

- Files: `src/app/modules/combat/components/combat-roll-decision/combat-roll-decision.component.ts` (new); `combat/models/combat.ts`, `combat/helpers/combat.rules.ts`, `combat/helpers/combat-view.rules.ts`, `combat/business/{combat,combat-host,combat-rolls}.business.ts`, `combat/components/combat-gm-panel/combat-gm-panel.component.ts`, `dice/components/dice-overlay/dice-overlay.component.ts`, `table/pages/table-page/table-page.component.{ts,html}`, `tools/business/sandbox-combat.business.ts`, `tools/pages/combat-sandbox-tool-page/combat-sandbox-tool-page.component.ts`, `public/i18n/{en,fr}.json`
- Change: new GM route `combat/close-roll` (`closedRollId` on the encounter and the view, not an undo step; `CombatBusiness.closeRoll`, sandbox too). `CombatRollsBusiness` closes the dice screen when the shown combat roll is the closed one or all its pending results are resolved (`pendingIdsOf`, `hasLanded` added). The overlay has a `[diceActions]` slot shown instead of Close and Again on combat rolls, and Escape ignores them; Close/Again carry `close-dice`/`again-dice`. The GM panel hides results whose roll is on the open dice screen. `app-combat-roll-decision` is projected on the table page and the sandbox; key `combat.decision.deciding` added in EN/FR (checked with node).
- Suite: 246 files / 2170 tests passed (baseline 244 / 2149 plus the new files and tests); tsc clean; ng build OK. The unstaged spec diffs are the old prettier-only ones.
- Open questions: none
- Review race (added): `combat-rolls.business.spec.ts` "keeps the dice screen open when the roll arrives before the view that lists its pending results, then closes it once they are resolved" (the host's `CombatService.publishState` is held back so the player gets the roll first) — fails by assertion: the player's dice screen is already closed on arrival (`$current()` undefined). Run: `npx ng test --watch=false --include src/app/modules/combat/business/combat-rolls.business.spec.ts`; prettier run on that file only.

## Review

- Verdict: ship. `combat/close-roll` is GM-only and needs a non-empty `rollId`; a player can't close, apply or dismiss; plain rolls keep Close, Again and Escape; dice doesn't import combat (projected slot); `closedRollId` is not an undo step.
- Fixed after review (red test then green): a roll arriving on a player's device before the view listing its pending results counted as resolved and closed the dice screen on arrival; it now counts as resolved only after its pending ids were seen.
- Consider (not applied): `closeRoll` doesn't check the id against known rolls; two quick combat rolls could in theory leave the GM's overlay on the older one without controls (the newer replaces it in practice).

## Answer

- `app-dice-overlay`: a `[diceActions]` slot shown instead of Close/Again on a combat roll; Escape ignored for it; plain rolls unchanged.
- `app-combat-roll-decision` (projected on the table page and the sandbox): GM sees each pending result with Apply / Edit / Dismiss once the roll has landed, or Close (for everyone) when nothing is pending; players see "Le MJ décide…" / "The GM is deciding…" and no button.
- Closing for everyone: GM route `combat/close-roll` sets `closedRollId` on the view; a roll is also closed once all its pending results (seen in the view) are resolved. `CombatRollsBusiness` then closes the overlay on every device. The GM panel doesn't list a result whose roll is on the GM's open dice screen.
- Tests: 20 new (multi-device closing, overlay, decision component, GM panel, the arrival race); 5 GM panel tests close the dice screen first. Suite 246 files, 2171 tests pass (baseline 2149). Build clean.
- Browser: sandbox FR: during the roll no Close, Escape ignored; after landing the dice screen shows "Yusica : Trait arcanique sur Gobelin des cavernes, 4 dégâts · raté" with Appliquer / Modifier / Écarter, and the panel doesn't repeat it; Appliquer closes the dice screen. Dice page: a plain roll still has Close and Relancer and closes with Escape. No console error. Other devices closing is covered by the multi-device tests.
