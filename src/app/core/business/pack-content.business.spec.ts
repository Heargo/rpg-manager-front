import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { EXTRA_MANIFEST, extraPackService, provideExtraPack } from '../../../testing/extra-pack';
import { NEON_LINK, NEON_ROOT, NeonWorld, neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackStorageService } from '../services/pack-storage.service';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';

const ATTRIBUTES = [{ id: 'str', name: 'Force' }];
const ITEMS = [
  {
    id: 'sword',
    name: 'Epee',
    description: 'Une epee.',
    rarity: 'common',
    type: 'equipment',
    slot: 'weapon1',
    price: 10,
    modifiers: [{ attribute: 'str', value: 2 }],
  },
];
const SKILLS = [
  {
    id: 'strike',
    name: 'Frappe',
    description: 'Un coup.',
    rarity: 'common',
    type: 'passive',
    maxLevel: 3,
    pointCost: 1,
    effects: [],
  },
];
const CLASSES = [
  {
    id: 'warrior',
    name: 'Guerrier',
    description: 'Un guerrier.',
    maxLevel: 10,
    pointCost: 1,
    bonuses: [],
    tree: [{ skillId: 'strike', requires: [], minLevel: 1, column: 0, row: 0 }],
  },
];

const contentDomains = () => ({
  items: { content: 'content/items.json' },
  skills: { content: 'content/skills.json' },
  classes: { content: 'content/classes.json' },
});

const contentFiles = (): [string, unknown][] => [
  ['content/items.json', ITEMS],
  ['content/skills.json', SKILLS],
  ['content/classes.json', CLASSES],
];

async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { errors?: string[] };
    return [e.message, ...(e.errors ?? [])].join('\n');
  }
  throw new Error('expected a rejection');
}

function official() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const files = new Map<string, unknown>(contentFiles().map(([path, value]) => [`packs/extra/${path}`, value]));
  const base = extraPackService();
  const service = extraPackService({
    loadManifest: vi.fn(async (id: string) =>
      id === 'extra'
        ? { ...structuredClone(EXTRA_MANIFEST), attributes: ATTRIBUTES, domains: { ...EXTRA_MANIFEST.domains, ...contentDomains() } }
        : (base.loadManifest as (id: string) => Promise<unknown>)(id),
    ),
    loadJson: vi.fn(async (url: string) => (files.has(url) ? structuredClone(files.get(url)) : (base.loadJson as (url: string) => Promise<unknown>)(url))),
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideExtraPack(service)] });
  TestBed.inject(LanguageBusiness).setLanguage('fr');
  return { files, service, business: TestBed.inject(PackBusiness), storage: TestBed.inject(PackStorageService) };
}

function neon(change: (world: NeonWorld) => void = () => undefined) {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const world = neonWorld();
  world.manifest['attributes'] = ATTRIBUTES;
  world.manifest['domains'] = { ...world.manifest['domains'], ...contentDomains() };
  for (const [path, value] of contentFiles()) world.json.set(`${NEON_ROOT}${path}`, value);
  change(world);
  const fakes = neonProviders(world, NEON_LINK);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideTestTranslations(), ...fakes.providers] });
  TestBed.inject(LanguageBusiness).setLanguage('fr');
  return { world, ...fakes, business: TestBed.inject(PackBusiness), storage: TestBed.inject(PackStorageService) };
}

describe('PackBusiness pack content files', () => {
  describe('an official pack', () => {
    it('downloads its content files with the pack and keeps them, like its texts', async () => {
      const { business, storage, service } = official();

      await business.enable('extra');

      expect(service.loadJson).toHaveBeenCalledWith('packs/extra/content/items.json');
      expect(service.loadJson).toHaveBeenCalledWith('packs/extra/content/skills.json');
      expect(service.loadJson).toHaveBeenCalledWith('packs/extra/content/classes.json');
      expect(await storage.getFile('extra', 'content/items.json')).toMatchObject({ kind: 'json', value: ITEMS });
      expect(await storage.getFile('extra', 'content/classes.json')).toMatchObject({ kind: 'json', value: CLASSES });
    });

    it('gives the content of a domain back, from the stored files', async () => {
      const { business, service } = official();
      await business.enable('extra');
      service.loadJson.mockClear();

      expect(await (business as any).content('skills', 'extra')).toEqual(SKILLS);
      expect(service.loadJson).not.toHaveBeenCalled();
    });

    it('rejects the content of a pack that has none for that domain', async () => {
      const { business } = official();
      await business.enable('extra');

      await expect((business as any).content('npcs', 'extra')).rejects.toThrow();
    });
  });

  describe('an unofficial pack', () => {
    it('fetches the content files next to the manifest and keeps them once installed', async () => {
      const { business, storage, service } = neon();

      const prepared = await business.prepare(NEON_LINK);
      await business.install(prepared);

      expect(service.loadJson).toHaveBeenCalledWith(`${NEON_ROOT}content/items.json`);
      expect(service.loadJson).toHaveBeenCalledWith(`${NEON_ROOT}content/skills.json`);
      expect(service.loadJson).toHaveBeenCalledWith(`${NEON_ROOT}content/classes.json`);
      expect(await storage.getFile('neon', 'content/items.json')).toMatchObject({ kind: 'json', value: ITEMS });
      expect(await (business as any).content('classes', 'neon')).toEqual(CLASSES);
    });

    it('fails the pack when a content file cannot be fetched, naming the file', async () => {
      const { business, storage } = neon((world) => world.json.delete(`${NEON_ROOT}content/skills.json`));

      expect(await rejection(business.prepare(NEON_LINK))).toContain('content/skills.json');
      expect(await storage.list()).toEqual([]);
    });

    it('fails the pack when a content file is not a list of valid entries', async () => {
      const { business } = neon((world) => world.json.set(`${NEON_ROOT}content/items.json`, { sword: {} }));

      expect(await rejection(business.prepare(NEON_LINK))).toContain('content/items.json');
    });

    it('fails the pack when an item modifier is on an attribute the pack does not declare', async () => {
      const { business } = neon((world) =>
        world.json.set(`${NEON_ROOT}content/items.json`, [{ ...ITEMS[0], modifiers: [{ attribute: 'luck', value: 1 }] }]),
      );

      const message = await rejection(business.prepare(NEON_LINK));

      expect(message).toContain('content/items.json');
      expect(message).toContain('luck');
    });

    it('fails the pack when a class uses a skill the pack does not have', async () => {
      const { business } = neon((world) => world.json.set(`${NEON_ROOT}content/skills.json`, []));

      const message = await rejection(business.prepare(NEON_LINK));

      expect(message).toContain('content/classes.json');
      expect(message).toContain('strike');
    });

    it('fails the pack on duplicate ids in a content file', async () => {
      const { business } = neon((world) => world.json.set(`${NEON_ROOT}content/skills.json`, [SKILLS[0], SKILLS[0]]));

      expect(await rejection(business.prepare(NEON_LINK))).toContain('content/skills.json');
    });
  });
});
