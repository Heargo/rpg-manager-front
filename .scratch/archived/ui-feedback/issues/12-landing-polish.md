# Landing polish: centred content, footer flush, credits without the legacy app

Status: resolved
Type: task
Blocked by: 11

User feedback (2026-11-07):

1. Centre the landing's second section (the content under the hero) like the first. Today the pitch, screenshot and cards sit in a left-aligned column; centre the block horizontally (and its content within the available height) so it reads as a centred section.
2. Remove the space between the footer and the bottom of the page: the footer must touch the bottom edge (today it ends about 10px above it, from the global body margin and page min-height) on every page that has it.
3. Credits: remove the section about the legacy app ("This app replaces the first RPG Manager…"). This app is a rework of it, not a different app. Remove its i18n keys from EN and FR too.

Tests: the existing home tests stay green. If a credits test checks the legacy section, update it to check it's gone. Checked in the browser at 1280 and 375 px.

## Answer

Done by the orchestrator after the agent stalled: it made no edits in 12 minutes, likely blocked on a test run that couldn't compile because of U07's staged red specs.

- **Centred section:** the landing `.content` is a flex column with `justify-content: center`, so the block is centred in the space under the hero (it was already centred horizontally).
- **Footer flush with the bottom:**
  - the footer's parent (the landing's `.below`, and the static pages' host) has `margin-bottom: -0.5rem`, which cancels the global body margin; flex parents stopped the footer's own negative margin from collapsing through;
  - the static pages' minimum height uses the real offset (50px nav plus the 0.5rem body margin);
  - the footer keeps only its side bleed.
- **Credits:** the legacy app section is removed, with its `credits.legacyTitle` and `credits.legacy` keys in EN and FR.
- **Checked:**
  - Home specs 4 files, 30 tests.
  - Browser at 1280 px: footer bottom equals the viewport height on the landing, `/contact` and `/credits`; the credits page has no legacy section.
  - Browser at 375 px: same on the landing and `/contact`, with no horizontal scroll.
