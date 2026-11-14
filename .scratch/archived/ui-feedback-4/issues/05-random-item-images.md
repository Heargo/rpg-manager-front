# Random item images from sprite sets

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Saved sprites and masks)

- A pure helper picks a sprite set matching the item kind (manifest tags; any set when none matches), picks a random preset gradient per material (`RandomSource`, seeded in tests) and renders the recoloured image.
- The item generator and the item editor's Random button set the item's image with it (stored like an uploaded image); a "re-roll image" action changes the image alone.
- The user's saved sets take part in the pick (assumed), with their own tags chosen when saving.

## Baseline

Test Files 197 passed, Tests 1646 passed.

## Seams

1. **Pure helper `helpers/random-sprite.ts`**: `pickSprite(candidates, item, random)` (name word match, then type + slot, then type, then any) and `randomMaterials(doc, random)` (a different built-in gradient per part, base and masks untouched). Plus `renderSprite` in `gradient-mapping.ts`, now shared with the colorizer.
2. **`RandomItemImageBusiness`** with the file, set storage and image services faked: bundled match, same seed → same sprite, tagged saved sets used and untagged ones left out. Plus the colorizer business for set tags.
3. **Item editor component**: Random and Generate draw an image from the item's seed; "Random image" re-rolls only the image; a failed draw keeps the current image.

## Answer

- `RandomItemImageBusiness.create(item, seed)` builds the candidates (101 bundled sprites, plus saved sets that have tags), picks one with a seeded source (`<seed>:image`), loads its materials (bundled JSON, or the automatic guess when missing), gives each part a random built-in gradient, renders it and stores it through `ImageBusiness.storeUpload` (same path as an uploaded image).
- **Item editor** (world catalogue and Tools): Random and "Generate from seed" also set the image; a new "Image aléatoire / Random image" button next to the image picker re-rolls the image alone for the item as it is (its name, type and slot pick the sprite). Offline or on failure the item keeps its image.
- **Saved sets** get optional tags (`type`, `slot`): a copy of a bundled sprite inherits the sprite's tags; in "My sprites" each set has an "Item kind" select (Not used for items, Item, Consumable, Equipment · slot). Untagged sets are never drawn. Sets saved before this ticket have no tags.
- **Not done (decided)**: the Tools item generator page only previews an item (its card has no image and nothing is saved), so it doesn't draw an image; drawing one on every reroll would only fill the image store. Images come with the editor's Random and Generate.

Checked in the browser (1024 px FR): Random gave "Robe enchantée" a purple cape, "Bouclier des marées" a shield; "Image aléatoire" changed the image and kept the name; the full-width button was fixed to its natural width. 375 px EN: the item kind select on a saved set stores `consumable`, no horizontal scroll, no console error. Review step skipped. Suite: 200 files, 1659 tests (13 new); build clean.
