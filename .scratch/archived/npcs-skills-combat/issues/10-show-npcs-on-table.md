# Show NPCs on the table

Status: resolved
Type: task
Blocked by: 03, 15

Spec: `../spec.md` (Showing NPCs on the table).

GM shows / hides up to 4 NPCs of any role on every player's table. World rules NPCs section: per role, which fields players see (description, level, life bar, life numbers, every attribute, equipped items; defaults in the spec), validated and exported with the world. The host builds the public projection from those rules (`npc-visibility.rules.ts`, union for several roles); inventory, skills, money, XP reward and loot are never sent.

## Baseline

`npm test`:  Test Files 109 passed (109)  Tests 886 passed (886) (2026-11-08).

## Seams

1. Pure helpers: `npc-visibility.rules.ts` builds the public projection of an NPC from the world's per-role visibility (defaults from the spec table, union over roles; portrait and name always; inventory, skills, money, XP reward and loot never) and validates the visibility settings; `world-export.ts` round-trips them and refuses an export without them (no fallback). Misses network and UI.
2. The room over the fake peer network (`src/testing/game-device.ts`): the GM shows and hides NPCs (up to 4, a 5th refused), players receive only the projection on one topic; editing a shown NPC or the visibility rules republishes it; the full NPC never leaves the host. Misses UI.
3. Components' inputs/outputs (`TEST_PROVIDERS`): the table shows the shown NPCs (projection fields only) for players and the GM, with show/hide from the NPC catalogue (GM); the shared rule-fields component gains the **NPCs** section (per role, the field ticks). Misses layout (browser check).

## Red

- Test files: `src/app/modules/npc/helpers/npc-visibility.rules.spec.ts` (new), `src/app/modules/world/helpers/world-export.spec.ts`, `src/app/modules/table/business/table-npcs.business.spec.ts` (new), `src/app/modules/table/components/table-npcs/table-npcs.component.spec.ts` (new), `src/app/modules/npc/components/npc-catalogue/npc-catalogue.component.spec.ts`, `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts`
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (or `npm test`). The red is a compile failure (missing symbols), so the whole suite shows the build errors until green; the baseline (109 files, 886 tests) passes without these edits. Quirk: with `--include`, `src/testing/jsdom-setup.ts` also prints a `node:crypto` TS2591 error that exists on the baseline too; ignore it, `npm test` does not show it.
- Symbols the tests expect (green must create them):
  - `npc/models/npc.ts`: `NpcVisibility` (booleans `description, level, lifeBar, lifeNumbers, attributes, equipment`), `NpcVisibilityRules` (`Record<NpcRole, NpcVisibility>`), `PublicNpc` (`{ id, name, portraitId?, description?, level?, lifeBar?: {percent}, life?: {current,max}, attributes?: {name,current,max}[], equipment?: {name}[] }`).
  - `npc/helpers/npc-visibility.rules.ts`: `DEFAULT_NPC_VISIBILITY`, `toPublicNpc(npc, world: Pick<World,'attributes'|'barAttributes'|'npcVisibility'>)`, `isValidNpcVisibility(value: unknown): boolean`.
  - `World.npcVisibility` (default `DEFAULT_NPC_VISIBILITY` from `createWorld`), `WorldDraft.npcVisibility?`, `WorldRules.npcVisibility`; `world-export` error `world.npcVisibility is invalid`; `saveRules` republishes the shown NPCs.
  - `TableBusiness`: `$npcs` (PublicNpc[], GM and players), `showNpc(id)`, `hideNpc(id)`; errors: 5th NPC `rejected`, unknown id `invalid`, player caller `forbidden`. Editing, deleting a shown NPC or changing the rules republishes.
  - `app-table-npcs` (`TableNpcsComponent`, input `npcs`; `data-testid="table-npc"`, `data-field` = description, level, life-bar (`data-percent`), life-numbers, attribute, equipment).
  - `NpcCatalogueComponent`: input `shownIds`, outputs `show` / `hide`, buttons `[data-action="show"]` / `[data-action="hide"]` (Show disabled once 4 are shown).
  - `app-rule-fields`: `[data-testid="rules-section-npcs"]` with 18 toggles `#npc-<role>-<field>` (fields as above), emits `draft.npcVisibility`.
- Not covered (browser check): embedding `app-table-npcs` in the table page and wiring the catalogue page's show/hide.
- Failing: 33 tests, all at build level (missing exports/members):
  - npc-visibility.rules.spec: 8 tests (DEFAULT matches spec, 6 toPublicNpc cases, 2 isValidNpcVisibility) — module `npc-visibility.rules` and `NpcVisibilityRules` missing
  - world-export.spec: round-trips the NPC visibility rules; refuses an export without valid NPC visibility rules — `World.npcVisibility` missing
  - table-npcs.business.spec: 9 tests (none on table, show as projection only, hide, max 4 / 5th refused, unknown NPC, player forbidden, edit republishes, rules change republishes, delete stops showing) — `TableBusiness.$npcs/showNpc/hideNpc` missing
  - table-npcs.component.spec: 4 tests — `TableNpcsComponent` missing
  - npc-catalogue.component.spec: Show/Hide emit; Show disabled at 4 — `show`/`hide`/`shownIds` missing
  - rule-fields.component.spec: NPCs section ticks from defaults; emits changed tick — `WorldDraft.npcVisibility` and section missing

## Green

- Files: src/app/modules/npc/{models/npc.ts,helpers/npc-visibility.rules.ts,components/npc-catalogue/npc-catalogue.component.ts,pages/npc-catalogue-page/npc-catalogue-page.component.ts}; src/app/modules/table/{models/table.ts,services/table.service.ts,business/table.business.ts,business/table-host.business.ts,components/table-npcs/table-npcs.component.ts,pages/table-page/table-page.component.{ts,html}}; src/app/modules/world/{models/world.ts,helpers/world.factory.ts,helpers/world-export.ts,helpers/world-rules.rules.ts,components/rule-fields/rule-fields.component.{ts,html},pages/world-rules-page/*.ts,pages/world-new-page/*.ts}; public/i18n/{en,fr}.json
- Change: `NpcVisibility`/`PublicNpc` types, `toPublicNpc`/`isValidNpcVisibility`/defaults, `World.npcVisibility` (factory default, export validation, applied by rules; `WorldRules.npcVisibility` is optional so the untouched specs still compile). The host serves one `table/set-npc` route (max 4, GM only) and publishes the projections on `table/npcs`; an effect on the open world republishes on NPC edit/delete or rule change. `app-table-npcs` is embedded in the GM scene panel and the player view; the NPC catalogue has Show/Hide (hidden on the sandbox tool page via `showControls`); the NPCs rule section is in `app-rule-fields`, so it shows on `/room/rules`, `/tools/world-rules` and the wizard.
- Suite: 112 files / 914 tests pass (baseline 109 / 886); tsc clean; `ng build` has no error (initial bundle was 24 bytes over the 1.02 MB error budget, trimmed `toPublicNpc` to fit, so there is almost no headroom left).
- Open questions: shown NPCs are kept in host memory (not persisted), so they reset when the room is reopened; shown NPCs are published in catalogue order. The initial bundle budget is now at the limit: next ticket touching the initial chunk will need a lazy split or a budget decision. Browser check of layout not done.

### Red (review fix: `table/set-npc` payload validation)

- Test file: `src/app/modules/table/business/table-npcs.business.spec.ts` (new `it.each`, raw `PeerApi` request to `table/set-npc` from the GM)
- Run: `npx ng test --watch=false --include src/app/modules/table/business/table-npcs.business.spec.ts`
- Failing: 3 tests (the other 11 pass)
  - refuses a null payload as invalid — raw TypeError ("unexpected error") instead of `invalid`
  - refuses a non-boolean shown as invalid — `"x"` is treated as show, resolves
  - refuses a missing shown as invalid — treated as show, resolves
- Already passing (guard, keep): missing npcId, empty npcId.

## Answer

- `npc-visibility.rules.ts`: `DEFAULT_NPC_VISIBILITY` (the spec table), `toPublicNpc` (field by field; portrait and name always, union over roles; inventory contents, skills, money, XP reward and loot never) and `isValidNpcVisibility`. `World.npcVisibility` (factory default, export round-trip, refused when missing or invalid), editable in `WorldRules`.
- Host route `table/set-npc` (GM only, payload checked by `parseNpcRequest`, max 4, unknown id `invalid`), projections published on `table/npcs`; an effect on the open world republishes when a shown NPC is edited or deleted or the rules change. Shown NPCs live in host memory (reset when the room is reopened).
- `app-table-npcs` on the GM scene panel and the player view; Show / Hide on the `/room/npcs` catalogue (hidden on the sandbox tool). The NPCs section in `app-rule-fields` (wizard, `/room/rules`, `/tools/world-rules`): a role × field grid of themed `p-checkbox`es (reworked after user feedback: native blue checkboxes didn't follow the red theme).
- Review must-fix (payload validation) done test-first; re-check ship.
- Checked: suite 112 files / 919 tests (baseline 109 / 886), `ng build` clean. Browser: rules section defaults match the spec, themed grid at desktop and mobile; hosted a local world, generated an NPC in `/room/npcs`, Show → it appears on the GM table (name, level), desktop and mobile. Player side covered by `table-npcs.business.spec.ts` (one profile per browser).
- Left for later: the initial bundle is a few bytes under the 1.02 MB error budget; the next ticket touching the initial chunk needs a lazy split or a budget decision. `world-export.ts` isn't Prettier-clean (pre-existing).
