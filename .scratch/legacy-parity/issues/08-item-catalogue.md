# Item catalogue (GM)

Status: ready-for-agent
Type: task
Blocked by: 03

Spec row 9. `p-dataview` grid, search, rarity/type `p-multiselect`, price `p-slider` range, hover preview, give to player (`itemService.giveToPlayer()`), edit, delete, "Add default items" (generated from the world's attributes with `starter-items.ts`, as in the wizard). Rarity as `p-tag` with preset colours.

**Tools entry (from L11):** also open the catalogue from the Tools menu on the sandbox world (`SandboxWorldBusiness`, items generated with `starter-items.ts`, kept in memory), with "give to player" hidden. Build it on a world input rather than reading the room directly. Reuse `app-item-card` and `RARITY_SEVERITY` (`modules/item`).
