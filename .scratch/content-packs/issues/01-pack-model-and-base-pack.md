# Pack model, validation and the Base pack

Status: needs-triage
Type: task
Blocked by: none

Spec: `../spec.md` (What a pack is, Official packs)

- Pack manifest model and a pure `validatePack(json)` with readable errors (format version, id, labels, license, generators per language, sprites with `kind` `grayscale` / `masked` / `colored`, limits).
- Today's word lists and the 101 bundled sprites are described by a Base manifest (`public/packs/base/pack.json` or generated from `SPRITE_LIBRARY`); `WordListService` and the sprite library read through a pack layer instead of fixed paths. Behaviour is unchanged for the user.
- No backward compatibility needed for stored dev data.
