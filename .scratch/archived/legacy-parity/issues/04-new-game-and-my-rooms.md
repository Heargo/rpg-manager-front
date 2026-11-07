# New game wizard and "my rooms" list

Status: resolved
Type: task
Blocked by: 03, p2p-rooms/04

Spec rows 3 and 4. `p-stepper` (identity → attributes → defaults) with live card preview, a "Start with the default items" checkbox and the room's offline feature toggles (p2p-rooms/10); `p-dataview` of hosted worlds and joined rooms with empty state; host a world (opens its room), join by code, leave/delete with `p-confirmdialog`.

## Answer

- `/play` hub (new `modules/play`, `PlayBusiness` combining the world and room businesses): worlds as cards (`p-dataview`, empty state) with Host / Open room, Export (JSON file), Delete (`p-confirmdialog`; closes the room if it's the open one); Import; "Join a room" box; "Rooms you joined" with Forget (confirm). "Play" in the menu goes here; `/room` with no open room redirects here.
- `/worlds/new` wizard (`p-stepper`, linear): identity (name, description, picture via `p-fileupload` → `ImageBusiness`), attributes (5 translated defaults, add/remove, life/mana bars), rules (starting stat points and money, currency incl. custom symbol, default items checkbox, offline feature toggles with the spec defaults). Live `world-card` preview. Validation in `world-draft.rules.ts`.
- Rooms carry `worldId`; hosting a world opens a room named after it.
- Default items: **generated** from the world's own attributes (`starter-items.ts`, seeded by the world id, active language): one common piece per equipment slot, 3 better ones, 2 potions per bar attribute, 3 misc items (20 items for a 2-bar world). Replaces the planned bundled JSON, whose modifiers would name attributes most worlds don't have; spec updated.
- Also: primary theme colour set to the palette's dark red (`#7f1919`, from `legacy-dev`'s preset); `localDate` pipe (dates in the app language instead of DatePipe's fixed en-US); `app-stored-image` core component; `ConfirmationService` + global confirm dialog; export file names keep accented letters as plain ones.
- Checked on a production build: theme, empty hub, wizard (picture upload + preview, duplicate attribute caught case-insensitively, defaults), creation with 20 French items (gender agreement), host → room → banner, delete closes the room, FR dates, phone width without overflow.
- Not covered by this ticket: editing a world after creation.
- Tests: 14 new (draft rules, starter items, world creation with items, PlayBusiness, date pipe). Suite: 153 passing.
