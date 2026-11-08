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
import { SandboxClassCatalogueBusiness } from '../../tools/business/sandbox-class-catalogue.business';
import { SkillCatalogueBusiness } from '../../skill/business/skill-catalogue.business';
import { SandboxSkillCatalogueBusiness } from '../../tools/business/sandbox-skill-catalogue.business';
import { CharacterClass } from '../models/class';
import { ClassCatalogueBusiness } from './class-catalogue.business';

const cls = (id: string, name: string, skillId = 's1'): CharacterClass => ({
  id, name, description: '',
  tree: [{ skillId, requires: [], minLevel: 1, column: 0, row: 0 }],
});

describe('ClassCatalogueBusiness (GM)', () => {
  let gm: ReturnType<typeof gameDevice>;
  const catalogue = () => gm.injector.get(ClassCatalogueBusiness);
  const stored = () => gm.injector.get(WorldSessionBusiness).$world()!.classes;

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
    await gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      skills: [{
        id: 's1', name: 'Slash', description: '', rarity: 'common', type: 'passive', maxRank: 3, pointCost: 1,
        effects: [{ kind: 'modify', attribute: 'Life', amount: 'rank', duration: 0 }],
      }],
      classes: [cls('c1', 'Warrior'), cls('c2', 'Mage')],
    }));
  });

  afterEach(() => gm.injector.destroy());

  it('lists the classes with a search', () => {
    expect(catalogue().list({ search: '' }).map((c) => c.name)).toEqual(['Warrior', 'Mage']);
    expect(catalogue().list({ search: 'mag' }).map((c) => c.name)).toEqual(['Mage']);
  });

  it('adds a new class with an id, and replaces one with the same id, in the stored world', async () => {
    const added = await catalogue().save({ ...cls('x', 'Rogue'), id: undefined });
    expect(added.id).toBeTruthy();
    expect(stored().map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    await catalogue().save(cls('c1', 'Paladin'));
    expect(stored().map((c) => c.name)).toEqual(['Paladin', 'Mage', 'Rogue']);
  });

  it('duplicates a class with a new id and a "(copy)" name', async () => {
    await catalogue().duplicate('c1');
    expect(stored().map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Warrior (copy)']);
    expect(stored()[2].id).not.toBe('c1');
  });

  it('deletes a class', async () => {
    await catalogue().remove('c1');
    expect(stored().map((c) => c.id)).toEqual(['c2']);
  });

  it('refuses to delete a skill a class tree uses, with that class among the usages', async () => {
    const result = await gm.injector.get(SkillCatalogueBusiness).remove('s1');
    expect(result.removed).toBe(false);
    expect(result.usages).toEqual([
      { kind: 'class', id: 'c1', name: 'Warrior' },
      { kind: 'class', id: 'c2', name: 'Mage' },
    ]);
    expect(gm.injector.get(WorldSessionBusiness).$world()!.skills.map((s) => s.id)).toEqual(['s1']);
  });
});

describe('SandboxClassCatalogueBusiness (Tools)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), SandboxClassCatalogueBusiness, SandboxSkillCatalogueBusiness],
    });
  });

  it('saves, duplicates and deletes classes on the sandbox world, in memory', async () => {
    const tool = TestBed.inject(SandboxClassCatalogueBusiness);
    const saved = await tool.save({ ...cls('x', 'Rogue'), id: undefined });
    expect(TestBed.inject(SandboxWorldBusiness).$world().classes.map((c) => c.name)).toContain('Rogue');
    await tool.duplicate(saved.id);
    expect(tool.$world().classes.map((c) => c.name)).toContain('Rogue (copy)');
    await tool.remove(saved.id);
    expect(tool.$world().classes.map((c) => c.name)).not.toContain('Rogue');
  });

  it('refuses to delete a sandbox skill a class tree uses', async () => {
    const classes = TestBed.inject(SandboxClassCatalogueBusiness);
    const skills = TestBed.inject(SandboxSkillCatalogueBusiness);
    const skill = await skills.save({
      name: 'Slash', description: '', rarity: 'common', type: 'passive', maxRank: 1, pointCost: 1, effects: [],
    });
    const saved = await classes.save({ ...cls('x', 'Rogue', skill.id), id: undefined });
    expect(await skills.remove(skill.id)).toEqual({
      removed: false, usages: [{ kind: 'class', id: saved.id, name: 'Rogue' }],
    });
  });
});
