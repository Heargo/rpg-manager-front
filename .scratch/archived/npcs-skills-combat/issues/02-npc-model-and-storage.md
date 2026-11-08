# NPC model, storage and export

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (NPC catalogue).

`Npc = Sheet & { roles, description, xpReward, loot, merchant? }`, `World.npcs`, `npc.rules.ts` (validation, duplicate, filter by name / role / level range), export/import round-trip. Host-only: `WorldInfo` never carries NPCs.

## Baseline

`npm test`: 99 files, 803 tests passed (2026-11-08).

## Seams

Model (from the spec): `Npc = Sheet & { roles: ('story' | 'merchant' | 'enemy')[] (at least one), description: string, xpReward: number (≥ 0), loot: string[] (ids of inventory entries dropped on defeat), merchant?: { buyRatio?: number; sellRatio?: number } }`. `World.npcs: Npc[]`, new worlds start empty.

1. A pure `npc.rules.ts` helper: validation (roles, xpReward, loot ids that exist in the inventory, merchant ratios), duplicate (new id, copied name, deep copy), filter by name / roles / level range. Misses storage and network.
2. `world/helpers/world-export.ts` and `world.factory`: new worlds have `npcs: []`; export/import round-trips NPCs; an export without `npcs` or with a malformed NPC is refused (no fallback). Misses runtime.
3. The room over the fake peer network (`src/testing/game-device.ts`): a host whose world has NPCs publishes `world/info`, and the player receives no NPC data. Misses UI (none in this ticket).

## Red

- Test files: `src/app/modules/npc/helpers/npc.rules.spec.ts` (new), `src/app/modules/npc/business/npc-privacy.spec.ts` (new), `src/app/modules/world/helpers/world-export.spec.ts` (3 tests added), `src/app/modules/world/helpers/world.factory.spec.ts` (1 test added)
- Run: `npx ng test --watch=false --include 'src/app/modules/npc/**/*.spec.ts' --include src/app/modules/world/helpers/world-export.spec.ts --include src/app/modules/world/helpers/world.factory.spec.ts 2>&1 | tail -30`
- Expected new symbols (the red is the build error, which also stops the whole suite until they exist): `src/app/modules/npc/models/npc.ts` exporting `Npc` (`Sheet & { roles, description, xpReward, loot, merchant? }`), `World.npcs: Npc[]`, and `src/app/modules/npc/helpers/npc.rules.ts` exporting `validateNpc(npc): {field, code}[]` (fields/codes: name/required, roles/required, roles/invalid, xpReward/invalid, loot/unknown-item (loot ids = the NPC's own inventory entry ids), merchant/invalid (ratios 0..10)), `duplicateNpc(npc, newId: () => string)` (name becomes `"<name> (copy)"`, deep copy), `filterNpcs(npcs, { search, roles, minLevel, maxLevel })` (name search trimmed/case-insensitive, any selected role, level bounds inclusive).
- Failing: 20 tests, all currently blocked by build errors (TS2307 `../models/npc` / `./npc.rules`, TS2339 `npcs` not on `World`):
  - npc.rules.spec: validateNpc (8 tests), duplicateNpc (2), filterNpcs (5) — missing `npc.rules` / `Npc`
  - world-export.spec: round-trips the NPCs; refuses an export without npcs; refuses a malformed NPC — `World.npcs` missing, no NPC validation
  - world.factory.spec: starts with no NPCs — `createWorld` has no `npcs`
  - npc-privacy.spec: keeps the NPCs in the hosted world and out of world/info for the player — `World.npcs` / `Npc` missing

## Green

- Files: `src/app/modules/npc/models/npc.ts` (new), `src/app/modules/npc/helpers/npc.rules.ts` (new), `src/app/modules/world/models/world.ts`, `src/app/modules/world/helpers/world.factory.ts`, `src/app/modules/world/helpers/world-export.ts`
- Change: added `Npc`/`NPC_ROLES`/`NpcFilter` and the pure `validateNpc`, `duplicateNpc`, `filterNpcs`; `World.npcs` (new worlds start with `[]`); the export parser now requires `world.npcs` and validates each NPC (sheet fields, roles, xpReward, loot, merchant ratios). `toWorldInfo` is untouched, so NPCs never leave the host.
- Suite: 101 files, 823 tests passed (baseline 99 / 803); tsc clean; ng build OK. No existing spec fixture needed `npcs: []`. No test file in the unstaged diff.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/world/helpers/world-export.ts:114-143 — duplicated code — the NPC block copies the sheet checks of the characters block (xp, level, money, skillPoints, skills, attributes, inventory). Extract a `validateSheet(record, path, errors)` used by both.
  - src/app/modules/world/helpers/world-export.ts:114 — the import does not check that a blank NPC name or loot ids missing from the inventory are refused (validateNpc does). Consider reusing `validateNpc` on parsed NPCs so file and rules cannot drift.
  - src/app/modules/npc/models/npc.ts:1 and world/models/world.ts:4 — world and npc models import each other (type-only cycle). Harmless now; watch it.
  - src/app/modules/npc/helpers/npc.rules.ts:11 — `NpcIssue` field/code are loose unions; the spec only lists specific pairs. Fine.

## Answer

- `Npc` (`npc/models/npc.ts`): `Sheet & { roles, description, xpReward, loot, merchant? }`, with `NPC_ROLES` and `NpcFilter`. Shapes chosen by the orchestrator where the spec was silent: `loot` is the ids of the NPC's own inventory entries, `merchant` holds optional `buyRatio` / `sellRatio` (0 to 10).
- `npc.rules.ts`: `validateNpc` (field/code issues), `duplicateNpc` (deep copy, new id, "<name> (copy)"), `filterNpcs` (name, any selected role, inclusive level range).
- `World.npcs` (new worlds start empty); export/import round-trips NPCs and refuses an export without `npcs` or with a malformed NPC (no fallback). `toWorldInfo` is unchanged: players never receive NPCs (checked over the fake peer network).
- Checked: suite 101 files / 823 tests (baseline 99 / 803), `ng build` clean, review ship. No UI, so no browser check.
- Left for later (review): the import repeats the character sheet checks for NPCs, and doesn't reuse `validateNpc` (a blank NPC name or a loot id missing from the inventory passes the import).
