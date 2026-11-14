# NPC tokens can't be dragged before starting

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Bugs)

- Setup grid (and combat grid): a token with a portrait drags like one with an initial. Prevent the native image drag (`draggable="false"` on the image, `-webkit-user-drag: none`, or `pointer-events: none` on the portrait) and handle `dragstart` if needed.
- Test: a token with a `portraitId` moves with pointer events in both grids.

## Baseline

Test Files 243 passed, Tests 2139 passed (the run also prints 4 unhandled rejections from two pack specs, present on clean HEAD). Working tree: `public/i18n/*.json` (credits keys), `src/app/modules/home/`, `user-docs/` belong to another session.

## Seams

1. **Component** `app-combat-setup-grid` (`TEST_PROVIDERS`): a token whose slot has a `portraitId` renders an image that cannot start a native drag (`draggable="false"` on the `img`, and `dragstart` on the token is prevented), and a pointer drag of that token (pointerdown, moves, pointerup on a free cell) places it there. Misses: real browser image-drag behaviour (browser check with a portrait NPC).
2. **Component** `app-combat-grid` (`TEST_PROVIDERS`, `combat-table` fixtures): same for a combatant token with a portrait, as the GM. Misses: same.

## Red

- Test files: `src/app/modules/combat/components/combat-setup-grid/combat-setup-grid.component.spec.ts` (new describe "a token with a portrait"), `src/app/modules/combat/components/combat-grid/combat-grid-portrait.component.spec.ts` (new)
- Run: `npx ng test --watch=false --include src/app/modules/combat/components/combat-setup-grid/combat-setup-grid.component.spec.ts` and `npx ng test --watch=false --include src/app/modules/combat/components/combat-grid/combat-grid-portrait.component.spec.ts`
- Failing: 2 tests
  - setup grid: renders an image that cannot start a native drag, and cancels dragstart on the token — the `img` has no `draggable="false"` (and no dragstart cancel)
  - combat grid (GM): renders an image that cannot start a native drag, and cancels dragstart on the token — same
- Not red: the 2 "moves with pointer events" tests (one per grid) already pass, because jsdom has no native image drag. They guard against regressions only.

## Green

- Files: src/app/core/components/stored-image/stored-image.component.ts
- Change: fixed in the shared `app-stored-image`: both `img` get `draggable="false"` and `(dragstart)` prevented, and CSS `-webkit-user-drag: none`. Both grids use this component, so both are fixed. Prettier also reformatted the whole file.
- Suite: 244 files / 2143 tests pass (baseline 243 / 2139, +4 new); tsc clean; ng build OK. `git diff --name-only` lists only `src/app/modules/home/pages/static-pages.spec.ts`, which belongs to the other session.
- Open questions: none

## Review

- Verdict: ship. Fixed once in the shared `app-stored-image` (both grids use it). About 15 other users checked: none relied on dragging the image; no HTML5 drag-and-drop elsewhere; CDK drag areas don't contain it. Same pattern as the existing `[draggable]="false"` images (QR scan, pick-a-save, formula presets).
- Consider (not applied): merge the two `<img>` branches; import order and a missing blank line in the setup-grid spec.

## Answer

- `app-stored-image`: images get `draggable="false"`, a prevented `dragstart` and `-webkit-user-drag: none`, so a token with a portrait drags with pointer events like one with an initial (setup grid and combat grid).
- Tests: 4 new (2 red: image can't start a native drag; 2 guards: pointer drag of a portrait token in each grid). Suite 244 files, 2143 tests pass (baseline 2139). Build clean.
- Browser: not reproduced. The dev data has no stored image (the sandbox and the test world use initials, the item pages show none), so the native image drag the user hit couldn't be replayed here; jsdom has no native drag either. To confirm on a world with a portrait NPC.
