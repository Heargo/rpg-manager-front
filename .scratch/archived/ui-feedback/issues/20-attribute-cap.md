# Optional hard cap per attribute

Status: resolved
Type: task
Blocked by: 07, 15

User feedback (2026-11-08): "it's missing the hard cap for attributes (for example Life can never go over 1000 in value); it must be configurable (optional)".

## Decisions (user, 2026-11-08)

- **What the cap limits:** the formula result only. `max = min(cap, round(formula)) + equipment bonuses`, so gear can still push the max above the cap. With no cap, nothing changes.
- **Where it's set:** an optional, narrow "Plafond" / "Cap" column in each attribute row of the wizard. Empty means no cap (placeholder "∞"); the name column shrinks a little. On phones it joins the second line (progression, step, cap).

## Rules

- **Model:** `WorldAttribute.cap?: number`, an integer of at least 1 when set (no backward compatibility needed: absent means none).
- **Validation:** the wizard and import reject a cap that isn't an integer of at least 1, and a cap below the attribute's base value (it would cap level 0); the error key is `world.errors.capTooLow` with the base.
- **Previews:** `previewMax` and the chart apply the cap, so the line flattens at it. The chart draws a thin dashed line at the cap, labelled.
- **Character rules:** spending a point on a capped attribute that already reaches the cap is refused (`character.errors.attributeCapped`), so no point is wasted. A level-up (`playerLevel`) never pushes it past the cap. Current stays at most the max.
- **Export and import** round-trip the cap.

## Seams

1. **Pure rules:** `formulaMax`, `attributeStats`, `previewMax` and the spend rule with a cap; world-draft and import validation.
2. **Wizard component:** the cap column (empty means none, a value is saved, an invalid value shows an error and blocks Next), and the preview flattening at the cap.

Checked in the browser at 1280 and 375 px.

## Red

- Baseline: 93 test files, 722 tests passed. Now: 94 files, 744 tests (727 pass, 17 fail; the 5 passing new ones are regression guards for "no cap changes nothing").
- Test files: `src/app/core/helpers/formula.spec.ts`, `src/app/modules/character/helpers/character-stats.spec.ts`, `src/app/modules/character/helpers/character-actions.rules.spec.ts`, `src/app/modules/world/helpers/world-draft.rules.spec.ts`, `src/app/modules/world/helpers/world-export.spec.ts`, `src/app/modules/world/helpers/world.factory.spec.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.cap.spec.ts` (new)
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (or the whole suite with `npx ng test --watch=false`)
- Agreed names the green step must use: `WorldAttribute.cap?` and the draft attribute `cap?`; `previewMax(formula, base, names, upTo, cap?)` (5th parameter); error keys `world.errors.capInvalid` (not an integer >= 1) and `world.errors.capTooLow` (below base) as the `attributes` error of `validateWorldDraft`; import error string `world.attributes[N].cap is invalid`; `character.errors.attributeCapped`; wizard hooks `formula-cap-N` (input, or host containing one) and `formula-cap-error-N` (inside the row). `createWorld` and `buildWorldExport` must carry `cap`. The specs reach `cap` through casts because the types don't have it yet; green can drop the casts.
- Failing: 17 tests
  - previewMax with a cap > flattens the line at the cap — 5th argument ignored, no flattening
  - formulaMax stops at the cap — no cap applied
  - attributeStats caps the formula only: gear adds on top — max is uncapped (60)
  - keeps current at most the max — current 40 vs 22 expected (max uncapped)
  - spend: refuses a point when the formula already reaches the cap — point accepted, no `attributeCapped`
  - spend: still refuses when gear lifts the max above the cap — same
  - spend: accepts the point reaching the cap, then refuses the next — second spend accepted
  - level-up never pushes a playerLevel formula past the cap — max exceeds 30
  - validateWorldDraft: rejects a cap that is not an integer of at least 1 — no `capInvalid` error
  - validateWorldDraft: rejects a cap below base with `capTooLow` — no error
  - world export: round-trips the cap — `buildWorldExport`/`createWorld` drop `cap`
  - world export: refuses invalid caps — import accepts them
  - createWorld keeps the cap on the world attribute — cap dropped
  - wizard: empty cap field in each attribute row — no `formula-cap-N` element
  - wizard: flattens the preview at the cap and restores it when cleared — no cap input
  - wizard: saves a valid cap in the draft, none by default — no cap input
  - wizard: error and blocked Next for a cap below the base value — no cap input

## Green

- Files: `src/app/core/helpers/formula.ts`, `src/app/modules/world/models/world.ts`, `src/app/modules/world/helpers/{world.factory,world-draft.rules,world-export}.ts`, `src/app/modules/character/helpers/{character-stats,character-actions.rules}.ts`, `src/app/core/components/formula-chart/formula-chart.component.{ts,html,scss,spec.ts}`, `src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html,scss}`, `public/i18n/{en,fr}.json`
- Change: `cap?` on `WorldAttribute` and the draft; `formulaMax` and `previewMax(…, cap?)` take `min(cap, round(formula))`, gear still adds on top; spend refuses with `attributeCapped` when the formula already reaches the cap; new `attributeCapError` (capInvalid / capTooLow) used by `validateWorldDraft`, import (`world.attributes[N].cap is invalid`), and the wizard; `createWorld`/export carry the cap. Chart: new `cap` input draws a dashed labelled line (+1 chart spec test). Wizard: "Cap" column (input `formula-cap-N`, placeholder "∞", error `formula-cap-error-N` inside the row), joins the second line on phones; progression column 11.5 to 10.5rem and name min 5 to 4rem to make room. EN/FR strings added. Red-spec casts left as they were (still compile).
- Suite: 94 files, 745 tests, all pass (baseline 93 / 722; red 744 + the new chart test). tsc clean, ng build OK.
- Open questions: 1280 px and 375 px layout not checked in a browser yet. The unstaged chart spec is the one requested new test.

## Answer

- **Model and rules:**
  - `cap?` on `WorldAttribute` and the draft;
  - `formulaMax` and `previewMax(…, cap?)` use `min(cap, round(formula))`, with gear added on top;
  - spending a point is refused with `character.errors.attributeCapped` once the formula reaches the cap;
  - `attributeCapError` (`capInvalid`, `capTooLow`) is used by the wizard, the draft rules and the import;
  - `createWorld` and the export carry the cap.
- **Chart:** a dashed, labelled line at the cap.
- **Wizard:**
  - an optional "Plafond" / "Cap" column (placeholder "∞", empty means none) with an inline error;
  - the orchestrator gave the form a 3:1 share beside the preview (the preview card is min 14rem) and the progression column 11.5rem, so labels and names fit at 1280 px;
  - on phones the cap sits on the third line beside "max".
- **Checked:**
  - Suite 94 files, 745 tests (baseline 93 / 722). Build OK.
  - Browser at 1280 px: cap 30 on Life gives "max 10 → 30" (levels 10 15 20 25 30 30); full labels and names.
  - Browser at 375 px: three lines, the cap readable, no horizontal scroll.
