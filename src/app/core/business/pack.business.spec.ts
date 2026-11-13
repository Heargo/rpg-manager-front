import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { PackService } from '../services/pack.service';
import { PackBusiness } from './pack.business';

const manifest = (): Record<string, unknown> => ({
  format: 1,
  id: 'base',
  name: { en: 'Base', fr: 'Base' },
  description: { en: 'Core', fr: 'Coeur' },
  version: '1.0.0',
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  generators: {
    en: { items: 'generators/en/items.json', npcs: 'generators/en/npcs.json' },
    fr: { items: 'generators/fr/items.json' },
  },
  sprites: [
    { id: 'axe', en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'gem', en: 'Gem', fr: 'Gemme', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/gem.png' },
  ],
});

describe('PackBusiness', () => {
  let json: unknown;
  let service: { loadManifest: ReturnType<typeof vi.fn>; loadJson: ReturnType<typeof vi.fn> };
  let business: PackBusiness;

  beforeEach(() => {
    // A fresh database: packs stored by other spec files in this worker must not show up here.
    globalThis.indexedDB = new IDBFactory();
    json = manifest();
    service = {
      loadManifest: vi.fn(async () => json),
      loadJson: vi.fn(async (url: string) => ({ url })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: PackService, useValue: service }] });
    business = TestBed.inject(PackBusiness);
  });

  it('loads and validates the Base manifest once', async () => {
    const first = await business.manifest();
    await business.manifest();
    await business.sprites();

    expect(first.id).toBe('base');
    expect(service.loadManifest).toHaveBeenCalledTimes(1);
  });

  it('exposes the sprites with their pack id and URLs under the pack folder', async () => {
    const sprites = await business.sprites();

    expect(sprites).toHaveLength(2);
    expect(sprites[0]).toMatchObject({
      id: 'axe',
      fr: 'Hache',
      kind: 'masked',
      packId: 'base',
      imageUrl: 'packs/base/sprites/axe.png',
      materialsUrl: 'packs/base/sprites/axe.json',
    });
    expect(sprites[1]).toMatchObject({ id: 'gem', kind: 'grayscale', packId: 'base', imageUrl: 'packs/base/sprites/gem.png' });
    expect(sprites[1].materialsUrl).toBeUndefined();
  });

  it('fetches a word list through the manifest, per language', async () => {
    const npcs = await business.wordList('npcs', 'en');
    const items = await business.wordList('items', 'fr', 'base');

    expect(npcs).toEqual({ url: 'packs/base/generators/en/npcs.json' });
    expect(items).toEqual({ url: 'packs/base/generators/fr/items.json' });
  });

  it('rejects when the pack has no word list for that generator and language', async () => {
    await expect(business.wordList('skills', 'en')).rejects.toThrow();
    await expect(business.wordList('npcs', 'fr')).rejects.toThrow();
    expect(service.loadJson).not.toHaveBeenCalled();
  });

  it('fails with the manifest errors when the manifest is invalid', async () => {
    json = { ...manifest(), id: 'Not Kebab', format: 7 };

    await expect(business.manifest()).rejects.toThrow(/format/);
    await expect(business.sprites()).rejects.toThrow(/id/);
  });
});
