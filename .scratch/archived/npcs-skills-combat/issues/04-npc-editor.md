# NPC editor (form, JSON, generate)

Status: resolved
Type: task
Blocked by: 03

Spec: `../spec.md` (NPC catalogue).

`/room/npcs/editor[/:id]`: identity, roles, level set directly, attribute levels, equipment and inventory from the item catalogue, money, enemy fields (`xpReward`, loot), merchant fields; JSON tab; random NPC from the L10 generators (name, level, attributes, equipment). Class, skills and class-based generation come with 07 (hidden until then). Tools entry.

## Baseline

`npm test`: 104 files, 839 tests passed (2026-11-08).

## Seams

1. A pure `npc-editor.rules.ts` helper, like `item-editor.rules.ts`: setting the level puts XP at the start of that level on the world's curve; NPC ↔ JSON (round-trip, refused with `validateNpc` issues); `generateNpc(world, random)` from the L10 generators with a seeded `RandomSource`: name from the word lists, a level, attribute levels spread from that level, equipment from the catalogue at a matching rarity, valid per `validateNpc`. Misses UI and storage.
2. The NPC editor save over the fake peer network (`src/testing/game-device.ts`), like `item-editor-save.spec.ts`: saving a new NPC adds it to the world, saving an existing one replaces it, both stored; players still receive no NPC. Misses UI.
3. The NPC editor component's inputs/outputs (`TEST_PROVIDERS`): Form tab (name, description, roles, level, attribute levels, equipment and inventory picked from the item catalogue, money; enemy fields `xpReward` and loot shown with the enemy role, merchant ratios with the merchant role; no class or skills yet), JSON tab, Generate fills the form, invalid NPC blocks save; the catalogue now shows an Edit action (the N03 "no edit action" test changes); the Tools pinned list in `menu.service.spec.ts` gains the NPC editor path. Misses the `/room/npcs/editor[/:id]` route (browser check).

## Red

- Test files:
  - `src/app/modules/npc/helpers/npc-editor.rules.spec.ts` (new)
  - `src/app/modules/npc/business/npc-editor-save.spec.ts` (new)
  - `src/app/modules/npc/components/npc-editor/npc-editor.component.spec.ts` (new)
  - `src/app/modules/npc/components/npc-catalogue/npc-catalogue.component.spec.ts` (N03 "no edit action" test replaced)
  - `src/app/core/services/menu.service.spec.ts` (pinned list gains `/tools/npc-editor` after `/tools/npc-catalogue`)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (per file)
- Names the green step must provide:
  - `helpers/npc-editor.rules.ts`: `setNpcLevel(npc, level, world)`, `npcToJson(npc)`, `parseNpcJson(text, base: Npc) -> { npc?, issues }` (issues `{field:'json',code:'invalid-json'}` or the `validateNpc` ones; JSON round-trips onto `base`, keeping id), `generateNpc(world, random, words: WordList)` returning `Omit<Npc,'id'>` (the ticket says `(world, random)`; the name needs the item word list, so `words` is a third argument).
  - `NpcCatalogueBusiness.save(npc without id or with id): Promise<Npc>`.
  - `NpcEditorComponent` (`components/npc-editor/npc-editor.component.ts`, inputs `world`, `npc`, output `save`). Hooks are listed in the spec's header comment (`data-field` / `data-action`).
  - `NpcCatalogueComponent`: `edit` output and `[data-action="edit"]` per card.
  - Tools nav entry `/tools/npc-editor`.
- Failing: 5 files, all red:
  - npc-editor.rules.spec.ts (all tests) — `./npc-editor.rules` does not exist (bundle fails).
  - npc-editor-save.spec.ts (3 tests: adds a new NPC; replaces in place; never sends to a player) — `NpcCatalogueBusiness.save` does not exist.
  - npc-editor.component.spec.ts (11 tests: fill from NPC, no class/skills, JSON sync, role-dependent fields, emit edited, emit new, inventory/loot, remove entry, loot only for enemy, blocked invalid JSON, blocked invalid NPC, generate) — `./npc-editor.component` does not exist.
  - npc-catalogue.component.spec.ts "emits the NPC to edit" — `edit` output / `[data-action="edit"]` missing (bundle fails).
  - menu.service.spec.ts "puts every tool directly in the nav bar…" — `/tools/npc-editor` missing (assertion failure).

## Green

- Files: `src/app/modules/npc/helpers/npc-editor.rules.ts`, `business/npc-editor.business.ts`, `business/npc-catalogue.business.ts` (`save`, translated copy suffix), `helpers/npc.rules.ts` (optional suffix), `components/npc-editor/npc-editor.component.ts`, `components/npc-catalogue/npc-catalogue.component.ts` (Edit + Add NPC), `pages/npc-editor-page/`, `pages/npc-catalogue-page/` (navigation), `npc.routes.ts`, `src/app/modules/tools/pages/npc-editor-tool-page/`, `tools/tools.routes.ts`, `tools/business/sandbox-npc-catalogue.business.ts`, `src/app/core/services/menu.service.ts`, `public/i18n/{en,fr}.json`
- Change: pure rules (level to XP, JSON, random generation, upsert and inventory edits) plus an `NpcEditorBusiness`; editor component with Form/JSON/Generate tabs; lazy routes `/room/npcs/editor[/:id]` and `/tools/npc-editor[/:id]` (the tool provides the sandbox business, saved in memory, listed in the sandbox catalogue, gear picked from the sandbox item catalogue). The sandbox NPC business now seeds the samples only when it has no NPCs, so saved NPCs survive revisiting the catalogue. The duplicate suffix is translated (`npc.catalogue.copySuffix`) by passing it from the businesses; `duplicateNpc` keeps " (copy)" as default.
- Suite: 107 files, 866 tests, all passed (baseline 104 files / 839); tsc clean; build OK, no new chunk in the initial bundle (the initial budget warning predates this ticket: 518.04 kB over before, 518.68 kB after).
- Open questions: generated names reuse the item name generator (no NPC word list), so they read like item names; to be revisited with 07.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/npc/helpers/npc-editor.rules.ts (parseNpcJson) — only top-level types are checked, so JSON with malformed attribute or inventory entries passes `validateNpc` and reaches the draft — validate entry shapes (attributeId, item, id) before accepting.
  - src/app/modules/npc/helpers/npc-editor.rules.ts (setNpcLevel) — changing the level does not recompute attributes' `current`, which depends on the level in `formulaMax` — recompute the attributes when the level changes.
  - src/app/modules/npc/business/npc-editor.business.ts — mostly one-line pass-throughs to the rules (shotgun surgery on every new edit) — acceptable per layering, but keep it thin.
  - src/app/modules/npc/components/npc-editor/npc-editor.component.ts — imports `NpcEditorIssue` from a helper (type only, fine), and `generate()` drops the description/merchant of the NPC being edited — confirm that is intended.
  - Generated names reuse item names (already noted as open in Green).

## Answer

- `npc-editor.rules.ts`: `setNpcLevel` (XP at the start of the level on the world's curve; each attribute's current value moves with its max, capped), `npcToJson` / `parseNpcJson` (validates entry shapes and `validateNpc`), `generateNpc(world, random, words)` (name, level, spread attribute levels, equipment from the catalogue at a matching rarity), upsert and inventory edits. `NpcCatalogueBusiness.save` and `NpcEditorBusiness`.
- `NpcEditorComponent` with Form / JSON / Generate tabs; enemy fields with the enemy role, merchant ratios with the merchant role; class and skills hidden until N07. Catalogue has Edit and "Add an NPC". Routes `/room/npcs/editor[/:id]` and `/tools/npc-editor[/:id]` (sandbox, memory only, shows in the sandbox catalogue, gear from the sandbox item catalogue). The duplicate suffix is now translated.
- Review defects fixed test-first after the first green: level change recomputes current values; malformed attribute / inventory entries in JSON are refused.
- Checked: suite 107 files / 872 tests (baseline 104 / 839), `ng build` clean, review ship. Browser (sandbox tool): Edit goblin level 2 → 5 shows in the catalogue; Add an NPC → Generate fills level, attributes and equipped gear → Save lists it; FR and EN; mobile without horizontal scroll; no console error. GM flow in a real room covered by `npc-editor-save.spec.ts`.
- Left for later: generated names come from the item word list ("Clé polie"), as there is no person-name list; `player-copy-guard.spec.ts` "rejects the actions of a player waiting for the pick" is flaky (failed once in the full suite, passes alone and on reruns), unrelated to this ticket.
