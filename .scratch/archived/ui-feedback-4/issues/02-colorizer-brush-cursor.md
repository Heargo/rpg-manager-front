# Sprite colorizer: brush size on the canvas

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Sprite colorizer fixes)

- Brush and eraser draw a circle following the pointer, its diameter the brush size at the current zoom; hardness shown (inner circle or soft edge). It follows size changes (slider, shortcut) at once.
- Hidden for bucket, wand and pan, and when the pointer leaves the canvas. Drawn on the overlay, never in the exported PNG.

## Baseline

Test Files 194 passed (after H01: 193 + the new spec below), Tests 1617 before this ticket.

## Seams

1. **Pure helper `helpers/brush-cursor.ts`** `brushCursor(tool, brush, pixel)`: the circle(s) to draw in image pixels; catches size, hardness, centring and which tools show it. Misses: drawing and pointer tracking (browser check).

## Answer

`brushCursor` gives a circle centred on the hovered pixel that encloses every pixel the stamp paints (radius shared with `stampBrushInPlace` through the new `brushRadius`), plus a dashed outer circle at the full size when hardness makes the painted disc smaller. The page tracks the hovered pixel (mouse, pen, and touch during a stroke; cleared on leave and after a touch ends) and draws the circles in the existing SVG overlay with a non-scaling 1 px light stroke and a dark shadow, so they read on any colour at any zoom. Hidden for bucket, wand, polygon and pan; never in the exported PNG (the SVG is not part of the canvas).

Review step skipped (small, self-contained change). Checked in the browser (1280 px): size 8 hard shows one circle, size 40 hardness 0 shows inner and dashed outer, bucket hides it, leaving the canvas hides it, a synthetic touch stroke clears it on release; no console error. No new strings. Suite: 194 files, 1622 tests (5 new); build clean.
