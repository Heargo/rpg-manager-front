# Character sheet and item actions

Status: claimed
Type: task
Blocked by: 06

Spec row 8. `p-tabs` Stats / Equipment / Inventory. `character.service` calls with host handlers in `character-host.business.ts` and pure rules in `character.rules.ts`: spendStatPoint (player), grantStatPoints (GM), equip/unequip (slot rules), use (consumable: add modifiers to current values, capped at max, then remove), sell (money += price, remove). Item actions via `p-contextmenu` + `p-menu` button; details in `p-popover`/`p-dialog`. Rules live in the host reducer and are unit-tested.

**Tools entry (from L11):** also open the sheet from the Tools menu on the sandbox world (`SandboxWorldBusiness`, a sample character built locally), with spend/equip/use/sell applied locally and in-game-only actions hidden. Build the sheet on a world + character input rather than reading the room directly. Reuse `app-character-summary`, `character-stats.ts` and `app-item-card`.

## Comments

- 2026-11-07 (work in progress, commit "wip(character)"): rules (`character-actions.rules.ts`), host handlers (one `character/<kind>` route per action; players on their own character, GM on anyone, GM alone grants points and sets current values), `app-character-sheet` (Stats / Equipment / Inventory tabs, context menu + ⋮ menu, details dialog, sell confirmation), `/room/sheet/:characterId` (linked from the table), `/tools/character-sheet` sandbox. 235 tests pass, build passes. Left: browser check (room sheet as GM, sandbox sheet, mobile, EN/FR), then resolve and archive. Added beyond the ticket: GM "set current value" (otherwise nothing lowers life).
