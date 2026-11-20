/** The dice of one roll: how many of each type, in the order the types were first tapped. */
export type DicePool = { sides: number; count: number }[];

/** A drawn pool: the values of each type. */
export interface DiceGroup {
  sides: number;
  count: number;
  values: number[];
}

export function addDie(pool: DicePool, sides: number): DicePool {
  return pool.some((entry) => entry.sides === sides)
    ? incrementDie(pool, sides)
    : [...pool, { sides, count: 1 }];
}

export function incrementDie(pool: DicePool, sides: number): DicePool {
  return pool.map((entry) =>
    entry.sides === sides ? { ...entry, count: entry.count + 1 } : entry,
  );
}

/** One die less of that type; the entry goes away at zero. */
export function decrementDie(pool: DicePool, sides: number): DicePool {
  return pool
    .map((entry) =>
      entry.sides === sides ? { ...entry, count: entry.count - 1 } : entry,
    )
    .filter((entry) => entry.count > 0);
}

export function clearPool(): DicePool {
  return [];
}

/** "2d6+1d4+3": the dice, then the modifier when it isn't zero. */
export function poolNotation(pool: DicePool, modifier: number): string {
  const dice = pool.map((entry) => `${entry.count}d${entry.sides}`).join('+');
  if (modifier === 0) return dice;
  return `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;
}

export function rollTotal(values: number[], modifier: number): number {
  return values.reduce((sum, value) => sum + value, modifier);
}

/** 0 (lowest possible total) to 1 (highest) over the whole pool, the modifier left out. */
export function poolRatio(groups: DiceGroup[]): number {
  const count = groups.reduce((sum, group) => sum + group.values.length, 0);
  const max = groups.reduce(
    (sum, group) => sum + group.values.length * group.sides,
    0,
  );
  const total = groups.reduce(
    (sum, group) => group.values.reduce((s, v) => s + v, sum),
    0,
  );
  return max === count ? 1 : (total - count) / (max - count);
}
