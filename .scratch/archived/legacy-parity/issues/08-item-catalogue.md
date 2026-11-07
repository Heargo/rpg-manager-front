# Item catalogue (GM)

Status: resolved
Type: task
Blocked by: 03

Spec row 9. `p-dataview` grid, search, rarity/type `p-multiselect`, price `p-slider` range, hover preview, give to player (`itemService.giveToPlayer()`), edit, delete, "Add default items" (generated from the world's attributes with `starter-items.ts`, as in the wizard). Rarity as `p-tag` with preset colours.

**Tools entry (from L11):** also open the catalogue from the Tools menu on the sandbox world (`SandboxWorldBusiness`, items generated with `starter-items.ts`, kept in memory), with "give to player" hidden. Build it on a world input rather than reading the room directly. Reuse `app-item-card` and `RARITY_SEVERITY` (`modules/item`).

## Baseline

`npm test`: 50 test files, 328 tests, all passed (2026-11-07, `develop` at ec1c1e8).

## Seams

Confirmed with the user (2026-11-07):

1. **`item-catalogue.rules.ts`** (pure): search by name, rarity/type multi-filter, price range, price bounds of a catalogue, merging "Add default items" into the catalogue. Catches filter/merge bugs; misses UI wiring.
2. **GM-only give-item over the fake peer network** (`src/testing/game-device.ts`), through `itemService.giveToPlayer()`: the GM gives a catalogue item, the player's inventory updates; a player's request is rejected as forbidden. Catches protocol and authorization; misses UI.
3. **Catalogue component on a world input** (`TEST_PROVIDERS`), with a "can give" flag: give is hidden on the sandbox world; delete asks for confirmation; filters narrow the grid; outputs fire. Catches wiring; misses real layout.

Decision: **Edit is hidden until L09**, which adds it along with the editor.

## Red

- Test files: `src/app/modules/item/helpers/item-catalogue.rules.spec.ts`, `src/app/modules/item/business/item-give.spec.ts`, `src/app/modules/item/components/item-catalogue/item-catalogue.component.spec.ts`
- Run: `npx ng test --watch=false --include 'src/app/modules/item/**/*.spec.ts' 2>&1 | tail -30`
- Failing: all 3 files fail to compile (missing modules), so every test is red:
  - item-catalogue.rules.spec.ts (10 tests: filter none/search/rarity/type/price/combined, priceBounds x2, mergeDefaultItems x2) — `./item-catalogue.rules` missing (`filterCatalogue({search, rarities, types, minPrice, maxPrice})`, `priceBounds -> {min,max}`, `mergeDefaultItems(catalogue, drafts, newId)`, dedupe by case-insensitive name).
  - item-give.spec.ts (4 tests: gives copy and player sees it, separate entries each time, unknown item -> `invalid`, player -> `forbidden`) — `../services/item.service` missing (`ItemService.giveToPlayer(characterId, itemId): Promise<Character>`).
  - item-catalogue.component.spec.ts (7 tests: one card per item, search narrows, give emits item, give hidden when `canGive` false, edit hidden, delete asks confirmation then emits, addDefaults emits) — `./item-catalogue.component` missing (`ItemCatalogueComponent`, inputs `world`, `canGive`; outputs `give`, `remove`, `addDefaults`; hooks `[data-field="search"]`, `[data-action="give|edit|delete|add-defaults"]`).
- Green must: add `ItemService` and the host business (serving `giveToPlayer`, GM-only via `SELF_PEER`) to `GAME_DEVICE` in `src/testing/game-device.ts` (not touched here to keep the rest of the suite compiling) and start it from `GameSessionBusiness`. Rarity/type multiselect and price slider UI are not driven by the component spec (rules cover them).

## Green

- Files: src/app/modules/item/{helpers/item-catalogue.rules.ts,helpers/item-give.rules.ts,models/item-api.ts,services/item.service.ts,business/item-host.business.ts,business/item-catalogue.business.ts,components/item-catalogue/item-catalogue.component.ts,pages/item-catalogue-page/item-catalogue-page.component.ts,item.routes.ts}; src/app/modules/tools/{business/sandbox-catalogue.business.ts,pages/item-catalogue-tool-page/item-catalogue-tool-page.component.ts,tools.routes.ts}; character-host.business.ts (publish public); play/game-session.business.ts; room-page.component.html; app.routes.ts; src/testing/game-device.ts; public/i18n/{en,fr}.json; angular.json
- Change: rules, ItemService + GM-only ItemHostBusiness (started by GameSessionBusiness, added to GAME_DEVICE); catalogue component (search, rarity/type p-multiselect, price p-slider, give/delete, add defaults; edit hidden); hosted page `/room/items` (player picker dialog, delete, add defaults saved on the world, button in the host lobby) and sandbox page `/tools/item-catalogue` (memory only, give hidden).
- Suite: 53 files, 349 tests pass (baseline 50 / 328); tsc clean; build ok.
- Open questions: Tools menu entry NOT added, because `menu.service.spec.ts` asserts the exact Tools list (a test file I must not touch); route `/tools/item-catalogue` exists, add the menu item with that spec update. Initial bundle grew ~11 kB over the 1MB error budget (baseline 999.55 kB), so angular.json `maximumError` was raised to 1.1MB; revert if you prefer to trim instead.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - angular.json:43 — initial budget raised 1MB to 1.1MB. Measured against HEAD: initial 999.55 kB to 1.01 MB (+~11 kB: main +2.2 kB, one shared Optimus chunk +9.4 kB). Nothing catalogue-specific that should be lazy landed in initial: the component, dataview, multiselect, slider and both pages are in lazy chunks; only ItemService, ItemHostBusiness (via GameSessionBusiness) and the route table are eager, which must be. The chunk growth is chunk-splitting, not an import to defer. The 1.1MB limit leaves ~90 kB of slack, so it weakens the guard: prefer 1.02MB.
  - src/app/modules/item/business/item-catalogue.business.ts:44 and src/app/modules/tools/business/sandbox-catalogue.business.ts:28 — the same "starter drafts from world attributes and bar attributes" code appears twice. Extract a helper in `world/helpers/starter-items` (or a shared function).
  - src/app/core/services/menu.service.ts:27 — the item catalogue uses `pi pi-box`, the same icon as Dice. Pick another icon.
  - Hosted "Add default items" uses a seed from `world.id`, so a second click adds nothing once defaults exist (deleted ones return). Fine, but worth knowing.

## Answer

Built:

- `item/helpers/item-catalogue.rules.ts`: filter by name, rarity, type and price range; price bounds; merge default items (dedupe by name, case-insensitive).
- `ItemService.giveToPlayer()` and `ItemHostBusiness`: a GM-only host handler (rejects any peer other than `SELF_PEER` as `forbidden`, unknown item as `invalid`). It adds a copy of the item to the character's inventory and publishes the characters. It's started by `GameSessionBusiness` and added to `GAME_DEVICE`.
- `app-item-catalogue` on a `world` input with `canGive`: `p-dataview` grid of `app-item-card`, search, rarity/type `p-multiselect`, price `p-slider` range, give, delete with confirmation, and "Add default items" (`starter-items.ts`).
- `/room/items` (hosted world: player picker for give, changes saved on the world, button in the host lobby) and `/tools/item-catalogue` (sandbox world, in memory, give hidden), with a Tools menu entry.

Decisions: Edit is hidden until L09. The initial bundle budget went from 1 MB to 1.02 MB: the baseline was 999.55 kB, and the eager item host and service add about 11 kB (the review confirmed nothing catalogue-specific is eager). A second "Add default items" adds nothing, because the seed is the world id and names are deduped.

Checked: suite at 53 files and 349 tests (baseline 50 / 328); build OK. In the browser, the sandbox catalogue was checked in French and English and at mobile width: search, delete confirmation, give hidden, no console error, no horizontal scroll. The hosted give flow (player side) is covered by the multi-device test, not the browser, because two devices in one browser share one profile.

Left as Consider: the starter-draft code is duplicated in `item-catalogue.business.ts` and `sandbox-catalogue.business.ts`.
