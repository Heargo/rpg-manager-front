# Empty image picker

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Empty image picker)

- Every image picker with no image shows a placeholder tile (dashed border, `pi-image` icon) and an Optimus UI button "Choose an image" / « Choisir une image »; the native file input is hidden. No `<img>` is rendered without a source (no broken image icon).
- Ideally one shared picker component used by every editor; with an image, behaviour is as today.
