import { Skill } from '../../skill/models/skill';
import { CombatSide } from '../models/combat';

interface Candidate {
  id: string;
  side: CombatSide;
}

const camp = (side: CombatSide) => (side === 'enemy' ? 'enemy' : 'friend');

/** The targets a skill starts with: the caster for `self`, the whole camp for `all-*`, nothing when the user picks. */
export function defaultTargets(
  skill: Pick<Skill, 'target'>,
  casterId: string,
  combatants: Candidate[],
): string[] {
  const caster = combatants.find((c) => c.id === casterId);
  if (!caster) return [];
  switch (skill.target) {
    case 'self':
      return [casterId];
    case 'all-allies':
      return combatants
        .filter((c) => camp(c.side) === camp(caster.side))
        .map((c) => c.id);
    case 'all-enemies':
      return combatants
        .filter((c) => camp(c.side) !== camp(caster.side))
        .map((c) => c.id);
    default:
      return [];
  }
}

/** Whether the user picks the targets one by one (single-target skills keep one, `area` any number). */
export function targetsArePicked(skill: Pick<Skill, 'target'>): boolean {
  return (
    skill.target === undefined ||
    skill.target === 'one-ally' ||
    skill.target === 'one-enemy' ||
    skill.target === 'area'
  );
}

/** The picked targets after a click on a combatant. */
export function toggleTarget(
  skill: Pick<Skill, 'target'>,
  picked: string[],
  id: string,
): string[] {
  if (!targetsArePicked(skill)) return picked;
  if (skill.target === 'area')
    return picked.includes(id)
      ? picked.filter((p) => p !== id)
      : [...picked, id];
  return picked.length === 1 && picked[0] === id ? [] : [id];
}
