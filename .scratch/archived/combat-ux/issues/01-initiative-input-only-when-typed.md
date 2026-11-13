# Initiative input only when it can be typed

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Starting a combat)

- The GM's per-combatant initiative input (and the player's) shows only when the initiative step is on and the mode is `typed` (`effectiveInitiativeMode`).
- Rolled and free modes: the initiative value is still displayed (rolled) or hidden (free); order is changed by drag and drop.

## Baseline

Test Files 229 passed, Tests 1916 passed. Working tree not clean before start: `.scratch/ROADMAP.md` and `.scratch/combat-ux/` (this feature's tickets, committed with this ticket), `user-docs/src/styles/theme.css` (another session, left alone), `.scratch/images/` and `.scratch/quicknotes.md` (untracked notes, left alone).

## Seams

1. **GM panel component** (`combat-gm-panel`, `TEST_PROVIDERS`, `combatTable(mode, extra)` fixture): the per-combatant initiative input and its set button render only when the effective initiative mode is `typed` (mode `typed` with the initiative step on); in `rolled` mode the value stays displayed, in `free` mode (or initiative step off) neither value nor input shows. Misses: layout (browser).
2. **Player view component** (`combat-player-view`): already hides its input outside `typed`; a regression test that it is hidden when the initiative step is off even with mode `typed`. Misses: layout.

## Green

- Files: src/app/modules/combat/components/combat-gm-panel/combat-gm-panel.component.html
- Change: the initiative value now renders only when `combat.$initiativeMode()` is not `free`, and the input plus set button only when it is `typed` (the mode already folds in the initiative step). The player view already behaved correctly, so it needed no change.
- Suite: 229 files and 1920 tests pass (baseline 229 files and 1916 tests, plus 4 new). tsc and ng build are clean. No test file is in the unstaged diff.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - combat-gm-panel.component.spec.ts (rolled test) — only asserts the value element exists, not that it shows the rolled number; assert its text to catch a "—" placeholder bug.
  - combat-gm-panel.component.spec.ts (typed test, free test) — the "free" test relies on the default fixture mode; make the mode explicit (`combatTable('free')`) so it survives a default change.
  - combat-player-view.component.spec.ts:232 — the Seam 2 regression test (step off, mode typed) already exists in HEAD, so no new test was added; fine, just noting it is not part of this diff.
  - combat-gm-panel.component.html — `combat.$initiativeMode()` is called twice per row; could be a single `@let mode`, minor.

## Answer

- GM panel (`combat-gm-panel.component.html`): the initiative value shows only when `combat.$initiativeMode()` is not `free`; the input and its set button only when it is `typed`. `$initiativeMode` already folds in the initiative step (H07), so the step off hides both. The player view already behaved this way; its regression test existed.
- Tests: 3 new GM panel tests (rolled, free, step off) plus a typed-mode guard; two existing tests moved from `free` to `typed` because free no longer shows the value. Suite 229 files, 1920 tests pass (baseline 1916). Build clean.
- Review: ship. Consider lines not applied (assert the rolled number's text, explicit `combatTable('free')`, a `@let` for the mode).
- Browser: Tools combat sandbox (rolled mode), FR, EN and mobile: initiative values shown (e.g. 20 / 14), no input, no horizontal scroll, no console error. Typed and free modes are covered by the component tests only. The player side of a room stays covered by the tests (two devices share one browser profile).
