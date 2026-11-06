import { RandomSource } from './random-source';

const TWO_POW_32 = 0x1_0000_0000;

/**
 * Uniform integer in [min, max], both included. Unbiased: values from the uneven tail of the 2^32 range
 * are rejected and redrawn instead of being folded in with `%`.
 */
export function randomInt(source: RandomSource, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) throw new RangeError('randomInt needs integer bounds');
  if (max < min) throw new RangeError(`randomInt: max (${max}) is below min (${min})`);
  const range = max - min + 1;
  if (range > TWO_POW_32) throw new RangeError('randomInt: range larger than 2^32');
  const limit = TWO_POW_32 - (TWO_POW_32 % range);
  let value = source.nextUint32();
  while (value >= limit) value = source.nextUint32();
  return min + (value % range);
}

export function pick<T>(source: RandomSource, list: readonly T[]): T {
  if (list.length === 0) throw new RangeError('pick: empty list');
  return list[randomInt(source, 0, list.length - 1)];
}

export interface Weighted<T> {
  value: T;
  /** Positive integer, so the draw stays exact. */
  weight: number;
}

export function weightedPick<T>(source: RandomSource, entries: readonly Weighted<T>[]): T {
  if (entries.length === 0) throw new RangeError('weightedPick: empty list');
  let total = 0;
  for (const { weight } of entries) {
    if (!Number.isInteger(weight) || weight <= 0) throw new RangeError('weightedPick: weights must be positive integers');
    total += weight;
  }
  let roll = randomInt(source, 1, total);
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  throw new Error('unreachable');
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(source: RandomSource, list: readonly T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(source, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** True with probability numerator / denominator, exactly. */
export function chance(source: RandomSource, numerator: number, denominator: number): boolean {
  return randomInt(source, 1, denominator) <= numerator;
}
