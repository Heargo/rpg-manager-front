import {
  Character,
  InventoryItem,
  WorldAttribute,
} from '../../world/models/world';
import { attributeStats, barStats, formulaMax } from './character-stats';
import { Skill } from '../../skill/models/skill';

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
    xp: 0,
    level: 1,
    money: 0,
    attributes: [
      { attributeId: 'life', level: 2, current: 7 },
      { attributeId: 'mana', level: 0, current: 0 },
      { attributeId: 'str', level: 1, current: 3 },
    ],
    inventory: [],
    rev: 1,
    updatedAt: 0,
    skillPoints: 0,
    skills: [],
    ...overrides,
  };
}

const barIds = { life: 'life', mana: 'mana' };

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
      }), barIds);

    expect(stats[0]).toEqual({
      attributeId: 'life',
      name: 'Life',
      base: 10,
      level: 2,
      bonus: 4,
      skillBonus: 0,
      classBonus: 0,
      max: 16,
      current: 7,
      isBar: true,
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
      }), barIds);

    expect(stats[0].current).toBe(10);
    expect(stats[2].current).toBe(2);
  });

  it('treats an attribute added to the world later as full', () => {
    const stats = attributeStats(
      [...attributes, { id: 'luck', name: 'Luck', baseValue: 5, formula: { preset: 'linear', step: 1 } }],
      character(), barIds);
    expect(stats[3]).toMatchObject({ level: 0, max: 5, current: 5 });
  });
});

describe('attributeStats: only bar attributes have a current value', () => {
  it('flags bar attributes and nothing else', () => {
    const stats = attributeStats(attributes, character(), barIds);
    expect(stats.map((stat) => stat.isBar)).toEqual([true, true, false]);
  });

  it('gives a non-bar attribute its max whatever is stored', () => {
    const stats = attributeStats(
      attributes,
      character({
        attributes: [
          { attributeId: 'life', level: 0, current: 4 },
          { attributeId: 'str', level: 1, current: 0 },
        ],
      }),
      barIds,
    );
    expect(stats[2]).toMatchObject({ max: 3, current: 3, isBar: false });
    expect(stats[0]).toMatchObject({ max: 10, current: 4, isBar: true });
  });

  it('adds the equipment bonus to a non-bar current', () => {
    const [, , str] = attributeStats(
      attributes,
      character({ inventory: [item('belt', true, [{ attribute: 'Strength', value: 2 }])] }),
      barIds,
    );
    expect(str).toMatchObject({ max: 5, current: 5 });
  });

  it('treats every attribute as a non-bar when the world has no barIds', () => {
    const stats = attributeStats(attributes, character(), {});
    expect(stats.every((stat) => stat.current === stat.max && !stat.isBar)).toBe(true);
  });
});

describe('barStats', () => {
  it('returns the configured bars with a percentage', () => {
    const stats = attributeStats(attributes, character(), barIds);
    const result = barStats(stats, { life: 'life', mana: 'mana' });

    expect(result.life).toEqual({
      name: 'Life',
      current: 7,
      max: 12,
      percent: 58,
    });
    expect(result.mana).toEqual({ name: 'Mana', current: 0, max: 0, percent: 0 });
  });

  it('leaves out barIds the world has not set', () => {
    expect(barStats(attributeStats(attributes, character(), barIds), {})).toEqual({
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
    const stats = attributeStats(formulaAttributes, withLevels({ life: 2, wit: 1, str: 3, pct: 1 }), barIds);
    expect(stats.find((entry) => entry.attributeId === 'life')).toMatchObject({ level: 2, base: 10, max: 20 });
    expect(maxOf(stats, 'wit')).toBe(18);
    expect(maxOf(stats, 'str')).toBe(5);
    expect(maxOf(stats, 'pct')).toBe(6);
  });

  it('rounds the formula result to an integer before adding equipment', () => {
    // 10 + 4 * 2 * sqrt(2) = 21.31
    const plain = attributeStats(formulaAttributes, withLevels({ wit: 2 }), barIds);
    expect(maxOf(plain, 'wit')).toBe(21);
    const worn = attributeStats(
      formulaAttributes,
      withLevels({ wit: 2 }, { inventory: [item('ring', true, [{ attribute: 'Wit', value: 2 }])] }), barIds);
    expect(worn.find((entry) => entry.attributeId === 'wit')).toMatchObject({ bonus: 2, max: 23 });
  });

  it('lets a custom formula read another attribute level by name, with spaces and any case', () => {
    const stats = attributeStats(
      [
        ...formulaAttributes,
        { id: 'regen', name: 'Regen', baseValue: 0, formula: { preset: 'custom', expression: '[MAX LIFE] * 2' } },
      ],
      withLevels({ str: 3, 'max-life': 2, regen: 9 }), barIds);
    expect(maxOf(stats, 'max-life')).toBe(1 + 30 + 2);
    expect(maxOf(stats, 'regen')).toBe(4);
  });

  it('uses level 0 for a character without an entry', () => {
    const stats = attributeStats(formulaAttributes, withLevels({}), barIds);
    expect(maxOf(stats, 'life')).toBe(10);
    expect(stats.find((entry) => entry.attributeId === 'life')!.current).toBe(10);
  });
});

describe('attributeStats with playerLevel', () => {
  it('uses the character level, not 0', () => {
    const wise: WorldAttribute[] = [
      { id: 'wit', name: 'Wit', baseValue: 10, formula: { preset: 'custom', expression: 'base + playerLevel * 10' } },
    ];
    const at = (level: number) =>
      attributeStats(wise, character({ level, attributes: [{ attributeId: 'wit', level: 0, current: 0 }] }), barIds)[0].max;
    expect(at(1)).toBe(20);
    expect(at(4)).toBe(50);
  });
});

// `cap` is not in the types yet (red): spread through a helper so the suite still compiles.
const cap = (value?: number): object => ({ cap: value });

describe('attribute cap', () => {
  const capped: WorldAttribute[] = [
    { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 5 }, ...cap(22) },
  ];
  const withLevel = (level: number, current: number, inventory: Character['inventory'] = []) =>
    character({ attributes: [{ attributeId: 'life', level, current }], inventory });

  it('formulaMax stops at the cap', () => {
    expect(formulaMax(capped[0], 1, {})).toBe(15);
    expect(formulaMax(capped[0], 3, {})).toBe(22);
    expect(formulaMax(capped[0], 50, {})).toBe(22);
  });

  it('attributeStats caps the formula only: equipped gear adds on top', () => {
    const gear = item('ring', true, [{ attribute: 'Life', value: 3 }]);
    const [plain] = attributeStats(capped, withLevel(10, 5), barIds);
    expect(plain.max).toBe(22);
    const [geared] = attributeStats(capped, withLevel(10, 5, [gear]), barIds);
    expect(geared).toMatchObject({ max: 25, bonus: 3 });
  });

  it('keeps current at most the max', () => {
    const [stat] = attributeStats(capped, withLevel(10, 40), barIds);
    expect(stat.current).toBe(22);
  });

  it('does nothing without a cap', () => {
    const [stat] = attributeStats([{ ...capped[0], ...cap(undefined) }], withLevel(10, 5), barIds);
    expect(stat.max).toBe(60);
  });
});

describe('attributeStats with passive skills', () => {
  const passive = (id: string, attribute: string, amount: string, duration = 0): Skill => ({
    id, name: id, description: '', rarity: 'common', type: 'passive', maxLevel: 3, pointCost: 1,
    effects: [{ kind: 'modify', attribute, amount, duration }],
  });

  it('adds the permanent modify effects at the sheet level to the max, as their own line', () => {
    const stats = attributeStats(
      attributes,
      character({ skills: [{ skillId: 'tough', level: 2 }] }),
      barIds,
      [passive('tough', 'Life', '5 + skillLevel')],
    );
    expect(stats[0]).toMatchObject({ bonus: 0, skillBonus: 7, max: 19 });
    expect(stats[2]).toMatchObject({ skillBonus: 0, max: 3 });
  });

  it('reads the caster attribute maxima in the formula', () => {
    const stats = attributeStats(
      attributes,
      character({ skills: [{ skillId: 'tough', level: 1 }] }),
      barIds,
      [passive('tough', 'Life', 'Strength')],
    );
    expect(stats[0]).toMatchObject({ skillBonus: 3, max: 15 });
  });

  it('ignores active skills, timed effects and skills the sheet does not have', () => {
    const active: Skill = { ...passive('act', 'Life', '50'), type: 'active', target: 'self' };
    const stats = attributeStats(
      attributes,
      character({ skills: [{ skillId: 'act', level: 1 }, { skillId: 'timed', level: 1 }] }),
      barIds,
      [active, passive('timed', 'Life', '50', 3), passive('other', 'Life', '50')],
    );
    expect(stats[0]).toMatchObject({ skillBonus: 0, max: 12 });
  });
});

describe('attributeStats class bonuses', () => {
  // Loosely typed: the fifth argument and `classBonus` do not exist yet (red).
  const stats = (sheet: Character, classBonuses: { attribute: string; value: number }[]) =>
    (attributeStats as unknown as (...args: unknown[]) => (ReturnType<typeof attributeStats>[number] & { classBonus: number })[])(
      attributes, sheet, barIds, [], classBonuses,
    );

  it('adds the class bonuses to the maxima on their own line', () => {
    const [life, mana, str] = stats(character(), [{ attribute: 'Life', value: 3 }, { attribute: 'Strength', value: 1 }]);

    expect(life).toMatchObject({ classBonus: 3, bonus: 0, max: 15 });
    expect(mana).toMatchObject({ classBonus: 0, max: 0 });
    expect(str).toMatchObject({ classBonus: 1, max: 4 });
  });

  it('stacks with the equipped items, and a negative bonus lowers the max', () => {
    const sheet = character({ inventory: [item('ring', true, [{ attribute: 'Life', value: 2 }])] });

    const [life, , str] = stats(sheet, [{ attribute: 'Life', value: 3 }, { attribute: 'Strength', value: -1 }]);

    expect(life).toMatchObject({ bonus: 2, classBonus: 3, max: 17 });
    expect(str).toMatchObject({ classBonus: -1, max: 2 });
  });
});
