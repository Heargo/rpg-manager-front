# Target picking as a multi-select

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Turn actions, target picking)

- `p-multiselect` of the combatants, grouped by side (enemies first for harmful skills, allies first for heals), portrait or initial, life bar when visible, chips for picked ones.
- Max targets reached: other options disabled. On a grid, out-of-range combatants are disabled.
- Stays in sync with picking on the grid (`CombatTargetingBusiness`).
