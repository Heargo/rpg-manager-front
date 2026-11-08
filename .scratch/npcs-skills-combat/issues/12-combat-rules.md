# Combat rules (pure) and world combat settings

Status: ready-for-agent
Type: task
Blocked by: 05, 15

Spec: `../spec.md` (Combat: World combat rules, Encounter flow).

World combat settings (life attribute, initiative mode, action types per turn, grid on/off and size, movement, basic attack, defence) with validation and export, in the World rules page Combat section and the wizard. `combat.rules.ts`: start an encounter from characters and NPC copies ("Goblin × 3"), initiative (rolled / typed / free order), turn and round progression skipping down combatants, action counters, a skill's computed effects at a rank (formula + dice text), use a skill (dice rolled with the `RandomSource`, cost and cooldown taken, a pending result), GM apply / edit then apply / dismiss of a pending result (damage with optional defence, heal capped at max, buffs with duration, notes), manual changes, one-step undo, end-of-combat reward proposal. No network, no combat UI.
