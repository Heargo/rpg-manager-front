# Item catalogue: wider price slider

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Bugs and layout)

- The price range slider in the item catalogue filters takes the full width of its filter cell (min ~16rem), with min and max values shown at each end, clearly apart. Same in the GM and Tools catalogues, mobile included.

## Answer

Layout only (no seam: widths are not measured by jsdom). The price filter (renamed `.price-filter`, it shared `.price` with the slot price) grows to fill the toolbar row (min 16rem), label on top, slider, then min and max at each end with "à"/"to" between. Checked in the browser: wide slider on desktop, 311px on a 375px phone, no horizontal scroll. Suite unchanged: 173 files, 1417 tests.
