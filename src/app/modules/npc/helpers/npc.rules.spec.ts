import { Item } from '../../world/models/world';
import { Npc } from '../models/npc';
import { duplicateNpc, filterNpcs, validateNpc } from './npc.rules';

const sword: Item = { id: 'sword', name: 'Iron Sword', description: '', rarity: 'common', type: 'equipment', slot: 'weapon1', price: 10, modifiers: [] };

const npc = (changes: Partial<Npc> = {}): Npc => ({
  id: 'n1',
  name: 'Goblin',
  statPoints: 0,
  xp: 0,
  level: 3,
  money: 5,
  attributes: [{ attributeId: 'life', level: 2, current: 12 }],
  inventory: [{ id: 'inv1', item: sword, equipped: false, position: 0 }],
  updatedAt: 1,
  skillPoints: 0,
  skills: [{ skillId: 'bite', level: 1 }],
  roles: ['enemy'],
  description: 'Green.',
  xpReward: 20,
  loot: ['inv1'],
  ...changes,
});

describe('validateNpc', () => {
  it('accepts a valid NPC', () => {
    expect(validateNpc(npc())).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateNpc(npc({ name: '  ' }))).toEqual([{ field: 'name', code: 'required' }]);
  });

  it('requires at least one role', () => {
    expect(validateNpc(npc({ roles: [] }))).toEqual([{ field: 'roles', code: 'required' }]);
  });

  it('refuses an unknown role', () => {
    expect(validateNpc(npc({ roles: ['boss' as never] }))).toEqual([{ field: 'roles', code: 'invalid' }]);
  });

  it('accepts several roles', () => {
    expect(validateNpc(npc({ roles: ['story', 'merchant'] }))).toEqual([]);
  });

  it('refuses a negative or fractional xpReward', () => {
    expect(validateNpc(npc({ xpReward: -1 }))).toEqual([{ field: 'xpReward', code: 'invalid' }]);
    expect(validateNpc(npc({ xpReward: 1.5 }))).toEqual([{ field: 'xpReward', code: 'invalid' }]);
    expect(validateNpc(npc({ xpReward: 0 }))).toEqual([]);
  });

  it('refuses loot that is not an inventory entry of the NPC', () => {
    expect(validateNpc(npc({ loot: ['inv1', 'ghost'] }))).toEqual([{ field: 'loot', code: 'unknown-item' }]);
  });

  it('accepts merchant ratios from 0 to 10 and refuses others', () => {
    expect(validateNpc(npc({ roles: ['merchant'], merchant: { buyRatio: 0, sellRatio: 10 } }))).toEqual([]);
    expect(validateNpc(npc({ roles: ['merchant'], merchant: {} }))).toEqual([]);
    expect(validateNpc(npc({ roles: ['merchant'], merchant: { buyRatio: -0.1 } }))).toEqual([{ field: 'merchant', code: 'invalid' }]);
    expect(validateNpc(npc({ roles: ['merchant'], merchant: { sellRatio: 10.5 } }))).toEqual([{ field: 'merchant', code: 'invalid' }]);
  });
});

describe('duplicateNpc', () => {
  it('gives a new id and a copied name', () => {
    const copy = duplicateNpc(npc(), () => 'n2');
    expect(copy.id).toBe('n2');
    expect(copy.name).toBe('Goblin (copy)');
    expect(copy.roles).toEqual(['enemy']);
    expect(copy.xpReward).toBe(20);
    expect(copy.level).toBe(3);
  });

  it('is a deep copy', () => {
    const original = npc({ roles: ['merchant'], merchant: { buyRatio: 2 } });
    const copy = duplicateNpc(original, () => 'n2');
    copy.roles.push('story');
    copy.loot.push('x');
    copy.attributes[0].current = 1;
    copy.inventory[0].equipped = true;
    copy.skills[0].level = 9;
    copy.merchant!.buyRatio = 5;
    expect(original.roles).toEqual(['merchant']);
    expect(original.loot).toEqual(['inv1']);
    expect(original.attributes[0].current).toBe(12);
    expect(original.inventory[0].equipped).toBe(false);
    expect(original.skills[0].level).toBe(1);
    expect(original.merchant).toEqual({ buyRatio: 2 });
  });
});

describe('filterNpcs', () => {
  const goblin = npc();
  const king = npc({ id: 'n2', name: 'King Arthur', level: 10, roles: ['story'] });
  const smith = npc({ id: 'n3', name: 'Smith', level: 5, roles: ['merchant', 'story'] });
  const all = [goblin, king, smith];
  const none = { search: '', roles: [], minLevel: 1, maxLevel: 100 };
  const names = (list: Npc[]) => list.map((n) => n.name);

  it('keeps everything when no filter is set', () => {
    expect(filterNpcs(all, none)).toEqual(all);
  });

  it('searches by name, ignoring case and surrounding spaces', () => {
    expect(names(filterNpcs(all, { ...none, search: '  ARTH ' }))).toEqual(['King Arthur']);
  });

  it('keeps the NPCs having any selected role', () => {
    expect(names(filterNpcs(all, { ...none, roles: ['merchant'] }))).toEqual(['Smith']);
    expect(names(filterNpcs(all, { ...none, roles: ['story', 'enemy'] }))).toEqual(['Goblin', 'King Arthur', 'Smith']);
  });

  it('keeps levels within the range, bounds included', () => {
    expect(names(filterNpcs(all, { ...none, minLevel: 3, maxLevel: 5 }))).toEqual(['Goblin', 'Smith']);
  });

  it('combines the filters', () => {
    expect(names(filterNpcs(all, { ...none, roles: ['story'], minLevel: 6 }))).toEqual(['King Arthur']);
  });
});
