# Random image by kind and tint

Status: resolved
Type: task
Blocked by: 05, 06

Spec: `../spec.md` (Decisions 1, 3, 6, Assumed: item without kind, image colours).

- Sprite choice: the sprites of every active pack (and tagged sprite sets saved on the device) whose kinds match the item's kind, else its parent, up the chain; then same type and slot; then same type; then any.
- An item without `kind`: the kind found from its name (05's noun lookup, singular match); sprite labels are no longer matched.
- Colours of a masked sprite: the item's `tints` on the material layers in order (first tint on the first layer, second on the second), other layers a random pooled tint, built-in presets when no pack gives any. A tint with several gradients draws one. A coloured sprite stays as is.
- Saved sprite sets (the colorizer's tags) get `kinds` instead of `type`/`slot`.
- Same item, seed and packs → same image.

## Decisions (orchestrator, 2026-11-14)

- `PackBusiness.sprites()` also gives each sprite its `domain` and `kinds` (type/slot stay for other users). Only `items` sprites are candidates.
- Pure `pickSprite(candidates, item, vocabulary, random)`: candidates carry `kinds`. Target kind = `item.kind` if the vocabulary knows it, else `vocabulary.kindForName(item.name)`. Walk the target's chain from itself to the root; the first level with at least one candidate whose kinds include it wins (draw among them). Then same type and slot, then same type, then any. Sprite labels are not matched any more.
- Pure `randomMaterials(doc, random, { tints: GradientStop[][][] in item order, pool: GradientStop[][][] })`: the i-th non-base layer gets a gradient of the i-th item tint (one variant drawn), remaining layers draw from the pool (all pooled tints), without repeating while there are enough; the pool falls back to the built-in `PRESETS` when no pack gives tints.
- Saved sprite sets (colorizer): `tags` becomes `{ kinds: string[] }` (items domain). The colorizer's tag form uses a `p-multiselect` of the pooled item kinds (raw ids, like the creator for now) instead of type/slot; "add to draft" passes the kinds straight through. Old tagged sets: tags dropped on read (no migration).
- `RandomItemImageBusiness.create(item: { name, type, slot, kind?, tints? }, seed)`: no pack argument; candidates are every active pack's item sprites plus tagged sets; uses `ItemVocabularyBusiness`. Same item, seed and packs → same image.

## Baseline

Test Files 259 passed, Tests 2397 passed (after `58c5b85`).

## Seams

1. **`pickSprite` (pure, seeded, fixture vocabulary and real Base FR)**: own kind, parent fallback (rapier → sword), kind from the name when `kind` is missing ("Gants" → glove), type/slot fallbacks, labels ignored, determinism.
2. **`randomMaterials` (pure)**: item tints on layers in order, variant draw, pool for the rest, presets when no tint, base layer untouched.
3. **`RandomItemImageBusiness` (faked `PackService` / image storage, world opened with packs, as `random-item-image.pack.spec.ts`)**: a sprite from any active pack whatever its language or a neutral pack; a tagged sprite set matched by kind; the rendered layers carry the item's tint gradient. Misses the colorizer page UI.

## Red

- Test files: `src/app/modules/sprite/helpers/random-sprite.spec.ts` (rewritten), `src/app/modules/sprite/business/random-item-image.pack.spec.ts` (rewritten: world-pooled sprites, tagged sets, tints), `src/app/modules/sprite/business/random-item-image.business.spec.ts`, `src/app/modules/sprite/business/sprite-colorizer.business.spec.ts`, `src/app/modules/sprite/business/sprite-colorizer-draft.business.spec.ts`, `src/app/core/business/pack-creator.business.spec.ts` (updated to `tags: { kinds }`), fixture `src/testing/kinds-pack.ts` (sprite kinds `key`/`potion`/`apple` instead of `item`, so picking by kind is deterministic).
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above.
- Failing: all six files fail to compile (red by missing types/signatures; no test runs until green), each error is one of:
  - `random-sprite.spec.ts` (11 `pickSprite` + 7 `randomMaterials` tests: own kind, parent chain, own over parent, multi-kind sprite, kind from name incl. real Base FR "Gants", unknown kind falls to name, type/slot, type, any fallbacks, labels ignored, determinism; item tints in order, variant draw, pool distinct, presets fallback, presets for leftovers, extra tints ignored) — `SpriteCandidate` has no `kinds`, `ItemLook` no `kind`, `pickSprite` takes 3 args not `(candidates, item, vocabulary, random)`, `randomMaterials` takes 2 args not `(doc, random, { tints, pool })`.
  - `random-item-image.pack.spec.ts` (8 tests: other-language pack sprite, Base sprite by kind, any active pack when no sprite for kind, determinism, tagged set by kind, by parent kind, set skipped when a nearer kind has a sprite, first part coloured by the first item tint) — `ItemLook` has no `kind`/`tints`, `SpriteSetTags` has no `kinds`; also `create` still takes a pack id.
  - `random-item-image.business.spec.ts` (3 updated tests) — same `kind` / `tags.kinds` errors.
  - `sprite-colorizer.business.spec.ts` ("tags a saved copy of a bundled sprite ... `{ kinds: ['helm'] }`", `setSetTags` with kinds) — `SpriteSetTags` has no `kinds`.
  - `sprite-colorizer-draft.business.spec.ts` (2 `addCurrentToDraft` tests, details now `{ id, label, kinds }`) — signature still requires `type`/`slot`.
  - `pack-creator.business.spec.ts` (`addFromSpriteSet` takes tags `{ kinds: ['axe'] }` → draft sprite `kinds: ['axe']`) — `SpriteSetTags` has no `kinds`.

## Green

- Files: `src/app/modules/sprite/helpers/random-sprite.ts`, `business/random-item-image.business.ts`, `business/sprite-colorizer.business.ts`, `models/sprite-set.ts`, `services/sprite-set-storage.service.ts`, `pages/sprite-colorizer-page/sprite-colorizer-page.component.{ts,html}` (all under `src/app/modules/sprite/`), `src/app/core/business/pack-creator.business.ts`
- Change: `pickSprite` walks the kind chain (raw item kind first when the vocabulary doesn't know it, then the name's kind), then type/slot, type, any; `randomMaterials` takes item tints in order then pooled tints (presets fallback). `RandomItemImageBusiness.create(item, seed)` uses every active pack's sprites plus tagged sets, with the world vocabulary's tints. Sets are tagged `{ kinds }` (old tags dropped on read); colorizer tag form and "add to draft" use a `p-multiselect` of Base item kinds. The item editor already passes `kind`/`tints` through its draft. Added `own` on `SpriteCandidate`: at a kind level, tagged sets and non-Base pack sprites win over Base sprites (needed by 3 red tests, because the real Base has `gem`/`key` sprites).
- Suite: 258/259 files, 2412/2413 tests (baseline 259/2397 plus the new tests); tsc clean, build ok, no test file modified.
- Open questions: `random-item-image.pack.spec.ts` "uses a set tagged with a parent kind of the item" looks wrong: item kind `rapier` in world `base-en`, set tagged `weapon`, but the real Base has a `rapier` sprite, so by the nearest-kind rule the Base sprite wins (and the next test, set skipped for `axe`, requires exactly that). Needs a fixture/world where no Base sprite is of kind `rapier` (e.g. a kind with no sprite under `weapon`). Also the `own` preference above is my addition: confirm it or adjust the tests.

## Answer

- `pickSprite(candidates, item, vocabulary, random)` walks the item's kind chain (kind from the name when missing or unknown), then type+slot, type, any; labels are no longer matched. At one kind level, sprites of non-Base packs and tagged sets win over Base sprites (orchestrator decision: a drawing added on purpose should be used).
- `randomMaterials(doc, random, { tints, pool })`: the item's tints on the layers in order, then pooled tints, then the built-in presets.
- `RandomItemImageBusiness.create(item, seed)`: every active pack's item sprites plus tagged sets, tints from the world vocabulary, no pack argument. Sprite sets are tagged `{ kinds }` (old tags dropped); the colorizer tag form and "add to draft" use a kinds `p-multiselect`.
- Orchestrator: one red test used `rapier` (which has a Base sprite) to test a parent-kind set; changed to `staff`. Removed unused strings (`sprite.draft.type/slot`, `packs.creator.slotNone`) and renamed the sprite colouring-mode label "Genre/Kind" to "Coloration/Colouring" to avoid confusion with item kinds.
- Checked: suite 259 files / 2413 tests pass (baseline 259 / 2397). Build OK. Browser: colorizer loads the demo sprite with no console error; the kind multiselects need a saved set, covered by specs.
- Left: kind option building duplicated between the colorizer and the draft page (extract in IC08); tagged sets enter the type tiers as plain items.
