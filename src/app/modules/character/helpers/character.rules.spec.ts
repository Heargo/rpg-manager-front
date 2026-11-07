import { World } from '../../world/models/world';
import { createCharacter, findCharacterOf, normalizeCharacterName, validateCreateCharacter } from './character.rules';

const world: Pick<World, 'attributes' | 'startingStatPoints' | 'startingMoney'> = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
    { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
  ],
  startingStatPoints: 5,
  startingMoney: 5000,
};

describe('character rules', () => {
  it('creates a character from the world defaults', () => {
    expect(createCharacter(world, { playerId: 'p1', name: '  Ada   la Brave ', portraitId: 'img' }, 'c1', 1000)).toEqual({
      id: 'c1',
      playerId: 'p1',
      name: 'Ada la Brave',
      portraitId: 'img',
      statPoints: 5,
      money: 5000,
      attributes: [
        { attributeId: 'life', level: 0, current: 10 },
        { attributeId: 'str', level: 0, current: 2 },
      ],
      inventory: [],
      rev: 1,
      updatedAt: 1000,
    });
  });

  it('starts every attribute at level 0 with current = max from its formula', () => {
    const formulaWorld = {
      ...world,
      attributes: [
        { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'steep-linear' as const, step: 5 } },
        { id: 'focus', name: 'Focus', baseValue: 5, formula: { preset: 'percent' as const, step: 10 } },
        { id: 'luck', name: 'Luck', baseValue: 5, formula: { preset: 'custom' as const, expression: 'base + 3 + level' } },
      ],
    };
    expect(createCharacter(formulaWorld, { playerId: 'p', name: 'Ada' }, 'c', 0).attributes).toEqual([
      { attributeId: 'life', level: 0, current: 10 },
      { attributeId: 'focus', level: 0, current: 5 },
      { attributeId: 'luck', level: 0, current: 8 },
    ]);
  });

  it('finds the character of a player', () => {
    const ada = createCharacter(world, { playerId: 'p1', name: 'Ada' }, 'c1', 0);
    expect(findCharacterOf({ characters: [ada] }, 'p1')).toBe(ada);
    expect(findCharacterOf({ characters: [ada] }, 'p2')).toBeUndefined();
  });

  it('validates create requests from the wire', () => {
    expect(validateCreateCharacter({ name: 'Ada' })).toBeNull();
    expect(validateCreateCharacter({ name: 'Ada', portrait: { type: 'image/webp', data: 'AAAA' } })).toBeNull();
    expect(validateCreateCharacter(null)).toBe('character.errors.invalid');
    expect(validateCreateCharacter({ name: '  ' })).toBe('character.errors.nameRequired');
    expect(validateCreateCharacter({ name: 'x'.repeat(33) })).toBe('character.errors.nameTooLong');
    expect(validateCreateCharacter({ name: 'Ada', portrait: { type: 'text/html', data: '' } })).toBe('character.errors.invalid');
    expect(validateCreateCharacter({ name: 'Ada', portrait: { type: 'image/png', data: 'A'.repeat(200_001) } })).toBe(
      'character.errors.portraitTooLarge',
    );
  });

  it('normalizes names', () => {
    expect(normalizeCharacterName(' a  b ')).toBe('a b');
  });
});
