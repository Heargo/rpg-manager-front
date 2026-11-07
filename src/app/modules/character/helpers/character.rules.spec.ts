import { createCharacter, findCharacterOf, normalizeCharacterName, validateCreateCharacter } from './character.rules';

const world = {
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10 },
    { id: 'str', name: 'Strength', baseValue: 2 },
  ],
  startingStatPoints: 5,
  startingMoney: 50,
};

describe('character rules', () => {
  it('creates a character from the world defaults', () => {
    expect(createCharacter(world, { playerId: 'p1', name: '  Ada   la Brave ', portraitId: 'img' }, 'c1', 1000)).toEqual({
      id: 'c1',
      playerId: 'p1',
      name: 'Ada la Brave',
      portraitId: 'img',
      statPoints: 5,
      money: 50,
      attributes: [
        { attributeId: 'life', points: 0, current: 10 },
        { attributeId: 'str', points: 0, current: 2 },
      ],
      inventory: [],
      rev: 1,
      updatedAt: 1000,
    });
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
