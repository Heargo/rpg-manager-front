# Packs as a top-level menu, Tools cleanup

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Navigation)

- The nav bar shows **Packs** as its own entry (out of a room and in a room), next to Catalogues / Tools; it is gone from the Tools submenu.
- The Tools submenu no longer has **Item generator**, **Character sheet** and **Combat** (out of a room). In a room, Tools keeps the sprite colorizer and external tools only.
- Assumed: the three tool pages and routes are deleted with their tests and i18n keys; nothing links to them any more (landing, docs in `user-docs/`, doc screenshot scripts). Stop and ask if a page still needs one.
- Mobile nav menu checked at 375 px, FR and EN.

## Baseline

`npm test`: 306 test files, 2931 tests, all passed (2026-11-17).

## Seams

- `NavBarComponent` (rendered with `TEST_PROVIDERS`, out of a room and in a room): catches Packs as its own top-level entry and the Tools submenu contents per state (no Packs, Item generator, Character sheet, Combat). Misses the mobile layout (browser check).
- `MenuService.getMenuItems()`: catches the static list dropping the item generator, character sheet and combat entries. Misses route and page deletion, which the build and review cover (no test asserts a route is absent).

## Red

- Test files: `src/app/core/components/nav-bar/nav-bar.component.spec.ts`, `src/app/core/services/menu.service.spec.ts`.
- Run: `npx ng test --watch=false --include src/app/core/components/nav-bar/nav-bar.component.spec.ts --include src/app/core/services/menu.service.spec.ts`
- Failing: 10 tests (9 nav bar, 1 menu service), all on assertion: no top-level Packs entry; Tools submenu still has Content packs, Item generator (and out of a room Character sheet, Combat); World rules not yet root item 4 in a room; French labels expect `Mondes, Dés, Catalogues, Packs, Outils`; MenuService static list still has the three tool routes.
- Notes for green: Packs sits between Catalogues and Tools (out of a room: Worlds, Dice, Catalogues, Packs, Tools; in a room: Table, Catalogues, Packs, Tools, World rules). `nav.packs` becomes `Packs` in both `public/i18n/en.json` and `fr.json` (was "Packs de contenu" in FR). Link stays `/tools/packs`.
- Green also deletes the three tool pages and routes (`tools/item-generator`, `tools/character-sheet`, `tools/combat`) with their specs and now-unused i18n keys, and the doc references (`user-docs/` pages and `user-docs/screenshots/*.shot.ts`). Keep what other code still imports (e.g. `ItemGeneratorBusiness` used by the item editor, `core/generators/item-generator`, the character sheet component).

## Green

- Files: `src/app/core/components/nav-bar/nav-bar.component.ts`, `src/app/core/services/menu.service.ts`, `src/app/modules/tools/tools.routes.ts`, `public/i18n/en.json`, `public/i18n/fr.json`; deleted `modules/tools/pages/{item-generator-page,sheet-tool-page,combat-sandbox-tool-page}` (with specs), `modules/tools/business/sandbox-character.business(.spec).ts`, `sandbox-combat.business.ts`, `user-docs/src/assets/screens/*/tools-item-generator.png`; docs `user-docs/src/content/docs/{,en/}{tools,packs,create-pack,getting-started}.md`, `user-docs/screenshots/{tools,packs}.shot.ts`.
- Change: Packs is its own top-level nav entry (between Catalogues and Tools, out of and in a room); Tools submenu is Sprite colorizer + External tools. Removed the three tool routes/pages, the sandbox businesses only they used, and the unused i18n keys (`nav.itemGenerator/characterSheet/combat`, `tools.combat`, `tools.sheet`, unused `tools.itemGenerator.*`); `nav.packs` = "Packs" in both languages. Docs and screenshot scripts no longer reference the item generator.
- Suite: 303 files, 2925 tests, all passed (baseline 306/2931; difference is the deleted specs). tsc clean, ng build no error, no test file in unstaged diff.
- Open questions: none (mobile 375 px check left to the browser step).

## Review

- Verdict: ship
- Must fix: none
- Consider: user-docs/src/assets/screens/{en,fr}/packs-choice.png — orphan screenshot, no doc references it and its shot step was removed from packs.shot.ts — delete it. src/app/core/components/nav-bar/nav-bar.component.ts (TOOLS comment "Sandbox pages are gone") — describes history, not the code; say what the menu is instead. i18n keys `tools.itemGenerator.{seed,reroll,failed}` are still used by editors, but the namespace name is now a misnomer (rename later). Mobile 375 px FR/EN check still pending in the browser step.

## Answer

- Packs is a top-level nav entry between Catalogues and Tools, out of a room and in a room; `nav.packs` reads "Packs" in EN and FR. The Tools submenu keeps the sprite colorizer and external tools only.
- Deleted the item generator, character sheet and combat tool pages and routes, the sandbox businesses only they used, their specs and unused i18n keys; doc pages and screenshot scripts no longer mention them (orphan `packs-choice.png` removed too). `ItemGeneratorBusiness`, the core generators and the character sheet component stay (still used by the editors and the table). The `tools.itemGenerator.*` keys still used by the editors are kept.
- Checked: suite 303 files / 2925 tests green (baseline 306 / 2931, the difference is the deleted specs); `ng build` clean; review verdict ship. Browser: nav out of a room in FR and EN, mobile menu at 375 px shows Packs as its own entry, no console error. The in-room nav is covered by the nav bar spec (GM and player), not the browser.
