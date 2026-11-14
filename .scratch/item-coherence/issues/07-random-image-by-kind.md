# Random image by kind and tint

Status: ready-for-agent
Type: task
Blocked by: 05, 06

Spec: `../spec.md` (Decisions 1, 3, 6, Assumed: item without kind, image colours).

- Sprite choice: the sprites of every active pack (and tagged sprite sets saved on the device) whose kinds match the item's kind, else its parent, up the chain; then same type and slot; then same type; then any.
- An item without `kind`: the kind found from its name (05's noun lookup, singular match); sprite labels are no longer matched.
- Colours of a masked sprite: the item's `tints` on the material layers in order (first tint on the first layer, second on the second), other layers a random pooled tint, built-in presets when no pack gives any. A tint with several gradients draws one. A coloured sprite stays as is.
- Saved sprite sets (the colorizer's tags) get `kinds` instead of `type`/`slot`.
- Same item, seed and packs → same image.
