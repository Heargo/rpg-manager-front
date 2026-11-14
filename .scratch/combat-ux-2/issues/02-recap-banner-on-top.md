# Recap banner above the dice screen, with bubbles

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Bugs: banner under the dice screen; Improvements: prettier recap). D03 was merged into this ticket (same component).

- The banner stays visible above the dice overlay and its backdrop, on the table page (GM and player) and in the sandbox, desktop and mobile.
- Layout: caster bubble → target bubbles (portrait or initial; enemies ringed like the grid), then dice and total and the outcome. Names as `title` and accessible labels. `SharedRoll.combat` may need portrait ids and sides (no hidden attributes).
