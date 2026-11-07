# Game table (GM and player views)

Status: resolved
Type: task
Blocked by: 05, 02

Spec rows 6 and 7. GM: `p-splitter` with player list, illustration + quick images (push to all), saved notes, dice. Player: own sheet, life/mana `p-progressbar` from the game's bar attributes, illustration, dice. Optional shared dice rolls. Mobile layout with `p-drawer`.

## Answer

- Table feature (`modules/table`): `table.rules.ts` (image ids, show/clear the illustration, quick images at the front without duplicates up to 30, notes up to 50,000 chars), `TableService` (`table/show-illustration`, `add-quick-image`, `remove-quick-image`, `save-notes`, topic `table/scene`), `TableHostBusiness` (GM-only: refuses anything not from the host's own UI, checks the image is in the host's store so players can fetch it, saves, publishes the scene), `TableBusiness` (scene, quick images, notes saved 800 ms after typing stops and flushed when the page closes).
- `/room/table` page. GM: `p-splitter` (players list + picked character | illustration, Add a picture, Hide, quick image strip: click to show to all, × to remove | saved notes + dice), sizes remembered in localStorage; under 960 px one column with the players in a `p-drawer`. Player: illustration + own character summary + dice; "create your character" when they have none. "Go to the table" in both lobbies; a new character lands on the table.
- `app-character-summary` (character module): portrait, life/mana `p-progressbar` from the world's bar attributes, stat points badge, money in the world's format, attributes with current/max and equipment bonus. Helpers `character-stats.ts` (max = base + points + equipped modifiers by attribute name; current capped) and `world/helpers/money.ts` (`Intl` currencies, coins, custom symbol); L07 can reuse both.
- Shared dice (off by default, toggle under Roll): **the host draws the values** (`DiceHostBusiness`, `dice/roll`, topic `dice/rolls` with the last 20), not the roller, so a player can't announce chosen values. Everyone replays the same values + seed; a roll from someone else is thrown on screen when it's less than 10 s old and the table page is open; the overlay says who rolled and hides "Roll again" for others' rolls. Sharing off, or not in a room: local roll as before. Spec "In a room" updated.
- `ImageBusiness.has()`; `src/testing/game-device.ts`: one per-device provider list for multi-device specs (character and table specs use it).
- Not done here: player personal notes (the `notes` offline toggle from L04 mentions them; no ticket asks for them yet).
- Checked in the browser (dev server, FR and EN): created and hosted a world, GM table with splitter, added a picture (shown + in the strip), notes saved and still there after reload, mobile layout and players drawer, shared d20 roll in the overlay and the table rolls list, no console errors. The player view and player-to-GM roll sharing are covered by the integration test (same-origin tabs share one profile), not a two-device run.
- Tests: 18 new (stats, money, table rules, five GM + player scenarios: illustration to player with image fetch, GM-only refusals, notes debounce + persistence, shared roll seen by the host and replayed with the same plan, local roll when sharing is off). Suite: 208 passing.
