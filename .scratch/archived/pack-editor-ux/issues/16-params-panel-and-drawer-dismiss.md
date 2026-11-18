# Params side panel made readable; every side panel closes on outside click and Escape

Status: resolved
Type: task
Blocked by: none

User request (2026-11-18): "améliore l'ux du side panel des params communs. Pour tous les side panels il faut le fermer si on clique en dehors ou si on appuie sur Échap."

Spec: `../spec.md` (Side panel). Builds on PE10 (params as a table with a drawer) and PE12 (titled sections, `app-detail-texts`).

## Today

- `app-params-editor` drawer detail: a bare `<strong>` name and a bullet list of the raw expressions (`les moines de {place}`, `un apprenti [maladroit|pressé]`). No sections, no count, nothing says how to use the param, nothing shows what the markup gives.
- The form: a name input and an 8-row textarea with the hint "One expression per line". A syntax error in a line is only caught later by the pack validation.
- All five drawers (`params-editor`, `common-words-editor`, `kinds-tree-table`, `tints-table`, `sprites-grid`) set `[dismissible]="false"` and `[closeOnEscape]="false"`: only the × button, Cancel or Save close them.

## Wanted

### Params detail (like the kind and tint details of PE12)

- Titled sections (`section-title`, same look as kind-detail):
  - **Usage**: the param's name as the panel heading, and the reference to type in a phrase, `{maker}`, with a copy button (Optimus UI `p-button`, text, small; copies `{name}` to the clipboard, short "Copied" toast or label).
  - **Expressions (N)**: the entries through `app-detail-texts` (collapsed after the first few, "Show all").
  - **Examples**: a "Draw examples" button (same label and look as the kinds' one) that expands 5 phrases from this param through `expandPhrase` with the draft's params as context, so `{place}` and `[a|b]` are resolved. An entry that fails to expand is skipped; if none expand, a short "nothing could be drawn" message.
- The row's issues (already shown in the table) also show at the top of the detail.

### Params form

- The hint explains the syntax in one line: one expression per line, `{param}` inserts another param, `[a|b]` picks one of the options.
- A line with a syntax error (`checkPhrase` errors) or a reference to an unknown param shows under the textarea as a small error naming the line; Save stays enabled for unknown params (they may be added next) but is disabled on syntax errors.

### Every side panel: outside click and Escape

- In the five drawers, a click on the mask outside the panel and the Escape key close it, through the same path as the × button (`requestClose`): a clean panel closes at once, a dirty form asks to discard first; answering "keep editing" leaves the panel open with the form as it was.
- Escape while the discard (or delete) confirmation is open closes only that confirmation, not the panel.

## Out of scope

- Factoring the drawer code shared by the five editors (noted by PE10's review) — allowed if it is the simplest way to apply the dismiss rule once, not required.
- The other details' content.

## Check

FR/EN, 375 px and desktop: params detail sections, copy, draw examples, form errors; outside click and Escape on each of the five panels, clean and dirty.

## Baseline

`develop` at 7f66909: Test Files 337 passed, Tests 3320 passed (PE15's final run; nothing changed since). 4 unhandled AbortErrors in pack-draft-page.lifecycle.spec / pack-update-atomic.business.spec are pre-existing.

## Seams

1. A pure helper in `src/app/core/packs/` (e.g. `param-lines.rules.ts`): from the textarea text and the known param names, the problems per line (syntax error from `checkPhrase`, unknown `{param}`), and whether they block Save. Catches the rules; misses the display.
2. `app-params-editor` inputs/outputs (`TEST_PROVIDERS`, draft in, `changed` out): detail sections, copy reference, draw examples (seeded `RandomSource` if the component takes one, otherwise assert entries come from resolved expressions), form errors and Save state. Catches what the user sees in the panel; misses real clipboard and the PrimeNG mask rendering.
3. The five drawer components (`params-editor`, `common-words-editor`, `kinds-tree-table`, `tints-table`, `sprites-grid`) through their inputs/outputs: Escape keydown and a click on the drawer mask close a clean panel, ask before closing a dirty form, keep it open on "keep editing"; Escape in the confirmation closes only it. Catches the dismiss rule in every panel; misses real focus handling in a browser.

## Red

- Test files: `src/app/core/packs/param-lines.rules.spec.ts` (new), `src/app/modules/tools/components/pack-draft/params-editor/params-editor.component.spec.ts` (added `detail panel` and `form` blocks), `src/app/modules/tools/components/pack-draft/drawer-dismiss.spec.ts` (new, `describe.each` over the five drawers)
- Run: `npx ng test --watch=false --include <file>` for each file
- Contract the tests pin (names to implement): `checkParamLines(text, knownParams)` in `param-lines.rules.ts` returns `{ problems: { line (1-based), kind: 'syntax' | 'unknown-param', param? }[], blocksSave }`. Hooks in params-editor: `param-reference` (contains `{name}`), `copy-reference` (calls `navigator.clipboard.writeText('{name}')`), `draw-examples`, `param-example` (5 shown), `examples-empty`, `line-error` (one per problem, text holds the line number and the unknown param name), `section-title` x3 labelled "Usage", "Expressions (N)", "Examples", issues (`issue`) above the first section; hint contains `{param}` and `[a|b]`. Dismiss: Escape on `document` and click on `.p-drawer-mask`; the component must ignore Escape while its own confirmation is open (and re-enable it after `reject`/`accept`).
- Failing: 7 (rules) + 10 (params-editor) + 39 (drawer-dismiss)
  - param-lines.rules.spec (7 tests) — module `./param-lines.rules` does not exist (compile error)
  - params-editor: shows titled sections; Usage heading and reference; copy button; Expressions with Show all; issues at top of detail; Draw examples (resolves 5), (skips failing entry), (nothing drawn message); hint explains syntax; syntax error line shown and Save disabled; unknown param error with Save enabled — 10 tests, missing hooks/sections/behaviour
  - drawer-dismiss.spec, for each of params, common words, kinds, tints, sprites (39 tests): Escape closes clean detail; mask click closes clean detail; Escape closes clean form; Escape on dirty form asks to discard; mask click on dirty form asks; keep editing leaves it open; Escape during discard confirmation neither closes nor asks again (7 each) — drawers set `[dismissible]="false"` and `[closeOnEscape]="false"`; plus, for params/words/tints/sprites, Escape during the delete confirmation does not close, but the next Escape does (4) — second Escape does not close the detail yet
- Baseline for the rest: unchanged; no existing test asserted that Escape or a mask click does not close a drawer.

## Green

- Files: src/app/core/packs/param-lines.rules.ts (new), src/app/modules/tools/components/pack-draft/drawer-dismiss.ts (new), params-editor/params-editor.component.ts, tints-table/tints-table.component.ts, common-words-editor/common-words-editor.component.ts, kinds-tree-table/kinds-tree-table.component.ts, sprites-grid/sprites-grid.component.ts, public/i18n/en.json, public/i18n/fr.json
- Change: `checkParamLines` rule; params detail in three titled sections (Usage with copy, Expressions via app-detail-texts, Examples drawn with expandPhrase) and form line errors that block Save only on syntax errors. A `DrawerDismissDirective` (capture-phase Escape and `.p-drawer-mask` click -> `requestClose()`) is applied to the five drawers, and `confirmWhileBusy` suspends it while a confirmation is open. The drawers keep `[dismissible]="false"` and `[closeOnEscape]="false"` so PrimeNG's own hide never strips the mask.
- Suite: 339 files / 3377 tests pass (baseline 337 / 3320); tsc clean; ng build OK; no test file in the unstaged diff.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - params-editor.component.ts (copyReference) — `navigator.clipboard.writeText` promise is dropped (rejection unhandled, "Copied" shown even on failure) and the 2 s `setTimeout` is not cleared on destroy — set `copied` only after the promise resolves, ignore rejection.
  - drawer-dismiss.ts / five drawers — each editor repeats `confirming` signal + `[appDrawerDismiss]="panel() !== null && !confirming()"` + `(dismiss)="requestClose()"` (small duplication, allowed by the ticket as out of scope).
  - params-editor.component.ts (drawExamples) — up to 40 draws can return duplicate examples; dedupe if the param has few entries.
  - public/i18n/en.json + fr.json — `countHeader` changed (fr "Nombre", en "Count" unchanged text) is not in the ticket; harmless, confirm intended.
  - drawExamples uses `cryptoRandomSource()` directly; an injectable RandomSource would make the test seedable.

## Answer

Params detail in three titled sections:
- Usage: the name, `{name}`, and a Copy button that says "Copied" only once the clipboard write succeeds.
- Expressions (N): through `app-detail-texts`.
- Examples: "Draw examples" expands 5 phrases with `expandPhrase` and the draft's params.

The row's issues show at the top of the detail.

The form hint explains `{param}` and `[a|b]`. `checkParamLines` (`core/packs/param-lines.rules.ts`) flags each line with a syntax error or an unknown param. Syntax errors disable Save; unknown params don't.

The five drawers share `DrawerDismissDirective` (`pack-draft/drawer-dismiss.ts`). Escape (capture phase) and a click on `.p-drawer-mask` call `requestClose()`, so a dirty form asks before closing. The directive is suspended while a confirmation is open, so Escape there closes only the confirmation. The PrimeNG `dismissible`/`closeOnEscape` options stay off so its own hide never bypasses the discard check.

Decisions:
- Examples may repeat when a param has few expressions. The ticket asks for 5 draws, and the red test pins 5.
- At 375 px the drawer is full width, so there is no outside area; × and Escape close it.

Checked:
- Suite 339 files / 3377 tests vs baseline 337 / 3320. Build clean. Review: ship.
- Browser, FR desktop: sections, examples resolved (`les moines de Valombre`), line errors (`Ligne 6 : erreur de syntaxe.`, `Ligne 7 : paramètre inconnu nowhere.`) with Save disabled. Escape and an outside click close a clean detail. Escape on a dirty form asks; Escape in the confirmation keeps the form and the edits. Escape also closes the tints, common words and kinds panels.
- Browser, EN at 375 px: sections and labels.
- No console errors.
- The sprites panel is covered by `drawer-dismiss.spec` only; the duplicated Base FR draft has no sprites.

Consider (review): an injectable `RandomSource` for the examples; the `confirming` signal and binding repeated in the five editors.
