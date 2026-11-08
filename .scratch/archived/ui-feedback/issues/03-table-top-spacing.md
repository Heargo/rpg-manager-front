# Too much space above the game table

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Bugs).

The table page has a large gap under the nav bar (`refs/table-top-spacing.png`). Bring it in line with the other pages.

## Answer

Cause: the nav bar sits in the page flow (about 50 px tall), but `.main-container` also had `margin-top: 60px` for a fixed nav that never existed, so every page had a double gap; the table showed it most. Fix: the nav bar's host is now `position: sticky; top: 0.5rem; z-index: 10` (it stays visible while scrolling), and the extra margin is gone.

Checked in the browser (CSS-only, decided with the user): on the GM table, nav bottom at 58 px and title top at 74 px (was about 134 px). The other pages lose the same extra 60 px.
