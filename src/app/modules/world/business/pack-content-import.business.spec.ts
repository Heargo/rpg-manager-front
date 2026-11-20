import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { contentPackProvider } from '../../../../testing/content-pack';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { entryHash } from '../../../core/packs/pack-content';
import { WorldRules } from '../models/world';
import { WorldLibraryBusiness } from './world-library.business';
import { WorldSessionBusiness } from './world-session.business';
// The business does not exist yet: the missing module is part of the red.
import { PackContentImportBusiness } from './pack-content-import.business';

const linear = { preset: 'linear', step: 1 } as const;

describe('PackContentImportBusiness', () => {
  const session = () => TestBed.inject(WorldSessionBusiness);
  const business = () => TestBed.inject(PackContentImportBusiness);
  const world = () => session().$world()!;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), contentPackProvider()] });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
  });

  async function open(attributes: { name: string }[], packs = ['extra']) {
    await TestBed.inject(PackBusiness).enable('extra');
    const created = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: attributes.map((a) => ({ ...a, baseValue: 10, formula: linear })),
      packs,
    });
    await session().open(created.id);
  }

  it('imports the fixed items, skills and classes of the active packs, prefixed and marked, and keeps them', async () => {
    await open([{ name: 'Force' }]);

    const result = await business().importFromPacks();

    expect(result).toMatchObject({ added: 3, updated: 0, kept: 0, needsChoice: [] });
    expect(world().items).toEqual([
      expect.objectContaining({ id: 'extra:sword', name: 'Epee', modifiers: [{ attribute: 'Force', value: 2 }], packHash: expect.any(String) }),
    ]);
    expect(world().skills.map((s) => s.id)).toEqual(['extra:strike']);
    expect(world().classes.map((c) => c.id)).toEqual(['extra:warrior']);
    expect(world().classes[0].tree[0].skillId).toBe('extra:strike');
    const saved = await TestBed.inject(WorldLibraryBusiness).get(world().id);
    expect(saved!.items.map((i) => i.id)).toEqual(['extra:sword']);
    expect(saved!.classes.map((c) => c.id)).toEqual(['extra:warrior']);
  });

  it('changes nothing when run again on untouched copies', async () => {
    await open([{ name: 'Force' }]);
    await business().importFromPacks();

    const result = await business().importFromPacks();

    expect(result).toMatchObject({ added: 0, updated: 0, kept: 0 });
    expect(world().items).toHaveLength(1);
  });

  it('updates an untouched copy that is out of date', async () => {
    await open([{ name: 'Force' }]);
    await business().importFromPacks();
    await session().update((w) => {
      const old = { ...w.items[0], name: 'Vieille epee' };
      return { ...w, items: [{ ...old, packHash: entryHash(old) } as any] };
    });

    const result = await business().importFromPacks();

    expect(result).toMatchObject({ added: 0, updated: 1, kept: 0 });
    expect(world().items[0].name).toBe('Epee');
  });

  it('keeps a copy the game master edited', async () => {
    await open([{ name: 'Force' }]);
    await business().importFromPacks();
    await session().update((w) => ({ ...w, items: [{ ...w.items[0], name: 'Ma lame' }] }));

    const result = await business().importFromPacks();

    expect(result).toMatchObject({ added: 0, updated: 0, kept: 1 });
    expect(world().items[0].name).toBe('Ma lame');
  });

  it('imports only the domains asked for', async () => {
    await open([{ name: 'Force' }]);

    const result = await business().importFromPacks({ domains: ['skills'] });

    expect(result.added).toBe(1);
    expect(world().skills.map((s) => s.id)).toEqual(['extra:strike']);
    expect(world().items).toEqual([]);
    expect(world().classes).toEqual([]);
  });

  describe('when the content uses an attribute the world does not have', () => {
    it('writes nothing and returns the attributes needing a choice', async () => {
      await open([{ name: 'Life' }]);

      const result = await business().importFromPacks();

      expect(result.needsChoice).toEqual([{ id: 'str', name: 'Force' }]);
      expect(result).toMatchObject({ added: 0, updated: 0, kept: 0 });
      expect(world().items).toEqual([]);
      expect(world().skills).toEqual([]);
      expect(world().classes).toEqual([]);
      expect(world().attributes.map((a) => a.name)).toEqual(['Life']);
    });

    it('adds the attribute to the world when the choice is add', async () => {
      await open([{ name: 'Life' }]);

      const result = await business().importFromPacks({ mapping: { str: 'add' } });

      expect(result.needsChoice).toEqual([]);
      expect(world().attributes.map((a) => a.name)).toEqual(['Life', 'Force']);
      expect(world().items[0].modifiers).toEqual([{ attribute: 'Force', value: 2 }]);
    });

    it('maps the attribute to an existing one', async () => {
      await open([{ name: 'Life' }]);
      const life = world().attributes[0];

      await business().importFromPacks({ mapping: { str: life.id } });

      expect(world().attributes.map((a) => a.name)).toEqual(['Life']);
      expect(world().items[0].modifiers).toEqual([{ attribute: 'Life', value: 2 }]);
      expect(world().classes[0].bonuses).toEqual([{ attribute: 'Life', value: 1 }]);
    });

    it('drops the modifiers on a skipped attribute and still imports the entries', async () => {
      await open([{ name: 'Life' }]);

      await business().importFromPacks({ mapping: { str: 'skip' } });

      expect(world().attributes.map((a) => a.name)).toEqual(['Life']);
      expect(world().items[0]).toMatchObject({ id: 'extra:sword', modifiers: [] });
      expect(world().classes.map((c) => c.id)).toEqual(['extra:warrior']);
    });
  });

  it('imports the content of a pack the game master activates in the world rules', async () => {
    await open([{ name: 'Force' }], []);
    expect(world().items).toEqual([]);
    TestBed.inject(PackContentImportBusiness);
    const rules: WorldRules = {
      attributes: world().attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
      startingStatPoints: world().startingStatPoints,
      startingMoney: world().startingMoney,
      levelCurve: world().levelCurve,
      maxLevel: world().maxLevel,
      statPointsPerLevel: world().statPointsPerLevel,
      startingSkillPoints: world().startingSkillPoints,
      skillPointsPerLevel: world().skillPointsPerLevel,
      offlineFeatures: world().offlineFeatures,
      packs: ['extra'],
    };

    await session().saveRules(rules);

    await vi.waitFor(() => {
      expect(world().items.map((i) => i.id)).toEqual(['extra:sword']);
      expect(world().classes.map((c) => c.id)).toEqual(['extra:warrior']);
    });
  });

  it('forgets a pending choice when the world is closed or another one opens', async () => {
    await open([{ name: 'Life' }], []);
    await business().importActivated(['extra']);
    expect(business().$pending()).not.toBeNull();

    session().close();

    expect(business().$pending()).toBeNull();
    await expect(business().confirmPending({ str: 'add' })).resolves.toBeNull();
  });

  it('forgets a pending choice of the previous world when another world opens', async () => {
    await open([{ name: 'Life' }], []);
    await business().importActivated(['extra']);
    const other = await TestBed.inject(WorldLibraryBusiness).create({ name: 'Other', attributes: [], packs: [] });

    await session().open(other.id);

    expect(business().$pending()).toBeNull();
  });
});
