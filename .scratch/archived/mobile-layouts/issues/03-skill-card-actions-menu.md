# Skill catalogue: card actions in a "…" menu

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Catalogues)

- Each skill card shows a "…" icon button (with an aria-label) instead of its row of action buttons; it opens an Optimus UI popup menu anchored to the button with the same actions and rules as today.
- Escape closes it and gives focus back to the button; the menu stays on screen at 375 px.
- FR/EN.

## Baseline

`npm test`: 309 test files, 3066 tests, all passed (2026-11-17, after ML02).

## Seams

- The skill catalogue page / skill card component (rendered with `TEST_PROVIDERS`): catches the per-card "…" button (`data-test="card-menu-<id>"`, aria-label) replacing the row of action buttons, the popup menu holding the same actions under the same conditions as today (e.g. actions hidden or disabled in the same cases), each menu item doing what the old button did, and Escape closing the menu with focus back on the button. Misses the menu staying on screen at 375 px (browser check).

## Red

- Test files: `src/app/modules/skill/components/skill-catalogue/skill-catalogue.menu.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/skill/components/skill-catalogue/skill-catalogue.menu.spec.ts`
- Today's actions: edit, duplicate, delete (delete asks `ConfirmationService` first); all unconditional, no hidden/disabled cases. Menu entries are expected as `[data-automationid]` = `edit`/`duplicate`/`delete` (same convention as the item catalogue's p-menu), labels Edit/Duplicate/Delete.
- Existing spec for green to adapt (not touched): `skill-catalogue.component.spec.ts` ("emits the skill to edit and to duplicate from its row", "asks for confirmation before emitting delete") clicks `[data-action="edit|duplicate|delete"]` directly; it must open the card menu first (or be replaced by the new spec). Its header hook comment also mentions the row actions.
- Failing: 5 tests, each one line:
  - shows a labelled "…" button per card and no row of action buttons — `card-menu-<id>` button missing, `[data-action]` buttons still present
  - opens a menu with Edit, Duplicate and Delete — `card-menu-fb` button missing
  - emits the skill of the card the menu was opened from on Edit and Duplicate — button missing
  - asks for confirmation on Delete before emitting remove — button missing
  - closes on Escape and gives focus back to the "…" button — button missing

## Green

- Files: src/app/modules/skill/components/skill-catalogue/skill-catalogue.component.ts, skill-catalogue.component.spec.ts (adapted: two tests open the card menu first, header comment updated), public/i18n/en.json, public/i18n/fr.json (`skill.catalogue.actions`)
- Change: each card has a "…" button (`card-menu-<id>`, aria-label "Actions for {name}") opening a shared body-appended `p-menu` with Edit / Duplicate / Delete (`automationId`s, delete still confirms). Escape (document listener) closes it and focus returns to the button. The menu uses `motionOptions {duration: 0}` so it leaves the DOM immediately.
- Suite: 310 files, 3071 tests, all passed (baseline 309 / 3066 + 5 new); tsc clean; ng build no error; no test file in the unstaged diff except the adapted existing spec.
- Open questions: the item catalogue's `menu.visible` check is really the `visible` input, not `overlayVisible`; works but worth a look. 375 px on-screen check not done (browser).

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - skill-catalogue.component.ts (host `document:keydown.escape`, `closeMenu`) — Optimus p-menu already closes on Escape and refocuses the target (`onListKeyDown` in openng-optimus-ui-menu.mjs, the list is focused on show). The listener is redundant for real use and only helps the test, which dispatches on `document.activeElement`. It is harmless: Angular removes host listeners on destroy, and it acts only when `menu.visible`. Drop it if the Escape test passes without it; otherwise keep.
  - skill-catalogue.component.ts (`[motionOptions]="{ duration: 0 }"`) — a production change (no open/close animation) made so the menu leaves the DOM at once in the test. The item catalogue does not do this. Prefer a test-side wait (e.g. the existing `settle`) and drop it, or keep it as a deliberate choice.
  - `menu.visible` is a plain public field on Menu (not `overlayVisible`); same use as item-catalogue, fine.
  - openMenu: the `setTimeout(() => menu.show(anchor))` switch between cards is untested and not cleaned up.
- Checked: actions and rules unchanged (edit, duplicate, delete with confirmation); the adapted existing spec keeps its intent (opens the menu first); i18n `skill.catalogue.actions` in both en and fr; no secrets. Tests use the agreed seam with literal expectations.

## Answer

- Each skill card has a "…" button (`card-menu-<id>`, aria-label "Actions for {name}" / "Actions pour {nom}") opening an Optimus UI popup `p-menu` with Edit / Duplicate / Delete (delete still confirms). Escape closes it and focus returns to the button.
- `skill-catalogue.component.spec.ts`: the two tests that clicked the row buttons now open the card menu first (reviewed: intent kept).
- Checked: suite green; build clean; review ship. Browser at 375 px FR (Base skills imported into the sandbox): the menu stays on screen, labels translated, Escape closes and refocuses the button, no console error.
- Left (review Consider): the menu has no open/close animation (`motionOptions` duration 0, set for the Escape test) and a document Escape listener that p-menu makes mostly redundant; the card-to-card menu switch is untested.
