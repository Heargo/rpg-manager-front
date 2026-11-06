# Character sheet and item actions

Status: ready-for-agent
Type: task
Blocked by: 06

Spec row 8. `p-tabs` Stats / Equipment / Inventory. `character.service` calls with host handlers in `character-host.business.ts` and pure rules in `character.rules.ts`: spendStatPoint (player), grantStatPoints (GM), equip/unequip (slot rules), use (consumable: add modifiers to current values, capped at max, then remove), sell (money += price, remove). Item actions via `p-contextmenu` + `p-menu` button; details in `p-popover`/`p-dialog`. Rules live in the host reducer and are unit-tested.
