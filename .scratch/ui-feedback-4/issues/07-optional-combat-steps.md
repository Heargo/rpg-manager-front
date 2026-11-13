# Optional combat steps in World rules

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Optional combat steps)

- `CombatRules` gets a switch per step: initiative, action counters, GM validation, defence, rewards (all on by default; no migration, dev worlds get the defaults).
- World rules Combat section (and the wizard's Rules step, Tools sandbox): one toggle per step; a step's own settings are hidden when it is off.
- Combat: initiative off = free order; action counters off = no counters on the turn; GM validation off = results apply at once (cost, effects, log, no pending result); defence off = no reduction offered; rewards off = no XP/money/loot at the end. Host and player views both follow.
