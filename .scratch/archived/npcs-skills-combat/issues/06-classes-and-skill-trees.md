# Classes and skill tree editor

Status: resolved
Type: task
Blocked by: 05

Spec: `../spec.md` (Classes and skill trees).

`World.classes`, `class.rules.ts` (tree validation: no cycle, prerequisites in the same tree, a skill once per tree, at least one root; node state locked / available / learned for a sheet). `/room/classes` page, class editor with the grid tree editor, reusable tree view component. Tools entry.

## Baseline

Test Files 115 passed (115), Tests 946 passed (946).

## Seams

1. **`class.rules.ts` (pure rules)**: class and tree validation (no cycle, prerequisites in the same tree, a skill once per tree, at least one root, known skills, minLevel and required rank in range), node state for a sheet (locked / available / learned, with the reason it's locked), and `skillUsages` from N05 extended to class trees so a skill in a tree can't be deleted. Misses: persistence and drawing.
2. **Class catalogue business (GM, and the sandbox one for Tools, like the skill catalogue)**: list + search, save, duplicate, delete, persisted in `World.classes`; deleting a skill used by a class tree is refused with that class among the usages. Misses: the page template.
3. **Class editor component inputs/outputs (`TEST_PROVIDERS`)**: given a class, the world's skills and attributes, the GM adds catalogue skills as tree nodes, sets a node's cell, prerequisites with required rank and min level, sees validation errors (save blocked), and the editor emits the edited class (form and JSON). Misses: drag gestures, line drawing and the reusable tree view's rendering (browser check; its node states come from seam 1).

## Red

- Test files: `src/app/modules/class/helpers/class.rules.spec.ts`, `src/app/modules/class/business/class-catalogue.business.spec.ts`, `src/app/modules/class/components/class-editor/class-editor.component.spec.ts`
- Run: `npm test` (whole-suite build; `ng test --include` hits the pre-existing node:crypto compile error). Red is a compile failure: every new test fails to build on missing symbols, so the whole run fails until they exist.
- Missing symbols to create: `class/models/class.ts` (`CharacterClass { id, name, description, imageId?, bonuses?: ItemModifier[], startingItems?, tree: TreeNode[] }`, `TreeNode { skillId, requires: {skillId, rank}[], minLevel, column, row }`, a `ClassDraft` with optional id, `ClassFilter { search }`), `class/helpers/class.rules.ts` (`validateClass(class, skills, attributeNames)`, `treeNodeStates(tree, {level, skills})`), `World.classes`, `skillUsages` taking `classes` (new `SkillUsage.kind` `'class'`), `class/business/class-catalogue.business.ts` (`ClassCatalogueBusiness`: list/save/duplicate/remove, `$world`), `tools/business/sandbox-class-catalogue.business.ts` (`SandboxClassCatalogueBusiness`), `class/components/class-editor/class-editor.component.ts` (`ClassEditorComponent`, inputs `world`, `characterClass`, output `save`; hooks documented in the spec header).
- Failing: 28 tests, all by compile error on the missing symbols above
  - class.rules.spec (14): validateClass accepts valid; requires name; no root; cycle; outside tree (`tree.1.requires.0` / `outsideTree`); duplicate (`duplicate`); unknown skill (`unknownSkill`); min level / required rank range (`invalid`); bonus on unknown attribute; treeNodeStates locked with reasons; available / learned; root available; skillUsages with classes.
  - class-catalogue.business.spec (7): GM list + search; save add/replace; duplicate "(copy)"; delete class; skill delete refused with class usages; sandbox save/duplicate/delete; sandbox skill delete refused with class usage.
  - class-editor.component.spec (7): fills form and JSON; offers and adds catalogue skill as node; sets cell; prerequisites with rank and min level; cycle blocks save; empty name blocks save; emits edited class and follows JSON.

## Green

- Files: `src/app/modules/class/` (models/class.ts, helpers/class.rules.ts, business/class-catalogue.business.ts, business/class-editor.business.ts, components/class-editor, components/class-catalogue, components/skill-tree, pages/class-catalogue-page, class.routes.ts), `src/app/modules/tools/business/sandbox-class-catalogue.business.ts`, `src/app/modules/tools/pages/class-catalogue-tool-page/`, `src/app/modules/tools/tools.routes.ts`, `src/app/app.routes.ts`, `src/app/core/services/menu.service.ts` (+ spec route list), `src/app/modules/skill/{helpers/skill.rules.ts,models/skill.ts}`, `src/app/modules/world/{models/world.ts,helpers/world.factory.ts,helpers/world-export.ts,business/sandbox-world.business.ts}`, room page html, `src/testing/game-device.ts`, `public/i18n/{en,fr}.json`, `angular.json`.
- Change: `World.classes`, class rules (validation, node states, upsert/copy/JSON), GM and sandbox class catalogues, `skillUsages` extended to class trees (`classes` optional so N05 callers still compile), grid tree editor with form + JSON, reusable `app-skill-tree` (icons, SVG lines, rank/max, locked/available/learned via `states`), `/room/classes` + `/tools/classes` pages, Tools menu entry, room page button, world export/import validation of `classes`, EN/FR strings.
- Suite: 118 files / 973 tests pass (baseline 115 / 946); tsc clean; `ng build` OK.
- Open questions: initial bundle budget error raised from 1.02MB to 1.03MB in angular.json (build was 809 B over); `startingItems` typed as catalogue item ids (`string[]`) with no form UI yet (JSON tab only, like bonuses); tree view and editor not yet browser-checked.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - angular.json:44 — budget bump: the build stats show only `class.rules.ts` (3.3 kB) and `class.routes.ts` (168 B) in the initial bundle. Everything else (business, editor, catalogue, skill-tree, pages) is in a lazy chunk. The leak is `world-export.ts` importing `parseClassJson`/`emptyClass`, which import validation needs, like the existing `skill.rules` import. That is legitimate, not an eager-import mistake. The bump is justified, but 1.03MB gives about 10 kB of headroom for an 809 B overrun. Take the smallest bump that fits, or accept it knowing the next ticket will probably need another.
  - class-editor.component.ts / class.rules.ts — `bonuses` and `startingItems` are editable only in the JSON tab. The ticket and spec seams don't ask for a form UI, so this is acceptable for N06. Record a follow-up ticket for a bonus and starting-item picker.
  - class-editor.component.ts — the "grid tree editor" is column/row number inputs plus the `app-skill-tree` preview, with no drag. The seam excludes drag gestures from the tests, but the browser check should confirm this matches the spec's intent.
  - Tree view and editor have not been browser-checked (open question in Green). Do it before closing the ticket.
  - menu.service.spec.ts — the `/tools/classes` addition is a deliberate, correct update; there is no issue.
  - Safety: no secrets, and `classes` is host-only, not added to WorldInfo.

## Answer

Built: the `CharacterClass` model and `World.classes`. `class.rules.ts` covers validation (name, at least one root, no cycle, prerequisites in the same tree, a skill once per tree, known skills, ranges, bonus attributes), node states for a sheet (locked with the reasons, available, learned), upsert/copy and JSON parsing. `skillUsages` now also lists class trees, so a skill in a tree can't be deleted. There is a GM class catalogue and a sandbox one. The class editor has form and JSON tabs: add catalogue skills as nodes, set each node's column, row, min level, and prerequisites with their required rank. It shows a live preview drawn by the reusable `app-skill-tree` view (skill icons, SVG links, rank / max rank, locked / available / learned). Pages are `/room/classes` (GM, room page button) and `/tools/classes` (Tools menu). World export/import validates `classes`. EN/FR strings.

Decisions:
- Nodes are placed with column/row number fields, not by drag. The preview shows the result.
- `bonuses` and `startingItems` (catalogue item ids) can only be edited in the JSON tab for now.
- The initial bundle error budget is raised from 1.02MB to 1.021MB. `world-export.ts` legitimately imports `class.rules` to validate imports.

Checked: suite 973/973 (baseline 946), `ng build` clean (budget warnings only), review verdict ship. In the browser on `/tools/classes` (FR):
- created two sandbox skills, then a class "Guerrier" with both as nodes;
- the preview drew the link once Charge required Frappe;
- a Frappe ↔ Charge cycle shows "Les prérequis forment un cycle" and "needs a root", which blocks save;
- after removing the cycle the class saved to the list.

EN page and mobile width render fine, with no console errors. `/room/classes` is covered by the business tests only (it needs a hosted room).
