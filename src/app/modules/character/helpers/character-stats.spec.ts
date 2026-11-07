import {
  Character,
  InventoryItem,
  WorldAttribute,
} from '../../world/models/world';
import { attributeStats, barStats } from './character-stats';

const attributes: WorldAttribute[] = [
  { id: 'life', name: 'Life', baseValue: 10 },
  { id: 'mana', name: 'Mana', baseValue: 0 },
  { id: 'str', name: 'Strength', baseValue: 2 },
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
      { attributeId: 'life', points: 2, current: 7 },
      { attributeId: 'mana', points: 0, current: 0 },
      { attributeId: 'str', points: 1, current: 3 },
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
      points: 2,
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
          { attributeId: 'life', points: 0, current: 99 },
          { attributeId: 'str', points: 0, current: -4 },
        ],
      }),
    );

    expect(stats[0].current).toBe(10);
    expect(stats[2].current).toBe(0);
  });

  it('treats an attribute added to the world later as full', () => {
    const stats = attributeStats(
      [...attributes, { id: 'luck', name: 'Luck', baseValue: 5 }],
      character(),
    );
    expect(stats[3]).toMatchObject({ points: 0, max: 5, current: 5 });
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
