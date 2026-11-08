# NPC catalogue page

Status: resolved
Type: task
Blocked by: 02

Spec: `../spec.md` (NPC catalogue).

`/room/npcs` (GM, lobby button next to Items): NPC cards (card format, smaller), search, role `p-multiselect`, level range, duplicate, delete with confirmation. Tools entry on the sandbox world. Edit hidden until 04.

## Baseline

`npm test`: 101 files, 823 tests passed (2026-11-08).

## Seams

1. An NPC catalogue business over the fake peer network (`src/testing/game-device.ts`), like the item catalogue: the host lists the world's NPCs, duplicates one and deletes one, and the world is stored; players still receive no NPC. Misses UI.
2. The NPC catalogue page component's inputs/outputs (`TEST_PROVIDERS`): one card per NPC, search by name, role multiselect and level range narrow the list (through `filterNpcs`), duplicate adds a card, delete only after confirmation, no edit action yet; same page on the sandbox world for the Tools entry (the pinned list in `menu.service.spec.ts` gains the NPC catalogue path, before `/tools/links`). Misses the `/room/npcs` route and lobby button (browser check).
3. The NPC card component's inputs (`TEST_PROVIDERS`): the character card format at a smaller size, with portrait, name, level badge on the rarity scale and role tags. Misses layout (browser check).

## Red

- Test files: `src/app/modules/npc/business/npc-catalogue.business.spec.ts`, `src/app/modules/npc/components/npc-card/npc-card.component.spec.ts`, `src/app/modules/npc/components/npc-catalogue/npc-catalogue.component.spec.ts`, `src/app/core/services/menu.service.spec.ts` (pinned list gains `/tools/npc-catalogue` before `/tools/links`)
- Run: `npx ng test --watch=false --include 'src/app/modules/npc/**/*.spec.ts' --include src/app/core/services/menu.service.spec.ts 2>&1 | tail -30`
- Expected new symbols: `NpcCatalogueBusiness` (`$world`, `duplicate(id)`, `remove(id)`), `NpcCardComponent` (inputs `npc`, `world`), `NpcCatalogueComponent` (input `world`; outputs `duplicate`, `remove`; hooks `data-field` search / level-min / level-max / `p-multiselect[data-field="roles"]`, `data-action` duplicate / delete; card hooks `card-portrait`, `card-name`, `npc-level[data-rarity]`, `npc-role[data-role]`), tools route `/tools/npc-catalogue` in the menu.
- Failing (all compile-red: the three new spec files cannot compile, so their tests do not run; menu test fails on the assertion):
  - NpcCatalogueBusiness: lists the world NPCs; duplicates with "(copy)" and stores; deletes and stores; never sends the catalogue to a player — `npc-catalogue.business` module missing
  - NpcCardComponent: name; initial/sample portrait; level badge rarity; one tag per role; no controls — `npc-card.component` missing
  - NpcCatalogueComponent: one card per NPC; search; role multiselect; level range; duplicate emits; delete confirms; no edit action — `npc-catalogue.component` missing
  - MenuService: tools in the nav bar — `/tools/npc-catalogue` not in the list

## Green

- Files: src/app/modules/npc/{business/npc-catalogue.business.ts, components/npc-card/npc-card.component.ts, components/npc-catalogue/npc-catalogue.component.ts, pages/npc-catalogue-page/npc-catalogue-page.component.ts, npc.routes.ts}, src/app/modules/tools/{business/sandbox-npc-catalogue.business.ts, tools.routes.ts}, src/app/modules/world/business/sandbox-world.business.ts (`updateNpcs`), src/app/core/services/menu.service.ts, src/app/modules/room/pages/room-page/room-page.component.html, src/app/app.routes.ts, src/testing/game-device.ts (NpcCatalogueBusiness per device), public/i18n/{en,fr}.json (`nav.npcCatalogue`, `npc.*`)
- Change: NpcCatalogueBusiness (list, duplicate, remove through WorldSessionBusiness.update); small NPC card (character card format, level badge on the rarity scale, role tags); catalogue component with search, roles multiselect, level range, duplicate and confirmed delete (no edit). One page serves `/room/npcs` (lobby button next to Items) and `/tools/npc-catalogue`, where the route swaps in SandboxNpcCatalogueBusiness, which edits the shared SandboxWorldBusiness in memory.
- Suite: 104 files, 839 tests pass (baseline 101 files, 823); tsc clean; ng build OK; no test file in unstaged diff.
- Open questions: none (browser check of layout and the lobby button still to do)

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `src/app/modules/tools/tools.routes.ts:45` — the `world-rules` providers array was reformatted to multiple lines, which is unrelated churn — revert it.
  - `src/app/modules/npc/business/npc-catalogue.business.ts:15` and `src/app/modules/tools/business/sandbox-npc-catalogue.business.ts:19` — the duplicate-by-id logic exists twice, with `crypto.randomUUID` inlined in both — extract a `duplicateNpcById(npcs, id)` helper into `npc.rules`.
  - `src/app/modules/npc/components/npc-catalogue/npc-catalogue.component.ts:153` — level bounds are parsed in the component (`parseInt`, `NaN` and `Infinity` fallbacks), which is data transformation in a component — move it into a rules helper.
  - `src/app/modules/npc/pages/npc-catalogue-page/npc-catalogue-page.component.ts:56` — `tool` comes from route data and the page switches between two behaviours. Acceptable, but a route-provided flag token would be cleaner.

## Answer

- `NpcCatalogueBusiness` (list, duplicate, remove through the world session; stored, never sent to players), a small `NpcCardComponent` (character card format, level badge on the rarity scale, role tags) and `NpcCatalogueComponent` (search, roles multiselect, level range, duplicate, delete after confirmation, no edit yet).
- One page serves `/room/npcs` (GM, lobby button next to Items) and `/tools/npc-catalogue` (thin lazy tool page providing `SandboxNpcCatalogueBusiness`, which edits the shared sandbox world in memory). The sandbox world gets 3 example NPCs (story, merchant, enemy) translated EN/FR, seeded from the lazy tools chunk to keep the initial bundle under budget. Real worlds still start with no NPC. `addNpcCopy` in `npc.rules.ts` is the one duplicate-by-id helper.
- Checked: suite 104 files / 839 tests (baseline 101 / 823), `ng build` clean, review ship. Browser (sandbox tool): cards render, search "gob" → 1, min level 3 → 3, max level 3 → 1, duplicate adds "(copy)", delete asks then removes; FR and EN; mobile width without horizontal scroll; no console error. `/room/npcs` in a real room is covered by the multi-device business test, not the browser.
- Left for later: the duplicate suffix "(copy)" is English in the French UI too (pinned by N02's `duplicateNpc` test; translate it when the editor lands); level-bound parsing sits in the component (review).
