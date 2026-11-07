import { Character, WorldAttribute } from '../../world/models/world';

export interface AttributeStat {
  attributeId: string;
  name: string;
  /** The world's base value. */
  base: number;
  /** Stat points spent on it. */
  points: number;
  /** Total of the equipped items' modifiers for it. */
  bonus: number;
  max: number;
  current: number;
}

export interface BarStat {
  name: string;
  current: number;
  max: number;
  /** 0 to 100, for a progress bar. */
  percent: number;
}

/**
 * Every attribute of the world for one character: base + points + equipped modifiers = max, and the current value
 * (capped at max, never below 0). Item modifiers name attributes, so they match by name.
 */
export function attributeStats(
  attributes: WorldAttribute[],
  character: Character,
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
  return attributes.map((attribute) => {
    const own = character.attributes.find(
      (entry) => entry.attributeId === attribute.id,
    );
    const points = own?.points ?? 0;
    const bonus = bonusByName.get(attribute.name) ?? 0;
    const max = attribute.baseValue + points + bonus;
    const current = Math.max(0, Math.min(own?.current ?? max, max));
    return {
      attributeId: attribute.id,
      name: attribute.name,
      base: attribute.baseValue,
      points,
      bonus,
      max,
      current,
    };
  });
}

/** The world's bar attributes (life, mana) for one character; a bar is missing when the world has none. */
export function barStats(
  stats: AttributeStat[],
  barAttributes: { life?: string; mana?: string },
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
