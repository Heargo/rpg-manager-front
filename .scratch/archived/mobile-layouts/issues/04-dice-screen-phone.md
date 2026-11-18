# Dice screen made for phones

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Dice screen)

- At phone width the Roll button is large, full width and fixed at the bottom (safe-area aware), the dice pickers above it in a compact grid, the result at the top.
- The shared-roll toggle and other options move next to or above the Roll button without crowding it.
- Same for the dice panel of the game table and the combat dice screen (assumed).

## To decide with the user

The note ends with "etc.": anything else on the dice screen (bigger dice buttons, presets for common rolls, history)? Triage to `ready-for-agent` once agreed.

## Triage (user, 2026-11-18)

- Extras: a **modifier** (+/−N) and a **mixed dice pool** (e.g. 2d6+1d4 in one roll). No saved presets. History already exists and stays.
- Where: **all three** screens (Dice page, game table dice panel, combat dice screen), through one shared component so they stay identical.
- After a roll on a phone, the **bottom bar swaps**: the fixed Roll bar becomes the result bar (total, Relancer, Fermer) in the same spot; Fermer brings Roll back.
- Split in two (rules and protocol change vs layout): this ticket is the **layout**; ticket 06 is the pool and modifier.

## Scope of this ticket (layout)

- One shared dice-screen layout component used by the Dice page, the table's dice panel and the combat dice screen.
- At phone width (below 40rem): result / history at the top, the dice pickers in a compact grid with bigger tap targets (at least 44 px), a full-width Roll button fixed at the bottom with `env(safe-area-inset-bottom)` padding; after a roll the same bottom bar shows the total with Relancer and Fermer. Options (shared-roll toggle in a room) sit just above the bar without crowding it. Desktop unchanged.
- Combat: the dice of an action are fixed by the action (assumed: the combat screen gets the layout but no free dice editing).
- FR/EN, 375 px and desktop.

## Baseline

`npm test`: 321 test files, 3141 tests, all passed (2026-11-18, after NP03).

## Seams

- The new shared dice-screen component (rendered with `TEST_PROVIDERS`; inputs: the dice choice / whether dice are editable / the last result / options slot; outputs: roll, reroll, close): catches the structure the phone layout relies on (`data-test` hooks for the result area, the dice grid, the bottom bar), the bottom bar showing Roll before a roll and the result (total, Relancer, Fermer) after one, Fermer bringing Roll back, Relancer and Roll emitting, no dice editing when not editable (combat), each die button with an accessible name. Misses sizes, fixed position and safe-area padding (browser check).
- The three hosts (Dice page, table dice panel, combat dice screen; rendered): each uses the shared component, and their existing roll behaviour (history, shared-roll toggle in a room, combat decisions) still works through it.

## Red

- Test files: `src/app/modules/dice/components/dice-screen/dice-screen.component.spec.ts` (new), `src/app/modules/dice/dice-screen-hosts.spec.ts` (new)
- Run: `npx ng test --watch=false --include src/app/modules/dice/components/dice-screen/dice-screen.component.spec.ts` and `npx ng test --watch=false --include src/app/modules/dice/dice-screen-hosts.spec.ts` (pipe through `tail -30`)
- Today's screens: Dice page (`pages/dice-page`, own form + history cards), table dice panel (`components/dice-roller`, used twice in `table-page.component.html`), and the combat dice screen = `components/dice-overlay` (result bar with the `[diceActions]` slot where `app-combat-roll-decision` is projected). Nothing shared today except `DiceRollBusiness`.
- Contract fixed in the specs: new `DiceScreenComponent`, selector `app-dice-screen`, at `src/app/modules/dice/components/dice-screen/dice-screen.component.ts`, exporting `DiceScreenResult = { count, sides, values, total }`. Inputs: `count`, `sides` (two-way `model()`), `editable` (default true), `result` (`DiceScreenResult | null`). Outputs: `roll`, `reroll`, `close`. Slots: `[diceOptions]` (above the bar), `[diceActions]` (in the bar after a roll, replacing Roll again/Close). Hooks: `data-testid` `dice-result`, `dice-grid`, `die` (+`data-sides`, `aria-label` containing `d<sides>`, `aria-pressed`), `dice-count` (wrapper of the number input), `dice-bar`, `dice-total`; `data-action` `roll-dice`, `again-dice`, `close-dice`. Labels EN: Roll, Roll again, Close. Not editable: no `die`, no `dice-count`.
- Existing specs to route through the new component in green (not touched): `src/app/modules/dice/components/dice-overlay/dice-overlay.component.spec.ts` (uses `[data-action="close-dice"]`/`again-dice`, `[diceActions]` slot, Escape; the overlay must keep these hooks), `src/app/modules/combat/components/combat-roll-decision/combat-roll-decision.component.spec.ts` (projected in the overlay), `src/app/modules/table/pages/table-page/table-page.component.spec.ts` (`panel('dice')` holds `app-dice-roller`), `src/app/modules/dice/business/dice-roll.business.spec.ts` (unaffected unless the business changes).
- Failing: 18 tests
  - dice-screen.component.spec.ts (11 tests: has the result area, grid and bar; one button per die with accessible name; tap chooses sides; number-of-dice input; Roll before a roll with options above; emits roll; bar swaps after a roll; emits reroll; Close brings Roll back; actions slot; not editable) — whole file fails to compile, `./dice-screen.component` (DiceScreenComponent, DiceScreenResult) does not exist.
  - dice-screen-hosts.spec.ts (7 tests: Dice page renders the screen; Dice page rolls chosen dice and history; table panel renders the screen; table panel rolls chosen dice; overlay shows plain roll via the screen with total and Close; overlay Close from the screen; overlay combat roll not editable) — no `app-dice-screen` / `die` / `roll-dice` / `dice-total` elements in the hosts yet (null element assertions).

## Green

- Files: `src/app/modules/dice/components/dice-screen/dice-screen.component.ts` (new); `dice-overlay.component.ts`, `dice-roller.component.ts`, `pages/dice-page/dice-page.component.ts` (all under `src/app/modules/dice/`); `public/i18n/en.json`, `fr.json` (`dice.die`).
- Change: `app-dice-screen` holds result/history on top (default slot), a die grid (p-button, min 44 px, `aria-pressed`) with a p-inputnumber count, `[diceOptions]` above a bottom bar (Roll, or total + Roll again + Close, or `[diceActions]`). Below 40rem the dock (options + bar) is fixed at the bottom with `padding-bottom: env(safe-area-inset-bottom)` and the page gets bottom padding. The Dice page, table roller and overlay (not editable, `[diceActions]` kept for combat, Escape unchanged) all render it; extra inputs: `overlay`, `rolling`, `by`, `ratio`, `canReroll`, `busy`, `controls` (`auto` shows Roll again/Close after a roll made with the screen's own Roll, the actions slot for a roll coming from elsewhere, as the spec forces). Existing specs needed no adaptation (none edited).
- Suite: 323 files, 3159 tests all passed (baseline 321 / 3141 plus the 2 new files); tsc clean; `ng build` no error (only existing budget warnings). No test file in `git diff`.
- Open questions: the Dice page lost the free "sides" number input (grid d4–d100 only, ticket 06 covers pool/modifier); on the Dice page the history now sits above the dice (inside the card) rather than in a separate card below; the overlay's total moved into the bar. Browser check at 375 px not done.

## Review

- Verdict: fix first
- Must fix: `src/app/modules/dice/pages/dice-page/dice-page.component.ts` (was the free "sides" `p-inputnumber`, min 2, max `MAX_SIDES`) and `dice-screen.component.ts:59-96` — the Dice page can no longer roll a d3, d7 or any custom die, and the ticket didn't ask for that (ticket 06 covers pool and modifier, not sides). Fix: keep a free sides number input (2 to `MAX_SIDES`) in the shared picker, or as an opt-in input used by the Dice page, with a `data-testid` and a test. If you drop it on purpose, get the user's agreement first and record it.
- Consider:
  - `dice-screen.component.ts:302-315` — `controls='auto'` and `rolledHere` are unused by every host (the overlay passes `buttons` or `slot`; the page and table never pass `result`). It is speculative generality that only the spec exercises. It hides no bug today, but a roll from elsewhere and a roll made here are told apart by hidden state. Prefer hosts passing an explicit `actions: 'buttons' | 'slot'` and dropping `rolledHere` plus its effect once the spec allows.
  - `dice-screen.component.ts:282-302` — 11 inputs; `overlay`, `rolling`, `by`, `ratio` are overlay-only. Consider grouping them into one `status` object or splitting an overlay variant.
  - Phone CSS, `:232-234` — a fixed `padding-bottom: 9rem` can be too small when `[diceOptions]` holds the share toggle plus an error message, so the last content hides behind the dock. Measure the dock or use a CSS variable.
  - 44 px targets hold for Roll and the die buttons. The count input's +/- buttons and the share toggle are not enforced.
  - The dock is `position: fixed` wherever the roller is rendered, including the table's player card and the GM accordion panel (`table-page.component.html:118,315`). It may cover other table UI on a phone. Do the browser check at 375 px, which has not been done.
  - `dice-overlay.component.ts:122` — the 3D inset now measures `app-dice-screen .screen` through `querySelector`. Fine, but brittle against the child's template.
- Checked and fine: the three hosts keep history (page), the share toggle and error (room), the 3D scene, Escape and the combat decision slot. The Dice page history now sits in the same card above the dice, which the Open questions already note. Strings are in both language files. No secret or invite-code change.

## Green (review round)

- Files: `dice-screen.component.ts`, `dice-overlay.component.ts`, `dice-roller.component.ts`, `dice-page.component.ts` (under `src/app/modules/dice/`).
- Change: free sides input (`dice-sides`, p-inputnumber 2..MAX_SIDES, label `dice.sides`) beside the grid and count; total shown once (overlay no longer renders its own); `dock: 'fixed' | 'inline'` on `dice-dock` (`data-dock`), fixed styling and content padding only for `fixed` below 40rem, page padding from the dock's measured height (`--dice-dock-h`, ResizeObserver) so options and errors never hide content; page and overlay pass `fixed`, table roller `inline`; `actions: 'buttons' | 'slot'` replaces `controls`/`rolledHere`; overlay-only inputs grouped in `status`; the overlay reads `DiceScreenComponent.topEdge()` for the 3D inset instead of querying the child's class.
- Suite: 323 files, 3166 tests passed; tsc clean; ng build no error; no spec file modified.
- Open questions: none (browser check at 375 px still pending).

## Review (round 2)

- Verdict: ship
- Must fix: none
- Consider:
  - `dice-screen.component.ts` constructor — `inject(DestroyRef)` is called inside the `afterNextRender` callback. It works (dice specs: 6 files, 52 tests pass) and the observer is disconnected on destroy, but injecting `DestroyRef` as a field is safer. If the component is destroyed before the first render, the callback never runs, so nothing leaks.
  - The dock's `offsetHeight` is observed on desktop too. This is harmless since the padding only applies below 40rem inside `.fixed`.
  - The 375 px browser check is still pending.
- Verified: free `dice-sides` input (2..MAX_SIDES) is back; the total is rendered once (the bar's `dice-total`); `dock` is `fixed` for the page and overlay and `inline` for the table roller; `actions` replaces `auto`; `status` groups the overlay extras; content padding follows the measured `--dice-dock-h`; the overlay uses `topEdge()`.

## Answer

- New shared `DiceScreenComponent` (`app-dice-screen`) used by the Dice page, the table's dice roller and the dice overlay (combat: not editable, combat decision in the actions slot). Inputs: `count`/`sides` (two-way), `editable`, `result`, `dock: 'fixed' | 'inline'`, `actions: 'buttons' | 'slot'`, `status` (overlay extras).
- Phone (below 40rem): result / history on top, die grid with 44 px targets plus count and free sides inputs (d2 up to the max), and a full-width bar fixed at the bottom with safe-area padding on the Dice page and the overlay (inline in the table panel); content padded by the dock's measured height. After a roll the same bar shows the total once with Roll again and Close (or the combat actions). Desktop keeps a centred card.
- Two review rounds: the free sides input was lost (restored), total shown twice, fixed dock covering the table panel (now `dock` per host), an implicit "auto" button mode (now explicit `actions`).
- Browser found an NG0203 error the tests missed (`inject(DestroyRef)` inside `afterNextRender`); fixed by the orchestrator (field injection).
- Checked: suite green; build clean; review ship. Browser: Dice page at 375 px FR (fixed bar, 44 px dice, a d7 rolled from the sides input, total once, history above), desktop EN, no console error. The table panel and combat overlay are covered by the host specs (they need a room / a combat), not the browser.
