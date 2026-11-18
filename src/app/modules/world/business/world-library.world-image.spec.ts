import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { ImageProcessingService } from '../../../core/services/image-processing.service';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { MemoryImageStorage } from '../../../../testing/memory-image-storage';
import { provideBasePack } from '../../../../testing/base-pack';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { WorldLibraryBusiness } from './world-library.business';

describe('WorldLibraryBusiness: choosing a pack world image', () => {
  let library: WorldLibraryBusiness;
  let storage: MemoryImageStorage;
  let fetched: string[];
  const image = {
    id: 'mountains-night',
    label: 'Mountains at night',
    tags: ['mountain', 'night'],
    packId: 'base-assets',
    image: 'worlds/mountains-night.webp',
    imageUrl: 'packs/base-assets/worlds/mountains-night.webp',
  };

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    storage = new MemoryImageStorage();
    fetched = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(new Blob(['webp-bytes'], { type: 'image/webp' }));
    });
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        provideBasePack(),
        { provide: ImageStorageService, useValue: storage },
        { provide: ImageProcessingService, useValue: { resize: async (file: Blob) => file } },
      ],
    });
    library = TestBed.inject(WorldLibraryBusiness);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches the image and stores a copy in the image store, returning its id', async () => {
    const id = await library.chooseWorldImage(image);

    expect(fetched).toEqual(['packs/base-assets/worlds/mountains-night.webp']);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(await TestBed.inject(ImageBusiness).has(id)).toBe(true);
    expect(storage.images.size).toBe(1);
  });

  it('gives the same id when the same image is chosen twice', async () => {
    expect(await library.chooseWorldImage(image)).toBe(await library.chooseWorldImage(image));
    expect(storage.images.size).toBe(1);
  });

  it('keeps the copy as the illustration of a world created with it, without the pack', async () => {
    const id = await library.chooseWorldImage(image);
    const world = await library.create({ name: 'Eldoria', attributes: [], imageId: id, packs: [] } as any);

    expect((await library.get(world.id))?.imageId).toBe(id);
  });

  it('rejects when the file cannot be fetched, storing nothing', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));

    await expect(library.chooseWorldImage(image)).rejects.toThrow();
    expect(storage.images.size).toBe(0);
  });

  it('still stores an upload', async () => {
    const id = await library.uploadImage(new Blob(['png'], { type: 'image/png' }));

    expect(await TestBed.inject(ImageBusiness).has(id)).toBe(true);
  });
});
