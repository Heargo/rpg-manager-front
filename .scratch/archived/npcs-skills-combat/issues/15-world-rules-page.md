# World rules page

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (World rules page).

`/room/rules` (GM, lobby button) and a sandbox Tools entry: every rule of the wizard's Rules step (Progression, Economy, Offline sections) and the attributes (add, rename, base, formula, cap; delete with confirmation removes it from sheets and item modifiers). One shared rule-fields component for the wizard and the page. Changes republish `world/info`; a new level curve recomputes levels from XP; a lower max level caps sheets. Later tickets (07, 11, 12) add their sections here.

## Baseline

`npm test`: 95 files, 785 tests passed (2026-11-08).

## Seams

1. A pure `world/helpers/world-rules.rules.ts` helper (applying edited rules and attributes to a world): a new level curve recomputes each sheet's level from its XP without granting or taking points; a lower max level caps sheets (XP kept); starting values leave existing sheets alone; deleting an attribute removes it from every sheet and from item modifiers that name it; validation is the wizard's (`world-draft.rules`). Misses network and UI.
2. The room host business over the fake peer network (`src/testing/game-device.ts`): the GM saves new rules, the host stores the world and republishes `world/info`, and players receive the new info and their updated sheets. Misses UI.
3. The rules page component's inputs/outputs (`TEST_PROVIDERS`), built on one shared rule-fields component that the wizard's Rules step also uses: Progression, Economy and Offline sections plus attributes (add, rename, base, formula, cap), the wizard's validation errors, and deleting an attribute only after confirmation. Misses the `/room/rules` route, the GM-only lobby button and the Tools sandbox entry (browser check).

## Red

- Test files:
  - `src/app/modules/world/helpers/world-rules.rules.spec.ts` (new)
  - `src/app/modules/world/business/world-rules.spec.ts` (new)
  - `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts` (new)
  - `src/app/modules/world/pages/world-rules-page/world-rules-page.component.spec.ts` (new)
  - `src/app/modules/world/pages/world-new-page/world-new-page.component.spec.ts` (one describe appended)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (once per file)
- Symbols the green step must create (contracts are in each spec's header comment):
  - `WorldRules` in `models/world.ts`: attributes `{id?, name, baseValue, formula, cap?}[]`, startingStatPoints, startingMoney, levelCurve, maxLevel, statPointsPerLevel, offlineFeatures.
  - `applyWorldRules(world, rules, newId)` in `helpers/world-rules.rules.ts`.
  - `WorldSessionBusiness.saveRules(rules)`: validates with the wizard rules (rejects when invalid), stores, republishes `world/info` and the characters.
  - `RuleFieldsComponent` (`app-rule-fields`, `draft` model, `errors` input) in `components/rule-fields/`.
  - `WorldRulesPageComponent` in `pages/world-rules-page/`.
- Failing: 19 tests, 1 file runs and the others fail to compile
  - world-rules.rules.spec.ts, 6 tests (stores edited rules, leaves sheets alone on starting values, recomputes levels on a new curve, caps at lower max level, deletes attribute from sheets and modifiers, renames/adds attributes) — no `applyWorldRules` export and no `WorldRules` type.
  - world-rules.spec.ts, 4 tests (stores and republishes info, players get recomputed sheet, deleted attribute removed for players, invalid rules refused) — no `WorldSessionBusiness.saveRules`.
  - rule-fields.component.spec.ts, 3 tests (three sections with fields, emits new curve, shows given error) — no `RuleFieldsComponent`.
  - world-rules-page.component.spec.ts, 4 tests (shows rule fields and rows, saves edits, validation error blocks save, remove only after confirmation) — no `WorldRulesPageComponent`.
  - world-new-page.component.spec.ts, 1 new test (wizard Rules step uses `app-rule-fields`) — assertion failure, 0 elements found; the file's other 19 tests still pass.

## Green

- Files: `src/app/modules/world/{models/world.ts, helpers/world-rules.rules.ts, business/world-session.business.ts, components/rule-fields/*, pages/world-rules-page/*, pages/world-new-page/*, world.routes.ts}`, `src/app/modules/tools/{tools.routes.ts, business/sandbox-rules.business.ts}`, `src/app/modules/room/pages/room-page/room-page.component.html`, `public/i18n/{en,fr}.json`
- Change: `WorldRules`, `applyWorldRules`/`validateWorldRules` (also renames item modifiers, clears deleted bar attributes), `WorldSessionBusiness.saveRules` (validates, stores, bumps changed sheets, republishes info and characters; reaches `CharacterHostBusiness` lazily through `Injector` to avoid a cycle). Shared `app-rule-fields` now used by the wizard Rules step and the new `WorldRulesPageComponent` (attribute table, confirm before delete). Routes: `/room/rules` (shows a "host a room" message without a world), GM-only lobby button in the hosting header, `/tools/world-rules` (route-provided `SandboxRulesBusiness` replaces the session and updates the shared `SandboxWorldBusiness`, so the sheet and catalogue tools follow; the sandbox character restarts from the new world). Unused wizard curve/offline code and SCSS removed.
- Suite: 99 files, 803 tests pass (baseline 95 files, 785); tsc clean; build has no error.
- Open questions: browser check of the shared sandbox edit still to repeat.

## Answer

- `WorldRules`, `applyWorldRules` and `validateWorldRules` (`world/helpers/world-rules.rules.ts`): a new level curve recomputes levels from XP without granting or taking points; a lower max level caps sheets (XP kept); starting values only affect new characters; a deleted attribute leaves every sheet and item modifier; a renamed one renames the modifiers.
- `WorldSessionBusiness.saveRules`: validates with the wizard's rules, stores, bumps `rev` on changed sheets and republishes `world/info` and the characters.
- One shared `app-rule-fields` (Progression, Economy, Offline) for the wizard's Rules step and the new `WorldRulesPageComponent` (attribute table, delete after confirmation).
- `/room/rules` (shows "host a room" without an open world), a "World rules" button in the host lobby header, and `/tools/world-rules` in the nav bar, editing the shared sandbox world in memory (`SandboxWorldBusiness.applyRules`), so the sandbox character sheet follows. `menu.service.spec.ts` got the new tool path (allowed by the orchestrator, ticket asks for the entry).
- Checked: suite 99 files / 803 tests (baseline 95 / 785), stable over 3 runs after one unexplained failure seen by the reviewer; `ng build` clean; review ship. Browser: sandbox page in FR and EN, delete Agilité with confirmation, save, the sandbox sheet loses it; mobile width with no horizontal scroll; `/room/rules` without a room; no console error. The GM flow inside a real room and the player side are covered by the multi-device test (`world-rules.spec.ts`), not the browser (one profile per browser).
- Left for later (review): the attribute table is duplicated between the wizard and the rules page; `saveRules` spots changed sheets by `JSON.stringify`; no spec for `SandboxRulesBusiness`.
