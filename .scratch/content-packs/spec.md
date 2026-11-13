# Spec: content packs (2026-11-13)

From the quick notes of 2026-11-13. A **pack** adds content to the generators (word lists) and to the sprites. Official packs ship with the app but load only when selected; anyone can add an unofficial pack from a link, ideally a GitHub repository. Generation options get a pack choice next to the seed.

Status: draft, to validate with the user (see Open questions). Lines marked *(assumed)* are defaults chosen while writing.

## What a pack is

- A pack is **data only**: one manifest `pack.json` plus the files it lists (JSON word lists, PNG sprites, JSON sprite configurations). No code, no HTML, no CSS; nothing from a pack is ever executed or injected as markup.
- Manifest fields: `format` (version of the pack format, starts at 1), `id` (kebab-case, unique), `name` and `description` per language (`en`, `fr`), `version`, `author`, `license` (SPDX id or text) and `licenseUrl`, optional `homepage`.
- **Generators**: per language, any of `items`, `npcs`, `skills`, `classes`, each a path to a file in the existing word-list format (`WORD_LIST_VERSION` and its siblings). A pack may provide only some generators and only some languages.
- **Sprites**: a list, each with `id`, labels `en`/`fr`, item tags `type` and `slot` (as `LibrarySprite` today), a `kind` and the files:

  | Kind | Files | In the colorizer | In random item images |
  | --- | --- | --- | --- |
  | `grayscale` | PNG | Opens like an image the user loaded; masks are made by hand or by shape detection. | Used with the automatic material guess (as a bundled sprite without JSON today). |
  | `masked` | PNG + materials JSON (colorizer config) | Opens with its materials ready, like the bundled sprites today. | Random gradient per material. |
  | `colored` | PNG | Not editable: shown in the library with a "colored" badge, the colorizer refuses it (or opens it read-only, *assumed: refuses with a message*). | Used as is, no recolouring. |

- Limits *(assumed)*: manifest under 64 KB, each file under 1 MB, a pack under 20 MB, PNG sprites up to 256 × 256. A pack over the limits is refused with the reason.

## Official packs

- Today's content becomes the **Base** pack: the four word lists per language and the 101 Fantasy items sprites (`masked`). It is always installed and selected by default; it can't be removed. *(assumed)*
- Official packs are listed in the app (a registry file in the app, `public/packs/index.json`: id, name, description, size, sprite count, languages, license). Their **content is not downloaded** with the app and not precached by the service worker: a pack's files are fetched the first time the user **selects** it (turns it on), then kept on the device for offline use.
- Turning an official pack off keeps its files cached *(assumed)*; "Remove from device" deletes them.

## Unofficial packs

- "Add a pack" takes a link:
  - a GitHub repository `https://github.com/<owner>/<repo>`, optionally `/tree/<ref>/<path>`: the app reads `pack.json` at that path through `raw.githubusercontent.com` (default branch when no ref is given);
  - or any HTTPS URL to a `pack.json` (its files resolve relative to it; the host must allow CORS).
- Before installing, the app shows the manifest: name, author, license, source link, what it adds (counts per generator and per sprite kind), its size, and a warning that the content is not checked by the app's authors. Installing downloads every file, validates it (manifest, word lists with the existing validators, PNG decodable and within limits, sprite configs with the colorizer's import) and stores the pack on the device (IndexedDB, device-wide, not per world).
- A failed validation lists readable errors per file and installs nothing.
- **Update**: an unofficial pack can be re-fetched from its link; the app shows the old and new `version` and replaces it on confirm. No automatic update. *(assumed)*
- **Remove** deletes its files. Items and NPCs generated from it keep their names and images (images are stored with the item, as today).

## Packs page

- Tools > **Packs** (and a link from the generator options): official packs (on/off, size, downloaded or not), unofficial packs (source link, version, update, remove), "Add a pack".
- Each pack opens a details view: description, license, credits, and its content (sprite thumbnails by kind, word-list counts per language).
- The Credits page lists every installed pack's author and license (CC BY requires it), in addition to the Fantasy items credit already there.

## Pack choice in generation options

- Every generator that takes a seed (item editor, item generator page, NPC editor, skill and class generators, random item image) gets a **Pack** select next to the seed: each selected pack that has content for this generator in the current language, plus **Random** (default *(assumed)*).
- **Random** picks one pack from the seed (`<seed>:pack`), so the same seed with the same selected packs gives the same result. A named pack plus a seed is fully reproducible on any device with that pack.
- Random item images use the sprites of the chosen pack (Random: all selected packs' sprites, weighted per sprite *(assumed)*), plus the user's tagged sprite sets as today.
- A generator whose language has no word list in the chosen pack falls back to the Base pack for that language *(assumed)*.
- The colorizer's sprite library groups sprites by pack, with a pack filter and the kind badge.

## Multiplayer

Packs are per device. Generated content travels as data (names, stats, images embedded as today), so players never need the GM's packs. Nothing in the room protocol changes.

## User documentation

- A user page "Packs" (what they are, adding one, the risk of unofficial packs).
- An author page "Create a pack": the manifest format, folder layout, sprite kinds, limits, a minimal example repository layout, how to test it with "Add a pack".

## Open questions

1. Base pack: keep today's content as an always-on Base pack (assumed), or move part of it to optional official packs to shrink the app?
2. Which official packs exist beyond Base at first? None yet means the lazy-loading path has nothing to load: ship one small second official pack (e.g. split the food sprites out of Base, or a new word list theme)?
3. Default of the pack select: Random (assumed) or Base?
4. Colored sprites in the colorizer: refuse (assumed), or open read-only for preview?
5. Unofficial pack trust: is a warning at install enough (assumed), or should unofficial packs also be off until the user turns them on after install?
6. Should a pack be able to **replace** Base words for a language (a full theme), or only add to the pool? Assumed: each pack is used on its own when chosen; "Random" chooses between packs, it never mixes words from two packs in one name.
