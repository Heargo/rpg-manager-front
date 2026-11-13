import { Skill } from '../../skill/models/skill';
import { CombatSide } from '../models/combat';
import { Cell, combatantsInRange } from './combat-grid.rules';

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

export interface TargetOption {
  id: string;
  name: string;
  portraitId?: string;
  lifePercent?: number;
  disabled: boolean;
}

export interface TargetGroup {
  id: 'enemies' | 'allies';
  options: TargetOption[];
}

interface TargetCandidate extends Candidate {
  name: string;
  portraitId?: string;
  lifePercent?: number;
  position?: Cell;
}

const isHarmful = (skill: Pick<Skill, 'target' | 'effects'>) =>
  skill.target === 'one-enemy' ||
  skill.target === 'all-enemies' ||
  skill.effects.some((e) => e.kind === 'damage');

/** The combatants a skill can aim at, in two groups (the harmful ones list enemies first), out-of-range ones disabled on a grid. */
export function targetGroups(
  skill: Pick<Skill, 'target' | 'effects' | 'range'>,
  casterId: string,
  combatants: TargetCandidate[],
  grid?: { enabled?: boolean; columns?: number; rows?: number },
): TargetGroup[] {
  const caster = combatants.find((c) => c.id === casterId);
  const inRange =
    grid?.enabled && skill.range !== undefined && caster?.position
      ? new Set(combatantsInRange(casterId, skill.range, combatants))
      : undefined;
  const option = (c: TargetCandidate): TargetOption => ({
    id: c.id,
    name: c.name,
    ...(c.portraitId !== undefined && { portraitId: c.portraitId }),
    ...(c.lifePercent !== undefined && { lifePercent: c.lifePercent }),
    disabled:
      !!inRange && c.id !== casterId && !!c.position && !inRange.has(c.id),
  });
  const enemyCamp = caster ? camp(caster.side) === 'friend' : true;
  const enemies: TargetGroup = {
    id: 'enemies',
    options: combatants
      .filter((c) => (camp(c.side) === 'enemy') === enemyCamp)
      .map(option),
  };
  const allies: TargetGroup = {
    id: 'allies',
    options: combatants
      .filter((c) => (camp(c.side) === 'enemy') !== enemyCamp)
      .map(option),
  };
  return isHarmful(skill) ? [enemies, allies] : [allies, enemies];
}

/** The picked targets after the multi-select reports `ids`: single-target skills keep the last newly added one. */
export function setTargets(
  skill: Pick<Skill, 'target'>,
  picked: string[],
  ids: string[],
): string[] {
  if (!targetsArePicked(skill)) return picked;
  if (skill.target === 'area') return ids;
  const added = ids.filter((id) => !picked.includes(id));
  return added.length ? [added[added.length - 1]] : ids.slice(-1);
}
