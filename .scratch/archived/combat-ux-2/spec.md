# Spec: combat made easy, feedback round (2026-11-14)

User feedback after trying C01–C09 (`archived/combat-ux/`), with a screenshot of the GM Combat panel. One commit per ticket.

## Bugs

- **NPC tokens can't be moved before starting** (setup grid, C08). Characters move, NPCs don't. Likely cause: NPC tokens show a portrait (`app-stored-image` → `<img>`), and the browser starts a native image drag, which cancels the pointer drag (`pointercancel`). The sandbox only uses initials, so the browser check missed it. Same risk on the combat grid tokens.
- **Recap banner under the dice screen**: while the 3D dice screen is open, the banner must stay visible above everything (z-index above the overlay and its backdrop).
- **Closing the dice screen of a combat roll closes it for everyone**: on a combat roll, only the GM closes it, and it closes on every device.
- **The GM decides on the dice screen**: for a combat roll, the GM's dice screen shows the result card (Apply, Edit, Dismiss per target) where the Close button is. Resolving every result closes the dice screen for everyone.

## Improvements

- **Prettier recap**: caster's bubble (portrait or initial, enemies ringed as on the grid) → the targets' bubbles, then the dice and total; names as tooltips/aria labels.
- **More room** between the combatants list and the action buttons row (Round, Undo, Next turn, End) in the GM Combat panel.
- **The red area** on the grid is the active combatant's reachable cells (movement). It reads as a big block: make it subtler and say what it is (legend or tooltip).

## Decisions (orchestrator, assumed)

- Dice screen on a combat roll: players get **no Close button**; it closes on every device when the GM resolves the roll (every pending result applied, edited or dismissed), or when the GM presses Close (GM validation off, or nothing pending). A new combat roll replaces it.
- The closing travels on the existing combat state: a roll's results resolved = closed. No new message type unless needed.
- The result card in the GM's dice screen reuses the GM panel's pending-result actions; the Combat panel no longer shows a result while its dice screen is open.
