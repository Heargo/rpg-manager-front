# Landing: footer below the fold

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Bugs and layout)

- On the landing page, the footer is not visible without scrolling, at desktop and mobile widths: the pitch section fills the viewport height minus the nav bar (or more), never less.

## Baseline

Test Files 173 passed, Tests 1417 passed.

## Seams

None: the behaviour is layout (viewport height), which jsdom does not measure. Checked in the browser instead (like F02).

## Answer

The footer was inside the full-height block, so it sat at the bottom of the first screen. Now only the content section has the full height (`100svh - 2.5rem`, more than the real nav bar offset) and the footer follows it. Checked in the browser: footer starts at 786px on a 768px desktop viewport, 1452px on a 375x812 phone, no horizontal scroll, FR and EN, no console error. Suite unchanged: 173 files, 1417 tests pass.
