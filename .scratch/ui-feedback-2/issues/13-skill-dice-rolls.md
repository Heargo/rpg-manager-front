# Skill uses roll dice

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md`

- World setting `skillRollsEnabled` (default true), in World rules (and the wizard defaults).
- Active skills get `roll: { count, faces }` (default 1d20) and `success: { mode: 'always' } | { mode: 'threshold', value } | { mode: 'formula', formula }`; effect amounts may use `roll`. Formula variables: `roll`, `rank`, `level`, caster attribute maxima by name, target maxima as `target_<name>` (or the parser's chosen syntax). Validated live in the skill editor.
- Pure `resolveSkillUse(skill, rank, caster, target, rolls, enabled)` → `{ success, rolls, total, amounts }`.
- The sheet's active skills get a Use button: rolls the dice (the dice overlay/roller), then shows success/failure and the amounts. No target application yet (combat tickets use the helper).
- Default skills (starter classes) get sensible rolls.
