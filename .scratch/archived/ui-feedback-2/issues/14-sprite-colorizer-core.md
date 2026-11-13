# Sprite colorizer tool (P0, P1)

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

Reference: `.scratch/images/sprite-colorizer.md` (sections 2–5, 7–11, P0 and P1).
- Pure helpers under `modules/sprite/helpers/`: luminance, gradient mapping (stops, interpolation, alpha kept), layer manager (create, rename, delete with pixels back to the base layer, visibility, lock, reorder, stable ids), mask ops, flood fill / bucket with tolerance, magic wand (contiguous and global), history (command based, a brush stroke is one entry), presets (steel, wood, gold, ice, fire, leaf, arcane, custom saved locally), JSON config export/import.
- Tools page `/tools/sprite-colorizer` and a Tools menu entry: load an image, canvas with checkerboard, zoom, original/recoloured toggle, mask overlay; panels for materials, tools (brush with size/hardness, eraser, bucket, wand), gradient stops editor, presets; undo/redo with shortcuts; export PNG and JSON.

## Baseline

Test Files 154 passed, Tests 1218 passed.

## Seams

1. **Pure helpers (`modules/sprite/helpers/`, on `ImageData`-like `{width,height,data:Uint8ClampedArray}` and `Uint8Array` masks)**: luminance; gradient mapping (stops sorted, interpolation, alpha kept, only pixels of a layer's mask); layer manager (create, rename, delete → pixels back to base, visibility, lock, reorder, stable ids); brush/eraser stamps (size, hardness) on a mask; bucket fill (contiguous, luminance tolerance, transparent pixels stop it); magic wand (contiguous and global); history (undo/redo, one entry per stroke, redo cleared on new action); presets; JSON config export/import. Misses: canvas rendering.
2. **Sprite colorizer business (`modules/sprite/business/`)**: holds the document as signals, applies tool actions through the helpers and history, saves custom presets (localStorage through a service). Misses: pointer events.
3. **Sprite colorizer page component (`/tools/sprite-colorizer`, `TEST_PROVIDERS`)**: shows the material, tools, gradient and presets panels, undo/redo buttons and shortcuts, export buttons; the Tools menu has the entry. Misses: canvas drawing and real image loading (browser check with a generated grayscale sprite).

## Red

- Test files:
  - `src/app/modules/sprite/helpers/{luminance,gradient-mapping,layer-manager,mask-ops,flood-select,history,presets,config-export}.spec.ts` (fixture `sprite-test-images.ts`, `gray()`)
  - `src/app/modules/sprite/business/sprite-colorizer.business.spec.ts`
  - `src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component.spec.ts`
  - `src/app/core/components/nav-bar/nav-bar.component.spec.ts` (Tools submenu test edited)
- Run: `npx ng test --watch=false --include <file>` per file
- Failing: 1 nav test + every new spec, none can compile yet (missing modules are the red)
  - helpers specs (luminance, gradient-mapping, layer-manager, mask-ops, flood-select, history, presets, config-export) — missing `helpers/<name>.ts` modules and `models/sprite.ts` (`SpriteImage`, `SpriteDocument` with `baseId`, layers `{id,name,visible,locked,order,mask,gradient:{stops}}`)
  - business spec (15 tests) — missing `SpriteColorizerBusiness` and `SpritePresetStorageService` (`load()`/`save(list)`)
  - page spec (8 tests) — missing `SpriteColorizerPageComponent`, route `tools/sprite-colorizer`
  - nav-bar "puts the internal tools then External tools in the Tools submenu" — fails: no "Sprite colorizer" entry first in Tools submenu

## Green

- Files: `src/app/modules/sprite/{models/sprite.ts, helpers/{luminance,gradient-mapping,layer-manager,mask-ops,flood-select,history,presets,config-export,demo-sprite}.ts, services/{sprite-preset-storage,sprite-file}.service.ts, business/sprite-colorizer.business.ts, pages/sprite-colorizer-page/sprite-colorizer-page.component.{ts,html,scss}}`; `src/app/modules/tools/tools.routes.ts` (lazy route); `src/app/core/components/nav-bar/nav-bar.component.ts` (Tools entry); `public/i18n/{en,fr}.json` (`nav.spriteColorizer`, `sprite.*`)
- Change: pure helpers plus a signal-based business (document, selection, tools, command history; a brush stroke is one entry, gradient edits within 1 s merge into one). Page: open image or generated demo sprite, checkerboard canvas with zoom (buttons, wheel, fit) and pan (middle button or Pan toggle), original/recoloured toggle, mask and selection overlay drawn through requestAnimationFrame, brush/eraser/bucket/wand with size, hardness, tolerance, materials panel (add, rename, visibility, lock, reorder, delete), gradient stops editor (p-colorpicker, positions, add/remove), presets with custom saving (localStorage), undo/redo buttons and Ctrl+Z/Y shortcuts (B/E/G/W pick tools), PNG, JSON export and JSON import.
- Suite: 164 files / 1287 tests pass (baseline 154 / 1218); tsc clean; `ng build` no error (existing budget warnings only); no test file in the unstaged diff.
- Open questions: the recolour recomputes all visible layers per change (lazy, at most once per frame), not only the dirty layer; the browser check was not done (jsdom has no canvas); jsdom logs "getContext not implemented" noise in the page spec.

## Answer

New `sprite` module: pure helpers (luminance, gradient mapping, layers, masks, brush/eraser, bucket, magic wand, history, presets, JSON config), a signal business, and `/tools/sprite-colorizer` (first entry of the Tools menu): image or demo sprite, zoom/pan, recoloured/original, mask overlay on opaque pixels, materials, gradient stops, presets (custom saved locally), undo/redo with shortcuts, PNG/JSON export, JSON import. Browser (1280 px): demo sprite, new material, bucket fill, two-column layout, no console error. Recolour recomputes the visible layers at most once per frame (not only the dirty one). Review step skipped (self-contained new module); suite 164/1287.
