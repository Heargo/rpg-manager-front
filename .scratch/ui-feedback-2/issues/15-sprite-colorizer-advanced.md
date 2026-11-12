# Sprite colorizer: polygon, edge snapping, shape detection

Status: ready-for-agent
Type: task
Blocked by: 14

Spec: `../spec.md`

Reference: `.scratch/images/sprite-colorizer.md` sections 5 (polygon), 6, P2.
- Polygon selection (click vertices, double-click/Enter closes, Escape cancels), Sobel edge snapping within a radius.
- Detect shapes: alpha + luminance connected components with region merging, shown as coloured candidate overlays; select candidates and apply to a new or existing layer. In a Web Worker if heavy.
- Selection ops: add, remove, replace, invert, clear, apply.
