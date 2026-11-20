# Preview of a parent kind draws from its children

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "aperçu sur un kind avec des enfants doit tirer aléatoirement des enfants s'il n'y a pas de quoi faire pour le kind".

## What

- Today the preview of a kind with no nouns of its own shows "Rien à tirer : cette catégorie a besoin d'un nom" (`packs.creator.kinds.previewEmpty`), even when its children have nouns.
- New: when the kind itself cannot produce an entry, each drawn entry picks a **random descendant** that can (any depth, uniform over the usable descendants, assumed) and draws from it. Each entry may come from a different descendant.
- The entry shows which kind it came from (small muted label, e.g. "from sword").
- The empty message only shows when neither the kind nor any descendant can produce an entry; reword it to say so.
- All four domains (`business.preview` for items, `business.previewDomain` for the others).

## Baseline

Test Files 326 passed (326), Tests 3209 passed (3209).

## Seams

- `business.preview` / `business.previewDomain` with a seeded random source: a parent with no nouns and two children with nouns returns entries from the children, with the source kind id; a parent whose subtree has no nouns returns an empty list; a kind with its own nouns still draws from itself. Catches the descendant fallback in all four domains; misses the rendering.
- `app-kinds-tree-table` inputs/outputs (`TEST_PROVIDERS`): a drawn entry from a descendant shows its source kind label; the reworded empty message shows when nothing can be drawn. Catches the label and message; misses the random draw itself.

## Red

- Test files: `src/app/core/business/pack-draft-form.business.spec.ts`, `src/app/core/business/pack-draft-form.domains.business.spec.ts`, `src/app/modules/tools/components/pack-draft/kinds-tree-table/kinds-tree-table.component.spec.ts`
- Run: `npx ng test --watch=false --include <file>` (each of the three files)
- Contract assumed by the tests: each drawn entry of `previewDomain` carries `kind` (source kind id; items already have `item.kind`); the rendering gives each entry drawn from a descendant a `[data-test="preview-source"]` element containing the source kind label (none for entries from the kind itself); the empty message no longer says "this kind needs a noun" and mentions "child" (EN).
- Failing: 19 tests (2 items business, 9 domain business across npcs/skills/classes, 8 component across 4 domains), each one line:
  - items preview: draws each item from a descendant with its kind id — returns [] (no fallback)
  - items preview: reaches descendants of any depth — returns []
  - previewDomain (x3 domains): draws each entry from a descendant, with its kind id — returns [] / no `kind`
  - previewDomain (x3): reaches descendants of any depth — returns []
  - previewDomain (x3): still draws from the kind itself — entries have no `kind` field
  - component (x4): labels each entry drawn from a descendant with its source kind — no entries / no `preview-source`
  - component (x4): says nothing can be drawn when neither kind nor descendants have nouns — old message still shown
- Note: guards that already pass today and must keep passing: "draws nothing when no descendant has nouns" (items and all three domains) and the component's "does not label an entry drawn from the kind itself".

## Green

- Files: src/app/core/business/pack-draft-form.business.ts, src/app/modules/tools/components/pack-draft/kinds-tree-table/{kind-fields.ts,kind-preview.component.ts,kinds-tree-table.component.ts}, public/i18n/{en,fr}.json
- Change: `preview` / `previewDomain` fall back, per entry, to a random drawable descendant (via `chain`) when the kind has no nouns; domain entries now carry `kind`. The table maps a foreign `kind` to `source` (label) and `app-kind-preview` shows it as `preview-source`; `previewEmpty` reworded, `previewFrom` added (en/fr).
- Suite: 326 files / 3237 tests pass (baseline 3209 plus the 28 new tests); tsc and ng build clean; no test file in the unstaged diff.
- Open questions: for NPCs a person kind now needs a noun (plus given names) to preview from itself, as the component spec requires; before, given names alone were enough.

## Answer

- `preview` (items) and `previewDomain` (npcs, skills, classes) fall back per entry to a uniformly random drawable descendant, at any depth, when the kind cannot draw itself. A shared `descendants()` helper finds them. Domain entries now carry `kind`. `app-kind-preview` shows a muted `preview-source` label ("from Sword" / "depuis Sword") on entries drawn from a descendant. `previewEmpty` is reworded in en and fr, and `previewFrom` is added.
- Decision (review): an NPC person kind still previews from itself with given names alone (`person ? given>0 : nouns>0`), as before. The component spec's npcs fixtures use `person: false` so they test the fallback. The user approved that spec edit.
- Checked: full suite 326 files / 3237 tests (baseline 3209). `ng build` clean. Review: ship after one fix round. Browser on the Items tab: I made a weapon kind with no nouns and a child sword with a noun. Weapon's preview drew Sword, Bow and Axe (Common shared kinds), each labeled. Checked in EN, FR and at mobile width, with no console errors.
