# Player actions only on their own turn

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Player side)

- Player view: actions (skills, items, counters) only when the active combatant is theirs; otherwise the same combat view without actions and a "Waiting for <name>" line (FR/EN).
- Host: a player's use-skill, use-item and tick-action off turn are rejected with `combat.errors.notYourTurn`. The GM is never blocked.
