# Word lists split into Common, Items, NPCs, Skills, Classes tabs

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Word lists tab split in five tabs)

- The pack draft page's "Word lists" tab is replaced by five tabs: Common, Items, NPCs, Skills, Classes (Optimus UI tabs, same row as Details, Sprites, Publish; scrollable on a phone).
- Common: the params editor and the `common.json` advanced panel. Items: kinds, tints, common item words, templates, the items advanced JSON. NPCs / Skills / Classes: their kinds and texts editors and their own advanced JSON.
- Neutral draft (no language): Common is hidden and the texts parts too, as today.
- The editors themselves don't change here (the tree table is ticket 04). Selected tab kept in the URL or the draft view state like today's tab.
- FR/EN, 375 px.

## Baseline

`npm test`: 305 test files, 2954 tests, all passed (2026-11-17, after PE02).

## Seams

- The pack draft page component (rendered with `TEST_PROVIDERS` over a language draft and a neutral draft, through its route/inputs): catches the tab row (Details, Common, Items, NPCs, Skills, Classes, Sprites, Publish; no "Word lists"), which editors and advanced JSON panel each tab holds, Common and texts hidden for a neutral draft, and the selected tab kept the same way as today's tab (URL or draft view state). Misses phone scrolling of the tab row (browser check).

## Red

- Test files: `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tabs.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tabs.spec.ts`
- Failing: 8 tests, each one line:
  - has the tabs Details, Common, Items, NPCs, Skills, Classes, Sprites, Publish and no Word lists — the row still has "Word lists" and no five tabs
  - Common holds the params editor and the common.json panel, and nothing of the other domains — no Common tab
  - Items holds kinds, tints, common item words, templates and the items JSON only — no Items tab
  - NPCs / Skills / Classes hold their kinds and texts editors and their own JSON only (3 tests) — no such tabs
  - a neutral draft hides the Common tab and the texts editors — no NPCs tab
  - shows the clicked tab as the selected one — no Skills tab
- Selected tab stays a component signal today (not URL), so no separate persistence test.
- For green: existing specs that click the old "Word lists" tab and need updating: `pack-draft-page.component.spec.ts` (tab list assertion at line ~64-69, and `tab('Word lists')` uses for the items JSON), `pack-draft-page.domains.spec.ts` (render helper), `pack-draft-page.sprites.spec.ts` (check for use).

## Green

- Files: `src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts`, `public/i18n/en.json`, `public/i18n/fr.json`, `user-docs/src/content/docs/create-pack.md`, `user-docs/src/content/docs/en/create-pack.md`; specs touched (tab navigation only): `pack-draft-page.component.spec.ts`, `pack-draft-page.domains.spec.ts`, `pack-draft-page.sprites.spec.ts`
- Change: "Word lists" tab replaced by Common (hidden for a neutral draft), Items, NPCs, Skills, Classes tabs; each holds its editors and its own Advanced JSON panel (shared `advanced` template). New key `packs.creator.tabs.common` (replaces `tabs.lists`), generic `listsIntro`; docs updated.
- Suite: 306 files, 2962 tests, all passed (baseline 305/2954 plus the 8 new tests); tsc clean, ng build OK. The unhandled IndexedDB/lifecycle errors come from `pack-draft-page.lifecycle.spec.ts` and exist without my change.
- Open questions: none (unused i18n keys `packs.creator.lists.items` and `lists.shared` left in place)

## Answer

- The pack draft page's "Word lists" tab is replaced by Common, Items, NPCs, Skills and Classes (row: Details, Common, Items, NPCs, Skills, Classes, Sprites, Publish). Common holds the params editor and `common.json`; Items holds kinds, tints, common item words, templates and the items JSON; NPCs / Skills / Classes hold their kinds and texts editors and their own JSON. A neutral draft hides Common and the texts editors. The selected tab stays a component signal, as before.
- New key `packs.creator.tabs.common` (FR "Commun"); the other labels reuse `packs.generator.*`. Unused `packs.creator.lists.items` / `lists.shared` removed. Docs (create-pack, FR and EN) updated.
- Three existing specs changed their tab navigation only (reviewed: intent kept).
- Checked: suite 306 files / 2962 tests green (baseline 305 / 2954 plus 8 new); build clean; review ship. Browser: a new draft shows the eight tabs with the right content in FR, labels in EN; at 375 px the tab row scrolls inside itself with no page overflow; no console error.
- Left (review Consider): if the language is cleared while Common is selected, the selected tab doesn't fall back to Details.
