import { joinPercentile, rollDice, rollDie, splitPercentile } from './dice';
import { cryptoRandomSource, seededRandomSource } from './random-source';

/** Pearson's chi-square of observed counts against a uniform distribution. */
function chiSquare(counts: number[], total: number): number {
  const expected = total / counts.length;
  return counts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
}

/**
 * Critical values at α = 1e-6 (Wilson–Hilferty approximation): a fair die fails only once in a million runs,
 * while a biased one (say one face at 1/6 + 1%) is far above them at 600,000 rolls.
 */
const CRITICAL = { df5: 37.5, df19: 64.4 };

describe('dice', () => {
  it('rolls within range', () => {
    const source = seededRandomSource('range');
    for (const sides of [2, 4, 6, 10, 20, 100, 1000]) {
      for (const value of rollDice(source, 100, sides)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(sides);
      }
    }
  });

  it('refuses impossible dice', () => {
    expect(() => rollDie(seededRandomSource('x'), 1)).toThrow(RangeError);
    expect(() => rollDie(seededRandomSource('x'), 2.5)).toThrow(RangeError);
    expect(() => rollDice(seededRandomSource('x'), 0, 6)).toThrow(RangeError);
    expect(() => rollDice(seededRandomSource('x'), 101, 6)).toThrow(RangeError);
  });

  it.each([
    [6, CRITICAL.df5],
    [20, CRITICAL.df19],
  ])('is uniform: chi-square on 600,000 crypto rolls of a d%i', (sides, critical) => {
    const total = 600_000;
    const counts = new Array<number>(sides).fill(0);
    const source = cryptoRandomSource();
    for (let i = 0; i < total; i++) counts[rollDie(source, sides) - 1]++;
    expect(chiSquare(counts, total)).toBeLessThan(critical);
  });

  it('the chi-square check does catch a biased die', () => {
    const total = 600_000;
    const counts = new Array<number>(6).fill(total / 6);
    counts[0] += 0.01 * total; // one face 1% more likely
    counts[1] -= 0.01 * total;
    expect(chiSquare(counts, total)).toBeGreaterThan(CRITICAL.df5);
  });

  it('splits every d100 value onto two d10s exactly once, and reads it back', () => {
    const pairs = new Set<string>();
    for (let value = 1; value <= 100; value++) {
      const { tens, units } = splitPercentile(value);
      expect(tens % 10).toBe(0);
      expect(tens).toBeGreaterThanOrEqual(0);
      expect(tens).toBeLessThanOrEqual(90);
      expect(units).toBeGreaterThanOrEqual(0);
      expect(units).toBeLessThanOrEqual(9);
      expect(joinPercentile(tens, units)).toBe(value);
      pairs.add(`${tens}+${units}`);
    }
    expect(pairs.size).toBe(100);
    expect(splitPercentile(100)).toEqual({ tens: 0, units: 0 });
  });
});
