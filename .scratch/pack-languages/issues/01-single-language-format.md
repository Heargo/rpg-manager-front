# Pack format: one language, Base split in two

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1-2, Assumed: registry, old stored packs).

- Manifest: required `language` (`en` | `fr`), `name` and `description` as strings, `generators: { items?, npcs?, skills?, classes? }` (paths), sprites with `label` instead of `en` / `fr`. `validatePack` checks the new shape and rejects the old one.
- `public/packs/base` becomes `public/packs/base-fr` and `public/packs/base-en` (same 101 sprite files, each manifest with its own labels and word lists). Registry entries `base-fr` and `base-en`, both built in, with `language` instead of `languages`.
- Everything that read `pack.name[lang]`, `sprite.en/fr` or `generators[lang]` reads the single value (pack business, sprite library, word lists, random item image, Packs page cards and details).
- Old-format stored packs and drafts are dropped by the database upgrade.
- Until 03 lands, both Bases are on (the existing device toggle keeps working).
