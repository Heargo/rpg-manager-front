# Combat protocol follow-ups

Status: ready-for-agent
Type: task
Blocked by: 13

Spec: `../spec.md` (Combat: Encounter flow, Sync and storage).

Review notes left by N13 (see the archived `13-combat-protocol.md`, `## Review`):

1. `projectEncounter`: `pending` and `log` reach players unfiltered, so a hidden NPC's life numbers can leak through them. The roll result itself is posted for everyone (spec step 4); strip only what the NPC's visibility rules hide (life values after a hit, for instance).
2. `combat/initiative`: a player can type their roll even when the world's initiative mode is `rolled`. Reject it outside `typed`.
3. `combat/use-item` and `combat/end`: errors from `applyCharacterAction` reach the client as raw codes; map them to `combat.errors.*` keys (EN and FR).
4. Found in the N14 browser check: using a skill doesn't tick an action counter, though the spec says counters are "ticked by hand or by using a skill".
   **Decided (user, 2026-11-13): each skill names its action type.** The skill model gets an optional action type (the name of one of the world's combat action types); the skill editor shows it as a select filled from the world's action types; the default classes and skills get sensible values. Using a skill in combat ticks that counter, or the world's first action type when the skill has none or names a type the world no longer has. Using a consumable item ticks the world's first action type. A counter at 0 doesn't block anything (reminder, not a lock). Included in skill JSON / export; no backward compatibility needed.
