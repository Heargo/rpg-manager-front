import en from '../../../../../public/i18n/generators/en/items.json';
import { seededRandomSource } from '../../../core/generators/random-source';
import { WordList } from '../../../core/generators/word-list';
import { EQUIPMENT_SLOTS } from '../../../core/models/item';
import { WorldDraft } from '../models/world';
import { generateStarterItems } from './starter-items';
import { attributeFormulaErrors, isDraftValid, validateWorldDraft } from './world-draft.rules';

const draft = (changes: Partial<WorldDraft> = {}): WorldDraft => ({
  name: 'Eldoria',
  attributes: [
    { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
    { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
  ],
  startingStatPoints: 5,
  startingMoney: 100,
  ...changes,
});

describe('validateWorldDraft level rules', () => {
  it('accepts a premade curve and a valid custom one', () => {
    expect(validateWorldDraft(draft({ levelCurve: { preset: 'steep' }, statPointsPerLevel: 2 }))).toEqual({});
    expect(validateWorldDraft(draft({ levelCurve: { preset: 'custom', expression: 'level * 50' } }))).toEqual({});
  });

  it('rejects an invalid custom curve and a bad stat points per level', () => {
    expect(validateWorldDraft(draft({ levelCurve: { preset: 'custom', expression: 'level +' } })).levelCurve).toEqual(expect.any(String));
    expect(validateWorldDraft(draft({ levelCurve: { preset: 'custom', expression: 'base' } })).levelCurve).toEqual(expect.any(String));
    expect(validateWorldDraft(draft({ statPointsPerLevel: -1 })).statPointsPerLevel).toBe('world.errors.nonNegativeInteger');
    expect(validateWorldDraft(draft({ statPointsPerLevel: 1.5 })).statPointsPerLevel).toBe('world.errors.nonNegativeInteger');
  });
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
    expect(validateWorldDraft(draft({ attributes: [{ name: ' ', baseValue: 1, formula: { preset: 'linear', step: 1 } }] })).attributes).toBe('world.errors.attributeNameRequired');
    expect(validateWorldDraft(draft({ attributes: [{ name: 'Life', baseValue: 1, formula: { preset: 'linear', step: 1 } }, { name: ' life', baseValue: 2, formula: { preset: 'linear', step: 1 } }] })).attributes).toBe(
      'world.errors.attributeNamesUnique',
    );
    expect(validateWorldDraft(draft({ attributes: [{ name: 'Life', baseValue: 1.5, formula: { preset: 'linear', step: 1 } }] })).attributes).toBe('world.errors.baseValueInteger');
  });

  it('treats names differing only by accents as duplicates', () => {
    const linear = { preset: 'linear', step: 1 } as const;
    const attributes: WorldDraft['attributes'] = [
      { name: 'Agilité', baseValue: 1, formula: linear },
      { name: 'Agilite', baseValue: 1, formula: linear },
    ];
    expect(validateWorldDraft(draft({ attributes })).attributes).toBe('world.errors.attributeNamesUnique');
  });

  it('accepts a custom formula that reads a sibling attribute by name', () => {
    const attributes: WorldDraft['attributes'] = [
      { name: 'Max life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { name: 'Regen', baseValue: 1, formula: { preset: 'custom', expression: 'base + [max LIFE] / 2' } },
    ];
    expect(validateWorldDraft(draft({ attributes }))).toEqual({});
    expect(attributeFormulaErrors(draft({ attributes }))).toEqual([null, null]);
  });

  it('reports a bad custom formula per attribute and blocks the attributes step', () => {
    const attributes: WorldDraft['attributes'] = [
      { name: 'Life', baseValue: 10, formula: { preset: 'custom', expression: 'base +' } },
      { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      { name: 'Luck', baseValue: 5, formula: { preset: 'custom', expression: 'base + nothing' } },
    ];
    expect(attributeFormulaErrors(draft({ attributes }))).toEqual([
      { key: 'formula.errors.syntax', position: 6 },
      null,
      { key: 'formula.errors.unknownName', position: 7 },
    ]);
    expect(validateWorldDraft(draft({ attributes })).attributes).toBe('world.errors.formulaInvalid');
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

describe('formulas that fail when evaluated', () => {
  const withFormula = (expression: string) =>
    draft({ attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'custom', expression } }] });

  it('blocks Next on a division by zero', () => {
    expect(attributeFormulaErrors(withFormula('base + level/0'))[0]).toMatchObject({ key: 'formula.errors.divisionByZero', position: 12, level: 0 });
    expect(validateWorldDraft(withFormula('base + level/0')).attributes).toBe('world.errors.formulaInvalid');
    expect(isDraftValid(withFormula('base + level/0'))).toBe(false);
  });

  it('blocks Next on a negative max', () => {
    expect(attributeFormulaErrors(withFormula('level - 5'))[0]).toMatchObject({ key: 'formula.errors.negative', level: 0 });
    expect(validateWorldDraft(withFormula('level - 5')).attributes).toBe('world.errors.formulaInvalid');
  });

  it('accepts an unaccented reference to an accented sibling', () => {
    const attributes: WorldDraft['attributes'] = [
      { name: 'Agilité', baseValue: 3, formula: { preset: 'linear', step: 1 } },
      { name: 'Dodge', baseValue: 1, formula: { preset: 'custom', expression: 'base + Agilite' } },
    ];
    expect(attributeFormulaErrors(draft({ attributes }))).toEqual([null, null]);
  });
});

describe('validateWorldDraft attribute cap', () => {
  const linear = { preset: 'linear', step: 1 } as const;
  const withCap = (cap: number | undefined) =>
    draft({ attributes: [{ name: 'Life', baseValue: 10, formula: linear, ...({ cap } as object) }] });

  it('accepts no cap, and an integer cap of at least the base value', () => {
    expect(validateWorldDraft(withCap(undefined))).toEqual({});
    expect(validateWorldDraft(withCap(1000))).toEqual({});
    expect(validateWorldDraft(withCap(10))).toEqual({});
  });

  it('rejects a cap that is not an integer of at least 1', () => {
    expect(validateWorldDraft(withCap(0)).attributes).toBe('world.errors.capInvalid');
    expect(validateWorldDraft(withCap(-5)).attributes).toBe('world.errors.capInvalid');
    expect(validateWorldDraft(withCap(20.5)).attributes).toBe('world.errors.capInvalid');
  });

  it('rejects a cap below the base value with world.errors.capTooLow', () => {
    expect(validateWorldDraft(withCap(9)).attributes).toBe('world.errors.capTooLow');
  });
});
