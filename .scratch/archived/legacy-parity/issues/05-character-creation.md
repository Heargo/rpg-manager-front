# Character creation on first join

Status: resolved
Type: task
Blocked by: 03, p2p-rooms/03

Spec row 5. Portrait + name; host creates the character from the game defaults (attributes, stat points, money) via `characterService.createCharacter()` handled by the host business.

## Answer

- Character feature (`modules/character`): `character.rules.ts` (validate a create request from the wire, build a character from the world's defaults: base values, starting stat points and money, empty inventory, `rev` 1), `CharacterService` (`character/create`, `character/list`), `CharacterHostBusiness` (host: knows the player from their connection's seat, refuses the game master, a second character, bad names or oversized portraits; stores the portrait; saves; publishes the list), `CharacterBusiness` (list, my character, `$needsCharacter`, create with portrait, readable errors).
- `/room/character` creation page (name, portrait, the world's starting stats); a player is sent there once right after joining, then has a button in the room; `app-character-list` in both lobbies.
- World session (`WorldSessionBusiness`, host): the hosted world in memory, changes applied one at a time and saved, public `world/info` published (`WorldInfoBusiness` on every device).
- `GameSessionBusiness` (play module, started at launch): while this device hosts a world's room, also after a reload, opens the world and runs the character and image handlers.
- Images across devices: `ImageTransferService` (`image/get`); `ImageBusiness.url()` asks the host for an image it doesn't have and keeps it only if the bytes match the hash; the host serves only stored hash ids.
- `PeerApi.watchCurrent()`: `null` at each session start/end, so room, world info and character signals never show a previous room's state.
- Checked in the browser (production build, two tabs): host creates and hosts a world, Ada joins, lands on creation with the world's stats, creates "Ada la Rousse" with a portrait, both lobbies list her. Same-origin tabs share the image store, so the portrait fetch from the host is covered by the integration test, not the browser run.
- Tests: 11 new (rules, five host + players scenarios incl. host reload and portrait transfer, watchCurrent). Suite: 164 passing.
