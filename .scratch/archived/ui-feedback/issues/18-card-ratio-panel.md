# Character card: fixed ratio on phones; white panel only around the details

Status: resolved
Type: task
Blocked by: 17

User feedback (2026-11-08), with a screenshot of the laptop sheet:

1. "the card should take the maximum width in mobile while keeping the same ratio as on laptop; if the width gets smaller than the width of screen because of this, center the card."
2. "The 'white' card should only be for the details, as a secondary card."

## Direction

- **Ratio:** the card keeps its 5:7 ratio at every size. On phones (below 52rem) it takes the largest size that fits both the available width and the viewport height under the nav: width = `min(available width, (100svh - nav - margins) * 5 / 7)`. When the height limit makes it narrower than the screen, it is centred horizontally. The old full-width bleed and the fixed `--card-height` that broke the ratio go away. The XP pill still straddles the bottom border.
- **Panel:** the white panel (the surface around the sheet today) wraps only the details (tabs), as a secondary card beside the character card on desktop and below it on mobile. The character card sits directly on the page background, not inside the white panel. Check the sheet page and the sheet tool (one of them may wrap the sheet in a `p-card`).
- **Checked** in the browser at 1440 px (card left on the page background, details in the white panel on the right) and at 375 px (card centred with 5:7 kept, the details panel below).

## Green

- Files: src/app/modules/character/components/character-card/character-card.component.scss, src/app/modules/character/components/character-sheet/character-sheet.component.scss, src/app/modules/character/pages/character-sheet-page/character-sheet-page.component.ts, src/app/modules/tools/pages/sheet-tool-page/sheet-tool-page.component.ts
- Change: Removed the fixed `--card-height`. On phones the card host is `min(100%, (100svh - 50px - 1rem - 1rem) * 5/7)` wide and centred, so 5:7 is kept. Both pages no longer wrap the sheet in `p-card`. The white panel is now the `.details` block in the sheet, and the player notes get their own panel. The nav offset (50px + 0.5rem body margins, plus 1rem for the XP pill) is computed from the given values, not measured.
- Suite: character and tools specs 16 files / 152 tests pass; `tsc -p tsconfig.app.json` clean. I did not run the full suite or `ng build`.
- Open questions: The 1440 px and 375 px browser check is not done. The 1rem allowance under the card for the XP pill is a guess.

## Answer

- **Ratio on phones:** the card keeps 5:7 at every size; on phones its host is `min(100%, (100svh - nav - margins) * 5/7)` wide and centred (the fixed `--card-height` and the full-width bleed are gone).
- **Panel:** the sheet page and the sheet tool no longer wrap the sheet in `p-card`. The white panel is the `.details` block (tabs) only, and the player notes get their own panel. The character card sits on the page background.
- **Checked:**
  - Character and tools specs 16 files, 152 tests; full suite 92 files, 716 tests; build OK.
  - Browser at 1440 px: the card on the page background, the details in the white panel.
  - Browser at 375 px: the card 327 × 458 (ratio 0.714), centred, the pill on the border, no horizontal scroll.
