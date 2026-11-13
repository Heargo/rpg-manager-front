import { Character, Sheet } from '../../world/models/world';
import { Npc } from '../../npc/models/npc';
import { Skill } from '../models/skill';
import { BUILT_IN_PRESETS, applyPreset, placeholders } from './formula-preset.rules';
import { SkillAmountScope, evaluateSkillAmount, filterSkills, parseSkillJson, previewSkillAmount, skillToJson, skillUsages, validateSkill } from './skill.rules';

const fireball: Skill = {
  id: 's1', name: 'Fireball', description: 'Boom.', rarity: 'rare', type: 'active', maxLevel: 3, pointCost: 2,
  target: 'one-enemy', cost: { attribute: 'Mana', amount: 10 }, cooldown: 1,
  effects: [{ kind: 'damage', attribute: 'Life', amount: '5 + skillLevel * 3' }],
};
const toughness: Skill = {
  id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxLevel: 2, pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel * 2', duration: 0 }],
};
const names = ['Life', 'Mana', 'Strength'];

describe('validateSkill', () => {
  it('accepts a valid active and a valid passive skill', () => {
    expect(validateSkill(fireball, names)).toEqual([]);
    expect(validateSkill(toughness, names)).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateSkill({ ...fireball, name: ' ' }, names)).toEqual([{ field: 'name', code: 'required' }]);
  });

  it('refuses a max level outside 1 to 10', () => {
    expect(validateSkill({ ...fireball, maxLevel: 0 }, names)).toEqual([{ field: 'maxLevel', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, maxLevel: 11 }, names)).toEqual([{ field: 'maxLevel', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, maxLevel: 10 }, names)).toEqual([]);
  });

  it('refuses a point cost below 1', () => {
    expect(validateSkill({ ...fireball, pointCost: 0 }, names)).toEqual([{ field: 'pointCost', code: 'invalid' }]);
  });

  it('requires a target on an active skill and refuses one on a passive skill', () => {
    expect(validateSkill({ ...fireball, target: undefined }, names)).toEqual([{ field: 'target', code: 'required' }]);
    expect(validateSkill({ ...toughness, target: 'self' }, names)).toEqual([{ field: 'target', code: 'invalid' }]);
  });

  it('refuses an effect amount that is not a valid formula or reads an unknown name', () => {
    const bad = { ...fireball, effects: [{ kind: 'damage' as const, attribute: 'Life', amount: '5 +' }] };
    expect(validateSkill(bad, names)).toEqual([{ field: 'effects.0.amount', code: 'formula' }]);
    const unknown = { ...fireball, effects: [{ kind: 'heal' as const, attribute: 'Life', amount: 'Luck * 2' }] };
    expect(validateSkill(unknown, names)).toEqual([{ field: 'effects.0.amount', code: 'formula' }]);
  });
});

describe('evaluateSkillAmount', () => {
  it('reads skillLevel, caster level and the caster attribute maxima', () => {
    const scope = { skillLevel: 2, level: 3, maxima: { Strength: 4 } };
    expect(evaluateSkillAmount('10 + skillLevel * 5 + Strength', scope)).toEqual({ ok: true, value: 24 });
    expect(evaluateSkillAmount('level * 2', scope)).toEqual({ ok: true, value: 6 });
  });

  it('returns the error of an unknown name', () => {
    const result = evaluateSkillAmount('Luck + 1', { skillLevel: 1, level: 1, maxima: {} });
    expect(result).toMatchObject({ ok: false, error: { key: 'formula.errors.unknownName' } });
  });
});

describe('the rank formula variable is gone', () => {
  it('rejects a formula using rank while skillLevel works', () => {
    const old = { ...fireball, effects: [{ kind: 'damage' as const, attribute: 'Life', amount: '5 + rank * 3' }] };
    expect(validateSkill(old, names)).toEqual([{ field: 'effects.0.amount', code: 'formula' }]);
    expect(evaluateSkillAmount('rank * 2', { skillLevel: 2, level: 1, maxima: {} })).toMatchObject({ ok: false });
    expect(evaluateSkillAmount('skillLevel * 2', { skillLevel: 2, level: 1, maxima: {} })).toEqual({ ok: true, value: 4 });
  });
});

describe('previewSkillAmount', () => {
  it('gives the amount at level 1 and at max level', () => {
    expect(previewSkillAmount('skillLevel * 4', ['Strength'], 3)).toMatchObject({ ok: true, level1: 4, maxLevel: 12 });
  });

  it('gives the error of an invalid formula', () => {
    expect(previewSkillAmount('Foo', ['Strength'], 3)).toMatchObject({ ok: false });
  });
});

describe('filterSkills', () => {
  it('searches the name and filters by type', () => {
    const all = [fireball, toughness];
    expect(filterSkills(all, { search: 'fire', type: undefined }).map((s) => s.id)).toEqual(['s1']);
    expect(filterSkills(all, { search: '', type: 'passive' }).map((s) => s.id)).toEqual(['s2']);
    expect(filterSkills(all, { search: '', type: undefined }).map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('skillUsages', () => {
  const sheet = (id: string, name: string, skillId?: string) =>
    ({ id, name, skills: skillId ? [{ skillId, level: 1 }] : [] }) as Sheet;

  it('lists the characters and NPCs that have the skill', () => {
    const usages = skillUsages('s1', {
      characters: [sheet('c1', 'Ada', 's1'), sheet('c2', 'Bob')] as Character[],
      npcs: [sheet('n1', 'Goblin', 's1'), sheet('n2', 'Baker', 's2')] as Npc[],
    });
    expect(usages).toEqual([
      { kind: 'character', id: 'c1', name: 'Ada' },
      { kind: 'npc', id: 'n1', name: 'Goblin' },
    ]);
  });

  it('is empty for an unused skill', () => {
    expect(skillUsages('s9', { characters: [], npcs: [] })).toEqual([]);
  });
});

describe('success formula without a formula', () => {
  const base = {
    name: 'Bolt', description: '', rarity: 'common', type: 'active', maxLevel: 1, pointCost: 1, target: 'one-enemy',
    effects: [],
  } as const;

  it('is refused by validation', () => {
    expect(validateSkill({ ...base, success: { mode: 'formula' } } as never, ['Life'])).toEqual([
      { field: 'success.formula', code: 'formula' },
    ]);
  });

  it('is refused when parsing JSON', () => {
    const text = JSON.stringify({ ...base, success: { mode: 'formula' } });
    expect(parseSkillJson(text, base as never, ['Life']).skill).toBeUndefined();
  });
});

describe('effect amounts reading the target', () => {
  const withAmount = (amount: string): Skill => ({
    ...fireball,
    effects: [{ kind: 'damage', attribute: 'Life', amount }],
  });

  it('validateSkill accepts target_<name> and the bracketed form, and rejects an unknown target name', () => {
    expect(validateSkill(withAmount('Strength - target_Life'), names)).toEqual([]);
    expect(validateSkill(withAmount('[target_Life]'), names)).toEqual([]);
    expect(validateSkill(withAmount('target_Luck'), names)).toEqual([{ field: 'effects.0.amount', code: 'formula' }]);
  });

  it('evaluateSkillAmount reads the target maxima', () => {
    expect(
      evaluateSkillAmount('max(1, Strength - target_Life) + skillLevel', {
        skillLevel: 2,
        level: 1,
        maxima: { Strength: 10 },
        targetMaxima: { Life: 4 },
      } as SkillAmountScope),
    ).toEqual({ ok: true, value: 8 });
  });

  it('previewSkillAmount treats target maxima as 1', () => {
    expect(previewSkillAmount('target_Life * 5 + skillLevel', ['Life'], 3)).toEqual({ ok: true, level1: 6, maxLevel: 8 });
  });

  it('every built-in effect preset, applied with the first attribute, validates as an effect amount', () => {
    const effects = BUILT_IN_PRESETS.filter((p) => p.kind === 'effect');
    expect(effects.length).toBeGreaterThan(0);
    for (const preset of effects) {
      const mapping = Object.fromEntries(placeholders(preset.formula).map((t) => [t, 'Strength']));
      const amount = applyPreset(preset, mapping);
      expect(validateSkill(withAmount(amount), names), amount).toEqual([]);
    }
  });
});

describe('evaluateSkillAmount with a bracketed target name', () => {
  const scope = { skillLevel: 1, level: 1, maxima: { 'Points de vie': 10 } };

  it('reads the target maximum', () => {
    expect(
      evaluateSkillAmount('[target_Points de vie] + 1', { ...scope, targetMaxima: { 'Points de vie': 7 } }),
    ).toEqual({ ok: true, value: 8 });
  });

  it('reads 0 without a target', () => {
    expect(evaluateSkillAmount('[target_Points de vie] + 1', scope)).toEqual({ ok: true, value: 1 });
  });
});

describe('the optional action type of a skill', () => {
  const jab: Skill = { ...fireball, actionType: 'Movement' };

  it('is accepted on an active skill, whether or not the world still has it', () => {
    expect(validateSkill(jab, names)).toEqual([]);
    expect(validateSkill({ ...jab, actionType: 'Gone' }, names)).toEqual([]);
  });

  it('is optional', () => {
    expect(validateSkill({ ...fireball, actionType: undefined }, names)).toEqual([]);
  });

  it('is refused when blank', () => {
    expect(validateSkill({ ...jab, actionType: ' ' }, names)).toEqual([{ field: 'actionType', code: 'invalid' }]);
  });

  it('is refused on a passive skill', () => {
    expect(validateSkill({ ...toughness, actionType: 'Action' }, names)).toEqual([
      { field: 'actionType', code: 'invalid' },
    ]);
  });

  it('survives the JSON round trip', () => {
    const text = JSON.stringify(jab);
    expect(parseSkillJson(text, jab, names).skill?.actionType).toBe('Movement');
  });

  it('is refused in JSON when it is not a string', () => {
    const text = JSON.stringify({ ...jab, actionType: 3 });
    expect(parseSkillJson(text, jab, names).skill).toBeUndefined();
  });
});

describe('skill range', () => {
  const bolt: Skill = { ...fireball, range: 4 };

  it('is optional and accepted as a positive whole number on an active skill', () => {
    expect(validateSkill(fireball, names)).toEqual([]);
    expect(validateSkill(bolt, names)).toEqual([]);
    expect(validateSkill({ ...bolt, range: 1 }, names)).toEqual([]);
  });

  it('is refused when it is zero, negative or fractional', () => {
    for (const range of [0, -2, 2.5]) {
      expect(validateSkill({ ...bolt, range }, names)).toEqual([{ field: 'range', code: 'invalid' }]);
    }
  });

  it('is refused on a passive skill', () => {
    expect(validateSkill({ ...toughness, range: 3 }, names)).toEqual([{ field: 'range', code: 'invalid' }]);
  });

  it('round-trips through the JSON tab', () => {
    const text = skillToJson(bolt);
    expect(parseSkillJson(text, bolt, names).skill?.range).toBe(4);
  });

  it('is refused in JSON when it is not a number', () => {
    const text = JSON.stringify({ ...bolt, range: 'far' });
    expect(parseSkillJson(text, bolt, names).skill).toBeUndefined();
  });
});
