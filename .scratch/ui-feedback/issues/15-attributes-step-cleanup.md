# Clean up the wizard's attributes step

Status: claimed
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
