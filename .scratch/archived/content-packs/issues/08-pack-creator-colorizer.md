# Pack creator: the colorizer link

Status: resolved
Type: task
Blocked by: 07

Spec: `../spec.md` (Pack creator: Sprites). Split from K07 on 2026-11-13 (a fourth seam on the colorizer).

- In the colorizer, "Ajouter à un brouillon de pack / Add to a pack draft": picks a draft and adds the current sprite with its materials as a `masked` sprite (limits checked).
- In the pack creator, "Modifier dans le colorizer / Edit in the colorizer" on a draft sprite opens it in the colorizer with its materials; saving there writes the image and materials back to that draft sprite (a grayscale sprite becomes `masked` once it has materials).

## Decisions (orchestrator, 2026-11-13)

- **Direction**: the colorizer (feature `sprite`) calls `PackCreatorBusiness` (core); core never imports the sprite module.
- **`PackCreatorBusiness`** gains `addFromColorizer(draftId, { image: Blob, materials: string, id, en, fr, type, slot })` → a `masked` draft sprite (same limits as `addPng`, duplicate id refused), and `updateSpriteMaterials(draftId, spriteId, materials)` → replaces the materials, keeps the image, turns a `grayscale` sprite into `masked`; a `colored` sprite is refused.
- **Add from the colorizer**: a "Ajouter à un brouillon de pack / Add to a pack draft" button (enabled when a sprite is open) opens a `p-dialog`: draft `p-select` (drafts by name, most recent first; when there is none, "Nouveau brouillon / New draft" creates one), sprite id (prefilled from the sprite or file name through `slugifyPackId`, with `_` kept out), EN/FR labels, type and slot selects (prefilled from the library sprite's tags when known), "Ajouter / Add". The image is the colorizer's grayscale source encoded as PNG, the materials its `exportConfig`. A success toast offers "Ouvrir le brouillon / Open the draft".
- **Edit in the colorizer**: in the draft editor's Sprites tab, `grayscale` and `masked` rows get "Modifier dans le colorizer / Edit in the colorizer" (not `colored`), which navigates to `/tools/sprite-colorizer?draft=<draftId>&sprite=<spriteId>`. The colorizer reads both query params (component inputs, `withComponentInputBinding` is on), loads the draft sprite's image with its materials (or as a loaded image when it has none), and shows a banner (`p-message`) "Sprite « <id> » du brouillon « <name> »" with "Enregistrer dans le brouillon / Save to the draft" (calls `updateSpriteMaterials` with `exportConfig`, success toast) and "Retour au brouillon / Back to the draft". A missing draft or sprite shows an error toast and the colorizer opens empty as usual.

## Baseline

Test Files 224 passed, Tests 1879 passed.

## Seams

1. **`PackCreatorBusiness` over fake-indexeddb and a faked `ImageProcessingService`**: `addFromColorizer` adds a masked sprite with the given materials, refuses oversized images and duplicate ids; `updateSpriteMaterials` replaces materials, keeps the image, turns grayscale into masked, refuses colored and unknown ids. Misses the colorizer.
2. **`SpriteColorizerBusiness` over its faked services and a real `PackCreatorBusiness`**: `loadDraftSprite(draftId, spriteId)` opens the image with its materials (or none); `saveToDraft()` writes `exportConfig` back; `addCurrentToDraft(draftId, details)` stores the current grayscale image and materials. Misses the pages.
3. **Pages**: the colorizer page with `draft` and `sprite` inputs shows the banner and Save calls through; its "Add to a pack draft" dialog lists drafts and adds; the draft editor shows "Edit in the colorizer" on grayscale and masked rows (not colored) and navigates with the query params. Misses layout (browser check).

## Red

- Test files:
  - `src/app/core/business/pack-creator-colorizer.business.spec.ts` (seam 1)
  - `src/app/modules/sprite/business/sprite-colorizer-draft.business.spec.ts` (seam 2)
  - `src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.draft.spec.ts` (seam 3, colorizer page)
  - `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.colorizer.spec.ts` (seam 3, draft editor)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (one run per file; the whole-suite run does not compile until the symbols exist)
- Failing: 26 tests (existing colorizer page and business specs still pass: 17 and 39)
  - seam 1 (8, compile error TS2339): addFromColorizer adds masked sprite; refuses > 1 MB; refuses > 256 x 256; refuses duplicate id; updateSpriteMaterials replaces materials and keeps image; grayscale becomes masked; refuses colored; refuses unknown sprite/draft. Fail: `addFromColorizer` / `updateSpriteMaterials` missing.
  - seam 2 (6, compile error TS2339): loadDraftSprite opens masked with materials; opens grayscale without; rejects unknown draft/sprite; saveToDraft writes materials back and masks; addCurrentToDraft stores PNG + materials; rejects duplicate id. Fail: `loadDraftSprite` / `saveToDraft` / `addCurrentToDraft` missing. Details argument is `{ id, en, fr, type, slot }`.
  - colorizer page (10, NG0303 no `draft`/`sprite` input, or button/element missing): banner with sprite and draft name; Save to the draft writes back with success toast; Back to the draft navigates with the draft id; error toast + empty for unknown sprite; error toast + empty for unknown draft; "Add to a pack draft" disabled until a sprite is open; lists drafts by name, latest first; prefills id without `_`; adds with materials + success toast; creates a first draft when none.
  - draft editor (2): "Edit in the colorizer" on grayscale and masked rows, not colored; navigates to `/tools/sprite-colorizer?draft=<id>&sprite=<spriteId>`. Fail: button missing.
- Hooks the tests expect (green must provide): `[data-test="draft-banner"]`, `p-select[data-test="add-draft-select"]` with options `{ label: draft name, value: draftId }` bound by ngModel, `[data-test="add-new-draft"]`, `input[data-test="add-sprite-id"]`, `[data-test="add-confirm"]`; buttons by English label ("Add to a pack draft", "Save to the draft", "Back to the draft", "Edit in the colorizer"); navigation via `Router.navigate` or `navigateByUrl`.

## Green

- Files: src/app/core/business/pack-creator.business.ts, src/app/modules/sprite/business/sprite-colorizer.business.ts, src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component.{ts,html,scss}, src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `PackCreatorBusiness.addFromColorizer/updateSpriteMaterials`; `SpriteColorizerBusiness.loadDraftSprite/saveToDraft/addCurrentToDraft` (+ `$draftTarget`, `openTags` for prefilled type/slot). Colorizer page: `draft`/`sprite` inputs, `p-message` banner with Save/Back, "Add to a pack draft" button and dialog (`p-select`, new-draft button, id/labels/type/slot), keyed `p-toast` with "Open the draft". Draft editor: "Edit in the colorizer" on grayscale/masked rows navigating with query params. `sprite.draft.*` and `packs.creator.editInColorizer` keys in EN and FR.
- Suite: 228 files / 1905 tests pass (baseline 224 / 1879); one unrelated library-dialog test failed once in a full run and passed on rerun and in isolation. tsc clean, ng build has no error (only existing budget warnings; the colorizer scss is now 1.98 kB over its 4 kB warning budget).
- Open questions: none. Browser check at 375 px not done (the banner and add form wrap, no fixed widths). `add-new-draft` and `add-confirm` are `<button pButton>` because the tests click the native button; the sprite scss budget warning is worth a look in review.

## Review

- Verdict: fix first
- Must fix: `sprite-colorizer.business.ts` `loadDraftSprite` (~l.205) — a deep link `?draft=&sprite=` to a `colored` sprite opens it in the colorizer (the Edit button hides it, the URL does not); "Add to a pack draft" would then store a colored image as `masked`, and Save fails only at the end — throw `sprite.coloredRefused` when `sprite.kind === 'colored'` (the page already shows the error toast and opens empty) and add a test.
- Consider: `sprite-colorizer.business.ts:~134` — the `$currentSetId` doc comment now sits above `$draftTarget`'s; swap them back.
- Consider: `pack-draft-page.component.ts` `editInColorizer` — `void this.flush()` is not awaited before navigating; `await` it so the colorizer reads the saved draft.
- Consider: `sprite-colorizer-page.component.scss` — about 2 kB over the 4 kB warning (error at 8 kB): acceptable now (warning only, the page was already near it); move the add-dialog into its own component if it grows.
- Consider: `sprite-colorizer-page.component.ts` — about 100 lines of draft/add-dialog state added to an already large page; an `AddToDraftDialogComponent` would be tidier.
- Checked: core to sprite: no new dependency (the two `modules/sprite` imports in `pack-creator.business.ts` predate K08; the colorizer calls core only). Draft target: `loadImage` resets `draftTarget`, and `loadDraftSprite` sets image and target in one synchronous step, so a later load or file open cannot leave a stale target. `slugifyPackId` emits only `a-z0-9-`, so `_` is stripped. The `draft` and `sprite` inputs clash with no other input (the only `input()` calls on the page).

## Review (re-check)

- Verdict: ship
- Must fix: none
- Consider: `pack-draft-page.component.ts:631` — the `saveTimer !== undefined` guard skips a save already in flight (timer cleared, `queue` pending); `await this.queue` there too if that ever shows. Otherwise sound: `flush()` returns `queue` when not dirty, so the guard only avoids a needless await.
- Checked: `loadDraftSprite` refuses colored before decode (test asserts no decode, no image, no target); EN banner straight quotes, FR keeps « »; doc comments back in place.

## Answer

- `PackCreatorBusiness.addFromColorizer` (masked sprite, same limits as `addPng`, duplicate id refused) and `updateSpriteMaterials` (keeps the image, grayscale becomes masked, colored and unknown ids refused). Core gains no new dependency on the sprite module (the two existing imports date from K07).
- `SpriteColorizerBusiness.loadDraftSprite` (refuses colored drafts sprites before loading), `saveToDraft`, `addCurrentToDraft`. Colorizer page: `draft` and `sprite` query-param inputs, a `p-message` banner with "Enregistrer dans le brouillon" and "Retour au brouillon", and an "Ajouter à un brouillon de pack" dialog (drafts latest first, New draft, id prefilled without `_`, type and slot prefilled) with a toast offering "Ouvrir le brouillon". Draft editor: "Modifier dans le colorizer" on grayscale and masked rows, saving a pending edit before navigating.
- Review fixes (approved by the user): colored deep links refused (new `sprite-colorizer-draft.colored.spec.ts`), the draft editor flushes a pending save before opening the colorizer, the English banner uses straight quotes.
- Checked in the browser: FR desktop, the demo axe added to the "Épées du Nord" draft (id `axe`, Équipement, Arme 1 prefilled; toast "Sprite ajouté au brouillon"); the draft's Sprites tab shows "Modifier dans le colorizer", which opens the colorizer with the banner « axe » du brouillon « Épées du Nord »; "Enregistrer dans le brouillon" saves. EN at mobile width: no horizontal scroll. No console error. Suite: 229 files, 1906 tests (baseline 224 / 1879); build clean. Review: ship after the fixes.
- Left for later: the colorizer page styles are ~2 kB over their 4 kB warning budget, and the add dialog could become its own component; `editInColorizer` doesn't wait for a save already in flight (timer cleared, queue pending). Green saw one sprite library dialog test fail once in a full run; it didn't recur in five runs.
