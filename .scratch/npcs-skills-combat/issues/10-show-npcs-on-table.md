# Show NPCs on the table

Status: needs-triage
Type: task
Blocked by: 03, 15

Spec: `../spec.md` (Showing NPCs on the table).

GM shows / hides up to 4 NPCs of any role on every player's table. World rules NPCs section: per role, which fields players see (description, level, life bar, life numbers, every attribute, equipped items; defaults in the spec), validated and exported with the world. The host builds the public projection from those rules (`npc-visibility.rules.ts`, union for several roles); inventory, skills, money, XP reward and loot are never sent.
