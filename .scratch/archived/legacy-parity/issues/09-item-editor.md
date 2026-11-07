# Item editor (form, JSON, AI prompt)

Status: resolved
Type: task
Blocked by: 08, 10

Spec row 10. `p-tabs`: form (image, name, rarity, type, slot when equipment, price, description, modifiers from the game's attributes), JSON (validated two-way), Generate (random generator from ticket 10 with Reroll and a visible seed; Chrome on-device AI when available; copy prompt). Create and edit. Split the on-device AI into its own ticket if it grows.

**Tools entry (from L11):** also open the editor from the Tools menu on the sandbox world's attributes, result kept on the page (no save to a world). The Generate tab can reuse `ItemGeneratorBusiness` (`modules/tools`, seed + options) or move it to the item module.

## Baseline

`npm test`: 53 test files, 349 tests, all passed (2026-11-07, `develop` at 5c68abd).

## Scope

Decided with the user (2026-11-07): the Chrome on-device AI tier is split out to `12-on-device-ai.md`. This ticket covers the form, JSON, random Generate (seed + Reroll), copy prompt, create and edit (Edit appears in the catalogue), and the Tools entry.

## Seams

Confirmed with the user (2026-11-07):

1. **`item-editor.rules.ts`** (pure): validate a draft; item to JSON and back, with errors; slot only for equipment; modifiers limited to the world's attributes; the copy prompt built from the world's attributes. Catches validation; misses UI.
2. **Item editor component** on a `world` input and an optional `item` (`TEST_PROVIDERS`): the Form and JSON tabs stay in sync; invalid JSON blocks saving; Generate fills the form with a visible seed and Reroll; save emits the item. Catches wiring; misses layout.
3. **Catalogue save through the catalogue business**: create and update are saved on the hosted world and kept in memory in the sandbox; Edit appears in the catalogue. Catches persistence; misses the page.

## Red

- Test files: `item/helpers/item-editor.rules.spec.ts` (new), `item/business/item-editor-save.spec.ts` (new), `item/components/item-editor/item-editor.component.spec.ts` (new), and `item/components/item-catalogue/item-catalogue.component.spec.ts` (edited: "hides edit" becomes "emits the item to edit").
- Run: `npx ng test --watch=false --include 'src/app/modules/item/**/*.spec.ts' 2>&1 | tail -30`
- Failing: 24 tests, all on missing symbols:
  - `item-editor.rules`: `validateItemDraft(draft, attributeNames)` returns `{field, code}[]`. Also `itemToJson(draft)`, `parseItemJson(text, attributeNames)` returning `{draft?, issues}`, and `buildItemPrompt(attributeNames)`.
  - `ItemCatalogueBusiness.save(item)` returns a Promise of the `Item`. `SandboxCatalogueBusiness.save(item)` is synchronous and returns the `Item`. With no id, the item is created with a new id; with an id, it is updated in place, keeping its image.
  - `ItemEditorComponent`: `world` and `item` inputs, `save` output. Hooks: `[data-field]` `name|description|price|json|seed|json-error`, `[data-action]` `generate|reroll|copy-prompt|save`. All tab panels are rendered even when hidden.
  - `ItemCatalogueComponent.edit` output, with `[data-action="edit"]` on every card.
- Notes: Generate uses the `world` input's attributes and the visible seed (same seed, same name); Reroll sets a new seed. `copy-prompt` writes to `navigator.clipboard`. `WordListService.loadItemWords` is mocked.

## Green

- Files: `item/helpers/item-editor.rules.ts`, `item/business/item-editor.business.ts`, `item/components/item-editor/item-editor.component.ts`, `item/pages/item-editor-page/`, `tools/pages/item-editor-tool-page/`; edited `item-catalogue.business.ts`, `item-catalogue.rules.ts` (`upsertItem`, `ItemInput`), `item-catalogue.component.ts` (edit and create outputs), both catalogue pages, `item.routes.ts`, `tools.routes.ts`, `sandbox-catalogue.business.ts` (`save`), `item-generator.business.ts` (`generateFor`, `newSeed`), `menu.service.ts` (+ spec), `world.service.ts`, `stored-image.component.ts`, `public/i18n/{en,fr}.json`, `angular.json` and `src/testing/jsdom-setup.ts`.
- Change: lazy editor with `p-tabs` Form / JSON / Generate (image upload, rarity, type, slot only for equipment, price, a modifier field per world attribute, two-way JSON, seed + Generate + Reroll via `ItemGeneratorBusiness`, copy prompt). Hosted pages `/room/items/editor[/:id]` save through `ItemCatalogueBusiness.save`; the sandbox tool `/tools/item-editor[?item=id]` (Tools menu entry, opened from the sandbox catalogue) saves in memory and shows the result on the page. The catalogue has Edit on every card and a New item button. EN and FR added.
- Suite: 56 files, 372 tests, all passed (baseline 53 / 349). tsc clean; build OK, initial 1.01 MB (budget 1.02 MB untouched).
- Open questions: three small side changes the red tests forced. `WorldService.publishInfo` is now a no-op unless hosting (the save spec opens a session without a room). `StoredImageComponent` shows its fallback when the image load fails (it threw in jsdom). Jsdom stubs for `ResizeObserver` and `matchMedia` are in a new `setupFiles` entry in `angular.json` (the editor spec doesn't stub them). The sandbox editor doesn't offer image removal, and the editor has none either.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - `world/services/world.service.ts:17` — `publishInfo` guard is safe: `GameSessionBusiness` only opens the world once `$isHost()` is true, and `PeerApi.publish` used to throw when not host, so nothing a live room needs is dropped (the late-close race now no-ops instead of rejecting). No test covers the guard; add a small `WorldService` spec (publishes as host, silent otherwise).
  - `core/components/stored-image/stored-image.component.ts:9` — the `hasValue()` fallback has no spec (none exists for this component); add one for a failing load.
  - `src/testing/jsdom-setup.ts` + `angular.json` `setupFiles` — fine, test-only; the stubs apply to every spec, which is acceptable.
  - No image-removal control in the editor (form or Tools page): an image can be replaced, never cleared. `upsertItem` keeps the old `imageId` when the input has none, so removal would also need a rule change. Log as a follow-up ticket.
  - `item-editor.component.ts` `generate()`: a slow generate can overwrite edits made meanwhile; minor.
  - `item/business/item-editor.business.ts` mostly delegates to rules (thin pass-through); acceptable for layering.
- Checked: spec rows covered by tests, seams used via public interface, EN/FR keys match, no secrets or invite-code changes.

## Answer

Built:

- `item/helpers/item-editor.rules.ts`: draft validation (name, price, slot only for equipment, modifiers limited to the world's attributes), item ↔ JSON with issues, and the copy prompt built from the world's attributes.
- `app-item-editor` (lazy) on `world` and `item` inputs, with `p-tabs`:
  - Form: image, name, description, rarity, type, slot, price, one modifier per attribute.
  - JSON: synced both ways, and invalid JSON blocks saving.
  - Generate: `ItemGeneratorBusiness` with a visible seed, Reroll, and Copy prompt.
- Saving: `ItemCatalogueBusiness.save` (hosted world, `/room/items/editor[/:id]`) and `SandboxCatalogueBusiness.save` (in memory, `/tools/item-editor[?item=id]`, with a Tools menu entry). The catalogue has Edit on each card and a New item button.

Decisions:

- The on-device AI tier is split to `12-on-device-ai.md` (ROADMAP row 18b).
- `WorldService.publishInfo` is a no-op unless hosting. Before, it threw in that case, and a world is only opened while hosting.
- `StoredImageComponent` shows its fallback when a load fails.
- Test-only jsdom stubs (`ResizeObserver`, `matchMedia`) are in `src/testing/jsdom-setup.ts`.

Checked:

- Suite: 56 files, 372 tests (baseline 53 / 349). Build OK, initial bundle 1.01 MB within the unchanged 1.02 MB budget.
- Browser, sandbox editor in French: generate fills the form and the JSON, and save shows the result. Also checked in English at mobile width: no console error, no horizontal scroll.
- The hosted editor page was not opened in the browser (it needs a hosted room); its save is covered by `item-editor-save.spec.ts`.

Left as Consider (from review and browser check):

- No control to remove an item's image (needs a rule change in `upsertItem`).
- No spec for the `publishInfo` guard or for the `StoredImageComponent` fallback.
- A slow generate can overwrite edits made meanwhile.
- The image picker is a native file input, whose text follows the browser language, not `p-fileupload`.
