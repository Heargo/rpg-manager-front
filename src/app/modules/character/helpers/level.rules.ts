import {
  evaluateFormula,
  FormulaError,
  validateFormula,
} from '../../../core/helpers/formula';

/** How much XP each level-up costs, chosen per world. */
export type LevelCurve =
  | { preset: 'flat' | 'growing' | 'steep' | 'classic' }
  | { preset: 'custom'; expression: string };

export const LEVEL_CURVE_PRESETS = [
  'flat',
  'growing',
  'steep',
  'classic',
  'custom',
] as const;
export const DEFAULT_LEVEL_CURVE: LevelCurve = { preset: 'growing' };
export const DEFAULT_STAT_POINTS_PER_LEVEL = 3;
/** No character goes beyond this level, which also bounds every loop. */
export const MAX_LEVEL = 100;

const INVALID = 'world.errors.levelCurveInvalid';
/** Cost of levels 2 to 6 of the classic table, then +50 % per level. */
const CLASSIC_TABLE = [300, 600, 1800, 3800, 7500];

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  /** XP the current level needs to reach the next one. */
  xpForNext: number;
  /** 0 to 100. */
  percent: number;
}

export interface XpGrant {
  xp: number;
  level: number;
  levelsGained: number;
  statPointsGranted: number;
}

/** XP cost of the level-up that reaches `level` (2 or more). Custom curves that fail cost 1. */
export function levelCost(curve: LevelCurve, level: number): number {
  switch (curve.preset) {
    case 'flat':
      return 100;
    case 'growing':
      return 100 * level;
    case 'steep':
      return Math.round(100 * Math.pow(1.5, level - 2));
    case 'classic': {
      const known = CLASSIC_TABLE[level - 2];
      if (known !== undefined) return known;
      let cost = CLASSIC_TABLE[CLASSIC_TABLE.length - 1];
      for (let l = 2 + CLASSIC_TABLE.length; l <= level; l++)
        cost = Math.round(cost * 1.5);
      return cost;
    }
    case 'custom': {
      const result = evaluateFormula(
        { preset: 'custom', expression: curve.expression },
        { level, base: 0, playerLevel: 0 },
      );
      return result.ok ? Math.max(1, Math.round(result.value)) : 1;
    }
  }
}

export interface LevelCurveError {
  key: string;
  position?: number;
  level?: number;
}

/** What's wrong with a curve (translation key, position or level), or null when it's usable. */
export function checkLevelCurve(curve: LevelCurve): LevelCurveError | null {
  if (curve.preset !== 'custom') return null;
  const expression = curve.expression;
  if (typeof expression !== 'string' || !expression.trim())
    return { key: 'formula.errors.syntax', position: 0 };
  const formula = { preset: 'custom', expression } as const;
  const problem: FormulaError | null = validateFormula(formula, [], ['level']);
  if (problem) return problem;
  for (let level = 2; level <= MAX_LEVEL; level++) {
    const result = evaluateFormula(formula, {
      level,
      base: 0,
      playerLevel: 0,
    });
    if (!result.ok) return result.error;
    if (Math.round(result.value) < 1)
      return { key: 'world.errors.levelCostTooLow', level };
  }
  return null;
}

/** Translation key of what's wrong with a curve, or null when it's usable. */
export function validateLevelCurve(curve: LevelCurve): string | null {
  return checkLevelCurve(curve) ? INVALID : null;
}

/** The level for a total XP, and how far into it. */
export function levelProgress(curve: LevelCurve, xp: number): LevelProgress {
  let level = 1;
  let left = Math.max(0, xp);
  while (level < MAX_LEVEL) {
    const cost = levelCost(curve, level + 1);
    if (left < cost) break;
    left -= cost;
    level++;
  }
  const xpForNext = levelCost(curve, level + 1);
  return {
    level,
    xpIntoLevel: left,
    xpForNext,
    percent: Math.round((left / xpForNext) * 100),
  };
}

/** Adds XP to a total: the new level, the levels gained and the stat points they give. */
export function grantXp(
  curve: LevelCurve,
  perLevel: number,
  xp: number,
  amount: number,
): XpGrant {
  const before = levelProgress(curve, xp).level;
  const total = xp + amount;
  const level = levelProgress(curve, total).level;
  const levelsGained = level - before;
  return {
    xp: total,
    level,
    levelsGained,
    statPointsGranted: levelsGained * perLevel,
  };
}
