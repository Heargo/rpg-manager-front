# Bundled grayscale sprites, demo axe, credits

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Bundled grayscale sprites)

- Copy the plain PNGs (not the `_b` variants) of `/home/hugo/Téléchargements/fantasy-items-pack/assets/` into `public/assets/sprites/`, one of each duplicate (`honey`/`honney`, `ocarina`/`occarina`, `fishing_rod`/`fishingrod`). A typed manifest lists each sprite: id (file name), FR/EN label, kind tag (weapon, armour, jewel, potion, food, tool, book, instrument, misc…).
- Colorizer: a sprite library picker (thumbnails, search by label) next to "Open an image"; picking one loads it like an opened file.
- The demo sprite is `axe.png`; remove the generated axe (`helpers/demo-sprite.ts`).
- Credits page, FR and EN: "Fantasy items pack" by Florian Sciberras, CC BY 4.0 with a link to the licence, sprites recoloured in the app.
- Check the service worker caching (the sprites are lazy assets, not prefetched).
