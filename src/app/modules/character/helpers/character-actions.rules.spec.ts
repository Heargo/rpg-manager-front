import { ItemDraft } from '../../../core/models/item';
import {
  Character,
  InventoryItem,
  WorldAttribute,
} from '../../world/models/world';
import {
  CHARACTER_ACTION_KINDS,
  GAME_MASTER_ACTIONS,
  ActionResult,
  applyCharacterAction as applyWithRules,
  MAX_GRANTED_XP,
  parseCharacterAction,
} from './character-actions.rules';
import { attributeStats } from './character-stats';

const levelRules = { levelCurve: { preset: 'growing' as const }, statPointsPerLevel: 3 };
const applyCharacterAction = (
  ...args: [WorldAttribute[], Character, Parameters<typeof applyWithRules>[2]]
) => applyWithRules(...args, levelRules);

const attributes: WorldAttribute[] = [
  { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
  { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
];

function entry(
  id: string,
  item: Partial<ItemDraft>,
  equipped = false,
): InventoryItem {
  return {
    id,
    equipped,
    position: 0,
    item: {
      id: `item-${id}`,
      name: id,
      description: '',
      rarity: 'common',
      type: 'item',
      slot: 'none',
      price: 1000,
      modifiers: [],
      ...item,
    },
  };
}

const helmA = entry('helmA', {
  type: 'equipment',
  slot: 'head',
  modifiers: [{ attribute: 'Life', value: 3 }],
});
const helmB = entry('helmB', {
  type: 'equipment',
  slot: 'head',
  modifiers: [{ attribute: 'Strength', value: 1 }],
});
const ring = entry('ring', { type: 'equipment', slot: 'ring' });
const potion = entry('potion', {
  type: 'consumable',
  modifiers: [{ attribute: 'Life', value: 6 }],
  price: 2500,
});
const rock = entry('rock', { price: 300 });

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c',
    playerId: 'p',
    name: 'Ada',
    statPoints: 2,
    xp: 0,
    level: 1,
    money: 5000,
    attributes: [
      { attributeId: 'life', level: 0, current: 4 },
      { attributeId: 'str', level: 0, current: 2 },
    ],
    inventory: [helmA, helmB, ring, potion, rock],
    rev: 1,
    updatedAt: 0,
    ...overrides,
  };
}

function ok(result: ActionResult): Character {
  if (!result.ok) throw new Error(`refused: ${result.error}`);
  return result.character;
}

const stat = (c: Character, id: string) =>
  attributeStats(attributes, c).find((s) => s.attributeId === id)!;

describe('character actions', () => {
  it('spends a stat point: max and current go up, points down', () => {
    const next = ok(
      applyCharacterAction(attributes, character(), {
        kind: 'spend-stat-point',
        attributeId: 'str',
      }),
    );
    expect(next.statPoints).toBe(1);
    expect(stat(next, 'str')).toMatchObject({ level: 1, max: 3, current: 3 });
  });

  it('raises max and current by the same delta, whatever the formula', () => {
    // Diminishing, base 10, step 4: level 0 -> 10, level 1 -> 18, level 2 -> 21 (21.31 rounded).
    const wit: WorldAttribute[] = [
      ...attributes,
      { id: 'wit', name: 'Wit', baseValue: 10, formula: { preset: 'diminishing', step: 4 } },
    ];
    const start = character({
      statPoints: 2,
      attributes: [{ attributeId: 'wit', level: 0, current: 4 }],
    });
    const first = ok(applyCharacterAction(wit, start, { kind: 'spend-stat-point', attributeId: 'wit' }));
    expect(attributeStats(wit, first).find((s) => s.attributeId === 'wit')).toMatchObject({
      level: 1,
      max: 18,
      current: 12,
    });
    const second = ok(applyCharacterAction(wit, first, { kind: 'spend-stat-point', attributeId: 'wit' }));
    expect(attributeStats(wit, second).find((s) => s.attributeId === 'wit')).toMatchObject({
      level: 2,
      max: 21,
      current: 15,
    });
  });

  it('keeps set-current and use capped at the formula max', () => {
    const steep: WorldAttribute[] = [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'steep-linear', step: 5 } },
    ];
    const start = character({ attributes: [{ attributeId: 'life', level: 2, current: 18 }], inventory: [potion] });
    const set = ok(applyCharacterAction(steep, start, { kind: 'set-current', attributeId: 'life', value: 99 }));
    expect(set.attributes[0]).toMatchObject({ level: 2, current: 20 });
    const used = ok(applyCharacterAction(steep, start, { kind: 'use', inventoryId: 'potion' }));
    expect(used.attributes[0]).toMatchObject({ level: 2, current: 20 });
  });

  it('refuses to spend without points or on an unknown attribute', () => {
    expect(
      applyCharacterAction(attributes, character({ statPoints: 0 }), {
        kind: 'spend-stat-point',
        attributeId: 'str',
      }),
    ).toEqual({
      ok: false,
      error: 'character.errors.noStatPoints',
    });
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'spend-stat-point',
        attributeId: 'luck',
      }),
    ).toMatchObject({ ok: false });
  });

  it('grants stat points within limits', () => {
    expect(
      ok(
        applyCharacterAction(attributes, character(), {
          kind: 'grant-stat-points',
          amount: 3,
        }),
      ).statPoints,
    ).toBe(5);
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'grant-stat-points',
        amount: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'grant-stat-points',
        amount: 101,
      }),
    ).toMatchObject({ ok: false });
  });

  it('sets a current value, kept between 0 and max', () => {
    const c = character();
    expect(
      stat(
        ok(
          applyCharacterAction(attributes, c, {
            kind: 'set-current',
            attributeId: 'life',
            value: 7,
          }),
        ),
        'life',
      ).current,
    ).toBe(7);
    expect(
      stat(
        ok(
          applyCharacterAction(attributes, c, {
            kind: 'set-current',
            attributeId: 'life',
            value: 99,
          }),
        ),
        'life',
      ).current,
    ).toBe(10);
    expect(
      stat(
        ok(
          applyCharacterAction(attributes, c, {
            kind: 'set-current',
            attributeId: 'life',
            value: -5,
          }),
        ),
        'life',
      ).current,
    ).toBe(0);
  });

  it('equips into a slot, sending the previous item of that slot back to the bag', () => {
    let c = ok(
      applyCharacterAction(attributes, character(), {
        kind: 'equip',
        inventoryId: 'helmA',
      }),
    );
    c = ok(
      applyCharacterAction(attributes, c, {
        kind: 'equip',
        inventoryId: 'ring',
      }),
    );
    expect(stat(c, 'life').max).toBe(13);

    c = ok(
      applyCharacterAction(attributes, c, {
        kind: 'equip',
        inventoryId: 'helmB',
      }),
    );
    const equipped = c.inventory.filter((e) => e.equipped).map((e) => e.id);
    expect(equipped).toEqual(['helmB', 'ring']);
    expect(stat(c, 'life').max).toBe(10);
    expect(stat(c, 'str').max).toBe(3);

    c = ok(
      applyCharacterAction(attributes, c, {
        kind: 'unequip',
        inventoryId: 'helmB',
      }),
    );
    expect(c.inventory.filter((e) => e.equipped).map((e) => e.id)).toEqual([
      'ring',
    ]);
  });

  it('only equips equipment', () => {
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'equip',
        inventoryId: 'potion',
      }),
    ).toEqual({
      ok: false,
      error: 'character.errors.notEquipment',
    });
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'equip',
        inventoryId: 'nope',
      }),
    ).toMatchObject({ ok: false });
  });

  it('uses a consumable: adds its modifiers to current, capped at max, and removes it', () => {
    const c = ok(
      applyCharacterAction(attributes, character(), {
        kind: 'use',
        inventoryId: 'potion',
      }),
    );
    expect(stat(c, 'life').current).toBe(10);
    expect(c.inventory.some((e) => e.id === 'potion')).toBe(false);

    const withHelm = character({
      inventory: [{ ...helmA, equipped: true }, potion],
    });
    expect(
      stat(
        ok(
          applyCharacterAction(attributes, withHelm, {
            kind: 'use',
            inventoryId: 'potion',
          }),
        ),
        'life',
      ).current,
    ).toBe(10);
    expect(
      applyCharacterAction(attributes, character(), {
        kind: 'use',
        inventoryId: 'rock',
      }),
    ).toEqual({
      ok: false,
      error: 'character.errors.notConsumable',
    });
  });

  it('sells an item for its price, equipped or not', () => {
    const c = ok(
      applyCharacterAction(
        attributes,
        character({ inventory: [{ ...helmA, equipped: true }, rock] }),
        { kind: 'sell', inventoryId: 'helmA' },
      ),
    );
    expect(c.money).toBe(6000);
    expect(c.inventory.map((e) => e.id)).toEqual(['rock']);
    expect(stat(c, 'life').max).toBe(10);
  });

  it('parses actions from the wire', () => {
    expect(parseCharacterAction('equip', { inventoryId: 'x' })).toEqual({
      kind: 'equip',
      inventoryId: 'x',
    });
    expect(parseCharacterAction('equip', { inventoryId: 3 })).toBeNull();
    expect(
      parseCharacterAction('grant-stat-points', { amount: 1.5 }),
    ).toBeNull();
    expect(
      parseCharacterAction('set-current', { attributeId: 'life', value: 4 }),
    ).toEqual({ kind: 'set-current', attributeId: 'life', value: 4 });
    expect(parseCharacterAction('spend-stat-point', null)).toBeNull();
    expect(parseCharacterAction('grant-xp', { amount: 250 })).toEqual({ kind: 'grant-xp', amount: 250 });
    expect(parseCharacterAction('grant-xp', { amount: 2.5 })).toBeNull();
    expect(parseCharacterAction('grant-xp', {})).toBeNull();
    expect(CHARACTER_ACTION_KINDS).toContain('grant-xp');
    expect(GAME_MASTER_ACTIONS).toContain('grant-xp');
  });
});

describe('grant-xp limits', () => {
  it('refuses an amount above MAX_GRANTED_XP', () => {
    expect(
      applyCharacterAction(attributes, character(), { kind: 'grant-xp', amount: 1e12 }),
    ).toEqual({ ok: false, error: 'character.errors.invalidAmount' });
    expect(
      applyCharacterAction(attributes, character(), { kind: 'grant-xp', amount: MAX_GRANTED_XP + 1 }),
    ).toEqual({ ok: false, error: 'character.errors.invalidAmount' });
  });
});
