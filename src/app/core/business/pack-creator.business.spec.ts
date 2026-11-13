import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { unzipSync } from 'fflate';
import basePack from '../../../../public/packs/base/pack.json';
import glowMaterials from '../../../../public/packs/base/sprites/axe.json';
import { EXTRA_ITEMS } from '../../../testing/extra-pack';
import { NEON_LINK, neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { SpriteSet } from '../../modules/sprite/models/sprite-set';
import { SpriteSetStorageService } from '../../modules/sprite/services/sprite-set-storage.service';
import { TranslocoService } from '@jsverse/transloco';
import { provideTestTranslations } from '../../../testing/test-providers';
import { openAppDatabase } from '../helpers/app-database';
import { buildPack, PackDraft } from '../packs/pack-draft';
import { ImageProcessingService } from '../services/image-processing.service';
import { validatePack } from '../packs/pack';
import { PackStorageService } from '../services/pack-storage.service';
import { PackCreatorBusiness } from './pack-creator.business';
import { PackBusiness } from './pack.business';

const MB = 1024 * 1024;
const png = () => new Blob(['png-bytes'], { type: 'image/png' });
const text = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());

function setup() {
  globalThis.indexedDB = new IDBFactory();
  let created = 0;
  URL.createObjectURL = vi.fn(() => `blob:fake-${++created}`);
  URL.revokeObjectURL = vi.fn();
  const fakes = neonProviders(neonWorld());
  /** Decoded size by blob; a missing entry decodes to 128 x 128, `'fail'` is undecodable. */
  const dims = new WeakMap<Blob, { width: number; height: number } | 'fail'>();
  const images = {
    dimensions: vi.fn(async (blob: Blob) => {
      const found = dims.get(blob);
      if (found === 'fail') throw new Error('cannot decode');
      return found ?? { width: 128, height: 128 };
    }),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [...fakes.providers, provideTestTranslations(), { provide: ImageProcessingService, useValue: images }],
  });
  return {
    dims,
    service: fakes.service,
    creator: TestBed.inject(PackCreatorBusiness),
    packs: TestBed.inject(PackBusiness),
    storage: TestBed.inject(PackStorageService),
    sets: TestBed.inject(SpriteSetStorageService),
  };
}
type Setup = ReturnType<typeof setup>;

async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { errors?: string[] };
    return [e.message, ...(e.errors ?? [])].join('\n');
  }
  throw new Error('expected a rejection');
}

/** A saved draft with valid details (id `mine`) and a French items list. */
async function validDraft({ creator }: Setup, over: Partial<PackDraft['details']> = {}): Promise<PackDraft> {
  const draft = await creator.createDraft();
  const saved: PackDraft = {
    ...draft,
    details: {
      id: 'mine',
      name: { en: 'Mine', fr: 'Mien' },
      description: { en: 'My pack', fr: 'Mon pack' },
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      ...over,
    },
    generators: { fr: { items: EXTRA_ITEMS } },
  };
  await creator.saveDraft(saved);
  return saved;
}

const spark = { id: 'spark', en: 'Spark', fr: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale' } as const;

describe('PackCreatorBusiness', () => {
  describe('drafts', () => {
    it('creates a draft with an id and lists it', async () => {
      const s = setup();

      const draft = await s.creator.createDraft();

      expect(draft.id).toBeTruthy();
      expect(draft.sprites).toEqual([]);
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([draft.id]);
    });

    it('lists the latest changed first and stamps updatedAt on save', async () => {
      const s = setup();
      let now = 1000;
      vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));
      const a = await s.creator.createDraft();
      const b = await s.creator.createDraft();
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([b.id, a.id]);

      await s.creator.saveDraft({ ...a, details: { ...a.details, version: '2.0.0' } });

      const list = await s.creator.listDrafts();
      expect(list.map((d) => d.id)).toEqual([a.id, b.id]);
      expect(list[0].details.version).toBe('2.0.0');
      expect(list[0].updatedAt).toBeGreaterThan(a.updatedAt);
      vi.restoreAllMocks();
    });

    it('gets a draft by id and deletes it', async () => {
      const s = setup();
      const a = await s.creator.createDraft();
      const b = await s.creator.createDraft();

      expect((await s.creator.getDraft(a.id))?.id).toBe(a.id);
      await s.creator.deleteDraft(a.id);

      expect(await s.creator.getDraft(a.id)).toBeUndefined();
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([b.id]);
    });
  });

  describe('addPng', () => {
    it('adds a sprite from a PNG and saves it in the draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      const file = png();

      const added = await s.creator.addPng(draft.id, file, spark);

      expect(added).toMatchObject(spark);
      expect(added.image).toBe(file);
      const saved = await s.creator.getDraft(draft.id);
      expect(saved?.sprites.map((x) => x.id)).toEqual(['spark']);
      expect(await text(saved!.sprites[0].image)).toBe('png-bytes');
    });

    it.each([
      ['larger than 1 MB', () => Object.defineProperty(png(), 'size', { value: MB + 1 }), undefined, '1 MB'],
      ['larger than 256 x 256', () => png(), { width: 300, height: 100 }, '256'],
      ['not a readable image', () => png(), 'fail' as const, 'readable'],
    ])('refuses a PNG %s, with the reason, and adds nothing', async (_name, make, size, reason) => {
      const s = setup();
      const draft = await s.creator.createDraft();
      const file = make();
      if (size) s.dims.set(file, size);

      expect(await rejection(s.creator.addPng(draft.id, file, spark))).toContain(reason);

      expect((await s.creator.getDraft(draft.id))?.sprites).toEqual([]);
    });

    it('refuses a sprite id already in the draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addPng(draft.id, png(), spark);

      await expect(s.creator.addPng(draft.id, png(), spark)).rejects.toBeDefined();

      expect((await s.creator.getDraft(draft.id))?.sprites).toHaveLength(1);
    });
  });

  describe('addFromSpriteSet', () => {
    const set = (over: Partial<SpriteSet> = {}): SpriteSet => ({
      id: 's1',
      name: 'Blue axe',
      source: { kind: 'library', spriteId: 'axe' },
      config: JSON.stringify(glowMaterials),
      updatedAt: 1000,
      tags: { type: 'equipment', slot: 'weapon1' },
      ...over,
    });

    it('adds a masked sprite with the set config, its library image and its tags', async () => {
      const s = setup();
      await s.sets.save(set());
      const draft = await s.creator.createDraft();

      const added = await s.creator.addFromSpriteSet(draft.id, 's1');

      expect(added).toMatchObject({ kind: 'masked', type: 'equipment', slot: 'weapon1', id: 'blue-axe', en: 'Blue axe', fr: 'Blue axe' });
      expect(added.materials).toBe(JSON.stringify(glowMaterials));
      expect(s.service.loadBlob).toHaveBeenCalledWith('packs/base/sprites/axe.png');
      expect(added.image).toBeInstanceOf(Blob);
      expect((await s.creator.getDraft(draft.id))?.sprites.map((x) => x.id)).toEqual(['blue-axe']);
    });

    it('reads the image from the images store for an opened image', async () => {
      const s = setup();
      const bytes = new TextEncoder().encode('stored-png').buffer;
      await (await openAppDatabase()).put('images', { id: 'img1', bytes, type: 'image/png' });
      await s.sets.save(set({ source: { kind: 'image', imageId: 'img1' }, tags: undefined }));
      const draft = await s.creator.createDraft();

      const added = await s.creator.addFromSpriteSet(draft.id, 's1');

      expect(await text(added.image)).toBe('stored-png');
      expect(added).toMatchObject({ kind: 'masked', type: 'item', slot: 'none' });
    });

    it('rejects an unknown set', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();

      await expect(s.creator.addFromSpriteSet(draft.id, 'nope')).rejects.toBeDefined();
    });
  });

  describe('copyBaseList', () => {
    it('copies the Base word list of a language and generator into the draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();

      await s.creator.copyBaseList(draft.id, 'fr', 'items');

      const saved = await s.creator.getDraft(draft.id);
      expect(saved?.generators.fr?.items).toEqual({ url: 'packs/base/generators/fr/items.json' });
    });
  });

  describe('install', () => {
    it('stores the draft as a local pack, enabled, served as any installed pack', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.addPng(draft.id, png(), spark);
      await s.packs.load();

      await s.creator.install(draft.id);

      const [stored] = await s.storage.list();
      expect(stored).toMatchObject({ id: 'mine', enabled: true, source: { kind: 'local' } });
      expect(s.packs.$installed().map((p) => p.id)).toEqual(['base', 'mine']);
      expect((await s.packs.sprites()).filter((x) => x.packId === 'mine').map((x) => x.id)).toEqual(['spark']);
      expect(await s.packs.wordList('items', 'fr', 'mine')).toEqual(EXTRA_ITEMS);
    });

    it('installing again from the same draft replaces the pack', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.install(draft.id);
      await s.creator.saveDraft({ ...draft, details: { ...draft.details, version: '1.1.0' } });

      await s.creator.install(draft.id);

      const list = await s.storage.list();
      expect(list).toHaveLength(1);
      expect(list[0].manifest.version).toBe('1.1.0');
    });

    it('lists the invalid details and stores nothing', async () => {
      const s = setup();
      const draft = await validDraft(s, { author: '' });

      expect(await rejection(s.creator.install(draft.id))).toContain('author');
      expect(await s.storage.list()).toEqual([]);
    });

    it('lists the invalid word list with its file name and stores nothing', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.saveDraft({ ...draft, generators: { fr: { items: { version: 1 } } } });

      expect(await rejection(s.creator.install(draft.id))).toContain('generators/fr/items.json');
      expect(await s.storage.list()).toEqual([]);
    });

    it('refuses an official pack id', async () => {
      const s = setup();
      const draft = await validDraft(s, { id: 'base' });

      expect(await rejection(s.creator.install(draft.id))).toContain('official');
      expect(await s.storage.list()).toEqual([]);
    });

    it('refuses an id installed from a link', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));
      const draft = await validDraft(s, { id: 'neon' });

      await expect(s.creator.install(draft.id)).rejects.toBeDefined();

      expect((await s.storage.list())[0].source).toMatchObject({ kind: 'unofficial' });
    });
  });

  describe('export', () => {
    it('gives a zip named <id>-<version>.zip with pack.json and the files in the documented layout', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.addPng(draft.id, png(), spark);

      const { fileName, bytes } = await s.creator.exportZip(draft.id);

      expect(fileName).toBe('mine-1.0.0.zip');
      const entries = unzipSync(bytes);
      expect(Object.keys(entries).sort()).toEqual(['generators/fr/items.json', 'pack.json', 'sprites/spark.png']);
      const manifest = JSON.parse(new TextDecoder().decode(entries['pack.json']));
      expect(manifest).toMatchObject({
        format: 1,
        id: 'mine',
        generators: { fr: { items: 'generators/fr/items.json' } },
        sprites: [{ id: 'spark', image: 'sprites/spark.png' }],
      });
      expect(JSON.parse(new TextDecoder().decode(entries['generators/fr/items.json']))).toEqual(EXTRA_ITEMS);
      expect(new TextDecoder().decode(entries['sprites/spark.png'])).toBe('png-bytes');
    });

    it('rejects an invalid draft with its errors', async () => {
      const s = setup();
      const draft = await validDraft(s, { license: '' });

      expect(await rejection(s.creator.exportZip(draft.id))).toContain('license');
    });
  });

  describe('draftFromInstalled', () => {
    it('copies an unofficial pack into a new saved draft', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const draft = await s.creator.draftFromInstalled('neon');

      expect(draft.details).toMatchObject({ id: 'neon', name: { en: 'Neon', fr: 'Neon' }, version: '1.0.0', author: 'Ann Author' });
      expect(draft.generators.fr?.items).toEqual(EXTRA_ITEMS);
      expect(draft.sprites.map((x) => [x.id, x.kind])).toEqual([['spark', 'grayscale'], ['glow', 'masked'], ['tint', 'colored']]);
      expect(JSON.parse(draft.sprites[1].materials!)).toEqual(glowMaterials);
      expect(draft.sprites[0].image).toBeInstanceOf(Blob);
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([draft.id]);
    });

    it('copies a pack created on this device', async () => {
      const s = setup();
      const mine = await validDraft(s);
      await s.creator.install(mine.id);

      const copy = await s.creator.draftFromInstalled('mine');

      expect(copy.id).not.toBe(mine.id);
      expect(copy.details.id).toBe('mine');
    });

    it('refuses Base and a downloaded official pack', async () => {
      const s = setup();
      await s.packs.enable('extra');

      await expect(s.creator.draftFromInstalled('base')).rejects.toBeDefined();
      await expect(s.creator.draftFromInstalled('extra')).rejects.toBeDefined();
      expect(await s.creator.listDrafts()).toEqual([]);
    });
  });

  describe('duplicate', () => {
    const ids = (d: PackDraft) => d.sprites.map((x) => x.id);

    it('copies a pack added from a link under a new id and names, keeping version, author, license and links', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const draft = await s.creator.duplicate('neon');

      expect(draft.details).toMatchObject({
        id: 'neon-copy',
        name: { en: 'Neon (copy)', fr: 'Neon (copie)' },
        description: { en: 'Glowing things', fr: 'Des choses brillantes' },
        version: '1.0.0',
        author: 'Ann Author',
        license: 'CC-BY-4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        homepage: 'https://example.com/neon',
      });
      expect(draft.generators.fr?.items).toEqual(EXTRA_ITEMS);
      expect(draft.sprites.map((x) => [x.id, x.kind])).toEqual([['spark', 'grayscale'], ['glow', 'masked'], ['tint', 'colored']]);
      expect(JSON.parse(draft.sprites[1].materials!)).toEqual(glowMaterials);
      expect(draft.sprites[0].image).toBeInstanceOf(Blob);
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([draft.id]);
      expect(buildPack(draft).manifest.id).toBe('neon-copy');
      expect(validatePack(buildPack(draft).manifest).ok).toBe(true);
    });

    it('uses -copie and (copie) when the language is French', async () => {
      const s = setup();
      TestBed.inject(TranslocoService).setActiveLang('fr');
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const draft = await s.creator.duplicate('neon');

      expect(draft.details.id).toBe('neon-copie');
      expect(draft.details.name).toEqual({ en: 'Neon (copie)', fr: 'Neon (copie)' });
    });

    it('skips taken ids: -copy, then -copy-2, -copy-3', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const first = await s.creator.duplicate('neon');
      const second = await s.creator.duplicate('neon');
      const third = await s.creator.duplicate('neon');

      expect([first, second, third].map((d) => d.details.id)).toEqual(['neon-copy', 'neon-copy-2', 'neon-copy-3']);
    });

    it('skips an id taken by an installed pack', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));
      const first = await s.creator.duplicate('neon');
      await s.creator.install(first.id);
      await s.creator.deleteDraft(first.id);

      const second = await s.creator.duplicate('neon');

      expect(second.details.id).toBe('neon-copy-2');
    });

    it('copies a pack created on this device with its sprites', async () => {
      const s = setup();
      const mine = await validDraft(s);
      await s.creator.addPng(mine.id, png(), spark);
      await s.creator.install(mine.id);

      const copy = await s.creator.duplicate('mine');

      expect(copy.id).not.toBe(mine.id);
      expect(copy.details).toMatchObject({ id: 'mine-copy', name: { en: 'Mine (copy)', fr: 'Mien (copie)' }, author: 'Ann Author' });
      expect(copy.generators.fr?.items).toEqual(EXTRA_ITEMS);
      expect(ids(copy)).toEqual(['spark']);
      expect(await text(copy.sprites[0].image)).toBe('png-bytes');
      expect(validatePack(buildPack(copy).manifest).ok).toBe(true);
    });

    it('copies a downloaded official pack', async () => {
      const s = setup();
      await s.packs.enable('extra');

      const draft = await s.creator.duplicate('extra');

      expect(draft.details).toMatchObject({ id: 'extra-copy', name: { en: 'Extra (copy)', fr: 'Extra (copie)' }, author: 'Jane Doe', license: 'CC0-1.0' });
      expect(draft.generators.fr?.items).toEqual(EXTRA_ITEMS);
      expect(ids(draft)).toEqual(['gem']);
      expect(draft.sprites[0].image).toBeInstanceOf(Blob);
    });

    it('copies Base: every word list and every sprite, read from the app', async () => {
      const s = setup();

      const draft = await s.creator.duplicate('base');

      expect(draft.details).toMatchObject({ id: 'base-copy', name: { en: 'Base (copy)', fr: 'Base (copie)' }, version: '1.0.0', license: 'CC-BY-4.0' });
      expect(draft.generators.fr?.items).toEqual({ url: 'packs/base/generators/fr/items.json' });
      expect(draft.generators.en?.classes).toEqual({ url: 'packs/base/generators/en/classes.json' });
      expect(Object.keys(draft.generators.en!).sort()).toEqual(['classes', 'items', 'npcs', 'skills']);
      expect(Object.keys(draft.generators.fr!).sort()).toEqual(['classes', 'items', 'npcs', 'skills']);
      expect(draft.sprites.length).toBe(basePack.sprites.length);
      expect(draft.sprites.length).toBe(101);
      expect(draft.sprites.every((x) => x.image instanceof Blob)).toBe(true);
      const masked = draft.sprites.filter((x) => x.kind === 'masked');
      expect(masked.length).toBe(basePack.sprites.filter((x) => x.kind === 'masked').length);
      expect(masked.length).toBeGreaterThan(0);
      expect(masked.every((x) => !!x.materials)).toBe(true);
      expect(validatePack(buildPack(draft).manifest).ok).toBe(true);
    });

    it('refuses an official pack that is not downloaded and an unknown id, saving nothing', async () => {
      const s = setup();

      await expect(s.creator.duplicate('extra')).rejects.toBeDefined();
      await expect(s.creator.duplicate('nope')).rejects.toBeDefined();
      expect(await s.creator.listDrafts()).toEqual([]);
    });
  });
});
