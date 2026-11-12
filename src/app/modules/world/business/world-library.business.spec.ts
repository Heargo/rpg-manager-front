import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { WorldImportError, WorldLibraryBusiness } from './world-library.business';
import en from '../../../../../public/i18n/generators/en/items.json';
import { WordListService } from '../../../core/services/word-list.service';
import { provideTestTranslations } from '../../../../testing/test-providers';

const TEST_WORLD_PROVIDERS = [
  provideTestTranslations(),
  { provide: WordListService, useValue: { loadItemWords: async () => en } },
];

describe('WorldLibraryBusiness (IndexedDB)', () => {
  let library: WorldLibraryBusiness;
  let images: ImageBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    vi.restoreAllMocks();
    TestBed.configureTestingModule({ providers: TEST_WORLD_PROVIDERS });
    library = TestBed.inject(WorldLibraryBusiness);
    images = TestBed.inject(ImageBusiness);
  });

  it('creates, lists, saves and removes worlds', async () => {
    // A ticking clock, so "most recently changed first" never depends on two calls landing in the same millisecond.
    let clock = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 10));
    const first = await library.create({ name: 'First', attributes: [] });
    await library.create({ name: 'Second', attributes: [] });
    await library.save({ ...first, description: 'edited' });

    // A fresh business sees what was stored.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: TEST_WORLD_PROVIDERS });
    const reloaded = TestBed.inject(WorldLibraryBusiness);
    await reloaded.load();
    expect(reloaded.$worlds().map((world) => world.name)).toEqual(['First', 'Second']);
    expect((await reloaded.get(first.id))?.description).toBe('edited');

    await reloaded.remove(first.id);
    expect(reloaded.$worlds().map((world) => world.name)).toEqual(['Second']);
    expect(await reloaded.get(first.id)).toBeUndefined();
  });

  it('stores identical images once', async () => {
    const a = await images.fromBase64({ type: 'image/png', data: 'AQID' });
    const b = await images.fromBase64({ type: 'image/png', data: 'AQID' });
    const c = await images.fromBase64({ type: 'image/png', data: 'BAUG' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await TestBed.inject(ImageStorageService).has(a)).toBe(true);
  });

  it('exports a world with its images and imports it as a new copy', async () => {
    const iconId = await images.fromBase64({ type: 'image/webp', data: 'AQIDBA==' });
    const world = await library.create({ name: 'Eldoria', attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }], imageId: iconId });

    const file = await (await library.exportWorld(world.id)).text();
    const json = JSON.parse(file);
    expect(Object.keys(json.images)).toEqual([iconId]);

    const imported = await library.importWorld(file);

    expect(imported.id).not.toBe(world.id);
    expect(imported.name).toBe('Eldoria');
    expect(imported.imageId).toBe(iconId);
    expect(library.$worlds()).toHaveLength(2);
    expect((await images.toBase64(iconId))?.data).toBe('AQIDBA==');
  });

  it('recomputes image ids on import instead of trusting the file', async () => {
    const world = await library.create({ name: 'W', attributes: [], imageId: 'forged-id' });
    const file = JSON.parse(await (await library.exportWorld(world.id)).text());
    file.images = { 'forged-id': { type: 'image/png', data: 'AQID' } };

    const imported = await library.importWorld(JSON.stringify(file));

    expect(imported.imageId).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses an invalid file with the list of problems', async () => {
    await expect(library.importWorld('{"format":"rpg-manager-world","version":1}')).rejects.toBeInstanceOf(WorldImportError);
  });

  it('creates a world with starter items drawn from its attributes', async () => {
    const world = await library.create(
      {
        name: 'Eldoria',
        attributes: [
          { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
          { name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
        ],
        barAttributes: { life: 'Life' },
      },
      { starterItems: true },
    );

    expect(world.items.length).toBeGreaterThan(15);
    expect(new Set(world.items.map((item) => item.id)).size).toBe(world.items.length);
    const attributes = world.items.flatMap((item) => item.modifiers.map((m) => m.attribute));
    expect(attributes.every((attribute) => ['Life', 'Strength'].includes(attribute))).toBe(true);
    expect((await library.get(world.id))?.items).toHaveLength(world.items.length);
  });

  it('creates a world with the starter classes and skills', async () => {
    const world = await library.create(
      {
        name: 'Eldoria',
        attributes: [
          { name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
          { name: 'Mana', baseValue: 5, formula: { preset: 'linear', step: 1 } },
          { name: 'Strength', baseValue: 2, formula: { preset: 'linear', step: 1 } },
        ],
        barAttributes: { life: 'Life', mana: 'Mana' },
      },
      { starterClasses: true } as unknown as { starterItems?: boolean },
    );

    expect(world.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    expect(world.classes.every((c) => c.tree.length >= 4 && c.tree.length <= 6)).toBe(true);
    expect(world.classes.every((c) => c.tree.every((n) => world.skills.some((s) => s.id === n.skillId)))).toBe(true);
    expect(new Set(world.skills.map((s) => s.id)).size).toBe(world.skills.length);
    expect(world.items).toEqual([]);
    expect(world.skills.every((s) => typeof s.maxLevel === 'number' && !('maxRank' in s))).toBe(true);
    expect(world.skills.every((s) => s.effects.every((e) => !/\brank\b/.test(e.amount)))).toBe(true);
    expect(world.skills.some((s) => s.effects.some((e) => /\bskillLevel\b/.test(e.amount)))).toBe(true);
    expect(world.classes.every((c) => c.tree.every((n) => n.requires.every((r) => typeof r.level === 'number' && !('rank' in r))))).toBe(true);
    const stored = await library.get(world.id);
    expect(stored?.classes).toHaveLength(3);
    expect(stored?.skills).toHaveLength(world.skills.length);
  });

  it('creates no classes or skills without the option', async () => {
    const world = await library.create({ name: 'Bare', attributes: [] });
    expect(world.classes).toEqual([]);
    expect(world.skills).toEqual([]);
  });

  it('creates an empty catalogue without the option', async () => {
    expect((await library.create({ name: 'Bare', attributes: [] })).items).toEqual([]);
  });
});
