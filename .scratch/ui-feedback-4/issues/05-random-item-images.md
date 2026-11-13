# Random item images from sprite sets

Status: ready-for-agent
Type: task
Blocked by: 04

Spec: `../spec.md` (Saved sprites and masks)

- A pure helper picks a sprite set matching the item kind (manifest tags; any set when none matches), picks a random preset gradient per material (`RandomSource`, seeded in tests) and renders the recoloured image.
- The item generator and the item editor's Random button set the item's image with it (stored like an uploaded image); a "re-roll image" action changes the image alone.
- The user's saved sets take part in the pick (assumed), with their own tags chosen when saving.
