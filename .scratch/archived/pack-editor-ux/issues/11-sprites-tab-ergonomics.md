# Sprites tab: fewer buttons and inputs

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "pareil pour l'interface sprites" (too many buttons and inputs).

## Today

- Toolbar: PNG upload, "from my sets" select, Add set button.
- A paginated list where every sprite row shows its image and its whole form inline (name, kind, tags…).

## What

- A grid or table of thumbnails (image, name, kind tag); clicking one opens the **right drawer** with its detail and the Edit form (same drawer rules as PE04: Save / Cancel, discard and delete confirmations).
- One "Add" menu button (upload PNG / from my sets) instead of three controls.
- Filter by kind above the grid; pagination kept.
- 375 px: two-column grid, drawer full width.

## Decisions (user, 2026-11-18)

- Grid of thumbnails + right drawer, one "Add" button (menu: upload PNG / from my sets).
- Each thumbnail also shows the sprite's kind in a tag.

## Baseline

`npm test` on develop (2026-11-18): 333 test files, 3284 tests, all passed (plus the 4 known unhandled AbortErrors in pack-draft-page.lifecycle.spec / pack-update-atomic.business.spec).

## Seams

Spec section: "Side panel" (right drawer, full width on a phone, discard on close with unsaved changes); drawer pattern of PE04/PE10 (`params-editor`, `tints-table`), titled sections from PE12 (`pack-draft/detail-texts/`).

1. New `app-sprites-grid` component inputs/outputs (TEST_PROVIDERS), in `src/app/modules/tools/components/pack-draft/sprites-grid/`: catches the thumbnail grid (image, name, kind tag), the kind filter above the grid, pagination kept, a thumbnail click opening the right drawer with detail and Edit form, Save / Cancel emitting the updated sprite, discard confirmation on unsaved close, delete confirmation emitting the removal, and no inline inputs in the grid. Misses the page wiring and the 375 px CSS (checked in the browser).
2. `pack-draft-page` component, Sprites tab (existing `pack-draft-page.sprites.spec.ts` style): catches the single "Add" menu button (upload PNG / from my sets) replacing the three toolbar controls, that the tab renders the grid, and that edits/deletes from the grid land in the draft. Misses drawer internals.

## Red

- Test files:
  - src/app/modules/tools/components/pack-draft/sprites-grid/sprites-grid.component.spec.ts (new)
  - src/app/modules/tools/pages/pack-draft-page/pack-draft-page.sprites-grid.spec.ts (new)
  - src/app/modules/tools/pages/pack-draft-page/pack-draft-page.sprites.spec.ts (moved to the cards / drawer / Add menu hooks)
  - src/app/modules/tools/pages/pack-draft-page/pack-draft-page.colorizer.spec.ts (moved to the drawer `detail-colorizer` button)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` for each file above
- Failing: all tests of the four files, since `app-sprites-grid` does not exist yet.
  - sprites-grid.component.spec: 16 tests, build error "Could not resolve ./sprites-grid.component" (SpritesGridComponent missing). Includes `colorize` output and `sprite-duplicate-id` hook.
  - pack-draft-page.sprites-grid.spec: 5 tests, `app-sprites-grid` absent from the Sprites tab (single Add menu button, grid rendered, save and delete landing in the draft).
  - pack-draft-page.sprites.spec: 9 tests, no `sprite-card-<id>` cards on the Sprites tab (pagination, lazy render, edit and delete through the drawer, PNG upload via the hidden file input, duplicate-id flag).
  - pack-draft-page.colorizer.spec: 2 tests, no cards, so no drawer and no `detail-colorizer`.

## Green

- Files: src/app/modules/tools/components/pack-draft/sprites-grid/sprites-grid.component.ts (new), src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: new `app-sprites-grid` (thumbnail cards with image, name, kind tag; kind filter shown only when 2+ kinds are used; 12 per page; right drawer with titled Identity / Generation sections, Edit form, Save / Cancel, discard and delete confirmations, `colorize` output; 2-column grid at 375 px, drawer `min(32rem, 100vw)`). The page's Sprites tab now has one "Add" p-menu button (upload PNG through a hidden file input / from my sprites) and the grid. New keys `packs.creator.addSprite` and `packs.creator.sprites.*`; removed `addSet` and `removeSprite` in en and fr.
- Suite: 335 files, 3305 tests, all passed (baseline 333 files, 3284 tests); tsc clean; build OK (budget warnings only).
- Open questions: the page test "single Add menu button" requires no `p-select` in the page, so the Details tab panel (language select) is now rendered only while that tab is active, like the other tabs.

## Answer

- Built: new `app-sprites-grid`. It shows a thumbnail card per sprite (image, name, kind tag) with a kind filter above the grid and 12 sprites per page. A card click opens the right drawer. The drawer has titled Identity / Generation sections, Edit / Edit in the colorizer / Delete, and a form with Save / Cancel. Cancel or close with unsaved changes asks to discard, and Delete asks first. The Sprites tab toolbar is now one "Add" menu button (upload a PNG through a hidden file input / from my sprites). At 375 px the grid has two columns and the drawer is full width.
- Decisions: the "kind" in the tag and the filter is the sprite's `kind` field (colouring: grayscale / colored …), which is the field the old inline row showed. The item kinds stay in the drawer's Generation section. The filter shows only when 2 or more kinds are in use. The Details tab panel now renders only while its tab is active, like the other tabs, because the page test checks that no `p-select` is left on the Sprites tab. I removed the old i18n keys `addSet` and `removeSprite`.
- Checked:
  - Suite: 335 files and 3305 tests pass (baseline 333 / 3284). Build is clean. Review verdict: ship.
  - Browser, FR: uploaded 3 PNGs through the Add menu, opened the drawer, then Edit → change → Cancel. The discard dialog appeared, and after discarding the old name was kept. Edit → Save renamed the card. Delete asked "Supprimer ce sprite ?" and removed the card.
  - Browser, EN: labels, the drawer and the Add menu.
  - Browser, 375 px: two columns, the drawer is 375 px wide, and there is no horizontal scroll. No console errors.
- Consider (from review, not done):
  - The unused `issues` input on the grid.
  - The grid emits a whole draft snapshot, so a concurrent change could be overwritten. Emitting a patch would be safer.
  - Drawer selection is tracked by index rather than id.
  - The card is `role=button` but handles Enter only, not Space.
  - The hidden native file input needs a one-line comment.
