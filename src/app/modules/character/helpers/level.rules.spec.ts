import {
  LevelCurve,
  MAX_LEVEL,
  grantXp,
  levelCost,
  levelProgress,
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
    expect(levelProgress(growing, 0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 200, percent: 0 });
  });

  it('is still level 1 one XP short of the first level-up', () => {
    expect(levelProgress(growing, 199)).toMatchObject({ level: 1, xpIntoLevel: 199, xpForNext: 200 });
  });

  it('levels up exactly at the cost', () => {
    expect(levelProgress(growing, 200)).toEqual({ level: 2, xpIntoLevel: 0, xpForNext: 300, percent: 0 });
  });

  it('reports progress inside a level', () => {
    expect(levelProgress(growing, 250)).toEqual({ level: 2, xpIntoLevel: 50, xpForNext: 300, percent: 17 });
    expect(levelProgress({ preset: 'flat' }, 150)).toEqual({ level: 2, xpIntoLevel: 50, xpForNext: 100, percent: 50 });
  });
});

describe('grantXp', () => {
  const growing: LevelCurve = { preset: 'growing' };

  it('adds XP without a level-up', () => {
    expect(grantXp(growing, 3, 0, 150)).toEqual({ xp: 150, level: 1, levelsGained: 0, statPointsGranted: 0 });
  });

  it('gains a level and its stat points', () => {
    expect(grantXp(growing, 3, 150, 100)).toEqual({ xp: 250, level: 2, levelsGained: 1, statPointsGranted: 3 });
  });

  it('gains several levels at once', () => {
    // 200 + 300 + 400 = 900 reaches level 4, 1400 would be level 5.
    expect(grantXp(growing, 3, 0, 1000)).toEqual({ xp: 1000, level: 4, levelsGained: 3, statPointsGranted: 9 });
  });

  it('grants the world setting per level', () => {
    expect(grantXp({ preset: 'flat' }, 5, 0, 250)).toEqual({ xp: 250, level: 3, levelsGained: 2, statPointsGranted: 10 });
    expect(grantXp({ preset: 'flat' }, 0, 0, 100)).toMatchObject({ level: 2, statPointsGranted: 0 });
  });
});

describe('level limits', () => {
  it('stops at MAX_LEVEL whatever the amount', () => {
    expect(grantXp({ preset: 'flat' }, 3, 0, 1e12)).toMatchObject({ level: MAX_LEVEL, levelsGained: MAX_LEVEL - 1 });
  });

  it('checks a custom curve up to MAX_LEVEL', () => {
    // Positive up to level 60, then it drops below 1.
    expect(validateLevelCurve({ preset: 'custom', expression: '1000 - level * 16' })).toEqual(expect.any(String));
  });
});
