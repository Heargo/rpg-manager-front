import { Skill } from '../../skill/models/skill';
import { CombatAttribute } from '../models/combat';
import { skillPreview } from './combat.rules';

/** "5 damage, 3 Mana, cooldown 2": what a skill does for a caster of this level and these maxima, worded through `t`. */
export function skillSummary(
  skill: Skill,
  skillLevel: number,
  caster: { level: number; attributes: CombatAttribute[] },
  rollsEnabled: boolean,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  const preview = skillPreview(
    skill,
    skillLevel,
    {
      level: caster.level,
      maxima: Object.fromEntries(caster.attributes.map((a) => [a.name, a.max])),
    },
    rollsEnabled,
  );
  const parts = preview.effects.map((effect) =>
    t(`combat.skill.${effect.kind}`, {
      amount: effect.amount,
      attribute: effect.attribute,
      duration: effect.duration,
    }),
  );
  if (preview.cost)
    parts.push(`${preview.cost.amount} ${preview.cost.attribute}`);
  if (preview.cooldown)
    parts.push(t('combat.skill.cooldown', { turns: preview.cooldown }));
  if (skill.range) parts.push(t('combat.skill.range', { cells: skill.range }));
  return parts.join(', ');
}
