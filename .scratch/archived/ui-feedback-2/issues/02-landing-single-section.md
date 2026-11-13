# Landing: drop the hero, full-height content section

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- Remove the first landing section (logo hero and scroll arrow).
- The remaining section (pitch, screenshot, calls to action) is at least the full viewport height (minus the nav bar); the footer is below the fold.
- Mobile: the call-to-action buttons are centred.

## Green

- Files: home-page.component.{html,scss,ts,spec.ts}, public/i18n/{en,fr}.json
- Change: hero and scroll arrow removed (plus scrollDown key); content section fills the viewport, footer below the fold; CTAs centred under 640px; spec updated.
- Suite: 131 files, 1098 tests pass (baseline 1099; 4 hero tests replaced by 2); ng build OK
- Open questions: not checked in a browser

## Answer

Done on the feedback branch; checked in the browser at mobile width (no horizontal scroll, no console error).
