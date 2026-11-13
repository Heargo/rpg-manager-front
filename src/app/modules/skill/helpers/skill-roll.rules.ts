import { evaluateFormula } from '../../../core/helpers/formula';
import {
  DEFAULT_SKILL_ROLL,
  Skill,
  SkillRoll,
  SkillSuccess,
} from '../models/skill';
import {
  TARGET_PREFIX,
  evaluateSkillAmount,
  targetVariables,
} from './skill.rules';

export { TARGET_PREFIX };

export interface SkillCaster {
  level: number;
  /** The caster's attribute maxima, by name. */
  maxima: Record<string, number>;
}

export interface SkillTargetScope {
  maxima: Record<string, number>;
}

export interface SkillUseResult {
  success: boolean;
  rolls: number[];
  total: number;
  /** One per effect, in order. */
  amounts: number[];
  /** Set when the success formula or an amount could not be evaluated. */
  error?: string;
}

export const rollOf = (skill: Skill): SkillRoll =>
  skill.roll ?? DEFAULT_SKILL_ROLL;
export const successOf = (skill: Skill): SkillSuccess =>
  skill.success ?? { mode: 'always' };

/**
 * Resolves one use of a skill from dice already drawn. With rolls on: success per the skill's mode (formulas read
 * `roll`, `skillLevel`, `level`, the caster's maxima and the target's as `target_<name>`; success when it is 0 or more) and
 * amounts that may read `roll`. With rolls off: always a success and `roll` is 0. Never evaluates code.
 */
export function resolveSkillUse(
  skill: Skill,
  skillLevel: number,
  caster: SkillCaster,
  target: SkillTargetScope | undefined,
  rolls: number[],
  enabled: boolean,
): SkillUseResult {
  const drawn = enabled ? rolls : [];
  const total = drawn.reduce((sum, value) => sum + value, 0);
  let error: string | undefined;
  const amounts = skill.effects.map((effect) => {
    const result = evaluateSkillAmount(effect.amount, {
      skillLevel,
      level: caster.level,
      maxima: caster.maxima,
      targetMaxima: target?.maxima,
      roll: total,
    });
    if (result.ok) return result.value;
    error ??= result.error.key;
    return 0;
  });

  let success = true;
  const mode = successOf(skill);
  if (enabled && mode.mode === 'threshold') success = total >= mode.value;
  if (enabled && mode.mode === 'formula') {
    const result = evaluateFormula(
      { preset: 'custom', expression: mode.formula },
      {
        level: caster.level,
        base: 0,
        playerLevel: caster.level,
        levels: {
          ...caster.maxima,
          // the target's names only: a target name without a target stays an error
          ...targetVariables({}, target?.maxima),
          skillLevel,
          roll: total,
        },
      },
    );
    if (result.ok) success = result.value >= 0;
    else {
      success = false;
      error = result.error.key;
    }
  }
  return { success, rolls: drawn, total, amounts, ...(error ? { error } : {}) };
}
