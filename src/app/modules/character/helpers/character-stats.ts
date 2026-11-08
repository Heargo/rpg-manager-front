import { evaluateFormula } from '../../../core/helpers/formula';
import { Sheet, WorldAttribute } from '../../world/models/world';
import { Skill } from '../../skill/models/skill';
import { evaluateSkillAmount } from '../../skill/helpers/skill.rules';

export interface AttributeStat {
  attributeId: string;
  name: string;
  /** The world's base value. */
  base: number;
  /** Level of the attribute (stat points spent on it). */
  level: number;
  /** Total of the equipped items' modifiers for it. */
  bonus: number;
  /** Total of the permanent `modify` effects of the sheet's passive skills for it. */
  skillBonus: number;
  max: number;
  /** The stored current value for a bar attribute; always the max for any other. */
  current: number;
  /** Whether the world shows it as a life or mana bar: only those have a current value apart from the max. */
  isBar: boolean;
}

/** The world's bar attributes, by attribute id. */
export type BarAttributes = { life?: string; mana?: string };

export interface BarStat {
  name: string;
  current: number;
  max: number;
  /** 0 to 100, for a progress bar. */
  percent: number;
}

/**
 * Every attribute of the world for one character: round(formula at level) + equipped modifiers = max, and the current value
 * (capped at max, never below 0) for the bar attributes; any other attribute's current is its max. Item modifiers name attributes, so they match by name.
 * The sheet's passive skills add their permanent `modify` effects (at the sheet's rank) to the max, as their own line.
 */
export function attributeStats(
  attributes: WorldAttribute[],
  character: Sheet,
  barAttributes: BarAttributes,
  skills: Skill[] = [],
): AttributeStat[] {
  const bonusByName = new Map<string, number>();
  for (const entry of character.inventory) {
    if (!entry.equipped) continue;
    for (const modifier of entry.item.modifiers) {
      bonusByName.set(
        modifier.attribute,
        (bonusByName.get(modifier.attribute) ?? 0) + modifier.value,
      );
    }
  }
  const levels = levelsByName(attributes, character);
  const skillBonusByName = passiveBonuses(attributes, character, levels, bonusByName, skills);
  return attributes.map((attribute) => {
    const own = character.attributes.find(
      (entry) => entry.attributeId === attribute.id,
    );
    const level = own?.level ?? 0;
    const bonus = bonusByName.get(attribute.name) ?? 0;
    const skillBonus = skillBonusByName.get(attribute.name) ?? 0;
    const max = formulaMax(attribute, level, levels, character.level) + bonus + skillBonus;
    const isBar = [barAttributes.life, barAttributes.mana].includes(attribute.id);
    const current = isBar ? Math.max(0, Math.min(own?.current ?? max, max)) : max;
    return {
      attributeId: attribute.id,
      name: attribute.name,
      base: attribute.baseValue,
      level,
      bonus,
      skillBonus,
      max,
      current,
      isBar,
    };
  });
}

/** The permanent `modify` effects of the passive skills a sheet has, per attribute name; amounts read the maxima before skills. */
function passiveBonuses(
  attributes: WorldAttribute[],
  character: Sheet,
  levels: Record<string, number>,
  equipmentBonus: Map<string, number>,
  skills: Skill[],
): Map<string, number> {
  const bonuses = new Map<string, number>();
  const owned = skills.flatMap((skill) => {
    const entry = character.skills.find((own) => own.skillId === skill.id);
    return skill.type === 'passive' && entry ? [{ skill, rank: entry.rank }] : [];
  });
  if (!owned.length) return bonuses;
  const maxima = Object.fromEntries(
    attributes.map((attribute) => [
      attribute.name,
      formulaMax(attribute, levels[attribute.name], levels, character.level) + (equipmentBonus.get(attribute.name) ?? 0),
    ]),
  );
  for (const { skill, rank } of owned) {
    for (const effect of skill.effects) {
      if (effect.kind !== 'modify' || effect.duration !== 0) continue;
      const result = evaluateSkillAmount(effect.amount, { rank, level: character.level, maxima });
      if (result.ok) bonuses.set(effect.attribute, (bonuses.get(effect.attribute) ?? 0) + Math.round(result.value));
    }
  }
  return bonuses;
}

/** Every attribute's level by name, for the formulas that read other attributes. */
export function levelsByName(
  attributes: WorldAttribute[],
  character: Pick<Sheet, 'attributes'>,
): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const attribute of attributes) {
    levels[attribute.name] =
      character.attributes.find((entry) => entry.attributeId === attribute.id)?.level ?? 0;
  }
  return levels;
}

/** The formula's max for one attribute at a level, rounded (the base value when the formula fails). */
export function formulaMax(
  attribute: WorldAttribute,
  level: number,
  levels: Record<string, number>,
  playerLevel = 1,
): number {
  const result = evaluateFormula(attribute.formula, {
    level,
    base: attribute.baseValue,
    playerLevel,
    levels,
  });
  const value = result.ok ? Math.round(result.value) : attribute.baseValue;
  return attribute.cap === undefined ? value : Math.min(attribute.cap, value);
}

/** The world's bar attributes (life, mana) for one character; a bar is missing when the world has none. */
export function barStats(
  stats: AttributeStat[],
  barAttributes: BarAttributes,
): { life?: BarStat; mana?: BarStat } {
  const bar = (attributeId?: string): BarStat | undefined => {
    const stat = stats.find((entry) => entry.attributeId === attributeId);
    if (!stat) return undefined;
    const percent =
      stat.max > 0 ? Math.round((stat.current / stat.max) * 100) : 0;
    return { name: stat.name, current: stat.current, max: stat.max, percent };
  };
  return { life: bar(barAttributes.life), mana: bar(barAttributes.mana) };
}
