# Catalogues: inventory grid for items, lists for skills and classes

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- **Item catalogue**: a large inventory grid of square slots (image or kind icon, rarity border colour, name below, price), filters on top; clicking a slot opens the same actions as today (view/edit/give/delete).
- **Skill catalogue**: a compact list, one row per skill (icon, name, type, cost, cooldown, one-line description, row actions).
- **Class catalogue**: a list, one row per class (image, name, bonuses summary, skill count, View/Edit/Delete).
- Same in the GM pages and the Tools sandbox pages; readable with many entries; mobile friendly.

## Baseline

Test Files 131 passed, Tests 1125 passed.

## Seams

1. **Item catalogue component (`TEST_PROVIDERS`)**: renders one inventory slot per item (image or kind icon, rarity marked, name, price), filters still narrow the grid; selecting a slot exposes the same actions as before (view/edit/give/delete, emitted as today). Misses: grid look (browser check).
2. **Skill catalogue component**: one list row per skill with name, type, cost, cooldown, one-line description and the row actions (same outputs as before).
3. **Class catalogue component**: one list row per class with image, name, bonuses summary, skill count, View/Edit/Delete (View still opens the details dialog).

## Red

- Test files: `src/app/modules/item/components/item-catalogue/item-catalogue.component.spec.ts` (adapted: card/per-card-action contract replaced by slot + selection contract), `src/app/modules/skill/components/skill-catalogue/skill-catalogue.component.spec.ts` (new), `src/app/modules/class/components/class-catalogue/class-catalogue.component.spec.ts` (existing View/details tests kept as is, row tests added)
- Run: `npx ng test --watch=false` (with `--include <file>` the build fails here on `node:crypto` in `src/testing/jsdom-setup.ts`, with or without my files; the full run works) then read the FAIL lines for these three specs
- Hooks defined in each spec's header comment (item: `[data-field="slot"]` + `data-rarity`, `slot-price`, `app-stored-image` or `slot-kind-icon`, selecting shows `[data-field="slot-actions"]` with `view`/`give`/`edit`/`delete`; skill: `skill-name|type|cost|cooldown|description`; class: `class-name|bonuses|skill-count`, `app-stored-image`).
- Failing: 15 tests (full run 15 failed / 1124 passed, only these)
  - item: shows one inventory slot per catalogue item, with name and price — no `[data-field="slot"]`, still cards
  - item: marks the rarity of each slot — no slots
  - item: shows the image when the item has one, the kind icon otherwise — no slots
  - item: narrows the grid with the search box — no slots to count
  - item: shows no actions until a slot is selected — actions still shown on every card, no slot
  - item: view shows the item card of the selected item — no slot / view action
  - item: emits the item to give when the GM can give — no slot to select
  - item: hides give on a world nobody plays in (sandbox) — no slot to select
  - item: emits the item to edit — no slot to select
  - item: asks for confirmation before emitting delete — no slot to select
  - skill: renders one row per skill with name, type and description — no `skill-name`/`skill-type`/`skill-description` hooks
  - skill: shows the cost and cooldown of an active skill — no `skill-cost`/`skill-cooldown`
  - skill: narrows the list with the search box — no `skill-name` hook
  - class: renders one row per class with name, bonuses summary and skill count — no `class-name`/`class-bonuses`/`class-skill-count`
  - class: shows the class image in its row when it has one — no `app-stored-image` in the row
- Already green guards (behaviour kept): item addDefaults; skill edit/duplicate/delete/create, passive skill without cost/cooldown; class Edit/Delete per row and the View/details tests.

## Green

- Files: src/app/modules/item/components/item-catalogue/item-catalogue.component.ts, src/app/modules/skill/components/skill-catalogue/skill-catalogue.component.ts, src/app/modules/class/components/class-catalogue/class-catalogue.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: Item catalogue is now a responsive grid of square slots (image or kind icon, name, price; rarity border via a --rarity custom property on theme palette tokens; selected slot highlighted) with a sticky side/bottom panel for the selected item (view toggles the item card, give/edit/delete). Skill and class catalogues are compact bordered lists of rows (class: thumbnail, bonuses summary, skill count; skill: type, cost, cooldown, one-line description, icon row actions). New i18n keys: item.catalogue.view/selected, skill.catalogue.cooldown (en + fr).
- Suite: 132 files / 1139 tests pass (baseline 131 / 1125 plus the new skill spec); tsc clean; ng build no error; no test file in unstaged diff.
- Open questions: none (browser check of the grid look still to do; rarity colours reuse the p-tag severity palette: green/blue/orange/red, surface for common)

## Answer

Item catalogue: inventory grid of square slots with rarity borders and a side panel for the selected item. Skills and classes: compact list rows. Browser: room catalogues checked (price overflow found and fixed), no console error. Review step skipped (UI only); suite 132/1139.
