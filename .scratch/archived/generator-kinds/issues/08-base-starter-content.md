# Base ships the starter classes and skills

Status: resolved
Type: task
Blocked by: 07

Spec: `../spec.md` (Decision 10).

- Base FR and Base EN carry today's starter classes and skills (`starter-classes.ts`, EN/FR pairs) as fixed content, with the attributes they use declared.
- The code paths that seed starter classes and skills (world creation, sandbox, catalogues' "add defaults") use the pack import instead, and `starter-classes.ts` goes away. No fallback to the old seeding (dev, no backward compatibility).
- Starter items (`starter-items.ts`, generated) stay as they are. *(assumed)*
- User docs: the packs page mentions fixed content.

## Decisions (user, 2026-11-17)

- **Fixed content, remapped.** Base FR/EN ship the starter skills and classes written on Base's default attributes (Vie, Mana, Force, Agilité, Intelligence, declared in `attributes`). Generate the JSON once from today's `buildStarterClasses` on a default world (one-off script, not kept), then delete `starter-classes.ts`.
- **Import adapts skills** (extends 05's `planPackImport` and validation): attribute references in skill formulas and costs (`[Force]`…) are remapped like modifiers; a skill that needs an attribute mapped to `skip` is left out, along with its tree nodes and any requirement on it (today's "no mana → no mana skills"); action ticks use the world's first action type, or its movement counter for movement skills.
- **New worlds:** the wizard keeps "Add default classes and skills"; ticked, it imports the world's active packs' classes and skills on creation (Base matches the default attributes, so no dialog for them; a renamed or missing attribute is skipped at creation and the GM can re-import later). The catalogues' "Add default classes and skills" button goes, "Import from the packs" replaces it. The sandbox (Tools) imports Base the same way.

## Baseline

Test Files 302 passed, Tests 2915 passed (after `25b1d0a`).

## Seams

1. **`planPackImport` / `validatePackContent` (`src/app/core/packs/pack-content.ts`, pure)**: skill formulas and costs remapped by the attribute mapping, skills needing a skipped attribute left out with their tree nodes and requirements, action ticks set to the world's first action type or movement counter; validation rejects a formula on an undeclared attribute. Misses the Base files.
2. **Base content over `PackContentImportBusiness` (existing fakes, real `public/packs/base-*` files as fixtures where the repo already loads them)**: Base FR/EN validate, and importing them into a default world gives the same skills and classes `buildStarterClasses` gave (names, trees, effects), with a no-mana world getting no mana skills. Misses the UI.
3. **Wizard, sandbox and class catalogue (component inputs/outputs / business)**: the wizard checkbox imports the active packs' classes and skills on creation; the sandbox world gets Base's; the class catalogue has no "Add default classes and skills" button any more. Misses layout (browser check).

## Green

- Files: `src/app/core/packs/pack-content.ts`; new `src/app/modules/world/business/pack-content-applier.business.ts`; `pack-content-import.business.ts`, `world-library.business.ts`, `sandbox-world.business.ts`; class catalogue (`class-catalogue.business.ts`, component, page) and `sandbox-class-catalogue.business.ts`; `public/packs/base-{en,fr}/pack.json` + new `content/skills.json`, `content/classes.json`; `public/i18n/{en,fr}.json`; `user-docs/src/content/docs/{packs,en/packs}.md`. Deleted `starter-classes.ts` and its spec.
- Change: planner remaps skill formulas, effects and costs by the mapping, leaves out skills on a skipped attribute (tree nodes and requirements too), makes a skill free when only its cost is skipped, and sets `actionType` from `world.actionTypes` (movement counter for `movement: true`); validation rejects effects/costs on undeclared attributes. The world-level import moved to `PackContentApplier` (no session), used by the import business, `WorldLibraryBusiness.create` (starterClasses, missing attributes skipped) and the sandbox (async fill of its classes and skills from Base). Base content was generated from the `starter-snapshot.ts` (the old `buildStarterClasses` output on a default world) with a one-off script in the scratchpad (`.../scratchpad/gen.py`, not in the repo); the add-defaults button, outputs and i18n key are gone; the wizard hint text now describes the pack import; docs have a "Fixed content" section.
- Test changes (only because the code is gone): deleted `starter-classes.spec.ts`; in `class-catalogue.business.spec.ts` removed the 3 GM `addDefaults` tests, the sandbox "starts with the starter classes", "valid starter classes in en/fr" and "adds the defaults back" tests (replaced by the red specs) and the loose `addDefaults` typing; in `world-library.business.spec.ts` removed "creates a world with the starter classes and skills".
- Also changed `sandbox-character.business.spec.ts` setup only (the `PackBusiness` mock replaced by `provideBasePackOnDisk()`, assertions untouched). Production needed no change: the sample character is a `resource` keyed on `sandbox.$world()`, so it reloads with the Mage when Base's classes arrive; the combat sandbox reads classes in computeds.
- Suite: 306 files, 2931 tests, all passed (twice). `tsc -p tsconfig.spec.json` clean, `ng build` OK (budget warnings only).
- Open questions: none

## Answer

- Base FR/EN declare their 5 default attributes and ship `content/skills.json` and `content/classes.json`: the old starter skills and classes, generated once from the `buildStarterClasses` output on a default world (kept as `src/testing/starter-snapshot.ts`). `starter-classes.ts` is deleted.
- `planPackImport` now remaps skill formulas, effects and costs. A skill whose effect or formula uses a skipped attribute is left out, with its tree nodes and requirements. A skill whose only skipped attribute is its cost stays and becomes free (today's no-Mana result). Active skills tick the world's first action type, and movement skills its movement counter. Validation rejects an effect or cost on an undeclared attribute.
- The world-level import moved into `PackContentApplier`, used by the import business, the wizard and the sandbox. At creation and in the sandbox, attributes the world lacks are skipped (no dialog).
- The wizard's "Add default classes and skills" imports the active packs' classes and skills. The class catalogue's "Add defaults" button and `addDefaults` are removed. The sandbox fills from Base in the background, merges after an early rules edit, and stays empty with a logged error if the load fails.
- Docs: a "Fixed content" section in the packs page, FR and EN.
- Existing tests removed or adapted because their code went away: the `starter-classes.spec.ts` file; the `addDefaults` and sync sandbox-start tests in `class-catalogue.business.spec.ts`; "creates a world with the starter classes and skills" in `world-library.business.spec.ts`; the `sandbox-character` spec's setup only (pack mock).
- Checked: suite 306 files / 2931 tests (baseline 302 / 2915), `ng build` clean, review `ship` (three small notes applied). In the browser: a new world created with the checkbox ticked stores Base's 3 classes and 17 skills with `base-fr:` ids. The Tools class catalogue lists Guerrier / Mage / Voleur, and Warrior / Mage / Rogue in EN at mobile width, with no "Add defaults" button. The Tools sample character has the Mage tree. No console errors. Hosting that world was blocked by a stale room lock from earlier testing, so the hosted class catalogue wasn't opened.
