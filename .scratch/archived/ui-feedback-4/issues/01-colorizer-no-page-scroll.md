# Sprite colorizer: no page scroll while working

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Sprite colorizer fixes)

- Wheel zoom, pan and brush strokes on the canvas never scroll the page (desktop wheel, trackpad, touch). On mobile a stroke doesn't drag the page.
- The side panels still scroll on their own; the page itself still scrolls outside the canvas.
- Hint: non-passive `wheel` listener with `preventDefault`, `touch-action: none` and `overscroll-behavior: contain` on the canvas area.

## Baseline

Test Files 193 passed, Tests 1617 passed.

## Answer

The canvas already kept the wheel and touch to itself (wheel `preventDefault`, `touch-action: none`); what scrolled was the page itself, about 100 px taller than the window. On two columns (≥ 64rem) the page now fills the window below the nav bar (`100dvh - 4.5rem`): the stage takes the remaining height and only the side panel scrolls (`overscroll-behavior: contain`). On mobile the layout stays stacked and the page scrolls to reach the panels; strokes on the canvas don't drag it.

Layout only (no seam: jsdom doesn't measure heights). Checked in the browser: 1280 px FR, page height = window height, panel scrolls inside, wheel on the canvas zooms; 375 px EN, no horizontal scroll, `touch-action: none` on the canvas; no console error. Suite unchanged: 193 files, 1617 tests; build clean.
