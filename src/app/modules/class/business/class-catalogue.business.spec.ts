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
import { TranslocoService } from '@jsverse/transloco';
import { validateClass } from '../helpers/class.rules';
import { validateSkill } from '../../skill/helpers/skill.rules';
import { CharacterClass } from '../models/class';
import { ClassCatalogueBusiness } from './class-catalogue.business';

const cls = (id: string, name: string, skillId = 's1'): CharacterClass => ({
  id, name, description: '',
  tree: [{ skillId, requires: [], minLevel: 1, column: 0, row: 0 }],
});

describe('ClassCatalogueBusiness (GM)', () => {
  let gm: ReturnType<typeof gameDevice>;
  // `addDefaults` is typed loosely until it exists, so the suite still compiles while red.
  const catalogue = () => gm.injector.get(ClassCatalogueBusiness) as ClassCatalogueBusiness & { addDefaults(): Promise<void> };
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

  it('adds the default classes and skills, keeping the existing ones', async () => {
    await catalogue().addDefaults();
    const world = gm.injector.get(WorldSessionBusiness).$world()!;
    expect(world.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    expect(world.classes[0].id).toBe('c1');
    expect(world.skills[0].id).toBe('s1');
    const rogue = world.classes[2];
    expect(rogue.tree.length).toBeGreaterThanOrEqual(4);
    expect(rogue.tree.every((n) => world.skills.some((s) => s.id === n.skillId))).toBe(true);
  });

  it('adds nothing the second time, and points the new tree at a skill kept by name', async () => {
    await catalogue().addDefaults();
    const probe = gm.injector.get(WorldSessionBusiness).$world()!;
    const rogue = probe.classes.find((c) => c.name === 'Rogue')!;
    const rogueSkill = probe.skills.find((s) => s.id === rogue.tree[0].skillId)!;
    // Reset to the original catalogue, but with a skill of the same name under another id.
    await gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      skills: [{ ...w.skills[0] }, { ...rogueSkill, id: 'mine' }],
      classes: [cls('c1', 'Warrior'), cls('c2', 'Mage')],
    }));

    await catalogue().addDefaults();
    const once = gm.injector.get(WorldSessionBusiness).$world()!;
    expect(once.skills.filter((s) => s.name === rogueSkill.name).map((s) => s.id)).toEqual(['mine']);
    expect(once.classes.find((c) => c.name === 'Rogue')!.tree.map((n) => n.skillId)).toContain('mine');
    expect(once.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);

    await catalogue().addDefaults();
    const twice = gm.injector.get(WorldSessionBusiness).$world()!;
    expect(twice.skills.map((s) => s.id)).toEqual(once.skills.map((s) => s.id));
    expect(twice.classes.map((c) => c.id)).toEqual(once.classes.map((c) => c.id));
  });

  it('gives starter skills no cost in a world without a mana bar, and valid trees', async () => {
    await catalogue().addDefaults();
    const world = gm.injector.get(WorldSessionBusiness).$world()!;
    const added = world.skills.filter((s) => s.id !== 's1');
    expect(added.length).toBeGreaterThanOrEqual(4);
    for (const skill of added) {
      expect(skill.cost).toBeUndefined();
      expect(validateSkill(skill, ['Life'])).toEqual([]);
    }
    const rogue = world.classes.find((c) => c.name === 'Rogue')!;
    expect(validateClass(rogue, world.skills, ['Life'])).toEqual([]);
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
    const saved = await tool.save({ ...cls('x', 'Paladin'), id: undefined });
    expect(TestBed.inject(SandboxWorldBusiness).$world().classes.map((c) => c.name)).toContain('Paladin');
    await tool.duplicate(saved.id);
    expect(tool.$world().classes.map((c) => c.name)).toContain('Paladin (copy)');
    await tool.remove(saved.id);
    expect(tool.$world().classes.map((c) => c.name)).not.toContain('Paladin');
  });

  it('starts with the starter classes and skills', () => {
    const world = TestBed.inject(SandboxWorldBusiness).$world();
    expect(world.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    expect(world.skills.length).toBeGreaterThanOrEqual(4);
    expect(world.classes.every((c) => c.tree.every((n) => world.skills.some((s) => s.id === n.skillId)))).toBe(true);
  });

  it.each([
    ['en', ['Warrior', 'Mage', 'Rogue']],
    ['fr', ['Guerrier', 'Mage', 'Voleur']],
  ])('has valid starter classes, charged on Mana, in %s', (language, names) => {
    TestBed.inject(TranslocoService).setActiveLang(language);
    const world = TestBed.inject(SandboxWorldBusiness).$world();
    const attributes = world.attributes.map((a) => a.name);
    expect(world.classes.map((c) => c.name)).toEqual(names);
    for (const skill of world.skills) {
      expect(validateSkill(skill, attributes)).toEqual([]);
      if (skill.cost) expect(skill.cost.attribute).toBe(attributes[1]);
    }
    expect(world.skills.some((s) => s.cost)).toBe(true);
    for (const c of world.classes) {
      expect(c.tree.length).toBeGreaterThanOrEqual(4);
      expect(c.tree.length).toBeLessThanOrEqual(6);
      expect(validateClass(c, world.skills, attributes)).toEqual([]);
    }
  });

  it('adds the defaults back after a delete, without duplicating the ones present', async () => {
    const tool = TestBed.inject(SandboxClassCatalogueBusiness) as SandboxClassCatalogueBusiness & { addDefaults(): Promise<void> };
    const skillCount = tool.$world().skills.length;
    const mage = tool.$world().classes.find((c) => c.name === 'Mage')!;
    await tool.remove(mage.id);
    await tool.addDefaults();
    expect(tool.$world().classes.map((c) => c.name).sort()).toEqual(['Mage', 'Rogue', 'Warrior']);
    expect(tool.$world().skills).toHaveLength(skillCount);
    await tool.addDefaults();
    expect(tool.$world().classes).toHaveLength(3);
    expect(tool.$world().skills).toHaveLength(skillCount);
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
