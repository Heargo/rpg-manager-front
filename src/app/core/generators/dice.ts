import { randomInt } from './random';
import { RandomSource } from './random-source';

export const MAX_DICE = 100;
export const MAX_SIDES = 1000;

/** One fair roll: each face has probability exactly 1/sides (randomInt rejects the biased tail). */
export function rollDie(source: RandomSource, sides: number): number {
  if (!Number.isInteger(sides) || sides < 2 || sides > MAX_SIDES) throw new RangeError(`A die needs 2 to ${MAX_SIDES} sides`);
  return randomInt(source, 1, sides);
}

export function rollDice(source: RandomSource, count: number, sides: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_DICE) throw new RangeError(`Roll 1 to ${MAX_DICE} dice`);
  return Array.from({ length: count }, () => rollDie(source, sides));
}

/**
 * A d100 result shown on two d10s: tens die `00`–`90`, units die `0`–`9`; `00` + `0` reads 100.
 * The value is drawn once, uniformly in 1..100; this only decides what the two dice show.
 */
export function splitPercentile(value: number): { tens: number; units: number } {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new RangeError('A d100 value is 1 to 100');
  return { tens: Math.floor((value % 100) / 10) * 10, units: value % 10 };
}

export function joinPercentile(tens: number, units: number): number {
  return tens + units === 0 ? 100 : tens + units;
}
