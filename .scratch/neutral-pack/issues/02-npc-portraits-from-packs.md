# NPC portraits from pack sprites

Status: claimed
Type: task
Blocked by: 01

Spec: `../spec.md` (Asset types a pack can carry)

## Triage (2026-11-18, user)

- Split: NPCs here; skills and classes in ticket 05.
- Colours: same rule as items. A `colored` sprite is used as is; `grayscale` and `masked` sprites are recoloured with random gradients.
- Skills and classes already have `imageId` in their model, but their editors have no image picker (ticket 05).

## Behaviours

1. The active packs' sprites with domain `npcs` can be drawn for an NPC, matched by the NPC's kind like items match theirs (a parent kind draws from its children; no match falls back to any NPC sprite). Item sprites are never drawn for an NPC, and NPC sprites never for an item.
2. The NPC editor gets a "Random image" button next to its portrait picker; the NPC generator (Generate / Random) also gives the NPC a portrait when an NPC sprite exists. Same NPC and seed give the same portrait. With no NPC sprite in the active packs, the portrait stays as it was and nothing fails.
3. The pack creator's Sprites tab lets the author pick the sprite's domain (items or NPCs) and then its kinds from that domain's kinds.

## Baseline

`npm test` on develop (2026-11-18): 339 test files, 3386 tests, all passed.

## Seams

1. **`pickSprite` in `src/app/modules/sprite/helpers/random-sprite.ts`** (pure helper, takes a domain or the NPC look): catches domain filtering, kind matching with parent → children and the fallback; misses storage, fetching and UI.
2. **The random image business** (`RandomItemImageBusiness` made domain-aware, or a sibling `create(npc, seed)` for NPCs, over the boundaries the repo already fakes): catches "an NPC gets a stored portrait from an `npcs` sprite", determinism by seed, item sprites never used for NPCs, and the "no NPC sprite" failure the editor turns into "keep the portrait"; misses the editor wiring (browser check).
3. **`PackCreatorBusiness` sprite edits** (domain set on a sprite, kinds validated against that domain's kinds): catches the Sprites tab's model change; misses the tab's layout (browser check).
