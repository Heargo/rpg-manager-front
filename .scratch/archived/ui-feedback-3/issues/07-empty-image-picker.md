# Empty image picker

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Empty image picker)

- Every image picker with no image shows a placeholder tile (dashed border, `pi-image` icon) and an Optimus UI button "Choose an image" / « Choisir une image »; the native file input is hidden. No `<img>` is rendered without a source (no broken image icon).
- Ideally one shared picker component used by every editor; with an image, behaviour is as today.

## Context found

Pickers today: item editor (`item-editor.component.ts`, `#item-image`) and NPC editor (`npc-editor.component.ts`, `#npc-portrait`): a native `<input type="file">` (browser's "Choose file / No file chosen") under an `app-stored-image` preview whose empty fallback is a small grey box with `pi-image`, then `app-image-warning`. The NPC editor also has a remove button.

## Baseline

Test Files 173 passed, Tests 1419 passed.

## Seams

1. **New `ImagePickerComponent` (`core/components/image-picker/`, `TEST_PROVIDERS`)**: inputs `imageId`, `accept`, `inputId`, `label`; outputs `picked` (File) and `removed`. Empty: a placeholder tile (`pi-image`, dashed) and an Optimus `pButton` "Choose an image" that opens the hidden file input; no `<img>` rendered. With an image: the stored image, a "Change" button and a "Remove" button (emits `removed`). Choosing a file emits `picked`. Shows `app-image-warning`. Misses: the look (browser check).
2. **Item editor and NPC editor components**: they use `app-image-picker` (no visible native file input); picking a file still uploads and sets the draft's image/portrait id as today, remove clears it. Existing editor tests that drive `data-field="image"` / `data-field="portrait"` keep working through the picker's hidden input (keep those `data-field` hooks on it).

## Red

- Test files: `src/app/core/components/image-picker/image-picker.component.spec.ts`, `src/app/modules/npc/components/npc-editor/npc-editor.picker.spec.ts`, `src/app/modules/item/components/item-editor/item-editor.picker.spec.ts`
- Run: `npx ng test --watch=false` (full suite; `--include` on editor specs fails here with an unrelated `node:crypto` type error, even on existing specs; `--include` works for the picker spec once the component exists)
- Contract added beyond the seam: an extra `field` input on `ImagePickerComponent` sets `data-field` on the hidden `input[type=file]` (hidden via the `hidden` attribute; `id` = `inputId`). Hooks: `[data-testid="image-placeholder"]` (contains `.pi-image`), `[data-action="choose-image"|"change-image"|"remove-image"]`, `[data-testid="image-warning"]` (from `app-image-warning`). Choose click calls the input's `click()`.
- i18n keys (green adds, FR/EN, under `common` next to `imageWarning`): `common.image.choose` "Choose an image" / « Choisir une image », `common.image.change` "Change" / « Changer », `common.image.remove` "Remove" / « Retirer ». (No better namespace exists; the existing `world.*chooseImage` keys are world-specific.)
- Currently without the component the build fails (missing module `./image-picker.component`). With a stub component, 11 tests fail:
  - ImagePickerComponent (8): placeholder tile + no img; Choose button, no change/remove; hidden input with id/accept/data-field; choose click opens input; picked emitted; stored image with Change/Remove; removed emitted; human-artists warning — all fail because the stub renders nothing (assertion failures).
  - NpcEditor picker: renders shared picker empty with hidden `portrait` input — no `app-image-picker` in the editor.
  - ItemEditor picker (2): renders shared picker empty with hidden `image` input; uploads then offers Change/Remove — no `app-image-picker` in the editor.

## Green

- Files: src/app/core/components/image-picker/image-picker.component.ts (new), src/app/modules/item/components/item-editor/item-editor.component.ts, src/app/modules/npc/components/npc-editor/npc-editor.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: New shared `ImagePickerComponent` (dashed placeholder tile with large `pi-image` + pButton Choose; stored image + Change/Remove; hidden file input with id/accept/data-field; `app-image-warning`). Item and NPC editors use it; `upload` now takes a File. Added `common.image.*` keys. Extra `removeAction` input (default `remove-image`) lets the NPC editor keep its existing `remove-portrait` hook.
- Suite: 176 files / 1430 tests passed (baseline 173 / 1419); tsc clean; build clean; no unstaged test files.
- Open questions: none

## Answer

New shared `app-image-picker` (core/components): empty = dashed tile with a large `pi-image` and an Optimus "Choisir une image" button opening a hidden file input; with an image = the stored image, Change and Remove; the human-artists warning below. Item and NPC editors use it (the item editor gains Remove). Unused `npc.editor.removePortrait` key removed after review. Review: ship. Browser: Tools item editor shows the tile and button, no native input visible, no `<img>`. Suite: 176 files, 1430 tests (+11), build OK.
