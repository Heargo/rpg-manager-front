import { Skill } from '../models/skill';
import { validateSkill } from './skill.rules';
import { resolveSkillUse } from './skill-roll.rules';

/**
 * Formula variables: `roll`, `skillLevel`, `level`, the caster's attribute maxima by name, and the target's as
 * `target_<name>` (the parser only reads bare words of letters, digits and `_`, so `target.<name>` is not available).
 * `rolls` are the dice values already drawn; `target` is `{ maxima }` or undefined.
 */
const fireball: Skill = {
  id: 's1', name: 'Fireball', description: '', rarity: 'rare', type: 'active', maxLevel: 3, pointCost: 2,
  target: 'one-enemy', cooldown: 0,
  roll: { count: 2, faces: 6 }, success: { mode: 'always' },
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'roll + skillLevel * 3' }],
};
const caster = { level: 3, maxima: { Strength: 4, Life: 20 } };
const names = ['Life', 'Strength'];

describe('resolveSkillUse', () => {
  it('totals the dice, always succeeds in always mode and evaluates the amounts with roll', () => {
    const result = resolveSkillUse(fireball, 2, caster, undefined, [3, 4], true);
    expect(result).toMatchObject({ success: true, rolls: [3, 4], total: 7, amounts: [13] });
  });

  it('succeeds on a threshold when the total reaches it', () => {
    const at = (value: number) =>
      resolveSkillUse({ ...fireball, success: { mode: 'threshold', value } }, 1, caster, undefined, [3, 4], true).success;
    expect(at(7)).toBe(true);
    expect(at(8)).toBe(false);
  });

  it('evaluates a formula with roll, skillLevel, level, caster maxima and target maxima, success when it is 0 or more', () => {
    const at = (formula: string, defense = 13) =>
      resolveSkillUse(
        { ...fireball, success: { mode: 'formula', formula } },
        2, caster, { maxima: { Defense: defense } }, [3, 4], true,
      );
    // 7 + 4 + 2 - 13 = 0
    expect(at('roll + Strength + skillLevel - target_Defense').success).toBe(true);
    expect(at('roll + Strength + skillLevel - target_Defense', 14).success).toBe(false);
    expect(at('level - 3').success).toBe(true);
    expect(at('level - 4').success).toBe(false);
  });

  it('fails with an error on an invalid formula, an unknown name, or a target name without a target', () => {
    const use = (formula: string, target?: { maxima: Record<string, number> }) =>
      resolveSkillUse({ ...fireball, success: { mode: 'formula', formula } }, 1, caster, target, [3, 4], true);
    expect(use('roll +')).toMatchObject({ success: false });
    expect(use('roll +').error).toBeDefined();
    expect(use('Luck').success).toBe(false);
    expect(use('target_Defense').success).toBe(false);
    expect(use('target_Defense').error).toBeDefined();
  });

  it('never evaluates code', () => {
    const result = resolveSkillUse(
      { ...fireball, success: { mode: 'formula', formula: 'constructor.constructor("return 1")()' } },
      1, caster, undefined, [3, 4], true,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('always succeeds with roll 0 when the world setting is off', () => {
    const result = resolveSkillUse({ ...fireball, success: { mode: 'threshold', value: 99 } }, 2, caster, undefined, [3, 4], false);
    expect(result).toMatchObject({ success: true, total: 0, amounts: [6] });
  });

  it('uses the defaults (always succeeds) for a skill without a roll config', () => {
    const { roll: _roll, success: _success, ...old } = fireball;
    expect(resolveSkillUse(old as Skill, 1, caster, undefined, [5], true)).toMatchObject({ success: true, total: 5, amounts: [8] });
  });
});

describe('validateSkill roll config', () => {
  it('accepts a skill without a roll config and a valid one', () => {
    const { roll: _roll, success: _success, ...old } = fireball;
    expect(validateSkill(old as Skill, names)).toEqual([]);
    expect(validateSkill(fireball, names)).toEqual([]);
    expect(
      validateSkill({ ...fireball, success: { mode: 'formula', formula: 'roll + Strength - target_Life' } }, names),
    ).toEqual([]);
  });

  it('refuses a dice count outside 1 to 100 and faces outside 2 to 1000', () => {
    expect(validateSkill({ ...fireball, roll: { count: 0, faces: 6 } }, names)).toEqual([{ field: 'roll.count', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, roll: { count: 101, faces: 6 } }, names)).toEqual([{ field: 'roll.count', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, roll: { count: 1, faces: 1 } }, names)).toEqual([{ field: 'roll.faces', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, roll: { count: 1, faces: 1001 } }, names)).toEqual([{ field: 'roll.faces', code: 'invalid' }]);
  });

  it('refuses a threshold that is not an integer', () => {
    expect(validateSkill({ ...fireball, success: { mode: 'threshold', value: 2.5 } }, names)).toEqual([
      { field: 'success.value', code: 'invalid' },
    ]);
  });

  it('refuses a success formula that is invalid or reads an unknown name', () => {
    expect(validateSkill({ ...fireball, success: { mode: 'formula', formula: 'roll +' } }, names)).toEqual([
      { field: 'success.formula', code: 'formula' },
    ]);
    expect(validateSkill({ ...fireball, success: { mode: 'formula', formula: 'roll - target_Luck' } }, names)).toEqual([
      { field: 'success.formula', code: 'formula' },
    ]);
  });

  it('lets an effect amount read roll', () => {
    expect(validateSkill(fireball, names)).toEqual([]);
  });
});

describe('resolveSkillUse amounts reading the target', () => {
  const overTarget: Skill = {
    ...fireball,
    effects: [{ kind: 'damage', attribute: 'Life', amount: 'max(1, Strength - target_Defense) + skillLevel' }],
  };

  it('uses the target maxima in the amounts', () => {
    const result = resolveSkillUse(overTarget, 2, caster, { maxima: { Defense: 3 } }, [3, 4], true);
    expect(result.error).toBeUndefined();
    expect(result.amounts).toEqual([3]);
  });

  it('reads the target variables as 0 without a target', () => {
    const result = resolveSkillUse(
      overTarget, 2, { ...caster, maxima: { ...caster.maxima, Defense: 5 } }, undefined, [3, 4], true,
    );
    expect(result.error).toBeUndefined();
    expect(result.amounts).toEqual([6]);
  });
});
