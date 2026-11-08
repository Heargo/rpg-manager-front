# Default classes and skills

Status: resolved
Type: task
Blocked by: 06

Spec: `../spec.md` (Default classes and skills).

Starter set built from the world's attributes (three classes, 4 to 6 skills each, no cost without a mana bar), EN and FR names. Wizard checkbox and an "Add defaults" button on the classes page, deduped by name like default items.

## Baseline

Test Files 122 passed (122), Tests 1027 passed (1027).

## Seams

User request (2026-11-08): "first setup few skills and classes examples", so this ticket also gives the Tools sandbox world the starter classes and skills from the start, so the skill, class, NPC and sheet tools have examples to try.

1. **Starter set builder (pure, beside `world/helpers/starter-items.ts`)**: given the world's attributes, bar attributes and language, it returns skills and three classes (Warrior / Mage / Rogue, Guerrier / Mage / Voleur), each tree with 4 to 6 skills. Every skill and class passes `validateSkill` / `validateClass`. Amounts use the life bar and the first attributes by order. Costs use the mana bar, with no cost when the world has none. Misses: persistence.
2. **Businesses**: the wizard option (`WorldLibraryBusiness.create(draft, { starterClasses: true })`) creates the world with them. "Add defaults" on the GM class catalogue and the sandbox one adds them, deduped by name for skills and classes, with class trees pointing at the kept skill ids. The sandbox world starts with them. Misses: the checkbox and button templates (browser check).

## Red

- Test files: `src/app/modules/class/business/class-catalogue.business.spec.ts`, `src/app/modules/world/business/world-library.business.spec.ts`
- Run: `npm test` (running these two files alone with `--include` fails to build in this repo even on the baseline, a `node:crypto` typing error, so use the full suite and read the FAIL lines)
- Seams the tests assume: `ClassCatalogueBusiness.addDefaults()`, `SandboxClassCatalogueBusiness.addDefaults()`, `WorldLibraryBusiness.create(draft, { starterClasses: true })`, sandbox world starting with the starter set. The pure builder has no test file of its own (a missing module would break the whole build); it is covered through the businesses. Suggested home: `world/helpers/starter-classes.ts`. The test that saved a sandbox "Rogue" now saves "Paladin", since Rogue is now a default.
- Failing: 8 tests (suite: 8 failed, 1028 passed; baseline 1027)
  - GM: adds the default classes and skills, keeping the existing ones — `addDefaults` is not a function
  - GM: adds nothing the second time, and points the new tree at a skill kept by name — `addDefaults` is not a function
  - GM: gives starter skills no cost in a world without a mana bar, and valid trees — `addDefaults` is not a function
  - Sandbox: starts with the starter classes and skills — sandbox classes are empty
  - Sandbox: has valid starter classes, charged on Mana, in en — sandbox classes are empty
  - Sandbox: has valid starter classes, charged on Mana, in fr — sandbox classes are empty
  - Sandbox: adds the defaults back after a delete, without duplicating the ones present — no starter class to find
  - WorldLibraryBusiness: creates a world with the starter classes and skills — `starterClasses` option ignored, no classes or skills

## Green

- Files: `src/app/modules/world/helpers/starter-classes.ts` (new), `src/app/modules/class/business/class-catalogue.business.ts`, `src/app/modules/tools/business/sandbox-class-catalogue.business.ts`, `src/app/modules/world/business/sandbox-world.business.ts`, `src/app/modules/world/business/world-library.business.ts`, `src/app/modules/class/components/class-catalogue/class-catalogue.component.ts`, `src/app/modules/class/pages/class-catalogue-page/class-catalogue-page.component.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html}`, `src/app/modules/tools/tools.routes.ts`, `src/app/modules/tools/pages/world-rules-tool-page/world-rules-tool-page.component.ts` (new), `public/i18n/{en,fr}.json`
- Change: pure builder `buildStarterClasses` (Warrior 6 / Mage 6 / Rogue 5 skills in EN/FR, roots, prerequisites with ranks, rising min levels, passives, damage/heal/modify amounts on rank, level and the class's main attribute, costs on mana only when the world has a mana bar) plus `mergeStarterClasses` (dedupe by name, trees remapped to kept skill ids). `addDefaults()` on the GM and sandbox class businesses, `starterClasses` option on `WorldLibraryBusiness.create` (the GM and library builders are loaded with a dynamic import), wizard checkbox (default on) and "Add defaults" button on the class catalogue, EN/FR strings. The sandbox world starts with the set. `tools.routes.ts` imported `SandboxRulesBusiness` statically, which pulled `SandboxWorldBusiness` (and now the builder) into the initial bundle, so the rules route now goes through a small lazy `WorldRulesToolPageComponent` that provides it; the initial bundle is now 966 kB (was about 1.02 MB).
- Suite: 122 files, 1036 tests passed (baseline 1027, +9 new red tests); tsc clean; `ng build` OK with no error; no test file in the unstaged diff.
- Open questions: the skill model has no dice field (spec mentions optional dice on amounts), so no starter skill has dice; add them once the model supports it. The browser check of the checkbox and button is still to do.

## Answer

Built: `world/helpers/starter-classes.ts` builds a starter set from the world's attributes, in EN and FR:
- Warrior / Guerrier: 6 skills.
- Mage / Mage: 6 skills, or 5 without a mana bar.
- Rogue / Voleur: 5 skills.

Each tree has roots, prerequisites with required ranks, rising min levels and at least one passive. Amounts use rank, level, the life bar and the class's main attribute. Costs go on the mana bar only when the world has one, and mana-only skills are left out otherwise. `mergeStarterClasses` dedupes skills and classes by name and re-points tree nodes at the kept skill ids. It is wired into:
- the wizard checkbox (Rules step, on by default);
- "Add defaults" on the GM and Tools class catalogues;
- the Tools sandbox world, which starts with the set (user request, 2026-11-08: "first setup few skills and classes examples").

Decisions:
- To keep the builder out of the initial bundle, the Tools world-rules route now goes through a small lazy `WorldRulesToolPageComponent`. The initial bundle dropped to 966 kB.
- The skill model has no dice field yet (spec: optional dice on amounts), so no starter skill has dice.
- One existing sandbox test now saves "Paladin" instead of "Rogue", since Rogue is a default.

Checked:
- Suite 1036/1036 (baseline 1027), spec typecheck clean, `ng build` clean, review verdict ship.
- In the browser: `/tools/classes` starts with Guerrier, Mage and Voleur. The Guerrier tree draws its links, though long names are cut off in the small tree nodes. The wizard's Rules step has the checkbox ticked by default, next to the default items one. No console errors. World creation with the option is covered by the business test; no test world was created in the dev database.
