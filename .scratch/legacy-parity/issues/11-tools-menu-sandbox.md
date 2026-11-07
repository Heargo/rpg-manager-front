# Tools menu: every tool usable without a game

Status: ready-for-agent
Type: task
Blocked by: none

Anyone should be able to try the app's features from the nav bar without creating a world or joining a room: roll dice, generate items, open the editors. Today only the dice roller (`/dice`) works on its own; the item generator has no page, and the planned item catalogue, item editor and character sheet (L07–L09) only exist inside a game.

## Scope

- **Nav bar "Tools" group** (`nav.tools`): a submenu in `MenuService.staticItems` (the nav bar already translates nested `items`). Move "Dice" into it. Every tool page gets its own route outside `room/`, with no guard that needs a room or a world.
- **Tools available now:**
  - Dice roller: `/dice`, unchanged, just moved into the group.
  - Item generator: new `/tools/item-generator` page on `core/generators/item-generator.ts` and the word lists: pick rarity / type / slot (or random), Reroll, visible seed (paste a seed to get the same item back), item shown as a card (name, rarity `p-tag`, type, slot, price, modifiers, description). Attributes come from the sandbox world below. Works offline, in EN and FR.
  - External tools (Watabou's Procgen Arcana, Azgaar's Fantasy Map Generator, Squoosh): the tools link page from L01, as the last entry of the group. If L01 isn't done yet, this ticket adds that page.
- **Sandbox world** for tools that need a world's attributes (item modifiers, character sheet): a fixed, in-memory world (default attributes like the new world wizard's, life/mana bars, default money format) built by a helper, in the active language. Never saved to IndexedDB, never hosted. Results stay on the page (no "give to player").
- **Rule for later tools:** item catalogue (L08), item editor (L09) and character sheet (L07) each get a Tools entry that opens them on the sandbox world, with in-game-only actions (give to player, sell to the host, push to the table) hidden. Add this to their tickets when picking this one up, so they're built with a world input rather than reading the room directly.

## Out of scope

- Saving sandbox results (export an item to a world later, maybe).
- Shared dice or any peer-to-peer behaviour in sandbox mode.

## Done when

- The nav bar shows a Tools submenu on desktop and mobile, with Dice, Item generator and External tools, labels in EN and FR.
- In a fresh browser (only the local profile created, no world, no room), each tool opens and works; offline too after a first visit (service worker).
- The item generator gives the same item for the same seed, and every rarity/type/slot combination renders.
- L07, L08, L09 mention the sandbox world and the Tools entry.
- Tests: sandbox world helper (valid world, both languages), item generator page (reroll changes the item, seed reproduces it), menu has the Tools group.

## Comments
