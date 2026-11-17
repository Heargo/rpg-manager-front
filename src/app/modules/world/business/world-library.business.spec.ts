import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { WorldImportError, WorldLibraryBusiness } from './world-library.business';
import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { ItemVocabularyBusiness } from '../../../core/business/item-vocabulary.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WorldStorageService } from '../services/world-storage.service';
import { provideTestTranslations } from '../../../../testing/test-providers';

const TEST_WORLD_PROVIDERS = [
  provideTestTranslations(),
  { provide: PackBusiness, useValue: { packsFor: async () => ['base-en'], $installed: () => [] } }, { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => baseItemVocabulary('en') } },
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

  it('creates no classes or skills without the option', async () => {
    const world = await library.create({ name: 'Bare', attributes: [] });
    expect(world.classes).toEqual([]);
    expect(world.skills).toEqual([]);
  });

  it('creates an empty catalogue without the option', async () => {
    expect((await library.create({ name: 'Bare', attributes: [] })).items).toEqual([]);
  });

  describe('active packs', () => {
    it.each([
      ['fr', ['base-fr']],
      ['en', ['base-en']],
    ])('a new world in the %s app has the Base of that language active', async (lang, packs) => {
      TestBed.inject(LanguageBusiness).setLanguage(lang as 'fr' | 'en');

      const world = await library.create({ name: 'Eldoria', attributes: [] });

      expect(world.packs).toEqual(packs);
    });

    it('keeps the packs the draft names', async () => {
      const world = await library.create({ name: 'Eldoria', attributes: [], packs: ['base-en', 'extra'] });
      expect(world.packs).toEqual(['base-en', 'extra']);
    });

    it('reads a stored world without packs as having none', async () => {
      const stored = await library.create({ name: 'Old', attributes: [] });
      const { packs: _packs, ...legacy } = stored;
      await TestBed.inject(WorldStorageService).put(legacy as typeof stored);

      expect((await library.get(stored.id))?.packs).toEqual([]);
    });
  });

  describe('language', () => {
    it.each(['fr', 'en'] as const)('a new world in the %s app has that language', async (lang) => {
      TestBed.inject(LanguageBusiness).setLanguage(lang);

      expect((await library.create({ name: 'Eldoria', attributes: [] })).language).toBe(lang);
    });

    it('keeps the language the draft names', async () => {
      TestBed.inject(LanguageBusiness).setLanguage('fr');

      const world = await library.create({ name: 'Eldoria', attributes: [], language: 'en' });

      expect(world.language).toBe('en');
      expect((await library.get(world.id))?.language).toBe('en');
    });

    it('reads a stored world without a language as the app language', async () => {
      TestBed.inject(LanguageBusiness).setLanguage('en');
      const stored = await library.create({ name: 'Old', attributes: [], language: 'fr' });
      const { language: _language, ...legacy } = stored;
      await TestBed.inject(WorldStorageService).put(legacy as typeof stored);

      expect((await library.get(stored.id))?.language).toBe('en');
    });

    it('keeps the language through export and import', async () => {
      const world = await library.create({ name: 'Eldoria', attributes: [], language: 'en' });

      const imported = await library.importWorld(await (await library.exportWorld(world.id)).text());

      expect(imported.language).toBe('en');
    });
  });
});
