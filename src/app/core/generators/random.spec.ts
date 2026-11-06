import { createSeed, cryptoRandomSource, RandomSource, seededRandomSource } from './random-source';
import { chance, pick, randomInt, shuffle, weightedPick } from './random';

/** Returns the given values in order. */
function sequence(...values: number[]): RandomSource & { calls: number } {
  const source = {
    calls: 0,
    nextUint32() {
      if (source.calls >= values.length) throw new Error('sequence exhausted');
      return values[source.calls++];
    },
  };
  return source;
}

describe('randomInt', () => {
  it('maps a raw value into the range', () => {
    expect(randomInt(sequence(7), 1, 6)).toBe(2); // 7 % 6 = 1 → 1 + 1
    expect(randomInt(sequence(0), 1, 6)).toBe(1);
  });

  it('rejects values in the uneven tail instead of folding them in', () => {
    // 2^32 % 3 = 1, so the last value (2^32 - 1) would favour one face: it must be redrawn.
    const source = sequence(0xffff_ffff, 5);
    expect(randomInt(source, 1, 3)).toBe(3); // 5 % 3 = 2 → 1 + 2
    expect(source.calls).toBe(2);
  });

  it('accepts the last value when the range divides 2^32', () => {
    const source = sequence(0xffff_ffff);
    expect(randomInt(source, 0, 3)).toBe(3);
    expect(source.calls).toBe(1);
  });

  it('stays within bounds', () => {
    const source = seededRandomSource('bounds');
    for (let i = 0; i < 10_000; i++) {
      const value = randomInt(source, -3, 17);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(17);
    }
  });

  it('refuses invalid bounds', () => {
    expect(() => randomInt(sequence(1), 5, 4)).toThrow(RangeError);
    expect(() => randomInt(sequence(1), 0, 1.5)).toThrow(RangeError);
  });
});

describe('random sources', () => {
  it('gives the same sequence for the same seed, a different one otherwise', () => {
    const draw = (seed: string) => {
      const source = seededRandomSource(seed);
      return Array.from({ length: 5 }, () => source.nextUint32());
    };
    expect(draw('abc')).toEqual(draw('abc'));
    expect(draw('abc')).not.toEqual(draw('abd'));
  });

  it('crypto source returns 32-bit unsigned integers', () => {
    const source = cryptoRandomSource();
    for (let i = 0; i < 600; i++) {
      const value = source.nextUint32();
      expect(Number.isInteger(value) && value >= 0 && value < 2 ** 32).toBe(true);
    }
  });

  it('creates readable seeds', () => {
    expect(createSeed(seededRandomSource('x'))).toMatch(/^[a-km-np-z2-9]{8}$/);
  });
});

describe('pick, weightedPick, shuffle, chance', () => {
  it('picks by index', () => {
    expect(pick(sequence(2), ['a', 'b', 'c'])).toBe('c');
    expect(() => pick(sequence(0), [])).toThrow(RangeError);
  });

  it('picks by weight, boundaries included', () => {
    const entries = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 3 },
    ];
    // randomInt(1, 4): raw 0 → 1 → 'a'; raw 1 → 2 → 'b'; raw 3 → 4 → 'b'
    expect(weightedPick(sequence(0), entries)).toBe('a');
    expect(weightedPick(sequence(1), entries)).toBe('b');
    expect(weightedPick(sequence(3), entries)).toBe('b');
    expect(() => weightedPick(sequence(0), [{ value: 'a', weight: 0.5 }])).toThrow(RangeError);
  });

  it('shuffles into a permutation, deterministically for a seed', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const once = shuffle(seededRandomSource('s'), list);
    expect([...once].sort((x, y) => x - y)).toEqual(list);
    expect(shuffle(seededRandomSource('s'), list)).toEqual(once);
    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('chance is exact on integer odds', () => {
    expect(chance(sequence(0), 1, 4)).toBe(true); // roll 1
    expect(chance(sequence(1), 1, 4)).toBe(false); // roll 2
  });
});
