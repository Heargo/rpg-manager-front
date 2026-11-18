# Spec: better phone layouts (2026-11-17)

From `quicknotes.md` ("meilleure responsive for phone"). Proposed, not yet validated. All changes apply at phone width (assumed: below the app's `md` breakpoint); desktop layouts stay as they are unless stated.

## Catalogues

- **Class catalogue**: search input and "New class" button each take the full width. The "Add the default classes and skills" button is removed (all widths).
- **Item catalogue**: search input full width; rarity and type filters on one line (50 % each); price slider full width; "New item" full width. The "Add the default items" button is removed (all widths).
- **Skill catalogue**: a card's actions (edit, duplicate, delete…) move into a context menu opened by a "…" button on the card (Optimus UI popup menu), at all widths (assumed, like the item catalogue's menu of H06).

Removing the default buttons assumes the starter content now comes from the packs (GK07 "Import from the packs", GK08 Base ships the starter classes and skills); hence the `Blocked by`.

## Class form

The variables help and the formula presets sit on **one line** (help toggle on the left, presets select on the right), instead of stacked.

## Dice screen

Rework for phones: a large, full-width **Roll** button fixed at the bottom of the screen (thumb reach), the dice pickers above it in a compact grid, the result on top. Open to further ideas ("etc."): see ticket 04.
