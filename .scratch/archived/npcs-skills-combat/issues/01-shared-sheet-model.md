# Shared sheet model

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Shared sheet model).

Extract `Sheet` from `Character` (`Character = Sheet & { playerId, rev, notes }`), with the new fields `classId?`, `skillPoints`, `skills`. `attributeStats`, level rules and equip/unequip/use rules take a sheet. Export/import validates the new fields; old exports are refused (no fallback). Pure refactor otherwise: the suite stays green, no UI change.

## Baseline

`npm test`: 94 files, 779 tests passed (2026-11-08).

## Seams

1. `world/helpers/world-export.ts` import/export: refuses exports whose characters lack `skillPoints`/`skills` (or have a malformed `classId`/`skills`), round-trips the new fields. Misses runtime use.
2. Rules helpers (`character-stats` `attributeStats`, `level.rules`, `character-actions.rules` equip/unequip/use) called with a plain `Sheet` (no `playerId`/`rev`/`notes`): an NPC-shaped sheet works the same. Misses UI.
3. Character creation (`character.rules` / `world.factory`, wherever characters are built): new characters get `skillPoints: 0` and `skills: []`, no `classId`. Misses migration (none, by design).

## Red

- Test files: `src/app/modules/character/helpers/sheet.rules.spec.ts` (new), `src/app/modules/world/helpers/world-export.spec.ts`, `src/app/modules/character/helpers/character.rules.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/character/helpers/sheet.rules.spec.ts --include src/app/modules/world/helpers/world-export.spec.ts --include src/app/modules/character/helpers/character.rules.spec.ts`
- Failing: 4 test groups
  - sheet.rules.spec.ts (4 tests: attributeStats, equip/unequip, use, levelProgress on a plain NPC-shaped `Sheet`) — build error TS2305, `Sheet` not exported from `world/models/world`
  - world-export: "refuses an old export without skillPoints or skills, and keeps the new fields of a valid one" — no `skillPoints`/`skills` validation yet
  - world-export: "refuses a malformed classId, skillPoints or skills entry" — no `classId`/`skillPoints`/`skills` validation yet
  - character.rules: "creates a character from the world defaults" — `createCharacter` returns no `skillPoints: 0` / `skills: []`

## Green

- Files: src/app/modules/world/models/world.ts, src/app/modules/world/helpers/world-export.ts, src/app/modules/character/helpers/character.rules.ts, character-stats.ts, character-actions.rules.ts; fixture-only edits in 8 existing specs (see below)
- Change: `Sheet` extracted (`Character = Sheet & { playerId, rev, notes }`) with `classId?`, `skillPoints`, `skills`; `attributeStats` takes a `Sheet`; `applyCharacterAction` is generic over `T extends Sheet` (returns the same type); `createCharacter` sets `skillPoints: 0`, `skills: []`; import validates the new fields (old exports refused).
- Suite: 95 files, 785 tests pass (baseline 94/779, +1 file, +6 tests); tsc and ng build clean.
- Open questions: the new required fields broke tsc in 8 existing, non-red spec fixtures (character-card, character-sheet, pick-a-save-dialog, character-actions.rules, character-stats, offline-actions.rules, player-copy.rules, world.factory); I added `skillPoints: 0, skills: []` to them, so unstaged test files appear in `git diff --name-only`. Prettier already flags world.ts, world-export.ts, character-actions.rules.ts before my change (not reformatted).

## Answer

- `Sheet` extracted in `world/models/world.ts`: `Character = Sheet & { playerId, rev, notes }`; new fields `classId?`, `skillPoints`, `skills: SheetSkill[]` (`{ skillId, rank }`).
- `attributeStats` and the level helpers take a `Sheet`; `applyCharacterAction` is generic over `T extends Sheet` (same type back), so an NPC-shaped sheet works like a character.
- `createCharacter` sets `skillPoints: 0`, `skills: []`, no `classId`.
- World import refuses exports without the new fields (no fallback) and rejects a bad `classId`, negative `skillPoints`, or a skill with a bad `skillId` / `rank < 1`. Checking that `skillId` exists is left to the skill catalogue ticket (N05).
- Checked: suite 95 files / 785 tests green (baseline 94 / 779), `ng build` clean, review verdict ship. No UI, so no browser check. 8 existing specs got fixture-only additions for the new required fields.
