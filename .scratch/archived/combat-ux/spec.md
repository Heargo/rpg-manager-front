# Spec: combat made easy (2026-11-13)

User request: rethink the combat screens so they are very easy to use, for the GM and for players. Answers from the user are in Decisions; the rest is marked "assumed". One commit per ticket.

## Decisions

- **Shared rolls**: every combat roll (skill, basic attack, item, initiative) is animated on **every device**, whatever the table's shared-dice toggle. A hidden NPC's roll shows the dice and the total, never its hidden stats.
- **Player movement**: only on their own turn, only to the highlighted reachable cells (enforced by the host). The GM moves any token anywhere, at any time, setup included.
- **Action tabs at 0**: the tab stays visible but its skills and items are disabled; the GM keeps a small −/+ on the tab to correct the count.
- **Moves cost a movement action**: an action type can be marked **movement** in World rules (Combat, action types). A grid move by a player ticks the first movement type; when it is at 0 the player can't move. GM moves never tick anything.

## GM layout (assumed)

- Desktop splitter stays three columns: players | scene | tools.
- **Scene** (middle): the grid when the world has one, else the turn order list (round, combatants, life bars, statuses).
- **Tools** (right): collapsible sections (Optimus UI accordion), in this order: **Dice**, **Combat**, **Notes**. All open by default; open/closed remembered per device. Combat holds: round and Next turn / Undo / End, pending results, the active combatant's action tabs, the selected combatant's manual edits (damage, heal, statuses), the start form when no combat runs.
- Mobile: same sections stacked under the scene.

## Starting a combat

- Two **multi-selects** (Optimus UI `p-multiselect`, chips, filter, portrait in each option): one for the **characters**, one for the **NPCs** (catalogue NPCs, each pick adds one copy; a count per NPC, assumed).
- With a grid: after picking, the GM **places** tokens on a setup grid before pressing Start. Unplaced tokens get a default cell (party on the left columns, enemies on the right, assumed). Start is the same button.
- **Initiative input**: shown only when the world lets someone type it (initiative step on and mode `typed`). Rolled mode rolls at start (shared roll); free order is drag and drop only.

## Turn actions

- The counters become **tabs**, one per action type, labelled with what is left: `Action (1/1)`, `Mouvement (0/1)`. The selected tab lists the skills of that type (a skill without type or with an unknown type belongs to the first one), plus basic attack and usable items under the first non-movement type (assumed).
- Using a skill ticks its tab (as today). A tab at 0 disables its entries.
- Without the action counters step (World rules), there are no tabs: one flat list as today.
- **Target picking**: a multi-select listing the combatants, grouped by side (enemies first for harmful skills, allies first for healing, assumed), with portrait, life bar where visible, and the skill's range/limit (out of range on the grid = disabled; max targets reached = others disabled). Picking on the grid still works and stays in sync.

## Rolls and results

- Every action that rolls dice starts a **shared 3D roll** (the existing dice overlay) on every device.
- A **recap banner**, top left of the table on every device: caster, skill, targets, then the dice and total once the roll lands. It stays until the GM resolves the result, then fades (assumed: 4 s).
- The result card (apply, edit, dismiss) appears for the GM **once the roll has landed**. With GM validation off, it is applied when the roll lands.

## Player side

- A player sees the combat (order, grid, banner) at all times, but their **actions only on their own turn**; otherwise the same view without actions, with "Waiting for <name>" (assumed). The host rejects a skill, item or tick sent off turn (`combat.errors.notYourTurn`).
- On a grid, the player drags their own token on their turn (see Decisions).

## Out of scope

- Fog of war, line of sight, areas of effect.
- Changing how results are computed.
