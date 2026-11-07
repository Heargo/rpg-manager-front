# Item editor (form, JSON, AI prompt)

Status: ready-for-agent
Type: task
Blocked by: 08, 10

Spec row 10. `p-tabs`: form (image, name, rarity, type, slot when equipment, price, description, modifiers from the game's attributes), JSON (validated two-way), Generate (random generator from ticket 10 with Reroll and a visible seed; Chrome on-device AI when available; copy prompt). Create and edit. Split the on-device AI into its own ticket if it grows.

**Tools entry (from L11):** also open the editor from the Tools menu on the sandbox world's attributes, result kept on the page (no save to a world). The Generate tab can reuse `ItemGeneratorBusiness` (`modules/tools`, seed + options) or move it to the item module.
