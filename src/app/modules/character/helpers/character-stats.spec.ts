import {
  Character,
  InventoryItem,
  WorldAttribute,
} from '../../world/models/world';
import { attributeStats, barStats } from './character-stats';

const attributes: WorldAttribute[] = [
  { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
  { id: 'mana', name: 'Mana', baseValue: 0, formula: { preset: 'linear', step: 1 } },
  { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
];

function item(
  id: string,
  equipped: boolean,
  modifiers: { attribute: string; value: number }[],
): InventoryItem {
  return {
    id,
    equipped,
    position: 0,
    item: {
      id,
      name: id,
      description: '',
      rarity: 'common',
      type: 'equipment',
      slot: 'head',
      price: 1,
      modifiers,
    },
  };
}

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c',
    playerId: 'p',
    name: 'Ada',
    statPoints: 0,
    money: 0,
    attributes: [
      { attributeId: 'life', level: 2, current: 7 },
      { attributeId: 'mana', level: 0, current: 0 },
      { attributeId: 'str', level: 1, current: 3 },
    ],
    inventory: [],
    rev: 1,
    updatedAt: 0,
    ...overrides,
  };
}

describe('attributeStats', () => {
  it('adds points and equipped modifiers (by attribute name) to the base value', () => {
    const stats = attributeStats(
      attributes,
      character({
        inventory: [
          item('helm', true, [
            { attribute: 'Life', value: 3 },
            { attribute: 'Strength', value: -1 },
          ]),
          item('ring', true, [{ attribute: 'Life', value: 1 }]),
          item('bag', false, [{ attribute: 'Strength', value: 50 }]),
        ],
      }),
    );

    expect(stats[0]).toEqual({
      attributeId: 'life',
      name: 'Life',
      base: 10,
      level: 2,
      bonus: 4,
      max: 16,
      current: 7,
    });
    expect(stats[2]).toMatchObject({ bonus: -1, max: 2, current: 2 });
  });

  it('caps the current value at max and keeps it at 0 or more', () => {
    const stats = attributeStats(
      attributes,
      character({
        attributes: [
          { attributeId: 'life', level: 0, current: 99 },
          { attributeId: 'str', level: 0, current: -4 },
        ],
      }),
    );

    expect(stats[0].current).toBe(10);
    expect(stats[2].current).toBe(0);
  });

  it('treats an attribute added to the world later as full', () => {
    const stats = attributeStats(
      [...attributes, { id: 'luck', name: 'Luck', baseValue: 5, formula: { preset: 'linear', step: 1 } }],
      character(),
    );
    expect(stats[3]).toMatchObject({ level: 0, max: 5, current: 5 });
  });
});

describe('barStats', () => {
  it('returns the configured bars with a percentage', () => {
    const stats = attributeStats(attributes, character());
    const bars = barStats(stats, { life: 'life', mana: 'mana' });

    expect(bars.life).toEqual({
      name: 'Life',
      current: 7,
      max: 12,
      percent: 58,
    });
    expect(bars.mana).toEqual({ name: 'Mana', current: 0, max: 0, percent: 0 });
  });

  it('leaves out bars the world has not set', () => {
    expect(barStats(attributeStats(attributes, character()), {})).toEqual({
      life: undefined,
      mana: undefined,
    });
  });
});

describe('attributeStats with formulas', () => {
  const formulaAttributes: WorldAttribute[] = [
    { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'steep-linear', step: 5 } },
    { id: 'wit', name: 'Wit', baseValue: 10, formula: { preset: 'diminishing', step: 4 } },
    { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
    { id: 'pct', name: 'Focus', baseValue: 5, formula: { preset: 'percent', step: 10 } },
    {
      id: 'max-life',
      name: 'Max life',
      baseValue: 1,
      formula: { preset: 'custom', expression: 'base + [strength] * 10 + level' },
    },
  ];
  const withLevels = (levels: Record<string, number>, extra: Partial<Character> = {}) =>
    character({
      attributes: Object.entries(levels).map(([attributeId, level]) => ({ attributeId, level, current: 0 })),
      ...extra,
    });
  const maxOf = (stats: ReturnType<typeof attributeStats>, id: string) =>
    stats.find((entry) => entry.attributeId === id)!.max;

  it('computes max from each attribute formula and level', () => {
    const stats = attributeStats(formulaAttributes, withLevels({ life: 2, wit: 1, str: 3, pct: 1 }));
    expect(stats.find((entry) => entry.attributeId === 'life')).toMatchObject({ level: 2, base: 10, max: 20 });
    expect(maxOf(stats, 'wit')).toBe(18);
    expect(maxOf(stats, 'str')).toBe(5);
    expect(maxOf(stats, 'pct')).toBe(6);
  });

  it('rounds the formula result to an integer before adding equipment', () => {
    // 10 + 4 * 2 * sqrt(2) = 21.31
    const plain = attributeStats(formulaAttributes, withLevels({ wit: 2 }));
    expect(maxOf(plain, 'wit')).toBe(21);
    const worn = attributeStats(
      formulaAttributes,
      withLevels({ wit: 2 }, { inventory: [item('ring', true, [{ attribute: 'Wit', value: 2 }])] }),
    );
    expect(worn.find((entry) => entry.attributeId === 'wit')).toMatchObject({ bonus: 2, max: 23 });
  });

  it('lets a custom formula read another attribute level by name, with spaces and any case', () => {
    const stats = attributeStats(
      [
        ...formulaAttributes,
        { id: 'regen', name: 'Regen', baseValue: 0, formula: { preset: 'custom', expression: '[MAX LIFE] * 2' } },
      ],
      withLevels({ str: 3, 'max-life': 2, regen: 9 }),
    );
    expect(maxOf(stats, 'max-life')).toBe(1 + 30 + 2);
    expect(maxOf(stats, 'regen')).toBe(4);
  });

  it('uses level 0 for a character without an entry', () => {
    const stats = attributeStats(formulaAttributes, withLevels({}));
    expect(maxOf(stats, 'life')).toBe(10);
    expect(stats.find((entry) => entry.attributeId === 'life')!.current).toBe(10);
  });
});
