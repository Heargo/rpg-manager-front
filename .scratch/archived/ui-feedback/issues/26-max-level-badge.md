# Max character level, and a level badge coloured by rarity

Status: resolved
Type: task
Blocked by: 08, 17

User request (2026-11-08): « ajoute un niveau max pour le joueur. En fonction du niveau max, détermine la couleur du badge de niveau selon l'échelle de rareté et le niveau (niveau max = badge légendaire) ».

## Decisions (orchestrator, open to the user)

- **Setting:** `World.maxLevel` is set in the wizard's Rules step next to the level curve. It is an integer from 2 to 100 (the existing `MAX_LEVEL` cap), default 20, round-tripped by export and import.
- **Cap:** a character never goes above `maxLevel`. `grantXp` stops levelling at the max: XP still adds up, but no level or stat points are gained past the max. The XP pill on the card shows "Niveau max" / "Max level" instead of "xp / next" at the max.
- **Badge colour:** the colour follows the item rarity scale (the same colours as rarity tags and tile borders), by progress `p = (level - 1) / (maxLevel - 1)`:
  - common: p < 0.25
  - uncommon: p < 0.5
  - rare: p < 0.75
  - mythic: p < 1
  - legendary: level = maxLevel

  A pure `levelRarity(level, maxLevel)` in `level.rules.ts`.
- **Where:** the level badge on the character card, and any other level badge (sheet, table player list) through the same helper.

## Tests

- `levelRarity` boundaries: level 1 is common, and the max is legendary. Use maxLevel 20 for the in-between steps; maxLevel 2 gives common, then legendary.
- `grantXp` stops at `maxLevel` with no extra stat points.
- `maxLevel` validation in the draft (2 to 100) and import.
- The card badge carries the rarity class or severity for its level.

Checked in the browser: the wizard field, and the sandbox card at level 1 and after granting enough XP to reach the max.

## Green

- Files: `src/app/modules/character/helpers/level.rules.ts`, `character-actions.rules.ts`, `offline-actions.rules.ts`, `business/character.business.ts`, `components/character-card/character-card.component.{ts,html}`; `src/app/modules/world/models/world.ts`, `helpers/world.factory.ts`, `world-draft.rules.ts`, `world-export.ts`, `pages/world-new-page/world-new-page.component.{ts,html}`; `public/i18n/{en,fr}.json`; specs: level.rules, character-actions.rules, character-actions, character-card, character-sheet, world-draft.rules, world-export, world.factory.
- Change: `World.maxLevel` (required, default 20, 2 to 100, validated in draft and import, exported, in `WorldInfo`); `levelProgress` and `grantXp` take `maxLevel` (cap, `maxed` flag); `levelRarity` and `isValidMaxLevel` in `level.rules.ts`; card badge uses `RARITY_SEVERITY` (imported from the item helper, helper-only import so no move to core) plus `data-rarity`; XP pill shows "Max level"; wizard "Max level" field. Only the card shows a level badge (sheet and table list have none).
- Tests that failed before the implementation (red showed as compile errors, the builder type-checks specs): new `levelRarity` (3), `max level cap` (3: grantXp stops at max, levelProgress maxed, isValidMaxLevel) in level.rules.spec; maxLevel range in world-draft.rules.spec; max level default/keep in world.factory.spec; max level round-trip/refusal in world-export.spec; card rarity class, severity tag and "Max level" text (3) in character-card spec. Existing specs got `maxLevel` fixtures and `maxed` in `levelProgress` expectations.
- Suite: 94 files, 760 tests pass; tsc clean; build OK. No browser check done.
- Open questions: none

## Answer

- **Setting:** `World.maxLevel` (2 to 100, default 20), in the wizard's Rules step; validated in the draft and on import, exported, and part of `WorldInfo`.
- **Levels:** `grantXp` and `levelProgress` take `maxLevel`: levelling stops at the max, with no stat points past it (XP still adds up), and `levelProgress().maxed` makes the card's pill show "Niveau max" / "Max level".
- **Badge:** `levelRarity(level, maxLevel)` follows the rarity scale (common below 25 %, uncommon below 50 %, rare below 75 %, mythic below the max, legendary at the max), shown on the card's level tag through `RARITY_SEVERITY` with a `data-rarity` attribute. Only the card has a level badge.
- **Checked:**
  - Suite 94 files, 760 tests; build OK.
  - Browser, sandbox: level 1 is common, "0 / 200"; +3000 XP gives level 7, uncommon (6/19); +30000 XP gives level 20, legendary (red tag), the pill "Niveau max", and stat points 62 (5 + 19 × 3, nothing past the max).
