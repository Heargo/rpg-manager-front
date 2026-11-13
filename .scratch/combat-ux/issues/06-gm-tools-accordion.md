# GM table: collapsible Dice, Combat, Notes

Status: ready-for-agent
Type: task
Blocked by: 05

Spec: `../spec.md` (GM layout)

- Right column (tools): Optimus UI accordion, sections Dice, Combat, Notes in that order, all open by default, open state remembered per device (localStorage, guarded).
- Combat section: round and Next turn / Undo / End, pending results, active combatant's actions, selected combatant's manual edits, the start form when no combat.
- Middle column: the grid when the world has one, else the turn order list. Mobile: sections stacked under the scene.
- Tools combat sandbox uses the same split.
