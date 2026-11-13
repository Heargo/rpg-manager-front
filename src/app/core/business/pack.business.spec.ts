import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackService } from '../services/pack.service';
import { LanguageBusiness } from './language.business';
import { basePackId, PackBusiness } from './pack.business';

const manifest = (id: string, language: 'en' | 'fr'): Record<string, unknown> => ({
  format: 1,
  id,
  language,
  name: language === 'fr' ? 'Base française' : 'English Base',
  description: language === 'fr' ? 'Coeur' : 'Core',
  version: '1.0.0',
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  generators:
    language === 'fr'
      ? { items: 'generators/items.json' }
      : { items: 'generators/items.json', npcs: 'generators/npcs.json' },
  sprites: [
    { id: 'axe', label: language === 'fr' ? 'Hache' : 'Axe', type: 'equipment', slot: 'weapon1', kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'gem', label: language === 'fr' ? 'Gemme' : 'Gem', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/gem.png' },
  ],
});

const entry = (id: string, language: string) => ({
  id,
  name: id,
  description: id,
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  size: 0,
  sprites: 2,
  language,
  builtIn: true,
});

describe('PackBusiness: the two Bases', () => {
  let manifests: Record<string, unknown>;
  let service: {
    loadManifest: ReturnType<typeof vi.fn>;
    loadJson: ReturnType<typeof vi.fn>;
    loadRegistry: ReturnType<typeof vi.fn>;
  };
  let business: PackBusiness;

  beforeEach(() => {
    // A fresh database: packs stored by other spec files in this worker must not show up here.
    globalThis.indexedDB = new IDBFactory();
    manifests = { 'base-fr': manifest('base-fr', 'fr'), 'base-en': manifest('base-en', 'en') };
    service = {
      loadManifest: vi.fn(async (id: string) => manifests[id]),
      loadJson: vi.fn(async (url: string) => ({ url })),
      loadRegistry: vi.fn(async () => ({ format: 1, packs: [entry('base-fr', 'fr'), entry('base-en', 'en')] })),
    };
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: PackService, useValue: service }],
    });
    business = TestBed.inject(PackBusiness);
  });

  const setLanguage = (code: string) => TestBed.inject(LanguageBusiness).setLanguage(code);

  it('gives the Base of a language', () => {
    expect(basePackId('fr')).toBe('base-fr');
    expect(basePackId('en')).toBe('base-en');
  });

  it('installs base-fr and base-en, built in, each with its language', async () => {
    await business.load();

    const bases = business.$installed().filter((p) => p.builtIn);
    expect(bases.map((p) => [p.id, p.language])).toEqual([
      ['base-fr', 'fr'],
      ['base-en', 'en'],
    ]);
    expect(business.$installed().map((p) => p.id)).toEqual(['base-fr', 'base-en']);
  });

  it('lists a pack with a single name and description', async () => {
    await business.load();

    const fr = business.$installed().find((p) => p.id === 'base-fr');
    expect(fr?.name).toBe('Base française');
    expect(fr?.description).toBe('Coeur');
    expect(fr?.generators).toEqual({ items: 'generators/items.json' });
  });

  it('refuses to remove either Base', async () => {
    await expect(business.remove('base-fr')).rejects.toThrow();
    await expect(business.remove('base-en')).rejects.toThrow();
  });

  it('loads and validates a Base manifest once', async () => {
    const first = await business.manifest('base-fr');
    await business.manifest('base-fr');

    expect(first.id).toBe('base-fr');
    expect(first.language).toBe('fr');
    expect(service.loadManifest.mock.calls.filter(([id]) => id === 'base-fr')).toHaveLength(1);
  });

  it('exposes the sprites of the Base of the app language, with one label and URLs under that pack folder', async () => {
    setLanguage('fr');

    const sprites = await business.sprites();

    expect(sprites).toHaveLength(2);
    expect(sprites[0]).toMatchObject({
      id: 'axe',
      label: 'Hache',
      kind: 'masked',
      packId: 'base-fr',
      imageUrl: 'packs/base-fr/sprites/axe.png',
      materialsUrl: 'packs/base-fr/sprites/axe.json',
    });
    expect(sprites[1]).toMatchObject({ id: 'gem', label: 'Gemme', packId: 'base-fr', imageUrl: 'packs/base-fr/sprites/gem.png' });
    expect(sprites[1].materialsUrl).toBeUndefined();
  });

  it('exposes the sprites of base-en, and only those, when the app is in English', async () => {
    setLanguage('en');

    const sprites = await business.sprites();

    expect(sprites.map((s) => [s.id, s.label, s.packId])).toEqual([
      ['axe', 'Axe', 'base-en'],
      ['gem', 'Gem', 'base-en'],
    ]);
  });

  it('fetches a word list of a pack by generator', async () => {
    const npcs = await business.wordList('npcs', 'base-en');
    const items = await business.wordList('items', 'base-fr');

    expect(npcs).toEqual({ url: 'packs/base-en/generators/npcs.json' });
    expect(items).toEqual({ url: 'packs/base-fr/generators/items.json' });
  });

  it('rejects when the pack has no word list for that generator', async () => {
    await expect(business.wordList('skills', 'base-en')).rejects.toThrow();
    await expect(business.wordList('npcs', 'base-fr')).rejects.toThrow();
    expect(service.loadJson).not.toHaveBeenCalled();
  });

  it('fails with the manifest errors when a Base manifest is invalid, e.g. in the old two-language format', async () => {
    manifests['base-fr'] = { ...manifest('base-fr', 'fr'), name: { en: 'Base', fr: 'Base' }, format: 7 };

    await expect(business.manifest('base-fr')).rejects.toThrow(/format/);
    setLanguage('fr');
    await expect(business.sprites()).rejects.toThrow(/name/);
  });
});
