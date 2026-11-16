# Manifest v2: kinds, tints, sprite kinds, neutral packs

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1–5, 13, Assumed: kind and tint conflicts, tree rules, Base packs).

- `PACK_FORMAT` 2. The flat `generators` map goes away. The manifest gets:
  - `tints` (`{ [id]: { gradient: stops } }`, the sprite gradient format), shared by every domain;
  - `domains`: `{ items?, npcs?, skills?, classes? }`, each `{ kinds?, texts? }`. `kinds` is the domain's tree (`{ [id]: { parent?, ...domain fields } }`), `texts` the path to its language file. For `items` the kind fields are `type` and `slot`; `npcs`, `skills` and `classes` have no kinds yet and only `texts` (today's v1 lists);
  - `common`: the path to the shared language file (params);
  - sprites get `domain` and `kinds: string[]`; their `type` / `slot` go away (they come from the kinds).
- Generic code, written once for every domain: a kind-tree validator that takes the domain's field schema (items: `type` only on a root, `slot` only on an equipment chain). Adding a domain later means adding a schema, not touching the validator.
- `language` becomes optional: a pack without it is neutral and can't have `common` or any `texts`.
- Validation: kebab-case ids; no cycle inside the pack; a `parent` not declared in the pack is allowed; a gradient has at least 2 stops with positions in [0, 1] and `#rrggbb` colours; a sprite's domain is known and its kinds are non-empty kebab-case ids. A domain the app doesn't know is ignored with a warning; an unknown field inside a known domain or kind is an error.
- `buildPack` (pack draft) writes the new fields. Old drafts and unofficial packs are dropped (no migration).
- `base-fr` and `base-en` manifests: `domains.items` with the same kinds tree (roots `equipment`, `consumable`, `item`; intermediate levels per slot: `head`, `weapon`, `shield`…) and tints (today's `PRESETS` plus `rust`, `silver`, `shadow`), every sprite with `domain: items` and its kinds, and `domains.npcs|skills|classes` pointing at the current lists.
- The registry (`public/packs/index.json`) allows a pack without language.

## Decisions (orchestrator, 2026-11-14)

- **Consumers keep working through `PackBusiness`**: `sprites()` keeps giving each sprite a `type` and `slot`, now resolved from its first kind up the pack's `domains.items` tree (a kind whose parent lives in another pack: resolved against the Base packs' tree; unresolvable: the sprite is left out). So the random image and the item editor don't change in this ticket (IC07 moves them to kinds).
- **Word lists** are found through `domains.<generator>.texts` instead of `generators.<generator>`. `common` is accepted and validated as a path, nothing reads it yet (IC03).
- **Warnings**: `validatePack` returns `{ ok: true, value, warnings: string[] }` (unknown domains). Errors stay as today.
- **Pack draft (interim, until IC08)**: `DraftSprite` loses `type` / `slot` and gets `kinds: string[]` (domain `items`). In the draft page's sprite form, a `p-multiselect` of the Base items kinds replaces the type and slot selects. `PackDraft` gets `kinds` (items tree) and `tints` objects, empty for now; `buildPack` writes them, `domains.<generator>.texts` for each word list, and `domain: "items"` on every sprite. Old drafts are dropped (DB upgrade, no migration).
- **Base packs**: `base-fr` and `base-en` manifests carry the same `tints` and `domains.items.kinds` (identical JSON). Tints: `steel`, `wood`, `gold`, `ice`, `fire`, `leaf`, `arcane` (today's `PRESETS` values) plus `rust`, `silver`, `shadow`. Roots `equipment`, `consumable`, `item`; under `equipment` one level per slot (`head`, `earring`, `necklace`, `ring`, `chest`, `hand`, `legs`, `foot`, `weapon`, `shield` for weapon2), carrying the `slot`; leaves for every sprite (`sword`, `dagger`, `potion`, `key`…), and the extra leaves IC03 will need for nouns without a sprite may wait for IC03. Every sprite keeps its current type and slot through its kinds.

## Baseline

Test Files 247 passed, Tests 2191 passed (after `4604d14`).

## Seams

1. **`validatePack` (`core/packs/pack.ts`), pure, including the real `public/packs/base-*/pack.json`**: format 2, domains with the items kind schema, tints, sprite domain/kinds, neutral packs, unknown domain warning, unknown field error, cycles; both Bases valid with identical kinds and tints and every sprite kinded. Misses loading and the draft.
2. **`buildPack` (`core/packs/pack-draft.ts`)**: a draft with kinds, tints, word lists and kinded sprites gives the v2 manifest and files. Misses the page.
3. **`PackBusiness` with a faked `PackService` (as the pack specs do)**: `sprites()` gives type and slot resolved from kinds (own tree, parent from Base, unresolvable left out); word lists found via `domains.<g>.texts`; a neutral pack installs and gives sprites but no word list. Misses the page UI.

## Red

- Test files: `src/app/core/packs/pack.kinds.spec.ts`, `src/app/core/packs/pack-draft.kinds.spec.ts`, `src/app/core/business/pack.kinds.business.spec.ts` (new files; the v1 tests in `pack.spec.ts`, `pack-draft.spec.ts`, `pack.business.spec.ts` and the v1 fixtures in `src/testing/*` are untouched and must be migrated or removed in green).
- Run: `npx ng test --watch=false --include src/app/core/packs/pack.kinds.spec.ts` (same for the other two files)
- Failing: 65 tests (full suite: 3 files failed, 247 passed, 2191 tests passed as in baseline)
  - `pack.kinds.spec.ts` (50) — `validatePack` still wants format 1, sprite type/slot, no `warnings`, no domains/tints/kinds/neutral packs. Groups: format 2 and paths; neutral packs (no language, no `common`/`texts`); domains (unknown domain warns, unknown field in domain or kind errors, `npcs.kinds` rejected, kebab-case kind ids); item kinds (`type` only on a root, `slot` only on an equipment chain, invalid type/slot, cycles); tints (id, at least 2 stops, positions in [0,1], `#rrggbb`); sprite `domain`/`kinds`; both real Base manifests (valid format 2, roots, one level per slot, 10 tints, domain texts paths, 101 kinded sprites, axe/amulet_1/armor_1/apple keep type and slot through kinds, files exist, identical kinds/tints/sprite kinds across `base-fr` and `base-en`). Each negative test first asserts the baseline fixture is valid, so none passes for the wrong reason.
  - `pack-draft.kinds.spec.ts` (6) — `buildPack` writes format 1, `generators`, sprite `type`/`slot`; expected format 2 with `tints`, `domains.items {kinds, texts}`, `domains.<g> {texts}`, sprites `{domain: 'items', kinds}`; `PackDraft.kinds`/`tints` and `DraftSprite.kinds` don't exist yet.
  - `pack.kinds.business.spec.ts` (9) — `PackBusiness` rejects format 2 manifests ("format must be 1"): `sprites()` type/slot from the first kind (own tree, Base parent via a neutral installed `neon` pack, unresolvable sprite left out), word list via `domains.<g>.texts`, no word list for a missing domain or a neutral pack, neutral pack install, the real Base manifest at format 2.

## Green

- Files: `src/app/core/packs/pack.ts`, `pack-kinds.ts` (new: generic kind-tree validator, items schema, `resolveItemKind`, `baseKindFor`), `pack-draft.ts`, `pack-registry.ts`, `src/app/core/business/pack.business.ts`, `pack-creator.business.ts`, `src/app/core/helpers/app-database.ts` (v9), `src/app/modules/sprite/business/sprite-colorizer.business.ts`, `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts` (p-multiselect of Base item kinds), `packs-tool-page.component.ts`, `rule-fields.component.html`, `public/packs/base-{fr,en}/pack.json` (v2), `public/i18n/{en,fr}.json` (`packs.creator.spriteKinds`), migrated tests/fixtures (`pack.spec.ts`, `pack-draft.spec.ts`, `pack-registry.spec.ts`, `pack.business.spec.ts` and the creator/colorizer/unofficial/concurrency/draft-page specs, `src/testing/{extra,unofficial,kinds,pack-choice-fixtures}`).
- Change: format 2 with `tints`, `domains.<g>.{kinds,texts}`, `common`, optional `language` (neutral packs), sprites `domain`/`kinds`; `validatePack` returns `warnings`. `PackBusiness.sprites()` resolves type/slot from the first kind (own tree, then Base trees; unresolvable left out); word lists via `textsPath`. `buildPack` writes the v2 fields; `PackDraft` gets `kinds`/`tints`, `DraftSprite.kinds` (readonly); DB v9 clears packs and drafts. Bases regenerated by script (identical kinds/tints, leaf kind per sprite, intermediate level per slot; tints add rust/silver/shadow). Colorizer "add to draft" still takes type/slot and maps to the Base kind.
- Suite: 250 files / 2257 tests pass (baseline 247 / 2191 plus the 65 new red tests, 0 failed); tsc spec clean; `ng build` no error.
- Open questions: (1) the old v1 tests were migrated, `pack-registry.spec` "requires a language" became "allows a pack without language" (ticket says the registry allows it); (2) `extra` fixture now carries its own `gem` kind so it works with the Base unreachable; (3) the packs page shows an empty language tag for a neutral pack (IC later); (4) `InstalledPack.generators` is kept, derived from `domains.<g>.texts`; (5) `common` is validated as a path only, not fetched or stored.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `public/i18n/{en,fr}.json` `packs.creator.spriteType` / `spriteSlot` — no longer used by any code after the draft form moved to `p-multiselect` — drop them (both files).
  - `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts` kind options — labels are the raw kind ids (untranslated); acceptable for the interim, translate when IC08 lands.
  - `src/app/core/business/pack.business.ts` `baseKinds()` — reloads both Base manifests on every `bundle()` call (once per `sprites()` / `spritesOf()`); cache it if it shows up as slow.
  - Full suite is 250 files / 2257 tests green, but vitest prints 4 unhandled errors (`pack-draft-page.lifecycle.spec.ts:58` "expected '' to be 'Edited'", and fake-indexeddb AbortErrors from `pack-update-atomic.business.spec.ts`). Check whether they predate this change (the baseline note doesn't mention them); the lifecycle one touches the draft page this ticket edited.
  - `rule-fields.component.html` and the packs page hide or show an empty language tag for neutral packs: the former is handled, the latter is already noted as open question 3.

## Answer

- Pack format 2: shared `tints`, `domains.<items|npcs|skills|classes>.{kinds,texts}`, `common`, optional `language` (neutral packs), sprites with `domain` + `kinds`. `validatePack` returns `warnings` (unknown domains). Generic kind-tree validator with a per-domain schema in the new `core/packs/pack-kinds.ts` (items: `type` on roots, `slot` on equipment chains).
- `PackBusiness.sprites()` resolves type and slot from the first kind (own tree, then Base trees), so the random image and item editor are unchanged until IC07. Word lists come through `domains.<g>.texts`.
- Draft: `kinds`, `tints`, sprite `kinds` (a `p-multiselect` of Base item kinds replaces type and slot). DB v9 drops old packs and drafts. The colorizer's "add to draft" maps its type/slot to a Base kind.
- Base FR/EN manifests regenerated with identical kinds (roots, one level per slot, a leaf per sprite) and 10 tints.
- Orchestrator: dropped the now unused `packs.creator.spriteType` / `spriteSlot` strings.
- Checked: suite 250 files / 2257 tests pass (baseline 247 / 2191, plus the 65 red). Build OK. Browser (FR): Packs page lists both Bases with 101 sprites, item editor random image draws a sprite, no console error. The draft sprite multiselect wasn't walked (adding a sprite needs a file upload); it is covered by the draft page specs.
- Left: the `pack-draft-page.lifecycle.spec.ts` unhandled rejection ("expected '' to be 'Edited'") predates this ticket (same on `4604d14`). Packs page shows an empty language tag for a neutral pack. Kind labels in the multiselect are raw ids (IC08). `baseKinds()` is not cached.
