import { Character, Sheet } from '../../world/models/world';
import { Npc } from '../../npc/models/npc';
import { Skill } from '../models/skill';
import { evaluateSkillAmount, filterSkills, previewSkillAmount, skillUsages, validateSkill } from './skill.rules';

const fireball: Skill = {
  id: 's1', name: 'Fireball', description: 'Boom.', rarity: 'rare', type: 'active', maxRank: 3, pointCost: 2,
  target: 'one-enemy', cost: { attribute: 'Mana', amount: 10 }, cooldown: 1,
  effects: [{ kind: 'damage', attribute: 'Life', amount: '5 + rank * 3' }],
};
const toughness: Skill = {
  id: 's2', name: 'Toughness', description: '', rarity: 'common', type: 'passive', maxRank: 2, pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'rank * 2', duration: 0 }],
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

  it('refuses a max rank outside 1 to 10', () => {
    expect(validateSkill({ ...fireball, maxRank: 0 }, names)).toEqual([{ field: 'maxRank', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, maxRank: 11 }, names)).toEqual([{ field: 'maxRank', code: 'invalid' }]);
    expect(validateSkill({ ...fireball, maxRank: 10 }, names)).toEqual([]);
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
  it('reads rank, caster level and the caster attribute maxima', () => {
    const scope = { rank: 2, level: 3, maxima: { Strength: 4 } };
    expect(evaluateSkillAmount('10 + rank * 5 + Strength', scope)).toEqual({ ok: true, value: 24 });
    expect(evaluateSkillAmount('level * 2', scope)).toEqual({ ok: true, value: 6 });
  });

  it('returns the error of an unknown name', () => {
    const result = evaluateSkillAmount('Luck + 1', { rank: 1, level: 1, maxima: {} });
    expect(result).toMatchObject({ ok: false, error: { key: 'formula.errors.unknownName' } });
  });
});

describe('previewSkillAmount', () => {
  it('gives the amount at rank 1 and at max rank', () => {
    expect(previewSkillAmount('rank * 4', ['Strength'], 3)).toMatchObject({ ok: true, rank1: 4, maxRank: 12 });
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
    ({ id, name, skills: skillId ? [{ skillId, rank: 1 }] : [] }) as Sheet;

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
