# Spec: UI feedback round 4 (2026-11-13)

The "à trier" notes of 2026-11-13, triaged with the user. One commit per ticket.

## Sprite colorizer fixes

- **No page scroll while working**: wheel, touch and drag on the canvas (zoom, pan, brush strokes) never scroll the page; on mobile a stroke doesn't drag the page either. The panels next to the canvas still scroll on their own.
- **Brush cursor**: brush and eraser show their size on the canvas, a circle following the pointer at the current zoom (hardness shown as an inner circle or a soft edge). Hidden for bucket, wand and pan.

## Bundled grayscale sprites (decided)

- The app ships the **Fantasy items pack** by Florian Sciberras, licensed **CC BY 4.0** (source: `/home/hugo/Téléchargements/fantasy-items-pack/`, 101 sprites, 128 × 128 RGBA PNG, about 1.2 MB without the `_b` variants). The plain variants are bundled (assumed; the `_b` ones add a white outline and are left out). Typos in names are kept as file names but get proper labels (`honney`, `occarina`, `fishingrod` vs `fishing_rod`: keep one of each duplicate).
- **Credits** page: a section crediting the pack, its author, the licence with a link, and that the sprites are recoloured in the app (CC BY requires saying changes were made), FR and EN.
- The colorizer gets a **sprite library**: a picker listing the bundled sprites (thumbnails, search by name), next to "Open an image".
- The **demo sprite** is the pack's `axe.png` (the generated axe helper goes away).

## Saved sprites and masks (decided)

- A **sprite set** is a grayscale image plus its material layers (masks, names, default gradients). The bundled sprites ship with a ready set each, made with the existing shape detection and checked by hand (assumed: the masks are generated once by a script and stored as JSON next to the PNG; fixing a bad one is done in the colorizer and exported).
- In the colorizer, the user can **save** the current sprite and its masks on the device (local storage layer, not per world), reopen, rename and delete them. Built-in sets are read-only; saving one makes a copy.
- **Random item images**: the item generator and the item editor's Random button pick a sprite set that matches the item kind (a tag per sprite: weapon, armour, ring, potion, food…), apply random gradients from the presets to each material, and store the result as the item's image. The user can re-roll the image alone.

## Item catalogue context menu

Clicking an item in the catalogue grid opens a popup menu **anchored to that item** (Optimus UI menu, list of the actions the panel offers today: details, edit, give, duplicate, delete…), instead of the detached actions panel. Keyboard: Enter or the context-menu key opens it on the focused slot; Escape closes it. Mobile: the menu stays on screen.

## Optional combat steps (decided)

In World rules, Combat section, each step can be turned off on its own (all on by default):

| Step | Off means |
| --- | --- |
| Initiative | No roll and no typed initiative: the GM orders combatants by hand (free order). |
| Action counters | No "Action 1/1, Movement 1/1" on the turn; the action types list is hidden. |
| GM validation | A skill's result is applied at once (cost, effects, log) without the pending step. |
| Defence | No defence reduction offered when damage is applied; the defence formula is hidden. |
| Rewards | No XP, money and loot screen when the combat ends; NPC rewards are not shown. |

The existing settings of a step are hidden when the step is off. The wizard's Rules step and the Tools sandbox follow the same settings. No backward compatibility: dev worlds get the defaults.

## User documentation (decided)

- A **Starlight** site, in its own folder at the repo root (`user-docs/`, assumed; `docs/` holds the dev docs), **French and English** (Starlight i18n, FR default like the app).
- Split by **functional module**: getting started (install the PWA, profile), worlds and world rules, hosting and joining a room (invite link, QR, offline), the table, characters (creation, sheet, levels, skills), items (catalogue, editor, random), NPCs and merchants, classes and skills, combat, dice, tools (sprite colorizer, sandboxes), credits and privacy.
- **Screenshots** of the real app, taken by **Playwright** scripts (one per module, FR and EN, desktop and mobile when it matters) on the dev server with seeded data; an npm script runs them all and writes the images into the doc, so screenshots are updated with one command.
- npm scripts: `docs:dev` (run the doc), `docs:build`, `docs:screenshots`.
- **Theme** as close to the app as it simply gets: the app's palette (bordeaux primary, surfaces, dark mode), its fonts, the logo and favicon, through Starlight's CSS custom properties; no custom components unless cheap.
- **Hosting**: built into the same Netlify deploy and served at **`/docs`** (Starlight `base: '/docs'`), linked from the app (footer and the nav bar's help entry). The SPA catch-all in `public/_redirects` and the service worker's navigation URLs must leave `/docs` alone.
