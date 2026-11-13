# NPC portrait image, human artists warning on image pickers

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- The NPC editor gets a portrait image picker (PNG, JPEG, WebP, GIF), stored through `ImageBusiness`; the NPC card and table show it.
- Every image picker (items, NPCs, skills, classes, character portrait, table images) shows a short warning: prefer images made by human artists; AI text is handy, AI images are lifeless. EN/FR.

## Baseline

Test Files 132 passed, Tests 1139 passed.

## Seams

1. **NPC editor component (`TEST_PROVIDERS`, `ImageBusiness` as existing specs fake it)**: picking a portrait file stores it through `ImageBusiness` and the emitted NPC has its `imageId`; removing clears it; the NPC card shows the image. Misses: real file picker.
2. **Image picker warning**: wherever an image is chosen (shared picker component if one exists, else each editor), the human-artists warning text shows in EN and FR. Misses: placement.

## Red

- Test files: `src/app/modules/npc/components/npc-editor/npc-editor.portrait.spec.ts`, `src/app/modules/item/components/item-editor/item-editor.warning.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/npc/components/npc-card/npc-card.component.spec.ts --include src/app/modules/npc/components/npc-editor/npc-editor.portrait.spec.ts --include src/app/modules/item/components/item-editor/item-editor.warning.spec.ts 2>&1 | tail -30` (the card spec is only there because an editor spec run alone fails to compile on `node:crypto`, a pre-existing issue that also hits the existing editor specs; it passes)
- Model: `Npc` (via `Sheet`) already has `portraitId` and `samplePortrait`, and `NpcCardComponent` already renders `portraitId` through `app-stored-image`, so no card test was added (it is already green). The editor must use `portraitId`.
- Hooks: `input[data-field="portrait"]` (accept has image/png, image/jpeg, image/webp, image/gif), `[data-action="remove-portrait"]`, `[data-testid="portrait-preview"]` (contains the `img`), `[data-testid="image-warning"]` (EN contains "human artists", FR contains "artistes humains").
- Only the item editor and the NPC editor have image pickers today (skill, class, character portrait, table have none), so the warning is tested on those two.
- Failing: 5 tests
  - NPC editor: accepts PNG, JPEG, WebP and GIF files — no `portrait` file input
  - NPC editor: stores the picked file through ImageBusiness and emits the NPC with its portrait id — no `portrait` file input
  - NPC editor: shows the existing portrait and clears it on remove — no portrait preview / remove button
  - NPC editor: shows the human-artists warning, EN and FR — no `image-warning` element
  - Item editor: shows the human-artists warning, EN and FR — no `image-warning` element

## Red

- Test files: npc-editor.portrait.spec.ts, item-editor.warning.spec.ts. NPC model already has `portraitId` (from Sheet); the card already shows it. Only the item and NPC editors have image pickers today. 5 failing (file input accept list, store via ImageBusiness + emit portraitId, preview + remove, warning EN/FR on NPC and item editors).

## Green

- Files: src/app/core/components/image-warning/image-warning.component.ts (new), src/app/modules/npc/components/npc-editor/npc-editor.component.ts, src/app/modules/item/components/item-editor/item-editor.component.ts, src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html}, public/i18n/en.json, public/i18n/fr.json
- Change: new shared `app-image-warning` (key `common.imageWarning`, EN/FR) used by the item editor, NPC editor and world wizard image picker. NPC editor gets a portrait file input (png/jpeg/webp/gif) stored via `ImageBusiness.storeUpload` into `portraitId`, a stored-image preview and a remove button (`npc.editor.fields.portrait`, `npc.editor.removePortrait`).
- Suite: 134 files / 1144 tests pass (baseline 132 / 1139); tsc clean; ng build has no error.
- Open questions: none (world import file input is JSON, not an image, so no warning there; NPC upload failures are silently ignored)

## Answer

NPC editor portrait picker (png/jpeg/webp/gif, through ImageBusiness, preview, remove) into `portraitId`. Shared `app-image-warning` on the item editor, NPC editor and world wizard. Browser: NPC editor shows the picker and the FR warning, no console error. Skill and class editors have no image picker yet (their model has imageId): candidate follow-up.
