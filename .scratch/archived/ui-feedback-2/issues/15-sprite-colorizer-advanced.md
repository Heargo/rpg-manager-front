# Sprite colorizer: polygon, edge snapping, shape detection

Status: resolved
Type: task
Blocked by: 14

Spec: `../spec.md`

Reference: `.scratch/images/sprite-colorizer.md` sections 5 (polygon), 6, P2.
- Polygon selection (click vertices, double-click/Enter closes, Escape cancels), Sobel edge snapping within a radius.
- Detect shapes: alpha + luminance connected components with region merging, shown as coloured candidate overlays; select candidates and apply to a new or existing layer. In a Web Worker if heavy.
- Selection ops: add, remove, replace, invert, clear, apply.

## Baseline

Test Files 164 passed, Tests 1287 passed.

## Seams

1. **Pure helpers (`modules/sprite/helpers/`)**: polygon rasterisation to a mask (point-in-polygon, closed); Sobel edge magnitude; snap a point to the strongest edge within a radius; shape detection (alpha + luminance connected components with region merging below a size, returns labelled regions); selection ops (add, remove, replace, invert, clear) if not already in `mask-ops`.
2. **Sprite colorizer business**: polygon tool (add vertex with optional snapping, close, cancel → one history entry), detect shapes → candidate regions, select candidates, apply to the active or a new layer (one history entry).
3. **Page component**: Polygon tool button, snap toggle with radius, Detect shapes button showing candidates, Apply to layer / new layer; Enter closes and Escape cancels the polygon.

## Red

- Test files: `src/app/modules/sprite/helpers/polygon.spec.ts` (new), `src/app/modules/sprite/helpers/edges.spec.ts` (new), `src/app/modules/sprite/helpers/shape-detection.spec.ts` (new), `src/app/modules/sprite/business/sprite-colorizer.business.spec.ts` (extended), `src/app/modules/sprite/pages/sprite-colorizer-page/sprite-colorizer-page.component.spec.ts` (extended)
- Run: `npx ng test --watch=false --include 'src/app/modules/sprite/**/*.spec.ts' 2>&1 | tail -30`
- Failing: the sprite specs fail to compile on missing symbols (TS errors), so all new tests are red. Expected API:
  - `helpers/polygon.ts`: `rasterizePolygon(width, height, points: {x,y}[]): Uint8Array` (pixel centres inside; <3 points gives empty).
  - `helpers/edges.ts`: `sobelMagnitude(image): Float32Array`; `snapToEdge(image, x, y, radius): {x,y}`.
  - `helpers/shape-detection.ts`: `detectShapes(image, {tolerance, minSize}): {mask: Uint8Array, size: number}[]`, biggest first, regions smaller than minSize merged into a neighbour, transparent pixels excluded.
  - `SpriteTool` gains `'polygon'`. Business: `addPolygonVertex(x,y)`, `$polygonVertices()`, `closePolygon(mode)`, `cancelPolygon()`, `setSnap({enabled,radius})`, `$snap()`, `detectShapes()`, `$candidates()` (`{id, mask, size}`), `toggleCandidate(id)`, `$selectedCandidates()` (ids), `applyCandidates('active' | 'new', name?)`.
  - Page: buttons aria-labelled `Polygon`, `Detect shapes`, `Apply to layer`, `Apply to new layer`; text `Snap to edges`; candidates rendered as `.candidate` clickable elements; Enter closes and Escape cancels the polygon (document keydown).
  - polygon.spec — rasterise square, triangle, clipping and <3 vertices
  - edges.spec — Sobel flat/step; snap within radius, no edge in radius, radius 0 and flat image
  - shape-detection.spec — alpha components, luminance split and ordering, transparent excluded, merge below minSize
  - business — polygon close is one history entry; add/remove modes; cancel; <3 vertices ignored; snap on/off
  - business — detect leaves document and history untouched; select and apply to active (one entry); toggle deselects; apply to new layer (undone together)
  - page — Polygon button, snap option text, Enter/Escape, detect + candidate + Apply to new layer, Apply to layer button

## Green

- Files: `src/app/modules/sprite/helpers/{polygon,edges,shape-detection,shape-colors}.ts`, `services/{sprite-shape.service,shape-detection.worker}.ts`, `business/sprite-colorizer.business.ts`, `models/sprite.ts`, the colorizer page (`.ts`, `.html`, `.scss`), `public/i18n/{en,fr}.json`, `angular.json` (`webWorkerTsConfig`), `tsconfig.worker.json`, `tsconfig.app.json` (excludes `*.worker.ts`)
- Change: pure helpers for polygon fill, Sobel and edge snapping, and shape detection (regions grow by neighbour-to-neighbour luminance step so smooth shading stays whole; regions under 1 % of the opaque area, min 4 px, merge into the neighbour with the longest border; then neighbours with mean luminance within tolerance merge; demo axe gives 5 candidates). Business gets the polygon, snap, candidates and apply API; `detectShapesAsync()` goes through `SpriteShapeService`, which runs a Web Worker (inline when `Worker` is undefined, as in jsdom) and exposes `$detecting`. The page draws the open polygon in an SVG over the sheet (vertices, edges, dashed closing preview), closes on Enter or double-click (Shift adds, Alt removes), cancels on Escape, and paints candidates as distinct colours on the overlay, with selected ones stronger and listed as `.candidate` items. Duplicate consecutive vertices are ignored (so double-click does not double the last one).
- Suite: 167 files / 1313 tests pass (baseline 164 / 1287); `tsc -p tsconfig.spec.json` clean; `ng build` OK (worker bundled; only pre-existing budget warnings).
- Open questions: none (min region size is `defaultMinSize` (1 % of opaque pixels, at least 4); tolerance slider is shared with the wand/bucket).

## Answer

Polygon selection (SVG preview, Enter/double-click close, Escape cancel, Shift add, Alt remove), Sobel edge snapping with radius, shape detection in a Web Worker (neighbour-step region growing, small regions merged into the longest-border neighbour at 1 % of opaque pixels, similar neighbours merged), candidates as coloured overlays, apply to the active or a new layer. Browser: demo axe gives 5 candidates (60 before the merge fix), applying one creates a material. Thresholds are constants for now.
