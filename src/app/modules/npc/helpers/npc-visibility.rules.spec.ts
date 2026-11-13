import { InventoryItem, World } from '../../world/models/world';
import { Npc, NpcVisibilityRules } from '../models/npc';
import { DEFAULT_NPC_VISIBILITY, isValidNpcVisibility, toPublicNpc } from './npc-visibility.rules';

const linear = { preset: 'linear', step: 1 } as const;
const helm: InventoryItem = {
  id: 'e1', equipped: true, position: 0,
  item: { id: 'i1', name: 'Iron Helm', description: '', rarity: 'common', type: 'equipment', slot: 'head', price: 5, modifiers: [{ attribute: 'Strength', value: 2 }] },
};
const sack: InventoryItem = {
  id: 'e2', equipped: false, position: 1,
  item: { id: 'i2', name: 'Secret Sack', description: '', rarity: 'common', type: 'item', slot: 'none', price: 1, modifiers: [] },
};

const world = {
  classes: [],
  attributes: [
    { id: 'life', name: 'Life', baseValue: 10, formula: linear },
    { id: 'str', name: 'Strength', baseValue: 2, formula: linear },
  ],
  barAttributes: { life: 'life' },
  npcVisibility: DEFAULT_NPC_VISIBILITY,
} as Pick<World, 'attributes' | 'barAttributes' | 'npcVisibility' | 'classes'>;

const npc = (roles: Npc['roles']): Npc => ({
  id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64), statPoints: 0, xp: 40, level: 3, money: 77, updatedAt: 1,
  skillPoints: 2, skills: [{ skillId: 'sk1', level: 1 }],
  attributes: [{ attributeId: 'life', level: 0, current: 4 }, { attributeId: 'str', level: 1, current: 3 }],
  inventory: [helm, sack], roles, description: 'A grumpy ogre.', xpReward: 123, loot: ['e2'],
});

const allOff = { description: false, level: false, lifeBar: false, lifeNumbers: false, attributes: false, equipment: false };
const rules = (patch: Partial<NpcVisibilityRules>): NpcVisibilityRules => ({
  story: allOff, merchant: allOff, enemy: allOff, ...patch,
});

describe('DEFAULT_NPC_VISIBILITY', () => {
  it('matches the spec table', () => {
    expect(DEFAULT_NPC_VISIBILITY).toEqual({
      story: { description: true, level: true, lifeBar: false, lifeNumbers: false, attributes: false, equipment: false },
      merchant: { description: true, level: true, lifeBar: false, lifeNumbers: false, attributes: false, equipment: false },
      enemy: { description: false, level: true, lifeBar: true, lifeNumbers: false, attributes: false, equipment: false },
    });
  });
});

describe('toPublicNpc', () => {
  it('shows the portrait and the name only when nothing is ticked', () => {
    expect(toPublicNpc(npc(['enemy']), { ...world, npcVisibility: rules({}) })).toEqual({
      id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64),
    });
  });

  it('applies the enemy defaults: level and a life bar without numbers', () => {
    expect(toPublicNpc(npc(['enemy']), world)).toEqual({
      id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64), level: 3, lifeBar: { percent: 40 },
    });
  });

  it('applies the story defaults: description and level', () => {
    expect(toPublicNpc(npc(['story']), world)).toEqual({
      id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64), description: 'A grumpy ogre.', level: 3,
    });
  });

  it('shows the union of the ticks of every role', () => {
    const projection = toPublicNpc(npc(['story', 'enemy']), world);
    expect(projection).toEqual({
      id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64), description: 'A grumpy ogre.', level: 3, lifeBar: { percent: 40 },
    });
  });

  it('adds life numbers, every attribute (current / max) and the equipped items when ticked', () => {
    const visibility = rules({
      enemy: { ...allOff, lifeNumbers: true, attributes: true, equipment: true },
    });
    expect(toPublicNpc(npc(['enemy']), { ...world, npcVisibility: visibility })).toEqual({
      id: 'n1', name: 'Grok', portraitId: 'p'.repeat(64),
      life: { current: 4, max: 10 },
      attributes: [
        { name: 'Life', current: 4, max: 10 },
        { name: 'Strength', current: 5, max: 5 },
      ],
      equipment: [{ name: 'Iron Helm' }],
    });
  });

  it('never carries inventory, skills, money, XP reward or loot, even with everything ticked', () => {
    const everything = { description: true, level: true, lifeBar: true, lifeNumbers: true, attributes: true, equipment: true };
    const json = JSON.stringify(toPublicNpc(npc(['story', 'merchant', 'enemy']), { ...world, npcVisibility: rules({ story: everything }) }));
    for (const hidden of ['inventory', 'skills', 'skillId', 'money', '77', 'xpReward', '123', 'loot', 'Secret Sack']) {
      expect(json).not.toContain(hidden);
    }
  });
});

describe('isValidNpcVisibility', () => {
  it('accepts the defaults', () => {
    expect(isValidNpcVisibility(DEFAULT_NPC_VISIBILITY)).toBe(true);
  });

  it('refuses a missing role, a missing field and a non-boolean tick', () => {
    const { enemy: _enemy, ...noEnemy } = DEFAULT_NPC_VISIBILITY;
    const { level: _level, ...noLevel } = DEFAULT_NPC_VISIBILITY.story;
    expect(isValidNpcVisibility(noEnemy)).toBe(false);
    expect(isValidNpcVisibility({ ...DEFAULT_NPC_VISIBILITY, story: noLevel })).toBe(false);
    expect(isValidNpcVisibility({ ...DEFAULT_NPC_VISIBILITY, story: { ...allOff, level: 'yes' } })).toBe(false);
    expect(isValidNpcVisibility(undefined)).toBe(false);
    expect(isValidNpcVisibility(null)).toBe(false);
  });
});
