# Shared sheet model

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Shared sheet model).

Extract `Sheet` from `Character` (`Character = Sheet & { playerId, rev, notes }`), with the new fields `classId?`, `skillPoints`, `skills`. `attributeStats`, level rules and equip/unequip/use rules take a sheet. Export/import validates the new fields; old exports are refused (no fallback). Pure refactor otherwise: the suite stays green, no UI change.
