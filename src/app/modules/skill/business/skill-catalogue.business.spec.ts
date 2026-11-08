import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { SandboxSkillCatalogueBusiness } from '../../tools/business/sandbox-skill-catalogue.business';
import { Skill } from '../models/skill';
import { SkillCatalogueBusiness } from './skill-catalogue.business';

const skill = (id: string, name: string, type: Skill['type'] = 'active'): Skill => ({
  id, name, description: '', rarity: 'common', type, maxRank: 3, pointCost: 1,
  ...(type === 'active' ? { target: 'one-enemy' as const, cooldown: 0 } : {}),
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'rank * 2' }],
});

describe('SkillCatalogueBusiness (GM)', () => {
  let gm: ReturnType<typeof gameDevice>;
  const catalogue = () => gm.injector.get(SkillCatalogueBusiness);
  const stored = () => gm.injector.get(WorldSessionBusiness).$world()!.skills;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    gm = gameDevice(createPeerNetwork(), 'gm', 'Gm');
    gm.injector.get(GameSessionBusiness);
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await gm.injector
      .get(WorldSessionBusiness)
      .update((w) => ({ ...w, skills: [skill('s1', 'Fireball'), skill('s2', 'Toughness', 'passive')] }));
  });

  afterEach(() => gm.injector.destroy());

  it('lists the skills with a search and a type filter', () => {
    expect(catalogue().list({ search: '', type: undefined }).map((s) => s.name)).toEqual(['Fireball', 'Toughness']);
    expect(catalogue().list({ search: 'tough', type: undefined }).map((s) => s.name)).toEqual(['Toughness']);
    expect(catalogue().list({ search: '', type: 'active' }).map((s) => s.name)).toEqual(['Fireball']);
  });

  it('adds a new skill with an id, and replaces one with the same id, in the stored world', async () => {
    const added = await catalogue().save({ ...skill('x', 'Bolt'), id: undefined });
    expect(added.id).toBeTruthy();
    expect(stored().map((s) => s.name)).toEqual(['Fireball', 'Toughness', 'Bolt']);
    await catalogue().save({ ...skill('s1', 'Big Fireball') });
    expect(stored().map((s) => s.name)).toEqual(['Big Fireball', 'Toughness', 'Bolt']);
  });

  it('duplicates a skill with a new id and a "(copy)" name', async () => {
    await catalogue().duplicate('s1');
    expect(stored().map((s) => s.name)).toEqual(['Fireball', 'Toughness', 'Fireball (copy)']);
    expect(stored()[2].id).not.toBe('s1');
  });

  it('deletes an unused skill', async () => {
    const result = await catalogue().remove('s1');
    expect(result).toEqual({ removed: true, usages: [] });
    expect(stored().map((s) => s.id)).toEqual(['s2']);
  });

  it('refuses to delete a skill a sheet has and returns where it is used', async () => {
    await gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      npcs: [{
        id: 'n1', name: 'Goblin', statPoints: 0, xp: 0, level: 1, money: 0, updatedAt: 1, skillPoints: 0,
        skills: [{ skillId: 's1', rank: 1 }], attributes: [], inventory: [], roles: ['enemy'], description: '',
        xpReward: 0, loot: [],
      }],
    }));
    const result = await catalogue().remove('s1');
    expect(result).toEqual({ removed: false, usages: [{ kind: 'npc', id: 'n1', name: 'Goblin' }] });
    expect(stored().map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('SandboxSkillCatalogueBusiness (Tools)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), SandboxSkillCatalogueBusiness] });
  });

  it('saves, duplicates and deletes skills on the sandbox world, in memory', async () => {
    const tool = TestBed.inject(SandboxSkillCatalogueBusiness);
    const saved = await tool.save({ ...skill('x', 'Bolt'), id: undefined });
    expect(TestBed.inject(SandboxWorldBusiness).$world().skills.map((s) => s.name)).toContain('Bolt');
    await tool.duplicate(saved.id);
    expect(tool.$world().skills.map((s) => s.name)).toContain('Bolt (copy)');
    expect(await tool.remove(saved.id)).toMatchObject({ removed: true });
    expect(tool.$world().skills.map((s) => s.name)).not.toContain('Bolt');
  });
});
