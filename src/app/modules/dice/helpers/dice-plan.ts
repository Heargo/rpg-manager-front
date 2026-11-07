import { splitPercentile } from '../../../core/generators/dice';
import { DieRole } from './dice-labels';

/** One die to throw and the value it must show (already drawn fairly). */
export interface DiePlan {
  role: DieRole;
  value: number;
  /** Text on the top face. */
  text: string;
}

export interface ThrowPlan {
  dice: DiePlan[];
  /** Seed for the throw's look (positions, spin); never for values. */
  seed: string;
}

/** Most dice simulated at once; the result bar still lists every value. */
export const MAX_THROWN_DICE = 20;

/** The dice to throw for drawn values: one die each, two for a d100 (tens and units). */
export function planDice(sides: number, values: number[]): DiePlan[] {
  const dice = values.flatMap((value): DiePlan[] => {
    if (sides !== 100) return [{ role: { sides }, value, text: String(value) }];
    const { tens, units } = splitPercentile(value);
    return [
      { role: { percentile: 'tens' }, value: tens, text: String(tens).padStart(2, '0') },
      { role: { percentile: 'units' }, value: units, text: String(units) },
    ];
  });
  return dice.slice(0, sides === 100 ? MAX_THROWN_DICE - (MAX_THROWN_DICE % 2) : MAX_THROWN_DICE);
}

/** 0 (lowest possible total) to 1 (highest), for colouring the total. */
export function totalRatio(values: number[], sides: number): number {
  const count = values.length;
  if (count === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return count * sides === count ? 1 : (total - count) / (count * sides - count);
}
