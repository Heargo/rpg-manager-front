import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { EXTRA_ITEMS } from '../../../testing/extra-pack';
import { NEON_LINK, NEON_ROOT, NeonWorld, neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { openWorldWithPacks } from '../../../testing/active-packs';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackStorageService } from '../services/pack-storage.service';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';

const BASE_SPRITES = 101;
const MB = 1024 * 1024;

function setup(world: NeonWorld = neonWorld(), link = NEON_LINK) {
  globalThis.indexedDB = new IDBFactory();
  let created = 0;
  URL.createObjectURL = vi.fn(() => `blob:fake-${++created}`);
  URL.revokeObjectURL = vi.fn();
  const fakes = neonProviders(world, link);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideTestTranslations(), ...fakes.providers] });
  // The neon pack is French, and so is the app: the Base in use is base-fr.
  TestBed.inject(LanguageBusiness).setLanguage('fr');
  return { world, ...fakes, business: TestBed.inject(PackBusiness), storage: TestBed.inject(PackStorageService) };
}

/** The message of the rejection, with every listed error. */
async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { errors?: string[] };
    return [e.message, ...(e.errors ?? [])].join('\n');
  }
  throw new Error('expected a rejection');
}

describe('PackBusiness unofficial packs', () => {
  describe('prepare', () => {
    it('returns the preview of a valid pack and stores nothing', async () => {
      const { business, storage } = setup();

      const preview = await business.prepare(NEON_LINK);

      expect(preview.manifest).toMatchObject({ id: 'neon', name: 'Neon', language: 'fr', version: '1.0.0', author: 'Ann Author' });
      expect(preview.source).toBe(NEON_LINK);
      expect(preview.size).toBeGreaterThanOrEqual('png-bytes'.length * 3);
      expect(preview.counts.generators).toBe(2);
      expect(preview.counts.sprites).toMatchObject({ grayscale: 1, masked: 1, colored: 1 });
      expect(await storage.list()).toEqual([]);
      expect(business.$installed().map((p) => p.id)).toEqual(['base-fr', 'base-en']);
    });

    it('fetches the manifest at the resolved URL and the files next to it', async () => {
      const root = 'https://raw.githubusercontent.com/jane/neon-pack/main/';
      const world = neonWorld();
      // Serve the pack's files next to the manifest, at the raw GitHub root.
      world.json = new Map([...world.json].map(([url, value]) => [url.replace(NEON_ROOT, root), value]));
      const { business, service } = setup(world, `${root}pack.json`);

      await business.prepare('https://github.com/jane/neon-pack/tree/main');

      expect(service.loadJson).toHaveBeenCalledWith(`${root}pack.json`);
      expect(service.loadBlob).toHaveBeenCalledWith(`${root}sprites/spark.png`);
    });

    it('refuses a link that is not usable, without any fetch', async () => {
      const { business, service } = setup();

      await expect(business.prepare('http://example.com/pack.json')).rejects.toBeDefined();

      expect(service.loadJson).not.toHaveBeenCalled();
    });

    it('rejects an invalid manifest naming the field, and stores nothing', async () => {
      const world = neonWorld();
      delete world.manifest['author'];
      const { business, storage } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('author');
      expect(await storage.list()).toEqual([]);
    });

    it('rejects a manifest with a javascript: license link', async () => {
      const world = neonWorld();
      world.manifest['licenseUrl'] = 'javascript:alert(1)';
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('licenseUrl');
    });

    it('rejects a manifest over 64 KB', async () => {
      const world = neonWorld();
      world.manifest['description'] = 'x'.repeat(70_000);
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('pack.json');
    });

    it('rejects a bad items word list naming the file and the problem', async () => {
      const world = neonWorld();
      world.json.set(`${NEON_ROOT}generators/items.json`, { version: 1 });
      const { business, storage } = setup(world);

      const message = await rejection(business.prepare(NEON_LINK));

      expect(message).toContain('generators/items.json');
      expect(message).toContain('templates');
      expect(await storage.list()).toEqual([]);
    });

    it('rejects a bad NPC name list naming the file', async () => {
      const world = neonWorld();
      world.json.set(`${NEON_ROOT}generators/npcs.json`, { version: 1, given: [] });
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('generators/npcs.json');
    });

    it('rejects a file that cannot be fetched, naming it', async () => {
      const world = neonWorld();
      world.json.delete(`${NEON_ROOT}generators/npcs.json`);
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('generators/npcs.json');
    });

    it('rejects a PNG over 1 MB', async () => {
      const world = neonWorld();
      world.blobSizes.set(`${NEON_ROOT}sprites/spark.png`, MB + 1);
      const { business, storage } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('sprites/spark.png');
      expect(await storage.list()).toEqual([]);
    });

    it('rejects a PNG larger than 256 x 256', async () => {
      const world = neonWorld();
      world.dimensions.set(`${NEON_ROOT}sprites/tint.png`, { width: 257, height: 100 });
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('sprites/tint.png');
    });

    it('accepts a PNG of exactly 256 x 256', async () => {
      const world = neonWorld();
      world.dimensions.set(`${NEON_ROOT}sprites/tint.png`, { width: 256, height: 256 });
      const { business } = setup(world);

      await expect(business.prepare(NEON_LINK)).resolves.toBeDefined();
    });

    it('rejects a PNG that cannot be decoded', async () => {
      const world = neonWorld();
      world.dimensions.set(`${NEON_ROOT}sprites/spark.png`, 'fail');
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('sprites/spark.png');
    });

    it('rejects materials made for another image size', async () => {
      const world = neonWorld();
      world.dimensions.set(`${NEON_ROOT}sprites/glow.png`, { width: 64, height: 64 });
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('sprites/glow.json');
    });

    it('rejects materials that are not a sprite configuration', async () => {
      const world = neonWorld();
      world.json.set(`${NEON_ROOT}sprites/glow.json`, { hello: 'world' });
      const { business } = setup(world);

      expect(await rejection(business.prepare(NEON_LINK))).toContain('sprites/glow.json');
    });

    it('rejects a pack over 20 MB in total', async () => {
      const world = neonWorld();
      world.manifest['sprites'] = Array.from({ length: 21 }, (_, i) => ({
        id: `s${i}`, label: 'S', type: 'item', slot: 'none', kind: 'grayscale', image: `sprites/s${i}.png`,
      }));
      world.manifest['generators'] = {};
      for (let i = 0; i < 21; i++) world.blobSizes.set(`${NEON_ROOT}sprites/s${i}.png`, 1_000_000);
      const { business, storage } = setup(world);

      await expect(business.prepare(NEON_LINK)).rejects.toBeDefined();
      expect(await storage.list()).toEqual([]);
    });

    it('lists every error, not only the first', async () => {
      const world = neonWorld();
      world.json.set(`${NEON_ROOT}generators/items.json`, { version: 1 });
      world.blobSizes.set(`${NEON_ROOT}sprites/spark.png`, MB + 1);
      const { business } = setup(world);

      const message = await rejection(business.prepare(NEON_LINK));

      expect(message).toContain('generators/items.json');
      expect(message).toContain('sprites/spark.png');
    });

    it('fetches at most 4 files at a time', async () => {
      const world = neonWorld();
      world.manifest['sprites'] = Array.from({ length: 12 }, (_, i) => ({
        id: `s${i}`, label: 'S', type: 'item', slot: 'none', kind: 'grayscale', image: `sprites/s${i}.png`,
      }));
      const { business, inFlight } = setup(world);

      await business.prepare(NEON_LINK);

      expect(inFlight.max).toBeGreaterThan(1);
      expect(inFlight.max).toBeLessThanOrEqual(4);
    });

    it('refuses an id that is an official pack, Base included', async () => {
      for (const id of ['extra', 'base-fr', 'base-en']) {
        const world = neonWorld();
        world.manifest['id'] = id;
        const { business, storage } = setup(world);

        await expect(business.prepare(NEON_LINK), id).rejects.toBeDefined();
        expect(await storage.list()).toEqual([]);
      }
    });
  });

  describe('install', () => {
    it('stores the pack with its source, and serves its sprites and word lists once a world has it active', async () => {
      const { business, storage } = setup();

      await business.install(await business.prepare(NEON_LINK));

      const [stored] = await storage.list();
      expect(stored.id).toBe('neon');
      expect(stored).not.toHaveProperty('enabled');
      expect(stored.source).toEqual({ kind: 'unofficial', link: NEON_LINK, manifestUrl: NEON_LINK });
      expect(business.$installed().find((p) => p.id === 'neon')).toMatchObject({ builtIn: false });
      await openWorldWithPacks(['base-fr', 'neon']);
      const sprites = await business.sprites();
      expect(sprites).toHaveLength(BASE_SPRITES + 3);
      const glow = sprites.find((s) => s.id === 'glow')!;
      expect(glow.packId).toBe('neon');
      expect(glow.imageUrl).toMatch(/^blob:/);
      expect(glow.materialsUrl).toMatch(/^blob:/);
      expect(await business.wordList('items', 'neon')).toEqual(EXTRA_ITEMS);
    });

    it('keeps the pack after a reload of the app', async () => {
      const { business, world } = setup();
      await business.install(await business.prepare(NEON_LINK));
      const fakes = neonProviders(world);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideTestTranslations(), ...fakes.providers] });
      TestBed.inject(LanguageBusiness).setLanguage('fr');

      const reloaded = TestBed.inject(PackBusiness);

      expect(await reloaded.spritesOf('neon')).toHaveLength(3);
    });

    it('refuses an id already installed from another link, and keeps the first pack', async () => {
      const { business, world, storage } = setup();
      await business.install(await business.prepare(NEON_LINK));
      const other = 'https://other.example.org/neon/pack.json';
      const second = neonProviders(world, other);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideTestTranslations(), ...second.providers] });
      const business2 = TestBed.inject(PackBusiness);

      await expect(business2.prepare(other)).rejects.toBeDefined();

      const [stored] = await storage.list();
      expect(stored.source).toMatchObject({ link: NEON_LINK });
    });

    it('the pack can be removed like an official one', async () => {
      const { business, storage } = setup();
      await business.install(await business.prepare(NEON_LINK));

      await business.remove('neon');

      expect(await storage.list()).toEqual([]);
      expect(await storage.getFile('neon', 'sprites/spark.png')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('checkUpdate gives the old and new versions; installing replaces the pack and deletes the old files', async () => {
      const { business, world, storage } = setup();
      await business.install(await business.prepare(NEON_LINK));
      world.manifest['version'] = '2.0.0';
      world.manifest['sprites'] = world.manifest['sprites'].filter((s: { id: string }) => s.id !== 'tint');

      const update = await business.checkUpdate('neon');

      expect(update.oldVersion).toBe('1.0.0');
      expect(update.newVersion).toBe('2.0.0');
      expect((await storage.list())[0].manifest.version).toBe('1.0.0');

      await business.install(update.prepared);

      const stored = await storage.list();
      expect(stored).toHaveLength(1);
      expect(stored[0].manifest.version).toBe('2.0.0');
      expect(stored[0]).not.toHaveProperty('enabled');
      expect(await storage.getFile('neon', 'sprites/tint.png')).toBeUndefined();
      expect(await business.spritesOf('neon')).toHaveLength(2);
    });

    it('checkUpdate rejects for a pack that is not unofficial', async () => {
      const { business } = setup();

      await expect(business.checkUpdate('base-fr')).rejects.toBeDefined();
      await expect(business.checkUpdate('nope')).rejects.toBeDefined();
    });
  });
});
