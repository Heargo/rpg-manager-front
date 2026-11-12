# Skill form: modern layout

Status: resolved
Type: task
Blocked by: 09

Spec: `../spec.md` (Skill editor and formula presets). User feedback after G09 (2026-11-13): the form must be more readable and grouped by sections.

- Each section is a card (surface background, border, radius) with a header: an icon in a tinted circle, the title and a one-line subtitle.
- Fields sit on a responsive grid (two or three columns on desktop, one on mobile), inputs fill their cell; description and formulas span the full width.
- Each effect is its own block: a header "Effect N" with the delete button, then kind, attribute, amount (with presets) and duration on the grid, the level preview at the bottom.
- The variables help and the presets button sit in a toolbar above the cards; the variables are shown as chips.
- Same hooks (`data-section`, `data-field`, `data-action`) and behaviour: layout only.

## Answer

Layout only (no seam; same hooks, the existing editor specs cover behaviour). Each section is a card with an icon in a tinted circle, a title and a subtitle (new `identityHint` and `costHint`; roll and effects reuse their help lines). Fields sit on an `auto-fill` grid (min 13rem, so a lone field keeps one column), and inputs fill their cell. Formulas span the full width and use a monospace font. Each effect is a block with a bordeaux left edge and an "Effet N" header holding the delete button; kind, attribute, duration and the full-width amount (with presets) are labelled, and the preview line has an icon. The toolbar (variables help, presets) sits on the right; the variables are shown as `code` chips on a grid. Browser: FR desktop and EN at 375px (one column, no horizontal scroll), no console error. Suite: 184 files, 1481 tests, build OK.
