# Spec: default neutral asset pack (2026-11-17)

From `quicknotes.md` ("Assets to add in the default asset pack"). Proposed, not yet validated.

## One neutral pack for the shared assets

- A new built-in **neutral pack** (no language; assumed id `base-assets`, name "Base assets"), active by default in every world next to Base FR or Base EN.
- The 101 item sprites (and their material masks) **move** from `base-fr` and `base-en` into it, so they exist once. Base FR/EN keep their word lists, texts and fixed content only. The kinds the sprites point to must be declared where the sprites live (assumed: the neutral pack declares the item kinds tree, Base FR/EN keep the words for them).
- No backward compatibility: dev worlds that listed only `base-fr` get the neutral pack added by the defaults.

## Asset types a pack can carry

| Asset | Today |
| --- | --- |
| Item images | done (sprites, domain `items`) |
| NPC images | to check: the model allows `domain: 'npcs'` but only item sprites seem to be drawn |
| Skill images | not used |
| Class images | not implemented |
| World images | not a pack asset yet |

Each type: the pack declares it, the matching generator / picker can draw from the active packs, the pack creator's Sprites tab can add it.

## World images

- A pack can ship **world images** (landscape illustrations for a world's card and table header). Assumed format: a `worldImages` list in the manifest (id, label, image path, tags such as `mountain`, `night`, `desert`, `ocean`, `snow`).
- The world wizard and world rules image picker offer them next to "upload".
- The neutral pack ships about a dozen landscapes from Vecteezy (list in ticket 04). Vecteezy's free licence requires attribution; credits page and pack `license` must say so. Some links may be Pro-only.
