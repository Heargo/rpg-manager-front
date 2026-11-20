# NPC portraits from pack sprites

Status: resolved
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

## Red

- Test files: `src/app/modules/sprite/helpers/random-sprite.npc.spec.ts`, `src/app/modules/sprite/business/random-item-image.npc.spec.ts`, `src/app/core/business/pack-creator.npc-sprites.business.spec.ts`
- Run: `npx ng test --watch=false --include <file>` for each file
- Assumed API: `pickSprite(candidates, { domain: 'npcs', kind }, npcVocabulary, random)` with candidates carrying `domain: 'items' | 'npcs'`; `RandomItemImageBusiness.createNpc({ kind }, seed)`; `domain?: 'items' | 'npcs'` on `SpriteMeta` / `DraftSprite` (default items), written to the manifest, kept on copy, kinds validated against the domain's kinds (Base plus the draft's own `npcKinds`)
- Failing: 17 tests
  - random-sprite.npc.spec.ts (6): draws among NPC sprites of the kind; parent-kind sprite for a child kind; fallback to any NPC sprite, never an item sprite; undefined with no NPC sprite; same seed gives the same NPC sprite; never an NPC sprite for an item — `pickSprite` ignores domain and uses the item vocabulary (assertion failures, `kindForName is not a function`)
  - random-item-image.npc.spec.ts (7): stored portrait from an NPC sprite of the kind; parent kind; fallback never an item sprite; colored sprite used as is; same seed same portrait; rejects with no NPC sprite; never an NPC sprite for an item — the file does not compile, `createNpc` does not exist
  - pack-creator.npc-sprites.business.spec.ts (4): writes the sprite domain in the built manifest (items by default); refuses an NPC sprite with a non-NPC kind; refuses an items sprite with an NPC kind; keeps the domain when the pack is copied — the domain is not modelled or validated yet

## Green

- Files: src/app/modules/sprite/helpers/random-sprite.ts, src/app/modules/sprite/business/random-item-image.business.ts, src/app/core/business/pack.business.ts, src/app/core/business/pack-creator.business.ts, src/app/core/packs/pack-draft.ts, src/app/modules/npc/components/npc-editor/npc-editor.component.ts, src/app/modules/tools/components/pack-draft/sprites-grid/sprites-grid.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `pickSprite` is domain-aware (NPC kind chain, then any NPC sprite); `RandomItemImageBusiness.createNpc`; `PackBusiness.npcSprites()`; `DraftSprite.domain` written to the manifest, kept on copy, kinds validated per domain. NPC editor: "Random image" button, Generate/Random also draw a portrait (kept when no NPC sprite). Sprites tab: domain select, kinds offered from that domain. EN/FR keys added.
- Suite: 342 files, 3403 tests, all pass (baseline 339 files, 3386 tests); tsc and ng build clean; no test file modified.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/sprite/helpers/random-sprite.ts:43 — `pickSprite` takes `ItemLook | NpcLook` and `ItemVocabulary | NpcVocabulary`, then casts both; a mismatched pair compiles — use overloads or two exported functions.
  - src/app/core/business/pack-creator.business.ts:176 — sprite kinds are validated only when a sprite is added; editing domain/kinds of an existing sprite (grid save) is constrained by the UI only — validate on update too.
  - src/app/modules/sprite/business/random-item-image.business.ts:67 — NPC portraits recolour with the item vocabulary's tint pool; fine, but worth a comment saying why.
  - src/app/core/business/pack.business.ts:372 — `npcSprites()` duplicates the Base/stored loop of `sprites()`; `BundledNpcSprite` is identical in shape to the item variant — consider one domain-parameterised helper.
  - npc-editor.component.ts: the "Random image" button and Generate portrait draw have no automated test (seam 2 excludes the wiring); cover in the browser check.
- Checked: the three red spec files pass (6, 7 and 4 tests). EN and FR keys are both added. No secrets or personal data in the diff, and invite codes are not touched.

## Answer

- Built: sprites carry a domain (`items` default, or `npcs`), written to the manifest, kept on copy, kinds checked against that domain's kinds when a sprite is added. `pickSprite` draws NPC sprites by the NPC's kind chain (nearest parent first), then any NPC sprite; items never get NPC sprites. `RandomItemImageBusiness.createNpc` stores the portrait (colored as is, grayscale/masked recoloured). NPC editor: "Random image" button; Generate/Random also draw a portrait; with no NPC sprite the portrait is kept. Sprites tab: "Sprite for" select (Items / NPCs), kinds offered from that domain.
- Decisions: split from skills/classes (ticket 05), same colour rule as items (user, 2026-11-18).
- Checked: 17 new tests pass; suite 342 files / 3403 tests green (baseline 339 / 3386); `ng build` clean. Browser (FR and EN, mobile): uploaded a test sprite in a new draft, switched it to NPCs, picked `peasant`, saved, the panel shows NPC + peasant; NPC editor's Random image keeps the portrait with no NPC sprite in the sandbox world, no console error. The end-to-end draw from an installed pack is covered by the business test, not the browser (no NPC sprite in the shipped packs).
- Left for later (review "Consider"): typed overloads for `pickSprite`, kind validation on sprite update too, one bundling helper for item and NPC sprites.
