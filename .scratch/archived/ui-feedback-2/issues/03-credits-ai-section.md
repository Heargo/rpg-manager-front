# Credits: a section on the use of AI

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- New section in the credits page (EN/FR): AI was used for the code, the documentation, the logo and the custom SVG icons.
- It says the author would be glad to work with artists to remove the AI "slop" and give the interfaces more life (with the contact link if the page has one).

## Green

- Files: credits-page.component.ts, static-pages.spec.ts, public/i18n/{en,fr}.json
- Change: new AI section (credits.aiTitle/ai/aiContact) with link to /contact; spec asserts it in EN and FR.
- Suite: 131 files, 1098 tests pass (baseline 1099; 4 hero tests replaced by 2); ng build OK
- Open questions: none

## Answer

Done on the feedback branch; checked in the browser at mobile width (no horizontal scroll, no console error).
