import { SharedCombatRoll } from '../../dice/models/dice-api';
import { Skill } from '../../skill/models/skill';
import { rollOf } from '../../skill/helpers/skill-roll.rules';
import { Encounter } from '../models/combat';

/** The dice of one skill use, as the table throws them. */
export interface SkillUseRoll {
  values: number[];
  sides: number;
  combat: SharedCombatRoll;
}

/** The roll of a skill use (the encounter before and after it), or null when the use drew no dice. */
export function skillUseRoll(
  before: Encounter,
  after: Encounter,
  use: { casterId: string; skillId: string; targetIds: string[] },
  skills: Skill[],
): SkillUseRoll | null {
  // Without GM validation, the results are applied at once and their log lines follow the skill's.
  const entry = [...after.log].reverse().find((line) => line.kind === 'skill');
  const skill = skills.find((s) => s.id === use.skillId);
  if (entry?.kind !== 'skill' || !skill || !entry.rolls.length) return null;
  const name = (id: string) =>
    after.combatants.find((c) => c.id === id)?.name ?? '';
  const known = new Set(before.pending.map((p) => p.id));
  return {
    values: entry.rolls,
    sides: rollOf(skill).faces,
    combat: {
      casterName: name(use.casterId),
      skillName: skill.name,
      targetNames: use.targetIds.map(name),
      pendingIds: after.pending.map((p) => p.id).filter((id) => !known.has(id)),
      total: entry.total,
      success: entry.success,
    },
  };
}
