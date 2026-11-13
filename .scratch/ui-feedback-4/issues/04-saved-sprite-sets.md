# Saved sprites and masks (sprite sets)

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `../spec.md` (Saved sprites and masks)

- Model: a sprite set = sprite (bundled id or stored image) + material layers (name, mask, default gradient). Reuse the JSON config export format where it fits.
- Bundled sets: a script (`scripts/`) runs the existing shape detection on each bundled sprite and writes one JSON per sprite next to it; the result is checked by hand and fixed in the colorizer where needed (export, then replace the JSON).
- Colorizer: save the current sprite and masks on the device (local storage layer, not per world), list, reopen, rename, delete; built-ins are read-only, saving one makes a copy. Opening a bundled sprite loads its set.
