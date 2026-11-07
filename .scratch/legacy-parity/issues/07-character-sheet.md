# Character sheet and item actions

Status: ready-for-agent
Type: task
Blocked by: 06

Spec row 8. `p-tabs` Stats / Equipment / Inventory. `character.service` calls with host handlers in `character-host.business.ts` and pure rules in `character.rules.ts`: spendStatPoint (player), grantStatPoints (GM), equip/unequip (slot rules), use (consumable: add modifiers to current values, capped at max, then remove), sell (money += price, remove). Item actions via `p-contextmenu` + `p-menu` button; details in `p-popover`/`p-dialog`. Rules live in the host reducer and are unit-tested.

**Tools entry (from L11):** also open the sheet from the Tools menu on the sandbox world (`SandboxWorldBusiness`, a sample character built locally), with spend/equip/use/sell applied locally and in-game-only actions hidden. Build the sheet on a world + character input rather than reading the room directly. Reuse `app-character-summary`, `character-stats.ts` and `app-item-card`.
