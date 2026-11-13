# Sheet preview: Mage by default, grant skill points

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Sheet preview)

- Tools character sheet: the default sandbox character has the Mage class (default classes).
- Its Skills tab has a "grant skill points" box, same look as the "give experience" box; granting adds the points to the character's available skill points.

## Context found

- The Tools sheet is `tools/pages/sheet-tool-page`, its character comes from `tools/business/sandbox-character.business.ts` (`createCharacter` on the sandbox world, which has the default classes Guerrier/Mage/Voleur).
- The action `{ kind: 'grant-skill-points', amount }` already exists (GM only, 1..100, `character-actions.rules.ts`), but no UI emits it. The "give experience" box is the GM-only `.grant-panel` on the Stats tab of `character-sheet.component.html`.

## Seams

1. **`SandboxCharacterBusiness`**: the sample character has the sandbox world's Mage class (by its default class id or name, from the world's classes), so its skill tree shows; `reset()` gives a Mage again.
2. **Character sheet component (`TEST_PROVIDERS`)**: for the GM, the Skills tab has a grant box (same `.grant-panel` look as the XP one) with an amount input and a button; submitting emits `{ kind: 'grant-skill-points', amount }`; amounts below 1 emit nothing; a player (not GM) sees no grant box.

## Red

- Test files: `src/app/modules/tools/business/sandbox-character.business.spec.ts` (one test added), `src/app/modules/character/components/character-sheet/character-sheet-grant-skill-points.spec.ts` (new)
- Run: `npx ng test --watch=false --include src/app/modules/tools/business/sandbox-character.business.spec.ts --include src/app/modules/character/components/character-sheet/character-sheet-grant-skill-points.spec.ts 2>&1 | tail -30` (the business spec alone fails to build on a `node:crypto` typing error, unrelated; run it with another file)
- Failing: 3 tests
  - gives the sample character the sandbox Mage class, again after a reset — `classId` is undefined
  - gives the game master a grant box on the Skills tab that emits grant-skill-points — no `.grant-panel #grant-skill-points` on the Skills tab
  - emits nothing for an amount below 1 — no `#grant-skill-points` input to fill
- Passing already: hides the grant box from players (regression guard).
- Selectors the green must use: input id `grant-skill-points` (inside `.grant-panel`, in the Skills tab panel), button `data-testid="grant-skill-points-button"`.

## Green

- Files: src/app/modules/tools/business/sandbox-character.business.ts, src/app/modules/tools/pages/sheet-tool-page/sheet-tool-page.component.ts, src/app/modules/character/components/character-sheet/character-sheet.component.{ts,html}, public/i18n/en.json, public/i18n/fr.json
- Change: the sample character gets the sandbox Mage class and 0 skill points; the tool page passes a classView so the tree shows; the GM-only `.grant-panel` on the Skills tab (same title and Optimus controls as the XP box) emits `grant-skill-points` (integer >= 1). New i18n keys `character.sheet.grantSkillPointsLabel` and `grantSkillPoints` in EN and FR.
- Suite: 177 files / 1434 tests all pass; tsc clean; ng build OK; no test file in the unstaged diff.
- Open questions: the amount is read from the input's DOM value on submit, because p-inputnumber only updates its model on blur and the test types without blurring.

## Answer

The sandbox character gets the sandbox world's Mage class (found by name: default class ids are random per world, and "Mage" is the same in EN and FR); the tool page passes its class view so the tree shows. The sheet's Skills tab has a GM-only grant box (same look as the XP box) emitting `grant-skill-points`. Review found a forced `skillPoints: 0` and a DOM read on submit; both fixed (starting points kept, signal like the XP box; the two red specs adjusted: `before + 3`, `blur` after `input`). Browser: Mage tree shown, Donner raises the points 1 → 2, no console error. Suite: 177 files, 1434 tests, build OK.
