# Action tabs replace the counters

Status: ready-for-agent
Type: task
Blocked by: 02

Spec: `../spec.md` (Turn actions, Decisions: action tabs at 0)

- One tab per action type (Optimus UI tabs), label `Name (left/count)`. The selected tab lists the skills of that type (no type or unknown type = first type); basic attack and items under the first non-movement type.
- A tab at 0: its entries are disabled. GM only: a −/+ on the tab sets the count used.
- Action counters step off: no tabs, one flat list as today.
- A pure helper groups skills/items per tab (`combat-actions.rules.ts` or the existing combat-view rules).
