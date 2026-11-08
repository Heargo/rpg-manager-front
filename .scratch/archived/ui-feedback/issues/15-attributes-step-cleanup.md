# Clean up the wizard's attributes step

Status: resolved
Type: task
Blocked by: 14

User feedback (2026-11-08): "clean up the ui in attribute step because it's clunky". Today each attribute takes four lines (name and base; a native progression select and a step field; a hint; a preview), and the life and mana bar selects sit at the bottom.

## Design (user, 2026-11-08)

- **One compact row per attribute:** name, base, progression (Optimus `p-select`), step (small `p-inputnumber`), a short preview "max 10 → 35" (levels 0 to 5 in a `p-tooltip`), and delete.
- **Custom:** choosing it opens a line under that row only, with the expression field, a one-line help (variables and the bracket rule) and the inline error (from U14).
- **Bars:** life and mana become small per-row toggles (one attribute each, exclusive) instead of the two selects at the bottom.
- **Mobile:** a row wraps into two lines (name and base on top; progression, step and preview below), with no horizontal scroll.

## Seam

The wizard component test: existing hooks kept, or renamed together with the spec. The layout is checked in the browser at 1280 and 375 px.

## Baseline

`npm test`: 92 test files, 709 tests, all passed (2026-11-08, `develop` at f5774b6).

## Red

- Test files: `src/app/modules/world/pages/world-new-page/world-new-page.component.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/world/pages/world-new-page/world-new-page.component.spec.ts`
- Hooks (documented in the spec header): `attribute-row-N`, `formula-preset-N` (on the `p-select`, driven by click then `li[role="option"]`, labels Linear/Steep linear/Diminishing/Percent/Custom), `formula-step-N` (on the `p-inputnumber`, inner `input`), `formula-preview-N` (text "max A → B", full levels in `data-levels`), `formula-custom-N` (custom line holding `formula-expression-N` input and `formula-error-N`), `bar-life-N` / `bar-mana-N` (element or inner button with `aria-pressed` or `aria-checked`).
- Failing: 12 tests (the 5 level-curve tests still pass), each one line:
  - renders one compact row per attribute — no `attribute-row-N` hooks, native selects present
  - uses an Optimus select for the progression — `formula-preset-0` missing
  - starts Life on Steep linear and the others on Linear, with a short max preview — new hooks and "max A → B" preview absent
  - updates the preview when the step changes — step is not a `p-inputnumber` with the new hook
  - switches preset with its default step and a rounded preview — no `p-select` to drive
  - shows the custom line only for a Custom row and previews it — no `formula-custom-N` / `formula-expression-N` hooks
  - shows a syntax error inline and blocks Next until it is fixed — no p-select, no custom line
  - reports a name that is not a variable nor an attribute, and accepts an attribute name — same
  - starts with Life on the first row and Mana on the second — no `bar-*-N` toggles
  - moves Life off row 0 when it is picked on row 2 — no toggles
  - moves Mana to another row the same way — no toggles
  - has no select for the bars at the bottom any more — `#life-bar` / `#mana-bar` still exist

## Green

- Files: src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html,scss}, public/i18n/en.json, public/i18n/fr.json, src/testing/jsdom-setup.ts
- Change: one compact grid row per attribute (name, base, p-select progression, p-inputnumber step, "max A → B" preview with p-tooltip and data-levels, life/mana toggles, delete); custom line (expression, short help, U14 inline error) only under a Custom row; life/mana are exclusive per-row toggles keyed by row key (draft `barAttributes` unchanged), bottom selects removed; under 40rem the row wraps into two lines via grid areas. New strings `world.formula.max` and `world.formula.helpShort` in EN and FR. jsdom setup gets a `scrollIntoView` no-op because the Optimus select calls it on open.
- Suite: 92 files, 715 tests, all passed (baseline 92 files, 709); tsc clean; build OK. Unstaged `git diff --name-only` lists `character-card.component.spec.ts`, which is the parallel agent's, not mine.
- Open questions: layout at 1280 and 375 px not yet checked in the browser.

### Green, follow-up (browser feedback)

- Custom pre-fill now substitutes the previous step into the expression (`base + level * 1`), so it is valid with the same preview; test added to the wizard spec (describe "switching to Custom").
- Progression select column 10.5rem, name column `minmax(5rem, 1fr)`, row total about 37rem plus name; muted header row (Attribut, Base, Progression, Pas, Max) added, hidden under 40rem; new keys `world.new.columns.*` in EN and FR.
- Suite: 92 files, 716 tests, all passed; tsc clean; build OK.
- Open questions: the 375 px wrap (two lines, no horizontal scroll) is by CSS grid areas, not verified in a browser from here.

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - world-new-page.component.html (whole file) — the diff re-quotes and re-wraps untouched lines (single to double quotes), which hides the real change — keep the repo's prettier settings, or split the reformat into its own commit.
  - world-new-page.component.ts:371 — a row with an empty name that holds a bar toggle shows `aria-pressed=true` but `barAttributes` gives `undefined` for it — acceptable while step 1 validation requires names, otherwise show the toggle as disabled for unnamed rows.
  - world-new-page.component.html:87 — the `aria-hidden` header row inside `role="table"` is fine, but the rows have no column headers for screen readers; the per-control `aria-label`s cover it.
- Checked: toggles are real `<button type="button">` with `aria-pressed` and a translated `aria-label` (plus tooltip) in both language files. `setBar` is exclusive (picking Life on the Mana row clears Mana; a second click clears). `removeAttribute` clears the bar signals before the row is dropped, so no dangling key. Bars are keyed by row key, so renaming keeps them, and `barAttributes` is derived in the `draft` computed. New i18n keys are in en and fr. The `scrollIntoView` stub in jsdom-setup is minimal and guarded.

## Answer

- **Rows:** one compact grid row per attribute: name, base, a progression `p-select` (11.5rem, labels in full), step (`p-inputnumber`), "max A → B" (full levels 0 to 5 in a `p-tooltip` and `data-levels`), exclusive life and mana toggles (buttons with `aria-pressed` and a label), delete. A muted column header row sits above (hidden on phones).
- **Custom:** a line under a Custom row only (expression, short help, U14's inline error). Switching to Custom pre-fills the previous preset with the step value substituted (`base + level * 1`), so it stays valid with the same preview.
- **Bars:** the life and mana selects at the bottom are removed; the toggles are keyed by row (draft `barAttributes` unchanged).
- **Phones (below 40rem):** three lines per row (name, base, toggles, delete / progression, step / max), with fixed column widths (the orchestrator fixed `auto` columns that let the step input squeeze the name).
- **Checked:**
  - Suite 92 files, 716 tests (baseline 92 / 709). Build OK.
  - Browser at 1280 px: rows with headers, full labels, Custom pre-fill valid, toggles.
  - Browser at 375 px: three-line rows, no horizontal scroll.
- **Left as Consider:** the wizard HTML diff includes quote reformatting; disable bar toggles on rows with an empty name.
