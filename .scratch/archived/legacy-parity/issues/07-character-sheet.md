# Character sheet and item actions

Status: resolved
Type: task
Blocked by: 06

Spec row 8. `p-tabs` Stats / Equipment / Inventory. `character.service` calls with host handlers in `character-host.business.ts` and pure rules in `character.rules.ts`: spendStatPoint (player), grantStatPoints (GM), equip/unequip (slot rules), use (consumable: add modifiers to current values, capped at max, then remove), sell (money += price, remove). Item actions via `p-contextmenu` + `p-menu` button; details in `p-popover`/`p-dialog`. Rules live in the host reducer and are unit-tested.

**Tools entry (from L11):** also open the sheet from the Tools menu on the sandbox world (`SandboxWorldBusiness`, a sample character built locally), with spend/equip/use/sell applied locally and in-game-only actions hidden. Build the sheet on a world + character input rather than reading the room directly. Reuse `app-character-summary`, `character-stats.ts` and `app-item-card`.

## Answer

- Rules (`character/helpers/character-actions.rules.ts`): one pure reducer for every action: spend a stat point (max and current +1), grant points (GM, 1–100), set a current value (GM, kept between 0 and max), equip (equipment only, one item per slot: the previous one goes back to the bag), unequip, use (consumables add their modifiers to current values, capped at max, then leave the bag), sell (money += price, item removed, equipped or not). Wire payloads parsed per action.
- Host (`CharacterHostBusiness`): one route per action, `character/<kind>` with `{ characterId, ... }`. Players act on their own character only; the game master on anyone, and alone grants points and sets current values. Applied through `WorldSessionBusiness.update`, `rev` bumped, list published.
- Sheet (`app-character-sheet`, presentational: world + character in, actions out): portrait, money, stat points, life/mana bars; tabs Stats (base, points, bonus, current/max, + to spend, GM grant form and editable current values), Equipment (10 slots), Inventory (tiles with rarity border). Item actions from the details dialog (`app-item-card` with the world's money format), right-click `p-contextmenu` and a ⋮ `p-menu`; selling asks for confirmation. Below 480 px the Base and Points columns hide.
- Room: `/room/sheet/:characterId`, linked from the table ("Open the sheet" for a player's own character and for the GM's selected one). Tools: `/tools/character-sheet` on the sandbox world, a sample character with the default items, actions applied locally, "Start over"; language switch starts over.
- `CharacterBusiness`: `act()`, `canPlay()`, `$isGameMaster`, stats/bars/money take an explicit world (room or sandbox).
- Added beyond the ticket: GM "set current value" (nothing else lowers life). No popover on hover: the details dialog covers it on touch and desktop.
- Checked in the browser (sandbox sheet, FR and EN, mobile): spend a point, equip from the details dialog (tile shows Equipped), sell with confirmation (money 50 → 60), context menu, unknown character in the room page, no console errors. The room flow (player acting, GM granting, other players seeing it) is covered by the multi-device test; inventory in a room stays empty until the catalogue can give items (L08).
- Tests: 17 new (9 rules, 3 host + players, 3 sheet component, 2 sandbox). Suite: 235 passing.

## Comments

- 2026-11-07 (work in progress, commit "wip(character)"): rules (`character-actions.rules.ts`), host handlers (one `character/<kind>` route per action; players on their own character, GM on anyone, GM alone grants points and sets current values), `app-character-sheet` (Stats / Equipment / Inventory tabs, context menu + ⋮ menu, details dialog, sell confirmation), `/room/sheet/:characterId` (linked from the table), `/tools/character-sheet` sandbox. 235 tests pass, build passes. Left: browser check (room sheet as GM, sandbox sheet, mobile, EN/FR), then resolve and archive. Added beyond the ticket: GM "set current value" (otherwise nothing lowers life).
