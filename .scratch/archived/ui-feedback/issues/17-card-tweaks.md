# Character card tweaks: coins only, XP pill on the border, bigger, full screen on phones

Status: resolved
Type: task
Blocked by: 16

User feedback (2026-11-08): "remove the money icon, only keep the number with the coins; put the experience bar very small as a number half on the bottom border of the level card; make the card bigger on laptop; for responsive design make it fill the full screen for mobiles".

## Direction

1. **Money:** remove the wallet icon; keep `app-coin-display` only (numbers with coin icons).
2. **XP:** remove the XP bar row from the bottom overlay. Instead, a small pill sits centred on the card's bottom border, half outside the card (straddling the frame). It holds a very thin progress line and the number "xp / next" in small type. Keep the `xp-progress` (`p-progressbar`) and `xp-text` hooks inside the pill. The card's container leaves room below for the overhanging half.
3. **Laptop:** the card is bigger, with a left column of about 24rem (was 18rem) from 52rem width up; the details keep the rest.
4. **Phones** (below 52rem): the card fills the screen width (edge to edge within the page gutter) and about the viewport height under the sticky nav (`min(100svh - nav, 177vw)`, keeping roughly 5:7 when possible); the details follow below.

## Checks

The card spec stays green and unchanged. Checked in the browser at 1280 px and at 375 px, with no horizontal scroll and the pill fully visible.

## Green

- Files: src/app/modules/character/components/character-card/character-card.component.{html,scss}, src/app/modules/character/components/character-sheet/character-sheet.component.scss
- Change: wallet icon removed (coin display only); XP bar row replaced by a small pill (thin p-progressbar + "xp / next", hooks kept) centred on the card's bottom border, host padding-bottom leaves room for the overhang; card column 24rem from 52rem up; below 52rem the card is full width with height min(100svh - 4.5rem, 177vw) via a --card-height variable.
- Suite: character components specs 4 files / 32 tests pass; tsc app clean.
- Open questions: browser check at 1280 px and 375 px not done; the 4.5rem nav offset is an estimate.

## Answer

- **Money:** the wallet icon is gone; only `app-coin-display` remains.
- **Stat points:** removed from the card (user, 2026-11-08); they stay in the Stats tab. The card spec now asserts `card-stat-points` is absent.
- **XP:** a small pill (a thin `p-progressbar` and "xp / next") straddles the card's bottom border, positioned in a `.frame` wrapper around the article.
- **Laptop:** the card column is 24rem from 52rem up (card 384 × 538 at 1440 px).
- **Phones:**
  - the card bleeds out of the sheet panel padding (`margin-inline: -2.25rem`) to about 8 px from the screen edges;
  - its height is `min(100svh - nav - margins, 177vw)`;
  - `min-width: 0` on the grid children, because the old `aspect-ratio` with a fixed height widened the page to 518 px.
- **Checked:**
  - Card and sheet specs 4 files, 32 tests.
  - Browser at 1440 px: 384 × 538, the pill on the border.
  - Browser at 375 px: x 8 to 367, height 664, the pill on the border, no horizontal scroll.
  - The stat points removal was verified in the source; the dev server was showing a stale bundle while U15 didn't compile.
