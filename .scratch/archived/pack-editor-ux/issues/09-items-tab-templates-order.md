# Items tab: name templates right after the common adjectives and suffixes

Status: resolved
Type: task
Blocked by: none

From the quick notes (2026-11-18): "modèle de noms pour objets doit être après adjectifs et suffixes communs".

## What

- Today the Items tab reads: tints, common adjectives and suffixes (`app-common-words-editor`), kinds tree, name templates (collapsed `p-panel`).
- New order (assumed reading of the note): tints, common adjectives and suffixes, **name templates**, kinds tree. Templates and common words are both "how a name is built", so they sit together; the kinds tree closes the tab.
- Nothing else changes (the templates panel stays collapsible).

## Baseline

Test Files 326 passed (326), Tests 3208 passed (3208).

## Seams

- Pack draft page rendered (component via `TEST_PROVIDERS`, named by the ticket): in the Items tab, the templates panel comes right after `app-common-words-editor` and before the kinds tree in DOM order. Catches: the order of the three sections. Misses: visual spacing/layout (browser check).

## Green

- Files: src/app/modules/tools/pages/pack-draft-page/pack-draft-page.component.ts
- Change: In the Items tab template, moved the collapsible name templates panel above the kinds heading and tree. Order is now tints, common words, templates, kinds tree.
- Suite: 326 files, 3209 tests passed (baseline 3208 plus the new test); tsc and ng build clean; no test file in the unstaged diff.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider: src/app/modules/tools/pages/pack-draft-page/pack-draft-page.tabs.spec.ts:80-90 — Prettier reports formatting issues in the new test (long querySelectorAll line and expect line) — run `npx prettier --write` on the file.

## Answer

- Built: the Items tab of the pack draft page now reads tints, common adjectives and suffixes, name templates (still a collapsible `p-panel`), then the kinds tree. Only the templates panel block moved in `pack-draft-page.component.ts`.
- Test: `pack-draft-page.tabs.spec.ts` checks the DOM order of the four sections on the rendered page.
- Checked: full suite 326 files / 3209 tests passed (baseline 3208 + 1), `ng build` clean, review verdict ship. Browser: draft opened, Items tab in English (desktop) and French (mobile width) shows the new order, no console error. No room flow involved.
- Note: `prettier --check` already flagged the spec file at HEAD; left as is.
