import { World } from '../models/world';
import { createWorld, DEFAULT_OFFLINE_FEATURES, remapWorldImages, summarizeWorld, worldImageIds } from './world.factory';

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

describe('createWorld', () => {
  it('has no money format: money is always integer copper', () => {
    const world = createWorld({ name: 'Eldoria', attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }, { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } }], barAttributes: { life: 'Life', mana: 'Mana' } }, ids(), 1000);
    expect(world).not.toHaveProperty('moneyFormat');
  });

  it('builds a world with ids, trimmed names and defaults', () => {
    const world = createWorld(
      {
        name: '  Eldoria ',
        attributes: [
          { name: ' Life ', baseValue: 10, formula: { preset: 'linear', step: 1 } },
          { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
        ],
        barAttributes: { life: 'Life', mana: 'Mana' },
        offlineFeatures: { sell: true },
      },
      ids(),
      1000,
    );

    expect(world).toMatchObject({
      id: 'id3',
      name: 'Eldoria',
      description: '',
      attributes: [
        { id: 'id1', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
        { id: 'id2', name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
      ],
      barAttributes: { life: 'id1', mana: 'id2' },
      startingStatPoints: 0,
      levelCurve: { preset: 'growing' },
      statPointsPerLevel: 3,
      startingMoney: 0,
      offlineFeatures: { ...DEFAULT_OFFLINE_FEATURES, sell: true },
      items: [],
      characters: [],
      quickImageIds: [],
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  it('keeps the level curve and stat points per level of the draft', () => {
    const world = createWorld(
      { name: 'W', attributes: [], levelCurve: { preset: 'custom', expression: 'level * 50' }, statPointsPerLevel: 5 },
      ids(),
      0,
    );
    expect(world).toMatchObject({ levelCurve: { preset: 'custom', expression: 'level * 50' }, statPointsPerLevel: 5 });
  });

  it('keeps each attribute formula, preset or custom', () => {
    const world = createWorld(
      {
        name: 'W',
        attributes: [
          { name: 'Life', baseValue: 10, formula: { preset: 'steep-linear', step: 5 } },
          { name: 'Luck', baseValue: 1, formula: { preset: 'custom', expression: 'base + level ^ 2' } },
        ],
      },
      ids(),
      0,
    );
    expect(world.attributes.map((attribute) => attribute.formula)).toEqual([
      { preset: 'steep-linear', step: 5 },
      { preset: 'custom', expression: 'base + level ^ 2' },
    ]);
  });

  it('leaves a bar empty when its attribute name does not exist', () => {
    const world = createWorld({ name: 'W', attributes: [], barAttributes: { life: 'Life' } }, ids(), 0);
    expect(world.barAttributes).toEqual({ life: undefined, mana: undefined });
  });
});

function worldWithImages(): World {
  const world = createWorld({ name: 'W', attributes: [] }, ids(), 0);
  const item = { id: 'i1', name: 'Sword', description: '', rarity: 'rare' as const, type: 'equipment' as const, slot: 'weapon1' as const, price: 5, modifiers: [], imageId: 'img-item' };
  return {
    ...world,
    imageId: 'img-icon',
    illustrationId: 'img-ill',
    quickImageIds: ['img-quick', 'img-icon'],
    items: [item],
    characters: [
      {
        id: 'c1', playerId: 'p1', name: 'Ada', portraitId: 'img-portrait', statPoints: 0, xp: 0, level: 1, money: 0, attributes: [], rev: 1, updatedAt: 0,
        inventory: [{ id: 'e1', item: { ...item, imageId: 'img-copy' }, equipped: false, position: 0 }],
      },
    ],
  };
}

describe('world images', () => {
  it('lists every image once', () => {
    expect(worldImageIds(worldWithImages()).sort()).toEqual(
      ['img-copy', 'img-icon', 'img-ill', 'img-item', 'img-portrait', 'img-quick'],
    );
  });

  it('remaps image ids everywhere, keeping unknown ones', () => {
    const remapped = remapWorldImages(worldWithImages(), new Map([['img-icon', 'new-icon'], ['img-copy', 'new-copy']]));
    expect(remapped.imageId).toBe('new-icon');
    expect(remapped.quickImageIds).toEqual(['img-quick', 'new-icon']);
    expect(remapped.characters[0].inventory[0].item.imageId).toBe('new-copy');
    expect(remapped.items[0].imageId).toBe('img-item');
  });

  it('summarizes a world', () => {
    expect(summarizeWorld(worldWithImages())).toEqual({
      id: 'id1', name: 'W', description: '', imageId: 'img-icon', characterCount: 1, updatedAt: 0,
    });
  });
});
