# Formula preview: a small chart instead of a text tooltip

Status: resolved
Type: task
Blocked by: 15

User feedback (2026-11-08), with `refs/formula-tooltip-before.png`: "instead of a text tooltip make a graph tooltip so it's easier to understand". Today hovering "max 10 → 35" shows "Maximum aux niveaux 0 à 5: 10 15 20 25 30 35".

## Direction

- **`app-formula-chart`** (`core/components/formula-chart/`): a small inline SVG line chart with no chart library.
  - About 14rem × 8rem; x = level, y = value, with a line and a dot per level.
  - The first and last values are labelled; a muted axis shows "niv. 0" … "niv. 10" (FR) / "lvl 0" … "lvl 10" (EN).
  - The y range starts at 0, or at the minimum if it's negative.
  - The line uses the primary colour token; a soft area fill sits under the line; text uses the muted text colour.
  - It has an accessible description ("Max per level: …") in a `<title>` / `aria-label`.
- **Attributes step:** hovering or focusing the "max A → B" preview opens the chart in a popover (Optimus `p-popover`, or a CSS hover card) instead of the text tooltip. The chart covers levels 0 to 10, not 0 to 5, so the shape of Diminishing or Percent is visible. Keep `data-levels` (levels 0 to 5) for the existing tests; the chart can use a wider range from `previewMax`-like evaluation over 0 to 10.
- **Rules step:** the level curve preview gets the same chart on hover (XP cost of levels 2 to 11).
- **Touch:** on touch devices, tapping the preview toggles the chart.

## Tests

- A component test for `app-formula-chart`: it renders one point per value, labels the first and last values, and has an aria label listing the values.
- The wizard spec stays green; add one test that the preview has the chart trigger.

Checked in the browser at 1280 px (hover) and 375 px (tap).

## Green

- Files: `src/app/core/components/formula-chart/formula-chart.component.{ts,html,scss,spec.ts}` (new), `src/app/core/helpers/formula.ts`, `src/app/modules/world/pages/world-new-page/world-new-page.component.{ts,html,scss,spec.ts}`, `public/i18n/en.json`, `public/i18n/fr.json`
- Change: `app-formula-chart` is a hand-written SVG (area, line, dots, first/last value labels, "lvl N"/"niv. N" axis ends, `<title>` + `aria-label`; colours from `--p-*` tokens). `previewMax` takes an optional `upTo` (default 5, max 10). In the wizard the max preview (and the level curve preview, levels 2 to 11) lost its text tooltip and has `data-chart-trigger`: mouse hover, keyboard focus-visible or a tap/Enter toggle a CSS hover card holding the chart. `data-levels` is unchanged. New keys `formula.chart.{level,maxLabel,xpLabel}` in EN and FR.
- Red before implementation: the 5 chart spec tests (renders one point per value; labels first and last values; aria label lists the values; axis labels translated; flat or negative series without NaN), failing at compile (component missing), and the wizard test "opens a chart of levels 0 to 10 from the max preview, which keeps its levels 0 to 5 data" (18 existing wizard tests stayed green).
- Suite: 93 files, 722 tests pass; `tsc` clean; `npm run build` has no error.
- Open questions: the build warns that `world-new-page.component.scss` is 44 bytes over its 4 kB budget (a warning, not an error); the real 1280 px hover and 375 px tap browser check is not done.

## Answer

- **`app-formula-chart`** (`core/components/formula-chart/`): a hand-written SVG with an area, a line, a dot per level, the first and last values labelled, "niv. 0" / "niv. 10" axis ends, and a `<title>` / `aria-label` listing the values. Colours come from the `--p-*` tokens.
- **Previews:** `previewMax(…, upTo)` evaluates up to level 10. The wizard's max preview (levels 0 to 10) and the level curve preview (XP for levels 2 to 11) open the chart in a CSS hover card on hover or keyboard focus, and toggle it on tap or Enter. `data-levels` (levels 0 to 5) is unchanged. Optimus UI has no popover component, hence the CSS card.
- **Tests:** 5 chart spec tests and 1 wizard test, all written first and seen failing; suite 93 files, 722 tests; build OK. The wizard scss is 44 bytes over its 4 kB component budget (a warning, not an error).
- **Checked in the browser:**
  - 1280 px hover on Life: a line from 10 to 60.
  - 375 px tap on Force: a chart from 1 to 11, inside the screen.
