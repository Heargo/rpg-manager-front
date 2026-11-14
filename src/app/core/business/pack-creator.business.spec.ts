import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { unzipSync } from 'fflate';
import baseEnPack from '../../../../public/packs/base-en/pack.json';
import baseFrPack from '../../../../public/packs/base-fr/pack.json';
import glowMaterials from '../../../../public/packs/base-fr/sprites/axe.json';
import { EXTRA_ITEMS } from '../../../testing/extra-pack';
import { NEON_LINK, neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { SpriteSet } from '../../modules/sprite/models/sprite-set';
import { SpriteSetStorageService } from '../../modules/sprite/services/sprite-set-storage.service';
import { TranslocoService } from '@jsverse/transloco';
import { openWorldWithPacks } from '../../../testing/active-packs';
import { provideTestTranslations } from '../../../testing/test-providers';
import { openAppDatabase } from '../helpers/app-database';
import { buildPack, PackDraft } from '../packs/pack-draft';
import { ImageProcessingService } from '../services/image-processing.service';
import { validatePack } from '../packs/pack';
import { PackStorageService } from '../services/pack-storage.service';
import { PackCreatorBusiness } from './pack-creator.business';
import { LanguageBusiness } from './language.business';
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
    language: TestBed.inject(LanguageBusiness),
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

/** A saved French draft with valid details (id `mine`) and an items list. */
async function validDraft({ creator }: Setup, over: Partial<PackDraft['details']> = {}): Promise<PackDraft> {
  const draft = await creator.createDraft();
  const saved: PackDraft = {
    ...draft,
    details: {
      id: 'mine',
      language: 'fr',
      name: 'Mien',
      description: 'Mon pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      ...over,
    },
    generators: { items: EXTRA_ITEMS },
  };
  await creator.saveDraft(saved);
  return saved;
}

const spark = { id: 'spark', label: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale' } as const;

describe('PackCreatorBusiness', () => {
  describe('drafts', () => {
    it('creates a draft with an id and lists it', async () => {
      const s = setup();

      const draft = await s.creator.createDraft();

      expect(draft.id).toBeTruthy();
      expect(draft.sprites).toEqual([]);
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([draft.id]);
    });

    it('creates a draft in the app language, with one empty name, description and list slot per generator', async () => {
      const s = setup();
      s.language.setLanguage('fr');

      const french = await s.creator.createDraft();
      s.language.setLanguage('en');
      const english = await s.creator.createDraft();

      expect(french.details.language).toBe('fr');
      expect(english.details.language).toBe('en');
      expect(english.details).toMatchObject({ name: '', description: '' });
      expect(english.generators).toEqual({});
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

      expect(added).toMatchObject({ kind: 'masked', type: 'equipment', slot: 'weapon1', id: 'blue-axe', label: 'Blue axe' });
      expect(added.materials).toBe(JSON.stringify(glowMaterials));
      expect(s.service.loadBlob).toHaveBeenCalledWith('packs/base-en/sprites/axe.png');
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
    it('copies the word list of the Base of the draft language into the draft', async () => {
      const s = setup();
      const draft = await validDraft(s);

      await s.creator.copyBaseList(draft.id, 'npcs');

      const saved = await s.creator.getDraft(draft.id);
      expect(saved?.generators.npcs).toEqual({ url: 'packs/base-fr/generators/npcs.json' });
      expect(saved?.generators.items).toEqual(EXTRA_ITEMS);
    });

    it('copies from base-en for an English draft, whatever the app language', async () => {
      const s = setup();
      s.language.setLanguage('fr');
      const draft = await validDraft(s, { language: 'en' });

      await s.creator.copyBaseList(draft.id, 'items');

      const saved = await s.creator.getDraft(draft.id);
      expect(saved?.generators.items).toEqual({ url: 'packs/base-en/generators/items.json' });
    });
  });

  describe('install', () => {
    it('stores the draft as a local pack, served as any installed pack', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.addPng(draft.id, png(), spark);
      await s.packs.load();

      await s.creator.install(draft.id);

      const [stored] = await s.storage.list();
      expect(stored).toMatchObject({ id: 'mine', source: { kind: 'local' } });
      expect(stored).not.toHaveProperty('enabled');
      expect(s.packs.$installed().map((p) => p.id)).toEqual(['base-fr', 'base-en', 'mine']);
      s.language.setLanguage('fr');
      await openWorldWithPacks(['base-fr', 'mine']);
      expect((await s.packs.sprites()).filter((x) => x.packId === 'mine').map((x) => [x.id, x.label])).toEqual([['spark', 'Etincelle']]);
      expect(await s.packs.wordList('items', 'mine')).toEqual(EXTRA_ITEMS);
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
      await s.creator.saveDraft({ ...draft, generators: { items: { version: 1 } } });

      expect(await rejection(s.creator.install(draft.id))).toContain('generators/items.json');
      expect(await s.storage.list()).toEqual([]);
    });

    it.each(['base-fr', 'base-en'])('refuses the official pack id %s', async (id) => {
      const s = setup();
      const draft = await validDraft(s, { id });

      expect(await rejection(s.creator.install(draft.id))).toContain('official');
      expect(await s.storage.list()).toEqual([]);
    });

    it('stores the new manifest: language, single name and description, one label per sprite', async () => {
      const s = setup();
      const draft = await validDraft(s);
      await s.creator.addPng(draft.id, png(), spark);

      await s.creator.install(draft.id);

      const [stored] = await s.storage.list();
      expect(stored.manifest).toMatchObject({
        language: 'fr',
        name: 'Mien',
        description: 'Mon pack',
        generators: { items: 'generators/items.json' },
        sprites: [{ id: 'spark', label: 'Etincelle' }],
      });
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
      expect(Object.keys(entries).sort()).toEqual(['generators/items.json', 'pack.json', 'sprites/spark.png']);
      const manifest = JSON.parse(new TextDecoder().decode(entries['pack.json']));
      expect(manifest).toMatchObject({
        format: 1,
        id: 'mine',
        language: 'fr',
        name: 'Mien',
        generators: { items: 'generators/items.json' },
        sprites: [{ id: 'spark', label: 'Etincelle', image: 'sprites/spark.png' }],
      });
      expect(JSON.parse(new TextDecoder().decode(entries['generators/items.json']))).toEqual(EXTRA_ITEMS);
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

      expect(draft.details).toMatchObject({ id: 'neon', language: 'fr', name: 'Neon', version: '1.0.0', author: 'Ann Author' });
      expect(draft.generators.items).toEqual(EXTRA_ITEMS);
      expect(draft.sprites[0].label).toBe('Etincelle');
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

      await expect(s.creator.draftFromInstalled('base-fr')).rejects.toBeDefined();
      await expect(s.creator.draftFromInstalled('base-en')).rejects.toBeDefined();
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
        id: 'neon-copie',
        language: 'fr',
        name: 'Neon (copie)',
        description: 'Des choses brillantes',
        version: '1.0.0',
        author: 'Ann Author',
        license: 'CC-BY-4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        homepage: 'https://example.com/neon',
      });
      expect(draft.generators.items).toEqual(EXTRA_ITEMS);
      expect(draft.sprites.map((x) => [x.id, x.kind])).toEqual([['spark', 'grayscale'], ['glow', 'masked'], ['tint', 'colored']]);
      expect(JSON.parse(draft.sprites[1].materials!)).toEqual(glowMaterials);
      expect(draft.sprites[0].image).toBeInstanceOf(Blob);
      expect((await s.creator.listDrafts()).map((d) => d.id)).toEqual([draft.id]);
      expect(buildPack(draft).manifest.id).toBe('neon-copie');
      expect(validatePack(buildPack(draft).manifest).ok).toBe(true);
    });

    it('follows the language of the pack, not the app: -copie for a French pack in an English app', async () => {
      const s = setup();
      TestBed.inject(TranslocoService).setActiveLang('en');
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const draft = await s.creator.duplicate('neon');

      expect(draft.details.id).toBe('neon-copie');
      expect(draft.details.name).toBe('Neon (copie)');
    });

    it('uses -copy and (copy) for an English pack, even in a French app', async () => {
      const s = setup();
      TestBed.inject(TranslocoService).setActiveLang('fr');
      const mine = await validDraft(s, { id: 'mine-en', language: 'en', name: 'Mine' });
      await s.creator.install(mine.id);

      const draft = await s.creator.duplicate('mine-en');

      expect(draft.details).toMatchObject({ id: 'mine-en-copy', name: 'Mine (copy)', language: 'en' });
    });

    it('skips taken ids: -copie, then -copie-2, -copie-3', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));

      const first = await s.creator.duplicate('neon');
      const second = await s.creator.duplicate('neon');
      const third = await s.creator.duplicate('neon');

      expect([first, second, third].map((d) => d.details.id)).toEqual(['neon-copie', 'neon-copie-2', 'neon-copie-3']);
    });

    it('skips an id taken by an installed pack', async () => {
      const s = setup();
      await s.packs.install(await s.packs.prepare(NEON_LINK));
      const first = await s.creator.duplicate('neon');
      await s.creator.install(first.id);
      await s.creator.deleteDraft(first.id);

      const second = await s.creator.duplicate('neon');

      expect(second.details.id).toBe('neon-copie-2');
    });

    it('copies a pack created on this device with its sprites', async () => {
      const s = setup();
      const mine = await validDraft(s);
      await s.creator.addPng(mine.id, png(), spark);
      await s.creator.install(mine.id);

      const copy = await s.creator.duplicate('mine');

      expect(copy.id).not.toBe(mine.id);
      expect(copy.details).toMatchObject({ id: 'mine-copie', language: 'fr', name: 'Mien (copie)', author: 'Ann Author' });
      expect(copy.generators.items).toEqual(EXTRA_ITEMS);
      expect(ids(copy)).toEqual(['spark']);
      expect(await text(copy.sprites[0].image)).toBe('png-bytes');
      expect(validatePack(buildPack(copy).manifest).ok).toBe(true);
    });

    it('copies a downloaded official pack', async () => {
      const s = setup();
      await s.packs.enable('extra');

      const draft = await s.creator.duplicate('extra');

      expect(draft.details).toMatchObject({ id: 'extra-copie', language: 'fr', name: 'Extra (copie)', author: 'Jane Doe', license: 'CC0-1.0' });
      expect(draft.generators.items).toEqual(EXTRA_ITEMS);
      expect(ids(draft)).toEqual(['gem']);
      expect(draft.sprites[0].image).toBeInstanceOf(Blob);
    });

    it.each([
      ['base-fr', 'fr', baseFrPack, 'Hache', 'base-fr-copie', /\(copie\)$/],
      ['base-en', 'en', baseEnPack, 'Axe', 'base-en-copy', /\(copy\)$/],
    ] as const)('copies %s: its language, four word lists and 101 sprites with their labels, read from the app', async (id, language, manifest, axeLabel, copyId, copyName) => {
      const s = setup();

      const draft = await s.creator.duplicate(id);

      expect(draft.details).toMatchObject({ id: copyId, language, name: expect.stringMatching(copyName), version: '1.0.0', license: 'CC-BY-4.0' });
      expect(draft.generators.items).toEqual({ url: `packs/${id}/generators/items.json` });
      expect(draft.generators.classes).toEqual({ url: `packs/${id}/generators/classes.json` });
      expect(Object.keys(draft.generators).sort()).toEqual(['classes', 'items', 'npcs', 'skills']);
      expect(draft.sprites.length).toBe(manifest.sprites.length);
      expect(draft.sprites.length).toBe(101);
      expect(draft.sprites.find((x) => x.id === 'axe')?.label).toBe(axeLabel);
      expect(draft.sprites.every((x) => x.image instanceof Blob)).toBe(true);
      const masked = draft.sprites.filter((x) => x.kind === 'masked');
      expect(masked.length).toBe(manifest.sprites.filter((x) => x.kind === 'masked').length);
      expect(masked.length).toBeGreaterThan(0);
      expect(masked.every((x) => !!x.materials)).toBe(true);
      expect(validatePack(buildPack(draft).manifest).ok).toBe(true);
    });

    it('duplicating base-en gives an English draft with English lists and labels, in a French app too', async () => {
      const s = setup();
      s.language.setLanguage('fr');

      const draft = await s.creator.duplicate('base-en');

      expect(draft.details.language).toBe('en');
      expect(draft.details.name).toMatch(/\(copy\)$/);
      expect(draft.sprites.find((x) => x.id === 'axe')?.label).toBe('Axe');
    });

    it('refuses an official pack that is not downloaded and an unknown id, saving nothing', async () => {
      const s = setup();

      await expect(s.creator.duplicate('extra')).rejects.toBeDefined();
      await expect(s.creator.duplicate('nope')).rejects.toBeDefined();
      expect(await s.creator.listDrafts()).toEqual([]);
    });
  });
});
