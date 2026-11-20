import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { builtInManifest } from '../../../../testing/base-pack';
import { openWorldWithPacks } from '../../../../testing/active-packs';
import {
  extraPackService,
  EXTRA_MANIFEST,
  provideExtraPack,
} from '../../../../testing/extra-pack';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ImageBusiness } from '../../../core/business/image.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { gray } from '../helpers/sprite-test-images';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { RandomItemImageBusiness } from './random-item-image.business';

const strip = () =>
  gray(
    20,
    1,
    [...Array(8).fill(10), ...Array(6).fill(120), ...Array(4).fill(230), 0, 0],
    [...Array(18).fill(255), 0, 0],
  );

const npcSprite = (
  id: string,
  kinds: string[],
  kind: 'grayscale' | 'colored' = 'grayscale',
) => ({
  id,
  label: id,
  domain: 'npcs',
  kinds,
  kind,
  image: `sprites/${id}.png`,
});

/** The `extra` pack with the item sprite `gem` and three NPC sprites. */
const manifest = () => ({
  ...structuredClone(EXTRA_MANIFEST),
  sprites: [
    ...EXTRA_MANIFEST.sprites,
    npcSprite('wolf-1', ['wolf']),
    npcSprite('beast-1', ['beast']),
    npcSprite('noble-1', ['noble'], 'colored'),
  ],
});

async function setup(worldPacks: string[], withNpcSprites = true) {
  globalThis.indexedDB = new IDBFactory();
  // The pack business keeps the bytes and rebuilds a new Blob: only the size survives, so each file gets its own.
  const sizes = new Map<number, string>();
  URL.createObjectURL = vi.fn((blob: Blob) => `blob:${sizes.get(blob.size)}`);
  URL.revokeObjectURL = vi.fn();
  const files = {
    fetchImage: vi.fn(async (_url: string) => strip()),
    fetchText: vi.fn(async () => ''),
    fetchBlob: vi.fn(async (_url: string) => new Blob(['x'])),
    decode: vi.fn(async () => strip()),
    encodePng: vi.fn(
      async (_image: unknown) => new Blob(['png'], { type: 'image/png' }),
    ),
  };
  const service = extraPackService({
    loadManifest: vi.fn(async (id: string) =>
      id === 'extra'
        ? withNpcSprites
          ? manifest()
          : structuredClone(EXTRA_MANIFEST)
        : builtInManifest(id),
    ),
    loadBlob: vi.fn(async (url: string) => {
      const size =
        [...sizes.entries()].find(([, path]) => path === url)?.[0] ??
        100 + sizes.size;
      sizes.set(size, url);
      return new Blob(['x'.repeat(size)], { type: 'image/png' });
    }),
  });
  TestBed.configureTestingModule({
    providers: [
      { provide: SpriteFileService, useValue: files },
      provideTestTranslations(),
      provideExtraPack(service),
      { provide: SpriteSetStorageService, useValue: { list: async () => [] } },
      {
        provide: ImageBusiness,
        useValue: { storeUpload: vi.fn(async () => 'stored-1') },
      },
      {
        provide: ImageStorageService,
        useValue: { get: vi.fn(async () => new Blob(['x'])) },
      },
    ],
  });
  TestBed.inject(LanguageBusiness).setLanguage('en');
  await TestBed.inject(PackBusiness).enable('extra');
  await openWorldWithPacks(worldPacks);
  return {
    business: TestBed.inject(RandomItemImageBusiness),
    files,
    images: TestBed.inject(ImageBusiness),
  };
}

const urlsOf = (files: { fetchImage: ReturnType<typeof vi.fn> }) =>
  files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));

describe('RandomItemImageBusiness for NPCs', () => {
  it('stores a portrait drawn from an NPC sprite of the NPC kind', async () => {
    const { business, files, images } = await setup(['base-en', 'extra']);

    const ids: string[] = [];
    for (let i = 0; i < 10; i++)
      ids.push(await business.createNpc({ kind: 'wolf' }, `seed-${i}`));

    expect(ids.every((id) => id === 'stored-1')).toBe(true);
    expect(urlsOf(files)).toHaveLength(10);
    expect(
      urlsOf(files).every(
        (url) => url === 'blob:packs/extra/sprites/wolf-1.png',
      ),
    ).toBe(true);
    expect(images.storeUpload).toHaveBeenCalledTimes(10);
  });

  it('draws a sprite of a parent kind for a child kind', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    for (let i = 0; i < 10; i++)
      await business.createNpc({ kind: 'boar' }, `seed-${i}`);

    expect(
      urlsOf(files).every(
        (url) => url === 'blob:packs/extra/sprites/beast-1.png',
      ),
    ).toBe(true);
  });

  it('falls back to any NPC sprite, never an item sprite', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    for (let i = 0; i < 40; i++)
      await business.createNpc({ kind: 'merchant' }, `seed-${i}`);

    const urls = new Set(urlsOf(files));
    expect(urls.has('blob:packs/extra/sprites/wolf-1.png')).toBe(true);
    expect(urls.has('blob:packs/extra/sprites/beast-1.png')).toBe(true);
    expect([...urls].some((u) => u.includes('gem'))).toBe(false);
  });

  it('uses a colored NPC sprite as is', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    await business.createNpc({ kind: 'noble' }, 'a');

    expect(files.fetchBlob).toHaveBeenCalledWith(
      'blob:packs/extra/sprites/noble-1.png',
    );
    expect(files.encodePng).not.toHaveBeenCalled();
  });

  it('gives the same portrait for the same NPC and seed', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    await business.createNpc({ kind: 'merchant' }, 'same');
    await business.createNpc({ kind: 'merchant' }, 'same');

    expect(files.fetchImage.mock.calls[1]).toEqual(
      files.fetchImage.mock.calls[0],
    );
    expect(files.encodePng.mock.calls[1][0]).toEqual(
      files.encodePng.mock.calls[0][0],
    );
  });

  it('rejects when the active packs have no NPC sprite', async () => {
    const { business, files } = await setup(['base-en', 'base-assets']);

    await expect(
      business.createNpc({ kind: 'wolf' }, 'a'),
    ).rejects.toBeDefined();
    expect(files.fetchImage).not.toHaveBeenCalled();
  });

  it('never draws an NPC sprite for an item', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    for (let i = 0; i < 30; i++)
      await business.create(
        { name: 'Machin', type: 'item', slot: 'none' },
        `seed-${i}`,
      );

    expect(urlsOf(files).length).toBe(30);
    expect(urlsOf(files).every((url) => url.includes('gem'))).toBe(true);
  });
});
