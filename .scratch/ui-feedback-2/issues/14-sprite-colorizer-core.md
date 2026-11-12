# Sprite colorizer tool (P0, P1)

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md`

Reference: `.scratch/images/sprite-colorizer.md` (sections 2–5, 7–11, P0 and P1).
- Pure helpers under `modules/sprite/helpers/`: luminance, gradient mapping (stops, interpolation, alpha kept), layer manager (create, rename, delete with pixels back to the base layer, visibility, lock, reorder, stable ids), mask ops, flood fill / bucket with tolerance, magic wand (contiguous and global), history (command based, a brush stroke is one entry), presets (steel, wood, gold, ice, fire, leaf, arcane, custom saved locally), JSON config export/import.
- Tools page `/tools/sprite-colorizer` and a Tools menu entry: load an image, canvas with checkerboard, zoom, original/recoloured toggle, mask overlay; panels for materials, tools (brush with size/hardness, eraser, bucket, wand), gradient stops editor, presets; undo/redo with shortcuts; export PNG and JSON.
