# Sprite colorizer: no page scroll while working

Status: ready-for-agent
Type: bug
Blocked by: none

Spec: `../spec.md` (Sprite colorizer fixes)

- Wheel zoom, pan and brush strokes on the canvas never scroll the page (desktop wheel, trackpad, touch). On mobile a stroke doesn't drag the page.
- The side panels still scroll on their own; the page itself still scrolls outside the canvas.
- Hint: non-passive `wheel` listener with `preventDefault`, `touch-action: none` and `overscroll-behavior: contain` on the canvas area.
