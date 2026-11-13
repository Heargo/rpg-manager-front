# Tools menu per state, bordeaux Close button

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Tools menu, Bugs and layout)

- In a room: the Tools submenu has no character sheet and no world rules entry.
- Not in a room: the Tools submenu has no world rules entry (the sandbox sheet stays).
- The "Close the world" button uses the app's bordeaux red (theme primary), not the `danger` severity red.

## Baseline

Test Files 173 passed, Tests 1417 passed.

## Seams

1. **Nav bar component (`TEST_PROVIDERS`)**: the Tools submenu labels out of a room and in a room (GM and player).

## Answer

Small ticket, red and green done inline (test first) rather than in subagents. Out of a room, Tools has Sprite colorizer, Item generator, Character sheet, External tools; in a room, Sprite colorizer, Item generator, External tools. The `/tools/world-rules` route still exists, it is only out of the menu. The Close the world button lost `severity="danger"`, so it takes the theme primary (the bordeaux of the other primary buttons). Suite: 173 files, 1419 tests (+2); build OK. Browser: the colour matches the "Nouveau monde" button (same default severity); not checked inside an open room.
