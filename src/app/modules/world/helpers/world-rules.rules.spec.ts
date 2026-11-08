import { Character, Item, World, WorldRules } from '../models/world';
import { createWorld } from './world.factory';
import { applyWorldRules } from './world-rules.rules';

const linear = { preset: 'linear', step: 1 } as const;

const sword: Item = {
  id: 'sword',
  name: 'Sword',
  description: '',
  rarity: 'common',
  type: 'equipment',
  slot: 'weapon1',
  price: 10,
  modifiers: [
    { attribute: 'Life', value: 2 },
    { attribute: 'Mana', value: 1 },
  ],
};

function sheet(id: string, xp: number, level: number, lifeId: string, manaId: string): Character {
  return {
    id,
    playerId: id,
    rev: 3,
    name: id,
    statPoints: 4,
    skillPoints: 2,
    skills: [],
    xp,
    level,
    money: 7,
    attributes: [
      { attributeId: lifeId, level: 1, current: 11 },
      { attributeId: manaId, level: 2, current: 7 },
    ],
    inventory: [{ id: 'inv', item: sword, equipped: true, position: 0 }],
    updatedAt: 1,
  };
}

function setup(): { world: World; rules: WorldRules } {
  let n = 0;
  const base = createWorld(
    {
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: linear },
        { name: 'Mana', baseValue: 5, formula: linear },
      ],
      levelCurve: { preset: 'growing' },
      maxLevel: 20,
      statPointsPerLevel: 3,
      startingStatPoints: 5,
      startingMoney: 100,
    },
    () => `id${++n}`,
    1,
  );
  const [life, mana] = base.attributes;
  const world: World = {
    ...base,
    items: [sword],
    // growing: level 2 costs 200, level 3 costs 300 (500 in all), level 4 costs 400 (900 in all)
    characters: [sheet('ada', 500, 3, life.id, mana.id)],
  };
  const rules: WorldRules = {
    attributes: world.attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
    startingStatPoints: world.startingStatPoints,
    startingMoney: world.startingMoney,
    levelCurve: world.levelCurve,
    maxLevel: world.maxLevel,
    statPointsPerLevel: world.statPointsPerLevel,
    offlineFeatures: world.offlineFeatures,
  };
  return { world, rules };
}

describe('applyWorldRules', () => {
  it('stores the edited rules on the world', () => {
    const { world, rules } = setup();
    const next = applyWorldRules(
      world,
      {
        ...rules,
        startingStatPoints: 9,
        startingMoney: 250,
        statPointsPerLevel: 1,
        offlineFeatures: { ...rules.offlineFeatures, sell: true },
      },
      () => 'new',
    );
    expect(next.startingStatPoints).toBe(9);
    expect(next.startingMoney).toBe(250);
    expect(next.statPointsPerLevel).toBe(1);
    expect(next.offlineFeatures.sell).toBe(true);
  });

  it('leaves existing sheets alone when only starting values change', () => {
    const { world, rules } = setup();
    const next = applyWorldRules(world, { ...rules, startingStatPoints: 9, startingMoney: 250 }, () => 'new');
    expect(next.characters).toEqual(world.characters);
  });

  it('recomputes levels from the XP with a new level curve, without touching points', () => {
    const { world, rules } = setup();
    // flat: 100 XP per level, so 500 XP is level 6 (was level 3 on the growing curve)
    const next = applyWorldRules(world, { ...rules, levelCurve: { preset: 'flat' } }, () => 'new');
    expect(next.levelCurve).toEqual({ preset: 'flat' });
    expect(next.characters[0]).toMatchObject({ xp: 500, level: 6, statPoints: 4, skillPoints: 2 });
  });

  it('caps sheets at a lower max level and keeps their XP', () => {
    const { world, rules } = setup();
    const next = applyWorldRules(world, { ...rules, maxLevel: 2 }, () => 'new');
    expect(next.maxLevel).toBe(2);
    expect(next.characters[0]).toMatchObject({ xp: 500, level: 2, statPoints: 4 });
  });

  it('deletes an attribute from every sheet and from item modifiers that name it', () => {
    const { world, rules } = setup();
    const [life, mana] = world.attributes;
    const next = applyWorldRules(world, { ...rules, attributes: rules.attributes.filter((a) => a.id !== mana.id) }, () => 'new');
    expect(next.attributes.map((a) => a.name)).toEqual(['Life']);
    expect(next.characters[0].attributes).toEqual([{ attributeId: life.id, level: 1, current: 11 }]);
    expect(next.items[0].modifiers).toEqual([{ attribute: 'Life', value: 2 }]);
    expect(next.characters[0].inventory[0].item.modifiers).toEqual([{ attribute: 'Life', value: 2 }]);
  });

  it('renames and edits an attribute in place, and adds a new one with a fresh id', () => {
    const { world, rules } = setup();
    const [life] = world.attributes;
    const next = applyWorldRules(
      world,
      {
        ...rules,
        attributes: [
          { id: life.id, name: 'Vitality', baseValue: 12, formula: linear, cap: 40 },
          rules.attributes[1],
          { name: ' Luck ', baseValue: 1, formula: linear },
        ],
      },
      () => 'luck-id',
    );
    expect(next.attributes[0]).toMatchObject({ id: life.id, name: 'Vitality', baseValue: 12, cap: 40 });
    expect(next.attributes[2]).toMatchObject({ id: 'luck-id', name: 'Luck', baseValue: 1 });
  });
});
