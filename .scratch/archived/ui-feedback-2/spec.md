# Spec: UI feedback round 2 (2026-11-12)

The user's feedback after phase 8 (NPCs, skills, classes). Developed on the `feedback` branch, one commit per ticket. The raw notes were `.scratch/quicknotes.md`.

## Bugs

- Nav bar, mobile: the avatar submenu goes off screen and causes a horizontal scroll.
- Dice page, mobile: the die faces choice goes off screen.
- Dice page: the dice count input is too narrow from 10 up (typing 10 shows "0").

## Navigation (decided)

The nav bar has two states.

- **Not in a room**, in this order: **Worlds** (replaces "Play", which was unclear), **Dice**, **Catalogues** (submenu: the catalogues only: items, NPCs, skills, classes), **Tools** (submenu: the internal tools, the sprite colorizer first, then the item generator, the sheet and the world rules sandbox, then "External tools").
- **In a room**, in this order: **Table**, **Catalogues** (same submenu, the room's world), **Tools**, **World rules**, then a **Close the world** button (end of the bar, before the avatar). For the GM it closes the room (confirm first); for a player it leaves the room.

## Landing

- Drop the first section (the logo hero). The second section (pitch and calls to action) takes the full viewport height; on mobile its buttons are centred. The footer is below the fold.

## Credits: use of AI

A section in the credits page: AI was used for the code, the documentation, the logo and the custom SVG icons. The author would be glad to work with artists to replace the AI-made visuals and give the interfaces more life.

## Room and world rules

- **/room**: cleaner page. The "open room" info card follows the app's art direction (same card style, colours and type as the other cards). The offline features panel moves from the room page to the World rules page (a tab there).
- **World rules page** (once the world exists): keep the wizard's steps but as clickable tabs, any order, not a linear stepper.

## Joined worlds offline (decided)

A player keeps a local list of the worlds they joined (world id, name, host name, their character copy, last seen). The Worlds page lists them with the GM's own worlds; a badge tells **GM** from **Player** apart. A joined world opens the player's character sheet read-only from the local copy (P09 player copy) when the host is offline, and offers to rejoin with the saved invite when possible.

## Random generation everywhere (decided)

- Every "Generate" button becomes **Random** (FR « Aléatoire »), icon `pi-sparkles`, placed next to the editor's Save button.
- Every editor has it: items, NPCs, skills, classes (new skill and class generators, pure helpers in `core/generators/`, seeded `RandomSource`, EN/FR word lists).
- The JSON tab of every editor has **Copy AI prompt**: a prompt describing the JSON shape (and the world's attributes) that the user pastes into any chat AI, then pastes the answer back.
- Every image picker shows a short warning: prefer images made by human artists (AI text is handy, AI images are lifeless).
- NPC editor: add a portrait image (PNG and other image types), through `ImageBusiness` like items.

## Catalogues (decided)

- **Items**: a large inventory grid (square slots with the image, rarity border, name on hover/below), filters on top.
- **Skills**: a compact list (icon, name, type, cost, short description, actions on the row).
- **Classes**: a list too (image, name, bonuses summary, skill count, actions).

## Character details

The details tabs must all be visible without scrolling: icon tabs (with a tooltip / aria-label), no text labels.

## Skill dice rolls (decided)

- World setting **Skills roll dice** (default on), in World rules.
- An active skill gets a **roll**: dice (count and faces, default 1d20), a **success rule**: `always`, `threshold` (roll ≥ a number) or `formula` (a formula that must be ≥ 0 / true: variables `roll`, `rank`, `level`, the caster's attribute maxima by name, and the target's as `target.<name>`), and its effects' amounts may use `roll`.
- Pure helper `resolveSkillUse(skill, rank, caster, target?, rolls)` → `{ success, rolls, total, amounts }`, same formula parser as attributes (never `eval`). With the setting off, a skill always succeeds and `roll` is 0.
- The sheet's active skills get a **Use** button that rolls (dice overlay) and shows the outcome. Applying it to a target comes with combat (N12–N14), which uses this helper.

## Sprite colorizer (decided scope)

`.scratch/images/sprite-colorizer.md` is the reference. Integrated as an internal tool (`/tools/sprite-colorizer`), pure helpers under `modules/sprite/helpers/`. First ticket: P0 + P1 (gradient mapping, material layers, presets, brush, eraser, bucket, magic wand, undo/redo, PNG and JSON export). P2/P3 (polygon, edge snapping, shape detection, batch) are a later ticket.

## Documentation

A learning document (French) on peer-to-peer and data encryption, taking this app's implementation as the example: `docs/learning/p2p-et-chiffrement.md`.
