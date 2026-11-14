# Pack editor freezes on a large draft

Status: resolved
Type: bug
Blocked by: none

User report 2026-11-13: "j'ai dupliqué le pack de base, et en voulant le modifier ça freeze".

## Diagnosis (orchestrator, 2026-11-13)

Reproduced in the browser: duplicate Base (101 sprites), open the draft. Each opening of the pack editor (`pack-draft-page`) blocks the main thread 4.5 to 5.3 s (long task), also when coming back from the colorizer. The Sprites tab panel is rendered even while another tab is shown, and each sprite row has 3 `p-select` (type, slot, kind): 303 `p-select` created at once. With those `p-select` removed from the rows (experiment, reverted), there is no long task at all.

## Decisions

- **Sprites panel is lazy**: its content is only created when the Sprites tab is shown (`lazy` on `p-tabpanel`, or an `@if` on the current tab). Details, Lists and Publish don't render any sprite row.
- **Sprites are paginated** with Optimus `p-paginator`: **12 per page**. The paginator shows only when there are more than 12 sprites. Every row action (edit fields, kind, remove, edit in colorizer) acts on the right sprite on any page (the index into `draft.sprites`, not the index on the page).
- Adding a sprite (PNG or from a sprite set) shows the page holding it (the last page).
- Removing the only sprite of the last page shows the previous page.
- The duplicate-id warning still compares against every sprite of the draft, not only the page.
- No other behaviour change.

## Baseline

Test Files 229 passed, Tests 1928 passed. (Working tree holds unrelated uncommitted changes from other work: combat specs, user-docs; left alone.)

## Seams

1. **`PackDraftPageComponent` through its `draftId` input (`TEST_PROVIDERS`, fake-indexeddb drafts saved with `PackCreatorBusiness`)**: with a 30-sprite draft, no sprite row exists before the Sprites tab is opened; on it, 12 rows and a paginator; page 3 shows 6 rows; editing a field on page 2 changes the right sprite in the saved draft; removing the last sprite of the last page goes back a page; adding a PNG shows the last page; a draft of ≤ 12 sprites has no paginator. Misses real-browser timing (browser check).

## Green

- Files: src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts
- Change: Lists and Sprites panels render only while their tab is shown (`@if (tab() === ...)`). Sprites paginated with `p-paginator` (12 per page, shown above 12): `pageSprites` carries each sprite's index in `draft.sprites`, so edit, kind, remove and colorizer act on the right sprite. Adding a sprite jumps to the last page, and the page is clamped when the last page empties. The draftId effect now calls `flush` in `untracked`: it used to track `draft()`, so every edit re-ran it and reloaded the draft from storage (stale edits overwritten, sprite edits never saved on 30 sprites).
- Suite: 229 files / 1936 tests pass, 1 fails (baseline 229 / 1928, all passing; +9 new specs). tsc clean, ng build no error. Unhandled errors (lifecycle spec, pack-update-atomic spec) are not new: the lifecycle one also occurs on the original component.
- Open questions: the red test "keeps the duplicate-id warning against sprites on other pages" fails and I think it is a test bug. It saves a modified draft (s20 renamed to s01) after the component has already loaded the draft (it waits for the tabs), so the component holds the stale draft and shows no warning. It only passed by accident through the reload loop described above. The fix is to save the draft before `createComponent` (for example a `render(count, mutate?)` option). `duplicateId` does compare against all sprites of the draft. Other test assumptions: paginator page buttons with the page number as text and remove button last in a row hold for `p-paginator`. The PNG test only works because the Lists panel is lazy too, since otherwise the first `input[type=file]` is a JSON import.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - pack-draft-page.sprites.spec.ts (whole file) — not Prettier-formatted (very long lines) — run prettier on it.
  - pack-draft-page.component.ts `spriteFirst` — not reset when `draftId` changes to another draft, so a new draft opens on the old page offset (clamped, but not 0) — reset it in `load`.
  - Green note says the duplicate-id test was a test bug; the spec now passes the mutation before `createComponent` (`render(count, mutate)`), so the fix is already in.
  - Lifecycle spec unhandled rejection ('' vs 'Edited') still appears in the run; the ticket says it also occurs on the original component, but it is worth its own ticket.
- Checked: `ng test` on pack-draft-page: 4 files / 21 tests pass. Spec covers each decision (lazy panels, 12 per page, page 3 with 6 rows, page-2 edit and remove on the right sprite, back a page, last page after add, duplicate-id across pages, no paginator at 12 or fewer). No new strings, so no i18n change. `@if` and `@for` control flow, Optimus `p-paginator`, no secrets.

## Answer

- The pack editor only creates the Lists and Sprites panels while their tab is shown, and pages sprites 12 at a time with `p-paginator` (shown above 12). Row actions use the sprite's index in the draft. Adding jumps to the last page, emptying the last page goes back one, and opening another draft starts on page 1.
- Second cause found in green: the draft-loading effect tracked `draft()` through `flush`, so every edit reloaded the whole draft from IndexedDB (new Blobs, new preview URLs for every sprite, every select rebuilt). On Base, that ran out of blob memory (`ERR_BLOB_OUT_OF_MEMORY` in the console) and could overwrite edits. `flush` now runs `untracked`.
- Checked: suite 230 files / 1937 tests pass (baseline 229 / 1928). Browser, on a copy of Base (101 sprites): no long task when opening the editor or the Sprites tab (was 4.5 to 5.3 s), 5 edits without long task, 12 preview URLs created; French and English; 375 px with no horizontal scroll.
- Left: the paginator is only above the list (on a phone you scroll back up to change page). The lifecycle spec's unhandled rejection predates this ticket.
