import { ITEM_RARITIES } from '../../../core/models/item';
import { seededRandomSource } from '../../../core/generators/random-source';
import { NpcNameList } from '../../../core/generators/npc-name-list';
import { levelRarity } from '../../character/helpers/level.rules';
import { createSandboxWorld } from '../../world/helpers/default-world';
import { Item, World } from '../../world/models/world';
import { Npc } from '../models/npc';
import { validateNpc } from './npc.rules';
import { generateNpc, npcToJson, parseNpcJson, setNpcLevel } from './npc-editor.rules';

const names: NpcNameList = {
  version: 1,
  given: [
    { text: 'Aro', gender: 'm' },
    { text: 'Mila', gender: 'f' },
  ],
  epithets: ['Grim'],
  templates: ['{given} {epithet}'],
};
const items: Item[] = ITEM_RARITIES.flatMap((rarity) =>
  (['weapon1', 'head', 'chest'] as const).map((slot) => ({
    id: `${rarity}-${slot}`,
    name: `${rarity} ${slot}`,
    description: '',
    rarity,
    type: 'equipment' as const,
    slot,
    price: 10,
    modifiers: [{ attribute: 'Wit', value: 1 }],
  })),
);
const world: World = {
  ...createSandboxWorld((key) => key),
  attributes: [
    { id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    { id: 'grit', name: 'Grit', baseValue: 5, formula: { preset: 'linear', step: 1 } },
  ],
  levelCurve: { preset: 'flat' },
  maxLevel: 10,
  startingStatPoints: 5,
  statPointsPerLevel: 3,
  items,
};

const npc: Npc = {
  id: 'n1', name: 'Goblin', description: 'Sneaky.', roles: ['enemy', 'merchant'], level: 3, xp: 200, statPoints: 0,
  money: 15, updatedAt: 1, skillPoints: 0, skills: [], xpReward: 30, loot: ['e1'],
  merchant: { buyRatio: 1.5 },
  attributes: [{ attributeId: 'wit', level: 4, current: 9 }],
  inventory: [{ id: 'e1', item: items[0], equipped: false, position: 0 }],
};

describe('setNpcLevel', () => {
  it('puts the XP at the start of the level on the world curve (flat: 100 per level)', () => {
    expect(setNpcLevel(npc, 3, world)).toMatchObject({ level: 3, xp: 200 });
    expect(setNpcLevel(npc, 1, world)).toMatchObject({ level: 1, xp: 0 });
    expect(setNpcLevel(npc, 10, world)).toMatchObject({ level: 10, xp: 900 });
  });

  it('follows another curve (growing: 100 x level)', () => {
    const growing = { ...world, levelCurve: { preset: 'growing' as const } };
    expect(setNpcLevel(npc, 3, growing)).toMatchObject({ level: 3, xp: 500 });
  });

  it('leaves the rest of the NPC untouched', () => {
    expect(setNpcLevel(npc, 5, world)).toEqual({ ...npc, level: 5, xp: 400 });
  });
});

describe('setNpcLevel and attributes that read the level', () => {
  const scaled: World = {
    ...world,
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'custom', expression: 'base + playerLevel * 2' } },
    ],
  };
  const hurt: Npc = { ...npc, level: 1, xp: 0, attributes: [{ attributeId: 'life', level: 0, current: 10 }] };

  it('moves the current value by the change of the max when the level changes', () => {
    // max is 12 at level 1 and 16 at level 3: current 10 becomes 14
    expect(setNpcLevel(hurt, 3, scaled).attributes).toEqual([{ attributeId: 'life', level: 0, current: 14 }]);
  });

  it('lowers the current value with the max when the level drops', () => {
    const high = setNpcLevel({ ...hurt, attributes: [{ attributeId: 'life', level: 0, current: 16 }] }, 3, scaled);
    expect(setNpcLevel(high, 1, scaled).attributes).toEqual([{ attributeId: 'life', level: 0, current: 12 }]);
  });
});

describe('npcToJson / parseNpcJson', () => {
  it('round-trips an NPC onto the one being edited', () => {
    const parsed = parseNpcJson(npcToJson(npc), npc);
    expect(parsed.issues).toEqual([]);
    expect(parsed.npc).toEqual(npc);
  });

  it('applies the edited fields, keeping the id', () => {
    const json = { ...JSON.parse(npcToJson(npc)), name: 'Hobgoblin', xpReward: 50 };
    const parsed = parseNpcJson(JSON.stringify(json), npc);
    expect(parsed.npc).toMatchObject({ id: 'n1', name: 'Hobgoblin', xpReward: 50 });
  });

  it('refuses text that is not JSON', () => {
    const parsed = parseNpcJson('{ nope', npc);
    expect(parsed.npc).toBeUndefined();
    expect(parsed.issues).toEqual([{ field: 'json', code: 'invalid-json' }]);
  });

  it('refuses an NPC with the validateNpc issues', () => {
    const json = { ...JSON.parse(npcToJson(npc)), name: ' ', roles: [], loot: ['ghost'] };
    const parsed = parseNpcJson(JSON.stringify(json), npc);
    expect(parsed.npc).toBeUndefined();
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        { field: 'name', code: 'required' },
        { field: 'roles', code: 'required' },
        { field: 'loot', code: 'unknown-item' },
      ]),
    );
  });
});

describe('parseNpcJson with malformed sheet parts', () => {
  const refuse = (change: (json: Record<string, unknown>) => void) => {
    const json = JSON.parse(npcToJson(npc));
    json['loot'] = [];
    change(json);
    const parsed = parseNpcJson(JSON.stringify(json), npc);
    expect(parsed.npc).toBeUndefined();
    expect(parsed.issues.length).toBeGreaterThan(0);
  };

  it('refuses an attribute without attributeId', () => {
    refuse((json) => (json['attributes'] = [{ level: 2, current: 3 }]));
  });

  it('refuses attributes that are not a list', () => {
    refuse((json) => (json['attributes'] = 'wit'));
  });

  it('refuses an inventory entry without item', () => {
    refuse((json) => (json['inventory'] = [{ id: 'e1', equipped: false, position: 0 }]));
  });

  it('refuses an inventory entry without id', () => {
    refuse((json) => (json['inventory'] = [{ item: items[0], equipped: false, position: 0 }]));
  });
});

describe('generateNpc', () => {
  const draw = (seed: string) => ({ id: 'g', ...generateNpc(world, seededRandomSource(seed), names) });

  it('gives the same NPC for the same seed, and another for another seed', () => {
    expect(draw('s1')).toEqual(draw('s1'));
    expect(draw('s1')).not.toEqual(draw('s2'));
  });

  it('is valid per validateNpc, named, with a level within the world and its XP at the start of that level', () => {
    for (let i = 0; i < 30; i++) {
      const generated = draw(`seed-${i}`);
      expect(validateNpc(generated)).toEqual([]);
      expect(generated.name.trim()).not.toBe('');
      expect(generated.level).toBeGreaterThanOrEqual(1);
      expect(generated.level).toBeLessThanOrEqual(10);
      expect(generated.xp).toBe((generated.level - 1) * 100);
    }
  });

  it('spreads attribute levels over the world attributes, within what the level affords', () => {
    for (let i = 0; i < 30; i++) {
      const generated = draw(`attr-${i}`);
      expect(generated.attributes.map((a) => a.attributeId).sort()).toEqual(['grit', 'wit']);
      const total = generated.attributes.reduce((sum, a) => sum + a.level, 0);
      expect(generated.attributes.every((a) => a.level >= 0)).toBe(true);
      expect(total).toBeLessThanOrEqual(5 + (generated.level - 1) * 3);
      if (generated.level > 1) expect(total).toBeGreaterThan(0);
    }
  });

  it('equips catalogue items of the rarity of its level, one per slot', () => {
    for (let i = 0; i < 30; i++) {
      const generated = draw(`gear-${i}`);
      const rarity = levelRarity(generated.level, world.maxLevel);
      expect(generated.inventory.length).toBeGreaterThan(0);
      for (const entry of generated.inventory) {
        expect(entry.equipped).toBe(true);
        expect(items).toContainEqual(entry.item);
        expect(entry.item.rarity).toBe(rarity);
      }
      const slots = generated.inventory.map((entry) => entry.item.slot);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it('takes its name from the NPC name list, not the item words', () => {
    for (let i = 0; i < 20; i++) {
      expect(['Aro Grim', 'Mila Grim']).toContain(draw(`name-${i}`).name);
    }
  });

  it('copes with a world without items', () => {
    const generated = generateNpc({ ...world, items: [] }, seededRandomSource('empty'), names);
    expect(generated.inventory).toEqual([]);
    expect(validateNpc({ id: 'g', ...generated })).toEqual([]);
  });
});
