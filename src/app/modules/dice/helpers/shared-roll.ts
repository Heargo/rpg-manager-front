import { MAX_DICE, MAX_SIDES } from '../../../core/generators/dice';
import {
  SHARED_ROLLS_KEPT,
  SharedRoll,
  SharedRollRequest,
} from '../models/dice-api';

export function isValidRollRequest(
  payload: unknown,
): payload is SharedRollRequest {
  const { count, sides, pool, modifier } = (payload ?? {}) as Record<
    string,
    unknown
  >;
  if (pool !== undefined) {
    if (!Array.isArray(pool) || pool.length === 0) return false;
    if (
      modifier !== undefined &&
      (!Number.isInteger(modifier) || Math.abs(modifier as number) > MAX_SIDES)
    )
      return false;
    let dice = 0;
    for (const entry of pool as Record<string, unknown>[]) {
      const { count: n, sides: s } = entry ?? {};
      if (
        !Number.isInteger(n) ||
        !Number.isInteger(s) ||
        (n as number) < 1 ||
        (s as number) < 2 ||
        (s as number) > MAX_SIDES
      )
        return false;
      dice += n as number;
    }
    return dice <= MAX_DICE;
  }
  return (
    Number.isInteger(count) &&
    Number.isInteger(sides) &&
    (count as number) >= 1 &&
    (count as number) <= MAX_DICE &&
    (sides as number) >= 2 &&
    (sides as number) <= MAX_SIDES
  );
}

/** The table's rolls with a new one in front, keeping the most recent ones. */
export function addSharedRoll(
  rolls: SharedRoll[],
  roll: SharedRoll,
): SharedRoll[] {
  return [roll, ...rolls].slice(0, SHARED_ROLLS_KEPT);
}
