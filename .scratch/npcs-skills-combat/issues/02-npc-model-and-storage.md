# NPC model, storage and export

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (NPC catalogue).

`Npc = Sheet & { roles, description, xpReward, loot, merchant? }`, `World.npcs`, `npc.rules.ts` (validation, duplicate, filter by name / role / level range), export/import round-trip. Host-only: `WorldInfo` never carries NPCs.
