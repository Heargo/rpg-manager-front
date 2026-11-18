import {
  addDie,
  clearPool,
  decrementDie,
  incrementDie,
  poolNotation,
  rollTotal,
} from './dice-pool.rules';
import { planPool } from './dice-plan';

describe('dice pool rules', () => {
  it('adds one die of the tapped type, keeping the order the types were first tapped', () => {
    let pool = addDie([], 6);
    pool = addDie(pool, 4);
    pool = addDie(pool, 6);

    expect(pool).toEqual([
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ]);
  });

  it('does not change the pool it was given', () => {
    const pool = [{ sides: 6, count: 1 }];

    addDie(pool, 6);

    expect(pool).toEqual([{ sides: 6, count: 1 }]);
  });

  it('increments and decrements the count of one entry', () => {
    const pool = [
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ];

    expect(incrementDie(pool, 4)).toEqual([
      { sides: 6, count: 2 },
      { sides: 4, count: 2 },
    ]);
    expect(decrementDie(pool, 6)).toEqual([
      { sides: 6, count: 1 },
      { sides: 4, count: 1 },
    ]);
  });

  it('drops an entry whose count reaches zero', () => {
    const pool = [
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ];

    expect(decrementDie(pool, 4)).toEqual([{ sides: 6, count: 2 }]);
  });

  it('clears the pool', () => {
    expect(clearPool()).toEqual([]);
  });

  it('writes the notation of the pool and its modifier', () => {
    const pool = [
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ];

    expect(poolNotation(pool, 3)).toBe('2d6+1d4+3');
    expect(poolNotation(pool, -2)).toBe('2d6+1d4-2');
    expect(poolNotation(pool, 0)).toBe('2d6+1d4');
    expect(poolNotation([{ sides: 20, count: 1 }], 0)).toBe('1d20');
  });

  it('adds the modifier to the sum of the dice', () => {
    expect(rollTotal([3, 4, 2], 3)).toBe(12);
    expect(rollTotal([3, 4, 2], -2)).toBe(7);
    expect(rollTotal([5], 0)).toBe(5);
  });

  it('throws every die of the pool, one per drawn value', () => {
    const plan = planPool([
      { sides: 6, values: [2, 5] },
      { sides: 4, values: [3] },
    ]);

    expect(plan.map((d) => d.value)).toEqual([2, 5, 3]);
    expect(plan.map((d) => d.role)).toEqual([{ sides: 6 }, { sides: 6 }, { sides: 4 }]);
  });

  it('throws a d100 of the pool as tens and units next to the other dice', () => {
    const plan = planPool([
      { sides: 100, values: [57] },
      { sides: 6, values: [1] },
    ]);

    expect(plan.map((d) => d.text)).toEqual(['50', '7', '1']);
  });
});
