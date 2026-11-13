# User docs: one language per pack, packs per world

Status: resolved
Type: task
Blocked by: 01, 04

Spec: `../spec.md`.

Update `user-docs` pages `packs.md` and `create-pack.md` (FR and EN): a pack has one language, to translate you make one pack per language, Base FR / Base EN, choosing the packs in the world rules, the manifest's new fields.

## Answer

- `packs.md` and `create-pack.md` (FR and EN) rewritten: one language per pack, the two Bases, Download instead of turning on, Duplicate, a new "Les packs d'un monde / A world's packs" section, the creator's language and 12 sprites per page, a "Traduire un pack / Translate a pack" section, and the manifest reference (`language`, string `name` / `description`, flat `generators`, `label`). `worlds.md` (FR and EN) links the Packs section from the wizard and the rules page.
- Checked: `npm run docs:build` builds 31 pages, and the anchors `les-packs-dun-monde` and `a-worlds-packs` exist.
- Left: the screenshots (`packs-page`, `packs-details`, `packs-creator-*`, `worlds-wizard-rules`, `worlds-rules`) still show the old UI. Done by orchestrator directly (docs only, no TDD steps).
