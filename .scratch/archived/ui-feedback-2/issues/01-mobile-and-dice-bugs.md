# Mobile nav menu and dice inputs bugs

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md`

- Nav bar, mobile width: opening the avatar menu must not overflow the viewport (no horizontal scroll); the menu stays inside the screen, aligned to the right edge.
- Dice page, mobile width: the die faces choice (d4…d100) wraps or fits the screen; no horizontal scroll.
- Dice page: the dice count `p-inputNumber` shows every digit of its max (10 shows "10", not "0").
