# Item catalogue: context menu on the clicked item

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Item catalogue context menu)

- Clicking a slot in the item catalogue grid opens an Optimus UI popup menu anchored to that slot, listing the actions the detached panel offers today (same actions, same rules for GM, player and Tools catalogues).
- Keyboard: Enter or the context-menu key on the focused slot opens it, Escape closes it and gives focus back to the slot. Mobile: the menu stays inside the screen, no horizontal scroll.
- The detached actions panel goes away (details stay reachable from the menu).

## Baseline

Test Files 200 passed, Tests 1659 passed.

## Seams

1. **Item catalogue component (`TEST_PROVIDERS`)**: clicking or right-clicking a slot opens a popup menu with `[data-automationid]` entries `view` (dialog with the item card), `give` (only when `canGive`), `edit`, `delete` (confirmation); the entries act on the slot clicked last. Misses: where the overlay sits and focus handling (browser).

## Answer

The detached actions panel is gone. Clicking a slot (or Enter / Space on it, the context-menu key, a right click) opens an Optimus UI `p-menu` popup anchored under that slot (appended to the body): View, Give (when someone can receive), Edit, a separator, Delete. Opening it on another slot while it is open closes it and reopens it under the new slot; clicking the same slot closes it. View opens a dialog with the item card. When the menu closes (Escape, outside click, an action other than View) focus goes back to the slot. Same component for the GM catalogue and the Tools catalogue. The unused `item.catalogue.selected` label was removed.

Tests: the panel tests were rewritten for the menu (7), plus the slot test kept as it was; one new test for the context-menu key / right click. Checked in the browser (1024 px FR): menu under "Torque ordinaire", View dialog, Enter on a focused slot opens it with focus in the menu, Escape closes it with focus back on the slot, switching slots re-anchors it (menu top 510 under slot bottom 508). 375 px EN: rightmost slot's menu stays inside the screen, no horizontal scroll. Review step skipped. Suite: 200 files, 1660 tests; build clean.
