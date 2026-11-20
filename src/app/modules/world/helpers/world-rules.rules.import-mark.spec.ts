import { entryHash, planPackImport } from '../../../core/packs/pack-content';
import { Item, World, WorldRules } from '../models/world';
import { createWorld } from './world.factory';
import { applyWorldRules } from './world-rules.rules';

const linear = { preset: 'linear', step: 1 } as const;

const copy = (): any => ({
  id: 'extra:sword',
  name: 'Epee',
  description: '',
  rarity: 'common',
  type: 'equipment',
  slot: 'weapon1',
  price: 10,
  modifiers: [
    { attribute: 'Life', value: 2 },
    { attribute: 'Mana', value: 1 },
  ],
});

function setup(item: Item): { world: World; rules: WorldRules } {
  let n = 0;
  const base = createWorld(
    {
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: linear },
        { name: 'Mana', baseValue: 5, formula: linear },
      ],
    },
    () => `id${++n}`,
    1,
  );
  const world: World = { ...base, items: [item] };
  const rules: WorldRules = {
    attributes: world.attributes
      .filter((a) => a.name !== 'Mana')
      .map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
    startingStatPoints: world.startingStatPoints,
    startingMoney: world.startingMoney,
    levelCurve: world.levelCurve,
    maxLevel: world.maxLevel,
    statPointsPerLevel: world.statPointsPerLevel,
    startingSkillPoints: world.startingSkillPoints,
    skillPointsPerLevel: world.skillPointsPerLevel,
    offlineFeatures: world.offlineFeatures,
    packs: world.packs,
  };
  return { world, rules };
}

describe('applyWorldRules on imported items', () => {
  it('strips a deleted attribute from an untouched pack copy and re-marks it, so the import still updates it', () => {
    const imported = copy();
    const { world, rules } = setup({ ...imported, packHash: entryHash(imported) });

    const next = applyWorldRules(world, rules, () => 'new');
    const fixed: any = next.items[0];

    expect(fixed.modifiers).toEqual([{ attribute: 'Life', value: 2 }]);
    expect(fixed.packHash).toBe(entryHash(fixed));
    expect(fixed.packHash).not.toBe(entryHash(imported));
    const plan = planPackImport({
      packId: 'extra',
      content: { items: [{ ...imported, id: 'sword', name: 'Epee v2' }] },
      attributes: [],
      world: { items: next.items, skills: [], classes: [], attributes: [] },
      mapping: {},
      domains: ['items'],
    });
    expect(plan.kept).toEqual([]);
    expect(plan.items.map((i) => i['name'])).toEqual(['Epee v2']);
  });

  it('keeps the old mark of a copy the game master edited', () => {
    const imported = copy();
    const edited = { ...imported, name: 'Ma lame', packHash: entryHash(imported) };
    const { world, rules } = setup(edited);

    const fixed: any = applyWorldRules(world, rules, () => 'new').items[0];

    expect(fixed.modifiers).toEqual([{ attribute: 'Life', value: 2 }]);
    expect(fixed.packHash).toBe(entryHash(imported));
  });
});
