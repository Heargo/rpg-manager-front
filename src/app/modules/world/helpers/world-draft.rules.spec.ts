import en from '../../../../../public/i18n/generators/en/items.json';
import { seededRandomSource } from '../../../core/generators/random-source';
import { WordList } from '../../../core/generators/word-list';
import { EQUIPMENT_SLOTS } from '../../../core/models/item';
import { WorldDraft } from '../models/world';
import { generateStarterItems } from './starter-items';
import { isDraftValid, validateWorldDraft } from './world-draft.rules';

const draft = (changes: Partial<WorldDraft> = {}): WorldDraft => ({
  name: 'Eldoria',
  attributes: [
    { name: 'Life', baseValue: 10 },
    { name: 'Mana', baseValue: 5 },
  ],
  startingStatPoints: 5,
  startingMoney: 100,
  ...changes,
});

describe('validateWorldDraft', () => {
  it('accepts a complete draft, and a world with no attributes', () => {
    expect(validateWorldDraft(draft())).toEqual({});
    expect(isDraftValid(draft({ attributes: [] }))).toBe(true);
  });

  it('requires a name of reasonable length', () => {
    expect(validateWorldDraft(draft({ name: '  ' })).name).toBe('world.errors.nameRequired');
    expect(validateWorldDraft(draft({ name: 'x'.repeat(49) })).name).toBe('world.errors.nameTooLong');
  });

  it('checks attributes: named, unique (ignoring case), integer base values', () => {
    expect(validateWorldDraft(draft({ attributes: [{ name: ' ', baseValue: 1 }] })).attributes).toBe('world.errors.attributeNameRequired');
    expect(validateWorldDraft(draft({ attributes: [{ name: 'Life', baseValue: 1 }, { name: ' life', baseValue: 2 }] })).attributes).toBe(
      'world.errors.attributeNamesUnique',
    );
    expect(validateWorldDraft(draft({ attributes: [{ name: 'Life', baseValue: 1.5 }] })).attributes).toBe('world.errors.baseValueInteger');
  });

  it('refuses negative or fractional starting values', () => {
    expect(validateWorldDraft(draft({ startingStatPoints: -1 })).startingStatPoints).toBe('world.errors.nonNegativeInteger');
    expect(validateWorldDraft(draft({ startingMoney: 2.5 })).startingMoney).toBe('world.errors.nonNegativeInteger');
  });
});

describe('generateStarterItems', () => {
  const words = en as WordList;
  const options = { attributes: ['Life', 'Mana', 'Strength'], barAttributes: ['Life', 'Mana'] };

  it('covers every equipment slot, potions for each bar, and misc items', () => {
    const items = generateStarterItems(seededRandomSource('world-1'), words, options);
    const slots = items.filter((item) => item.type === 'equipment').map((item) => item.slot);
    expect(new Set(slots)).toEqual(new Set(EQUIPMENT_SLOTS));
    const potions = items.filter((item) => item.type === 'consumable');
    expect(potions).toHaveLength(4);
    expect(potions.every((p) => ['Life', 'Mana'].includes(p.modifiers[0].attribute))).toBe(true);
    expect(items.filter((item) => item.type === 'item')).toHaveLength(3);
  });

  it('only uses the world attributes, and is repeatable for a seed', () => {
    const items = generateStarterItems(seededRandomSource('world-1'), words, options);
    expect(items.flatMap((item) => item.modifiers.map((m) => m.attribute)).every((a) => options.attributes.includes(a))).toBe(true);
    expect(generateStarterItems(seededRandomSource('world-1'), words, options)).toEqual(items);
  });

  it('still works for a world without bars or attributes', () => {
    const items = generateStarterItems(seededRandomSource('w'), words, { attributes: [], barAttributes: [] });
    expect(items.length).toBeGreaterThan(10);
    expect(items.every((item) => item.modifiers.length === 0)).toBe(true);
  });
});
