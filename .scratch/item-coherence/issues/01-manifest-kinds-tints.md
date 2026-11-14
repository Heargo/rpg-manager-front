# Manifest v2: kinds, tints, sprite kinds, neutral packs

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decisions 1–5, 13, Assumed: kind and tint conflicts, tree rules, Base packs).

- `PACK_FORMAT` 2. The flat `generators` map goes away. The manifest gets:
  - `tints` (`{ [id]: { gradient: stops } }`, the sprite gradient format), shared by every domain;
  - `domains`: `{ items?, npcs?, skills?, classes? }`, each `{ kinds?, texts? }`. `kinds` is the domain's tree (`{ [id]: { parent?, ...domain fields } }`), `texts` the path to its language file. For `items` the kind fields are `type` and `slot`; `npcs`, `skills` and `classes` have no kinds yet and only `texts` (today's v1 lists);
  - `common`: the path to the shared language file (params);
  - sprites get `domain` and `kinds: string[]`; their `type` / `slot` go away (they come from the kinds).
- Generic code, written once for every domain: a kind-tree validator that takes the domain's field schema (items: `type` only on a root, `slot` only on an equipment chain). Adding a domain later means adding a schema, not touching the validator.
- `language` becomes optional: a pack without it is neutral and can't have `common` or any `texts`.
- Validation: kebab-case ids; no cycle inside the pack; a `parent` not declared in the pack is allowed; a gradient has at least 2 stops with positions in [0, 1] and `#rrggbb` colours; a sprite's domain is known and its kinds are non-empty kebab-case ids. A domain the app doesn't know is ignored with a warning; an unknown field inside a known domain or kind is an error.
- `buildPack` (pack draft) writes the new fields. Old drafts and unofficial packs are dropped (no migration).
- `base-fr` and `base-en` manifests: `domains.items` with the same kinds tree (roots `equipment`, `consumable`, `item`; intermediate levels per slot: `head`, `weapon`, `shield`…) and tints (today's `PRESETS` plus `rust`, `silver`, `shadow`), every sprite with `domain: items` and its kinds, and `domains.npcs|skills|classes` pointing at the current lists.
- The registry (`public/packs/index.json`) allows a pack without language.
