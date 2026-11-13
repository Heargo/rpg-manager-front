# Grid moves: GM anywhere, players on their turn

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Decisions: player movement, moves cost a movement action)

- World rules, Combat, action types: a **movement** flag per type (wizard, World rules page, sandbox). Validation and defaults updated (no backward compatibility).
- Host: a player's move is accepted only on their turn, to a reachable cell (`reachableCells`), and only if the first movement type has a use left; it ticks that type. Errors `combat.errors.notYourTurn`, `combat.errors.outOfReach`, `combat.errors.noMovementLeft`.
- GM moves any token anywhere at any time, without ticking.
- Grid: a player can drag only their own token, only on their turn; reachable cells shown.
