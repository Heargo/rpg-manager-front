# Equipment slot silhouettes

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Character sheet).

Ten slot silhouettes as own SVGs in the logo's line style, shown in empty slots instead of "-".

## Baseline

`npm test`: 86 test files, 546 tests, all passed (2026-11-07, `develop` at 6b778e7).

## Seams

Confirmed with the user (2026-11-07):

1. **Equipment component** (`TEST_PROVIDERS`): each of the 10 empty slots shows its own silhouette, identified by slot and with an accessible label, instead of "-"; a filled slot shows the item. The SVGs are drawn in the logo's style and checked in the browser.

## Red

- Test files: `src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts` (new `describe('equipment slot silhouettes')`)
- Run: `npx ng test --watch=false --include src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts 2>&1 | tail -30`
- Contract: an empty slot renders `[data-slot-silhouette="<slot>"]` with `role="img"`, `aria-label` = the slot label (e.g. "Hands", "Weapon 1") and an inline `<svg>`; slot ids are `earring, necklace, ring, chest, hand, legs, foot, weapon1, weapon2` (and `head` when empty).
- Failing: 11 tests (the 5 existing ones still pass)
  - shows the {earring, necklace, ring, chest, hand, legs, foot, weapon1, weapon2} silhouette, labelled, in the empty slot (9 tests) — no `[data-slot-silhouette]` element exists yet
  - no longer shows the "-" icon in empty slots — `.tile.empty .pi-minus` still rendered
  - shows the item, not a silhouette, in a filled slot — 0 silhouettes found, expected 9 (head filled by "Iron helm")

## Green

- Files: `src/app/modules/character/components/slot-silhouette/slot-silhouette.component.ts` (new), `src/app/modules/character/components/character-sheet/character-sheet.component.{ts,html}`
- Change: new `app-slot-silhouette` component holds a TS map `SLOT_SHAPES` (10 slots, faceted polygons with small gaps, shared `0 0 64 64` viewBox, `currentColor` muted fill); host carries `role="img"`, `data-slot-silhouette` and the translated `aria-label`. Weapon1 is a sword, weapon2 a shield. The empty tile now renders it instead of the "-" icon. No i18n change (existing `item.slot.*` labels).
- Suite: 86 files / 561 tests pass (baseline 86 / 546, +15 new); tsc clean; ng build OK; no test file in unstaged diff.
- Open questions: browser check of the drawn shapes not done yet (visual review pending).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - slot-silhouette.component.ts:12 — `Exclude<EquipmentSlot, 'none'>`: EquipmentSlot already excludes 'none' (item.ts:20), so the Exclude is redundant; use `Record<EquipmentSlot, ...>`.
  - character-sheet.component.spec.ts — the empty `head` silhouette has no test (the contract lists it); a fully empty sheet case would cover it. Tests also check only that an `svg` exists, so a swapped shape between two slots would stay green (acceptable: shapes are visual, checked in the browser).
  - slot-silhouette.component.ts:77 — `SLOT_VIEWBOX` is exported but only used inside; keep it private to the file.
  - Import order in character-sheet.component.ts:29 — the new import sits between item imports and world models; trivial.

## Answer

- `app-slot-silhouette` (`character/components/slot-silhouette/`): 10 faceted silhouettes in a TS map on a shared `0 0 64 64` viewBox, filled with a muted `currentColor`. Weapon 1 is a sword and weapon 2 is a shield. The host has `role="img"` and the translated slot label, reusing `item.slot.*`. Empty equipment tiles render it instead of "-".
- Checked: suite 86 files, 561 tests. Browser: the sample sheet's Equipment tab shows all 10 silhouettes, recognizable and muted.
- Left as Consider: a test for the empty `head` slot, and small type and export tidy-ups.
