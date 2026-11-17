# Item catalogue on a phone, no default items button

Status: resolved
Type: task
Blocked by: GK07 (`../../generator-kinds/issues/07-pack-content-import.md`)

Spec: `../spec.md` (Catalogues)

- At phone width: search full width; rarity and type selects on one line (50 % each); price slider full width; "New item" full width.
- The "Add the default items" button is removed everywhere; items come from the packs' "Import from the packs" (GK07). Assumed: `addDefaults` goes if unused.
- Check 375 px and desktop, FR/EN.

## Baseline

`npm test`: 310 test files, 3071 tests, all passed (2026-11-17, after ML03).

## Seams

- The item catalogue page component (rendered with `TEST_PROVIDERS`): catches the "Add the default items" button gone (in a room and in the sandbox), "Import from the packs" still there, and the toolbar structure the phone layout relies on (search, a filters row holding rarity and type, price slider, New item; `data-test` hooks). Misses the actual widths at 375 px (browser check).
- The business / helpers behind `addDefaults` (if any public method or helper only served the button): catches its removal not breaking other callers (e.g. world creation starter items keep working).

## Red

- Test files: `src/app/modules/item/components/item-catalogue/item-catalogue.phone.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/item/components/item-catalogue/item-catalogue.phone.spec.ts`
- Failing: 3 tests
  - has no "Add the default items" button and no addDefaults output — button and `addDefaults` output still exist
  - puts the rarity and type filters together in one filters row — no `[data-field="filters"]` / `rarity-filter` / `type-filter` hooks
  - orders the toolbar: search, filters row, price slider, New item — no `filters` / `price-filter` hooks
- For green: `item-catalogue.component.spec.ts` ("emits addDefaults from the toolbar", ~line 179, plus the doc comment mentioning `add-defaults`) must be deleted or adapted. Other callers of `addDefaults` (item-catalogue page, tool page, `item-catalogue.business.ts`, `sandbox-catalogue.business.ts`, `world-library.business.ts`, `starter-items.ts`) are not covered by a new test; check their specs when removing.

## Green

- Files: src/app/modules/item/components/item-catalogue/item-catalogue.component.ts, item-catalogue.component.spec.ts, src/app/modules/item/business/item-catalogue.business.ts, src/app/modules/item/pages/item-catalogue-page/item-catalogue-page.component.ts, src/app/modules/tools/business/sandbox-catalogue.business.ts, src/app/modules/tools/pages/item-catalogue-tool-page/item-catalogue-tool-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: removed the default-items button and the `addDefaults` chain (output, page wiring, both businesses, i18n key in EN/FR); starter items for world creation untouched. Toolbar now has `filters` row (rarity and type `[fluid]` multiselects) and `price-filter` hooks; below 40rem search, filters row (50% each), price slider and New item are full width. Deleted the "emits addDefaults" test and fixed the doc comment in `item-catalogue.component.spec.ts`. README default-items mention is about world creation, kept.
- Suite: 311 files, 3073 tests all pass (baseline 310/3071); tsc clean; ng build no error.
- Open questions: none (375 px browser check not done)

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - item-catalogue.component.ts (`.filters { display: contents }`) — on desktop the wrapper is transparent so the layout is unchanged, but `[fluid]` selects now sit in a flex row only below 40rem; confirm at 375 px in the browser (not done yet).
  - item-catalogue.phone.spec.ts — the DOM-order test passes if only the order is right; widths remain a browser check (as the ticket's Seams say).
  - sandbox-catalogue.business.ts — `mergeDefaultItems` is still used for the sandbox's initial items, so it is not dead; the sandbox still seeds default items on load (ticket removes only the button). Fine.

Checked: `addDefaults` chain fully removed (output, page wiring, both businesses, unused imports, EN/FR key `item.catalogue.addDefaults`); no leftovers in src. World-creation starter items (`world-library.business.ts`, `starter-items.ts`, `world.*.starterItems` i18n, world-draft spec) untouched. The deleted test only covered the removed button. CSS: `[fluid]="true"` on both multiselects, no new `display:block` on Optimus hosts (`.price` block is pre-existing), only existing-style classes. README line 18 refers to world creation, which stays.

## Answer

- "Add the default items" is gone with its whole `addDefaults` chain (component output, page wiring, both businesses, i18n). Items come from "Import from the packs"; world creation's starter items and the sandbox's initial items are untouched.
- Toolbar: a `filters` row holds rarity and type. Desktop keeps one inline row as before. Below 40rem: search, price slider and New item full width, rarity and type side by side at 50%.
- Spec: the "emits addDefaults" test deleted (removed behaviour only).
- Browser found a desktop regression in the first green (`[fluid]` made the selects full-width rows); fixed. Checked: suite green; build clean; review ship. Browser FR: desktop one inline toolbar row; 375 px search 327 px, rarity / type 158 px each on one line, price and New item 327 px, no horizontal scroll.
