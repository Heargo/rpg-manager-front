# Active packs in the world rules

Status: resolved
Type: task
Blocked by: 01

Spec: `../spec.md` (Decisions 3-5, Assumed: missing pack).

- `WorldRules` (and the stored world) get `packs: string[]`, the active pack ids.
- Rules page: a "Packs" section, a multi-select of the installed packs with a language tag. A missing pack is shown as missing, with Install when it is official.
- Wizard, Rules step: the same choice, preset to the Base of the app language.
- ~~The Packs page loses its on/off toggle~~ moved to PL04 (see Decisions).

## Decisions (orchestrator, 2026-11-13)

- **Removing the Packs page toggle moves to PL04.** Until the generators read the world's packs, the device toggle is what feeds them (interim rule from PL01). Removing it here would leave nothing to choose content with.
- `packs: string[]` is stored on the world and is part of `WorldRules`, so the rules page, the wizard (both through `rule-fields`) and `applyWorldRules` / `saveRules` carry it. The sandbox world and the rules tool page get it too.
- A new world (`world.factory` / default world / wizard draft) gets `[basePackId(app language)]`.
- A stored world without `packs` reads as `[]` (dev, no migration). PL04's fallback to the Base of the app language covers generation.
- The Packs section lists every installed pack (both Bases included): name, a language tag and a checkbox (or a `p-multiselect`, following Optimus and the existing rule-fields style). An id in `packs` that isn't installed shows as "missing". If it is in the official registry, it gets an "Install" button that downloads it (`PackBusiness` official install); otherwise only "Remove from the world" is offered.
- No rule validation on `packs` (an empty list is allowed).
- New strings in both i18n files. Note: `public/i18n/*.json` and the credits page hold the user's uncommitted credits work. Don't touch those keys.

## Baseline

Test Files 231 passed, Tests 1975 passed (after `c2042c7`).

## Seams

1. **World helpers (`world.factory` / `world-draft.rules` / `applyWorldRules`)**: a new world has the Base of the app language, applied rules store `packs`, and a world without `packs` reads as `[]`. Misses the UI.
2. **`RuleFieldsComponent` inputs/outputs (`TEST_PROVIDERS`, packs from the faked `PackService` / fake-indexeddb as the pack specs do)**: lists the installed packs with their language tag and the world's ones ticked. Ticking or unticking emits rules with the new `packs`. A missing official pack shows "missing" plus Install, which installs it and then lists it. A missing unknown pack shows "missing" and can be removed. Misses the page wiring.
3. **`WorldSessionBusiness.saveRules` over the fake peer network**: saving rules with new `packs` stores them on the world and republishes `world/info` with them. Misses the UI.

## Green

- Files: src/app/modules/world/models/world.ts, helpers/world.factory.ts, helpers/world-rules.rules.ts, business/world-library.business.ts, business/sandbox-world.business.ts, components/rule-fields/rule-fields.component.{ts,html}, pages/world-new-page/world-new-page.component.ts, pages/world-rules-page/world-rules-page.component.ts, public/i18n/{en,fr}.json (6 keys `world.fields.pack*`, inserted without touching the credits keys)
- Change: `packs` on `World`, `WorldInfo` (via `toWorldInfo`), `WorldDraft` and `WorldRules` (optional there, kept as is when omitted, since existing specs build rules without it). `createWorld` copies the draft's packs (none gives `[]`). `WorldLibraryBusiness.create` defaults to the Base of the app language and `get` reads a missing `packs` as `[]`. `RuleFieldsComponent` has a Packs section (p-checkbox, p-tag language, Missing tag, p-button Install via `PackBusiness.enable` or Remove), shown wherever the rules sections show. The wizard draft starts with `[basePackId(language)]`; the rules page and the sandbox world carry `packs` too (the rules tool page goes through the sandbox).
- Suite: 231 files / 1991 tests pass (baseline 231 / 1975, plus the new tests); tsc clean; ng build OK; the only unstaged spec in the diff is the user's `static-pages.spec.ts`.
- Open questions: none

## Answer

- Worlds carry `packs` (World, WorldInfo, WorldDraft, and WorldRules, where it is optional and an omitted value keeps the world's packs). A new world gets the Base of the app language. A stored world without the field reads as `[]`.
- `rule-fields` has a Packs section, so it shows on both the rules page and the wizard. Each installed pack has an Optimus checkbox and a language tag. Missing packs are tagged, with Install for an official pack and Remove otherwise.
- The device toggle on the Packs page stays until PL04 (moved there).
- Checked: suite 231 files / 1991 tests pass (baseline 1975). Build OK. Browser: in the wizard's Rules step (French app), "Base (français) FR" is ticked and "Base (English) EN" is not.
- Left (review, Consider): `exportWorld` reads raw storage, so an old world exports without `packs`. The rules and wizard page wiring has no spec. `missingPacks` shows nothing while no pack is loaded. The section reuses the `offline` fieldset class.
