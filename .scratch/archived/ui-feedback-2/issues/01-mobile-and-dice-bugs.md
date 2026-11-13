# Mobile nav menu and dice inputs bugs

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md`

- Nav bar, mobile width: opening the avatar menu must not overflow the viewport (no horizontal scroll); the menu stays inside the screen, aligned to the right edge.
- Dice page, mobile width: the die faces choice (d4…d100) wraps or fits the screen; no horizontal scroll.
- Dice page: the dice count `p-inputNumber` shows every digit of its max (10 shows "10", not "0").

## Green

- Files: src/app/core/components/nav-bar/nav-bar.component.html, src/app/modules/dice/pages/dice-page/dice-page.component.ts
- Change: avatar tiered menu appended to body (stays in viewport); selectbutton wraps and is centred; dice count input widened to 7rem.
- Suite: 131 files, 1098 tests pass (baseline 1099; 4 hero tests replaced by 2); ng build OK
- Open questions: not checked in a browser

## Answer

Done on the feedback branch; checked in the browser at mobile width (no horizontal scroll, no console error).
