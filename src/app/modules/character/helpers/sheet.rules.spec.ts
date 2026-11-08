import { Sheet, WorldAttribute } from '../../world/models/world';
import { applyCharacterAction } from './character-actions.rules';
import { attributeStats } from './character-stats';
import { levelProgress } from './level.rules';

const attributes: WorldAttribute[] = [
  { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
  { id: 'str', name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
];
const levelRules = { levelCurve: { preset: 'growing' as const }, statPointsPerLevel: 3, skillPointsPerLevel: 1, maxLevel: 20, barAttributes: { life: 'life' } };

const entry = (id: string, modifiers: { attribute: string; value: number }[], type: 'equipment' | 'consumable', equipped = false) => ({
  id,
  equipped,
  position: 0,
  item: { id: `item-${id}`, name: id, description: '', rarity: 'common' as const, type, slot: type === 'equipment' ? ('head' as const) : ('none' as const), price: 100, modifiers },
});

/** An NPC-shaped sheet: no playerId, rev or notes. */
function sheet(overrides: Partial<Sheet> = {}): Sheet {
  return {
    id: 'n1',
    name: 'Goblin',
    statPoints: 0,
    xp: 0,
    level: 3,
    money: 0,
    attributes: [
      { attributeId: 'life', level: 2, current: 5 },
      { attributeId: 'str', level: 1, current: 3 },
    ],
    inventory: [],
    updatedAt: 0,
    classId: 'warrior',
    skillPoints: 2,
    skills: [{ skillId: 'bash', rank: 1 }],
    ...overrides,
  };
}

describe('rules on a plain sheet', () => {
  it('computes attribute maxima and equipment bonuses', () => {
    const stats = attributeStats(attributes, sheet({ inventory: [entry('helm', [{ attribute: 'Life', value: 3 }], 'equipment', true)] }), { life: 'life' });
    expect(stats[0]).toMatchObject({ attributeId: 'life', level: 2, bonus: 3, max: 15, current: 5 });
    expect(stats[1]).toMatchObject({ attributeId: 'str', level: 1, bonus: 0, max: 3, current: 3 });
  });

  it('equips and unequips', () => {
    const helm = entry('helm', [{ attribute: 'Life', value: 3 }], 'equipment');
    const equipped = applyCharacterAction(attributes, sheet({ inventory: [helm] }), { kind: 'equip', inventoryId: 'helm' }, levelRules, { skills: [], classes: [] });
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    expect(equipped.character.inventory[0].equipped).toBe(true);
    expect(equipped.character).not.toHaveProperty('playerId');

    const removed = applyCharacterAction(attributes, equipped.character, { kind: 'unequip', inventoryId: 'helm' }, levelRules, { skills: [], classes: [] });
    expect(removed.ok && removed.character.inventory[0].equipped).toBe(false);
  });

  it('uses a consumable on a bar attribute and keeps the new fields', () => {
    const potion = entry('potion', [{ attribute: 'Life', value: 4 }], 'consumable');
    const result = applyCharacterAction(attributes, sheet({ inventory: [potion] }), { kind: 'use', inventoryId: 'potion' }, levelRules, { skills: [], classes: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.inventory).toEqual([]);
    expect(result.character.attributes.find((a) => a.attributeId === 'life')?.current).toBe(9);
    expect(result.character).toMatchObject({ classId: 'warrior', skillPoints: 2, skills: [{ skillId: 'bash', rank: 1 }] });
  });

  it('derives the level from the sheet xp', () => {
    expect(levelProgress({ preset: 'growing' }, sheet({ xp: 200 }).xp, 20).level).toBe(2);
  });
});
