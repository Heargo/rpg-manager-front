import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { openWorldWithPacks } from '../../../testing/active-packs';
import { NEON_LINK, neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackService } from '../services/pack.service';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';

const KINDS = {
  equipment: { type: 'equipment' },
  weapon: { parent: 'equipment', slot: 'weapon1' },
  sword: { parent: 'weapon' },
  consumable: { type: 'consumable' },
  potion: { parent: 'consumable' },
  trinket: { type: 'item' },
};

const manifest = (id: string, language: 'en' | 'fr'): Record<string, unknown> => ({
  format: 2,
  id,
  language,
  name: id,
  description: id,
  version: '1.0.0',
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  tints: {
    fire: { gradient: [{ position: 0, color: '#5a0a0a' }, { position: 1, color: '#fde047' }] },
  },
  domains: {
    items: { kinds: KINDS, texts: 'texts/things.json' },
    npcs: { texts: 'texts/people.json' },
  },
  common: 'texts/common.json',
  sprites: [
    { id: 'axe', label: 'Axe', domain: 'items', kinds: ['sword'], kind: 'masked', image: 'sprites/axe.png', materials: 'sprites/axe.json' },
    { id: 'gem', label: 'Gem', domain: 'items', kinds: ['trinket'], kind: 'grayscale', image: 'sprites/gem.png' },
    { id: 'brew', label: 'Brew', domain: 'items', kinds: ['potion', 'sword'], kind: 'colored', image: 'sprites/brew.png' },
    { id: 'lost', label: 'Lost', domain: 'items', kinds: ['nowhere'], kind: 'colored', image: 'sprites/lost.png' },
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
  sprites: 4,
  language,
  builtIn: true,
});

describe('PackBusiness with kinds (format 2)', () => {
  let service: {
    loadManifest: ReturnType<typeof vi.fn>;
    loadJson: ReturnType<typeof vi.fn>;
    loadRegistry: ReturnType<typeof vi.fn>;
  };
  let business: PackBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    const manifests: Record<string, unknown> = {
      'base-fr': manifest('base-fr', 'fr'),
      'base-en': manifest('base-en', 'en'),
    };
    service = {
      loadManifest: vi.fn(async (id: string) => manifests[id]),
      loadJson: vi.fn(async (url: string) => ({ url })),
      loadRegistry: vi.fn(async () => ({ format: 1, packs: [entry('base-fr', 'fr'), entry('base-en', 'en')] })),
    };
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: PackService, useValue: service }],
    });
    business = TestBed.inject(PackBusiness);
    TestBed.inject(LanguageBusiness).setLanguage('fr');
  });

  it('gives each sprite the type and slot resolved from its first kind up its own tree', async () => {
    const sprites = await business.sprites();

    const byId = Object.fromEntries(sprites.map((s) => [s.id, s]));
    expect(byId['axe']).toMatchObject({ type: 'equipment', slot: 'weapon1', packId: 'base-fr' });
    expect(byId['gem']).toMatchObject({ type: 'item', slot: 'none' });
  });

  it('uses the first kind only', async () => {
    const sprites = await business.sprites();

    expect(sprites.find((s) => s.id === 'brew')).toMatchObject({ type: 'consumable', slot: 'none' });
  });

  it('leaves out a sprite whose kinds cannot be resolved', async () => {
    const sprites = await business.sprites();

    expect(sprites.map((s) => s.id)).toEqual(['axe', 'gem', 'brew']);
  });

  it('keeps the file URLs under the pack folder', async () => {
    const sprites = await business.sprites();

    expect(sprites[0]).toMatchObject({
      imageUrl: 'packs/base-fr/sprites/axe.png',
      materialsUrl: 'packs/base-fr/sprites/axe.json',
    });
  });

  it('finds the word list of a generator through domains.<generator>.texts', async () => {
    expect(await business.wordList('items', 'base-fr')).toEqual({ url: 'packs/base-fr/texts/things.json' });
    expect(await business.wordList('npcs', 'base-en')).toEqual({ url: 'packs/base-en/texts/people.json' });
  });

  it('rejects when the domain has no texts or does not exist', async () => {
    await expect(business.wordList('items', 'base-fr')).resolves.toBeDefined();
    await expect(business.wordList('skills', 'base-fr')).rejects.toThrow();
    await expect(business.wordList('classes', 'base-en')).rejects.toThrow();
  });
});

describe('PackBusiness with a pack that declares a kind under a Base kind', () => {
  const neutralNeon = () => {
    const world = neonWorld();
    world.manifest = {
      format: 2,
      id: 'neon',
      name: 'Neon',
      description: 'Des choses brillantes',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      tints: {
        neon: { gradient: [{ position: 0, color: '#003300' }, { position: 1, color: '#33ff33' }] },
      },
      domains: {
        items: {
          kinds: {
            trinket: { type: 'item' },
            charm: { parent: 'trinket' },
            glowblade: { parent: 'weapon' },
            ghost: { parent: 'not-declared-anywhere' },
          },
        },
      },
      sprites: [
        { id: 'spark', label: 'Etincelle', domain: 'items', kinds: ['charm'], kind: 'grayscale', image: 'sprites/spark.png' },
        { id: 'glow', label: 'Lueur', domain: 'items', kinds: ['glowblade'], kind: 'masked', image: 'sprites/glow.png', materials: 'sprites/glow.json' },
        { id: 'tint', label: 'Teinte', domain: 'items', kinds: ['ghost'], kind: 'colored', image: 'sprites/tint.png' },
      ],
    };
    return world;
  };

  function setup() {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const fakes = neonProviders(neutralNeon(), NEON_LINK);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), ...fakes.providers] });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    return TestBed.inject(PackBusiness);
  }

  it('installs a neutral pack, resolves its kinds (own tree, then the Base tree) and drops the unresolvable sprite', async () => {
    const business = setup();
    await business.install(await business.prepare(NEON_LINK));
    await openWorldWithPacks(['base-fr', 'neon']);

    const sprites = (await business.sprites()).filter((s) => s.packId === 'neon');

    expect(sprites.map((s) => [s.id, s.type, s.slot])).toEqual([
      ['spark', 'item', 'none'],
      ['glow', 'equipment', 'weapon1'],
    ]);
  });

  it('gives a neutral pack no word list', async () => {
    const business = setup();
    await business.install(await business.prepare(NEON_LINK));

    await expect(business.wordList('items', 'neon')).rejects.toThrow();
    await expect(business.wordList('npcs', 'neon')).rejects.toThrow();
  });

  it('resolves the sprites of the real Base through its own tree', async () => {
    const business = setup();
    await business.load();

    const sprites = await business.sprites();
    const byId = Object.fromEntries(sprites.map((s) => [s.id, s]));

    expect((await business.manifest('base-fr')).format).toBe(2);
    expect(sprites).toHaveLength(101);
    expect(byId['axe']).toMatchObject({ type: 'equipment', slot: 'weapon1' });
    expect(byId['armor_1']).toMatchObject({ type: 'equipment', slot: 'chest' });
    expect(byId['apple']).toMatchObject({ type: 'consumable', slot: 'none' });
  });
});
