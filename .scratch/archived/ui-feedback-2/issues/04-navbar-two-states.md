# Nav bar: out-of-room and in-room states, close the world

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- **Not in a room**, in order: Worlds (label replaces "Play"; same route), Dice, Catalogues (submenu: item, NPC, skill and class catalogues, the Tools sandbox catalogues), Tools (submenu: internal tools — item generator, character sheet, world rules sandbox; the sprite colorizer joins later (ticket 14) — then External tools).
- **In a room**, in order: Table, Catalogues (submenu: the room world's catalogues; GM routes for the GM, what players may see for players), Tools, World rules, then a **Close the world** button at the end, before the avatar. GM: confirm, then close the room (back to Worlds). Player: confirm, then leave the room.
- Mobile menu keeps the same order.
- EN/FR labels.

## Baseline

Test Files 131 passed, Tests 1098 passed.

## Seams

1. **Nav bar component (`TEST_PROVIDERS`, room business state faked as the existing nav-bar spec does)**: out of a room, the top-level items and their order, the Catalogues and Tools submenus; in a room (GM and player), the order, the World rules item and the Close the world button (confirm then close/leave). Misses: real menu overlay layout (browser check).

## Red

- Test files: `src/app/core/components/nav-bar/nav-bar.component.spec.ts`
- Run: `npx ng test --watch=false --include src/app/core/components/nav-bar/nav-bar.component.spec.ts 2>&1 | tail -30`
- Failing: 15 tests (the existing host-offline test still passes). Contract assumed: RoomBusiness faked with `$status`, `$isHost`, `$room`, `leave()`; confirm through `ConfirmationService.confirm`; after accept, `leave()` then `router.navigate(['/play'])`; the Close the world button is a `<button>` after the menu and before `p-avatar`; Worlds links `/play`, room catalogues link `/room/items|npcs|skills|classes`, room World rules links `/room/rules`.
  - out of a room: Worlds, Dice, Catalogues, Tools order and no Close button — bar still lists the 12 flat items, "Play" label
  - out of a room: Catalogues submenu (item, NPC, skill, class) — no submenu exists
  - out of a room: Tools submenu (item generator, character sheet, world rules, external tools) — no submenu exists
  - in a room as GM / as player: Table, Catalogues, Tools, World rules order (2 tests) — bar is not room-aware
  - in a room as GM / as player: Close the world button after menu, before avatar (2 tests) — no button
  - in a room as GM / as player: confirm first, then leave and navigate to /play (2 tests) — no button
  - in a room as GM / as player: rejecting the confirm does nothing (2 tests) — no button
  - submenu markup: submenu items render in the DOM — no submenus
  - room catalogues: GM links to /room/items, /room/npcs, /room/skills, /room/classes — no Catalogues submenu
  - room catalogues: World rules item links to /room/rules (player) — item absent in room state
  - French labels: Mondes, Dés, Catalogues, Outils — still "Jouer" plus flat items

## Green

- Files: src/app/core/components/nav-bar/nav-bar.component.ts, nav-bar.component.html, public/i18n/en.json, public/i18n/fr.json
- Change: the nav bar now builds its own items from the room status (out of a room: Worlds, Dice, Catalogues, Tools; in a room (hosting, connected, host-offline): Table, Catalogues, Tools, World rules). A "Close the world" p-button (in a room only) sits before the avatar, asks for confirmation, then calls `RoomBusiness.leave()` and navigates to `/play`. `leave()` already closes the hosted room for a host (`host.close()`), so no business change. The avatar menu keeps `appendTo="body"`. New nav.* keys in EN and FR.
- Suite: 131 files / 1113 tests passed (baseline 131 / 1098); tsc clean; ng build has no error.
- Open questions: `MenuService` and its spec (flat item list) are no longer used by the nav bar and were left untouched, since its spec is not a red test; it is dead code that review may remove along with its spec. The "Close the world" button is not yet checked in a real mobile layout (browser check).

## Answer

Nav bar builds its items from the room status; Close the world confirms then `RoomBusiness.leave()` (closes the room for a host) and goes to /play. Browser: out-of-room order and submenus checked (FR), no console error; in-room state covered by the spec. Follow-up noted: `NavigationGuard` + `MenuService` are now dead code (separate cleanup).
