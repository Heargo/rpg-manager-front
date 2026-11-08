import {
  LevelCurve,
  MAX_LEVEL,
  grantXp,
  levelRarity,
  isValidMaxLevel,
  levelCost,
  levelProgress,
  checkLevelCurve,
  validateLevelCurve,
} from './level.rules';

const costs = (curve: LevelCurve, levels: number[]) =>
  levels.map((level) => levelCost(curve, level));

describe('levelCost', () => {
  it('Flat costs 100 per level', () => {
    expect(costs({ preset: 'flat' }, [2, 3, 4, 5, 6])).toEqual([100, 100, 100, 100, 100]);
  });

  it('Growing costs 100 * level', () => {
    expect(costs({ preset: 'growing' }, [2, 3, 4, 5, 6])).toEqual([200, 300, 400, 500, 600]);
  });

  it('Steep costs round(100 * 1.5^(level - 2))', () => {
    expect(costs({ preset: 'steep' }, [2, 3, 4, 5, 6])).toEqual([100, 150, 225, 338, 506]);
  });

  it('Classic tabletop follows its table, then adds 50 % per level', () => {
    expect(costs({ preset: 'classic' }, [2, 3, 4, 5, 6, 7, 8])).toEqual([
      300, 600, 1800, 3800, 7500, 11250, 16875,
    ]);
  });

  it('Custom evaluates the expression in level', () => {
    expect(costs({ preset: 'custom', expression: 'level * 50' }, [2, 3, 4])).toEqual([100, 150, 200]);
  });
});

describe('validateLevelCurve', () => {
  it('accepts the presets and a valid custom expression', () => {
    expect(validateLevelCurve({ preset: 'growing' })).toBeNull();
    expect(validateLevelCurve({ preset: 'custom', expression: '50 * level ^ 2' })).toBeNull();
  });

  it.each(['level +', 'base * 2', 'playerLevel', 'luck', '0', 'level - 5', '', '1 / 0'])(
    'rejects the custom expression "%s"',
    (expression) => {
      expect(validateLevelCurve({ preset: 'custom', expression })).toEqual(expect.any(String));
    },
  );
});

describe('levelProgress', () => {
  const growing: LevelCurve = { preset: 'growing' };

  it('starts at level 1 with nothing earned', () => {
    expect(levelProgress(growing, 0, 20)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 200, percent: 0, maxed: false });
  });

  it('is still level 1 one XP short of the first level-up', () => {
    expect(levelProgress(growing, 199, 20)).toMatchObject({ level: 1, xpIntoLevel: 199, xpForNext: 200 });
  });

  it('levels up exactly at the cost', () => {
    expect(levelProgress(growing, 200, 20)).toEqual({ level: 2, xpIntoLevel: 0, xpForNext: 300, percent: 0, maxed: false });
  });

  it('reports progress inside a level', () => {
    expect(levelProgress(growing, 250, 20)).toEqual({ level: 2, xpIntoLevel: 50, xpForNext: 300, percent: 17, maxed: false });
    expect(levelProgress({ preset: 'flat' }, 150, 20)).toEqual({ level: 2, xpIntoLevel: 50, xpForNext: 100, percent: 50, maxed: false });
  });
});

describe('grantXp', () => {
  const growing: LevelCurve = { preset: 'growing' };

  it('adds XP without a level-up', () => {
    expect(grantXp(growing, 3, 0, 150, 20)).toEqual({ xp: 150, level: 1, levelsGained: 0, statPointsGranted: 0 });
  });

  it('gains a level and its stat points', () => {
    expect(grantXp(growing, 3, 150, 100, 20)).toEqual({ xp: 250, level: 2, levelsGained: 1, statPointsGranted: 3 });
  });

  it('gains several levels at once', () => {
    // 200 + 300 + 400 = 900 reaches level 4, 1400 would be level 5.
    expect(grantXp(growing, 3, 0, 1000, 20)).toEqual({ xp: 1000, level: 4, levelsGained: 3, statPointsGranted: 9 });
  });

  it('grants the world setting per level', () => {
    expect(grantXp({ preset: 'flat' }, 5, 0, 250, 20)).toEqual({ xp: 250, level: 3, levelsGained: 2, statPointsGranted: 10 });
    expect(grantXp({ preset: 'flat' }, 0, 0, 100, 20)).toMatchObject({ level: 2, statPointsGranted: 0 });
  });
});

describe('level limits', () => {
  it('stops at MAX_LEVEL whatever the amount', () => {
    expect(grantXp({ preset: 'flat' }, 3, 0, 1e12, MAX_LEVEL)).toMatchObject({ level: MAX_LEVEL, levelsGained: MAX_LEVEL - 1 });
  });

  it('checks a custom curve up to MAX_LEVEL', () => {
    // Positive up to level 60, then it drops below 1.
    expect(validateLevelCurve({ preset: 'custom', expression: '1000 - level * 16' })).toEqual(expect.any(String));
  });
});

describe('checkLevelCurve', () => {
  const check = (expression: string) => checkLevelCurve({ preset: 'custom', expression });

  it('accepts presets and a valid custom expression', () => {
    expect(checkLevelCurve({ preset: 'steep' })).toBeNull();
    expect(check('50 * level ^ 2')).toBeNull();
  });

  it('reports a syntax error with its position', () => {
    expect(check('level +')).toEqual({ key: 'formula.errors.syntax', position: 7 });
  });

  it('reports an unknown name with its position', () => {
    expect(check('level + luck')).toEqual({ key: 'formula.errors.unknownName', position: 8 });
    expect(check('base * 2')).toEqual({ key: 'formula.errors.unknownName', position: 0 });
  });

  it('reports the first level that costs less than 1 XP', () => {
    expect(check('level - 5')).toEqual({ key: 'world.errors.levelCostTooLow', level: 2 });
    expect(check('1000 - level * 16')).toEqual({ key: 'world.errors.levelCostTooLow', level: 63 });
  });
});

describe('levelRarity', () => {
  it('level 1 is common and the max is legendary', () => {
    expect(levelRarity(1, 20)).toBe('common');
    expect(levelRarity(20, 20)).toBe('legendary');
  });

  it('steps through the scale by progress towards the max (max 20)', () => {
    // progress = (level - 1) / 19: 0.25 is level 5.75, 0.5 is 10.5, 0.75 is 15.25.
    expect(levelRarity(5, 20)).toBe('common');
    expect(levelRarity(6, 20)).toBe('uncommon');
    expect(levelRarity(10, 20)).toBe('uncommon');
    expect(levelRarity(11, 20)).toBe('rare');
    expect(levelRarity(15, 20)).toBe('rare');
    expect(levelRarity(16, 20)).toBe('mythic');
    expect(levelRarity(19, 20)).toBe('mythic');
  });

  it('with a max of 2, level 1 is common then level 2 is legendary', () => {
    expect(levelRarity(1, 2)).toBe('common');
    expect(levelRarity(2, 2)).toBe('legendary');
  });
});

describe('max level cap', () => {
  const flat: LevelCurve = { preset: 'flat' };

  it('grantXp stops levelling at the max: XP adds up, no extra stat points', () => {
    expect(grantXp(flat, 3, 0, 10_000, 5)).toEqual({ xp: 10_000, level: 5, levelsGained: 4, statPointsGranted: 12 });
    expect(grantXp(flat, 3, 400, 500, 5)).toEqual({ xp: 900, level: 5, levelsGained: 0, statPointsGranted: 0 });
  });

  it('levelProgress is maxed at the cap', () => {
    expect(levelProgress(flat, 400, 5)).toMatchObject({ level: 5, maxed: true, percent: 100 });
    expect(levelProgress(flat, 399, 5)).toMatchObject({ level: 4, maxed: false });
  });

  it('accepts integers from 2 to 100 only', () => {
    expect([2, 20, 100].every(isValidMaxLevel)).toBe(true);
    expect([1, 101, 5.5, NaN, '20', undefined].some(isValidMaxLevel)).toBe(false);
  });
});
