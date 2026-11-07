import { MAX_DICE, MAX_SIDES } from '../../../core/generators/dice';
import {
  SHARED_ROLLS_KEPT,
  SharedRoll,
  SharedRollRequest,
} from '../models/dice-api';

export function isValidRollRequest(
  payload: unknown,
): payload is SharedRollRequest {
  const { count, sides } = (payload ?? {}) as Record<string, unknown>;
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
