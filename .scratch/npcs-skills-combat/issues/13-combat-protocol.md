# Combat protocol and host persistence

Status: needs-triage
Type: task
Blocked by: 12, 02, 10

Spec: `../spec.md` (Combat: Sync and storage).

Host business for the `combat/*` routes and the `combat/state` topic; encounter saved with the world and resumed after a host reload. Authorization: GM routes; a player only for their own combatant (initiative, use skill, items, move, tick action, end turn on their turn); `combat/use-skill` rolls on the host and posts a pending result; only the GM applies, edits or dismisses it. Characters' current values change on their records, NPC copies only in the encounter; NPC combatants projected with the world's NPC visibility rules (10); rewards through `grant-xp`. Tested over the fake peer network.
