# Sprite colorizer: brush size on the canvas

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Sprite colorizer fixes)

- Brush and eraser draw a circle following the pointer, its diameter the brush size at the current zoom; hardness shown (inner circle or soft edge). It follows size changes (slider, shortcut) at once.
- Hidden for bucket, wand and pan, and when the pointer leaves the canvas. Drawn on the overlay, never in the exported PNG.
