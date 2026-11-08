# Item previews show the slot icon for equipment

Status: resolved
Type: task
Blocked by: 06

User request (2026-11-08): "for items preview put the icon of the slot in the bottom right corner if it's an equipment".

## Direction

- In `app-item-card` (the item preview used by the catalogue, inventory, item editor result, generator and pick lists), when the item is equipment with a slot, show that slot's silhouette (`app-slot-silhouette`, U06) small (about 1.5rem), muted, in the bottom-right corner of the card, with the translated slot name as its accessible label (`item.slot.*`).
- No icon for consumables and plain objects.
- It must not cover the price or the actions; adjust the padding if needed.
- **Tests:** one item-card test that equipment shows the silhouette for its slot with its label, and one that a consumable shows none.
- **Checked** in the browser in the catalogue and the sheet's inventory.

## Green

- Files: src/app/core/components/slot-silhouette/slot-silhouette.component.ts (moved from modules/character/components/, git mv), src/app/modules/character/components/character-sheet/character-sheet.component.ts (import path), src/app/modules/item/components/item-card/item-card.component.ts, item-card.component.spec.ts (2 new tests)
- Change: moved the silhouette to core/components so the item module does not import a character component. app-item-card shows it (1.5rem, muted, absolute bottom-right, label item.slot.*) when slot is not 'none'; price gets right padding. No i18n changes.
- Suite: 94 files / 749 tests pass; tsc clean; build OK. Failed before implementation: "shows the slot silhouette with its label for equipment" (the consumable test passed trivially before, as it asserts absence). Browser check not done.
- Open questions: none

## Answer

- **Slot icon:**
  - `app-slot-silhouette` moved to `core/components/slot-silhouette` (the item module mustn't import a character component).
  - `app-item-card` shows the slot silhouette (1.5rem, muted, bottom-right, labelled `item.slot.*`) for equipment; consumables and objects show none (2 item-card tests).
  - The sheet's inventory tiles also show a small slot icon (1rem, bottom-right) for equipment; the equipment tab doesn't, since the slot is the tile itself.
- **Also from the user (2026-11-08):**
  - **Tiles:** inventory and equipment tiles are small fixed squares (5.5rem, `aspect-ratio: 1`) with a smaller image and a 2-line name.
  - **Equipment grid:** the slot name and item name show on hover or focus only (a small pill over the tile; opacity, so screen readers still read them).
- **Spec scoping:** the equipment-silhouette spec now counts silhouettes inside `.slots` only, because the inventory panel (also rendered) now carries slot icons. Same expectations.
- **Checked:**
  - Suite 94 files, 749 tests.
  - Browser, catalogue: 13 of 20 sample items (the equipment) show the icon, without covering the price.
  - Browser, inventory: small squares with slot icons.
  - Browser, equipment: a clean grid; hovering Mains shows "Mains".
  - 375 px: no horizontal scroll.
