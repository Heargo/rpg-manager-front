import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { extraPackService, provideExtraPack } from '../../../../testing/extra-pack';
import { openWorldWithPacks } from '../../../../testing/active-packs';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ImageBusiness } from '../../../core/business/image.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { autoMaterials } from '../helpers/auto-materials';
import { exportConfig } from '../helpers/config-export';
import { gray } from '../helpers/sprite-test-images';
import { SpriteSet } from '../models/sprite-set';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { RandomItemImageBusiness } from './random-item-image.business';

/** 20 x 1 strip with three regions besides the base. */
const strip = () =>
  gray(
    20,
    1,
    [...Array(8).fill(10), ...Array(6).fill(120), ...Array(4).fill(230), 0, 0],
    [...Array(18).fill(255), 0, 0],
  );
const sprite = strip;

async function setup(worldPacks?: string[], saved: SpriteSet[] = []) {
  globalThis.indexedDB = new IDBFactory();
  let created = 0;
  URL.createObjectURL = vi.fn(() => `blob:extra-${++created}`);
  URL.revokeObjectURL = vi.fn();
  const files = {
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => ''),
    fetchBlob: vi.fn(async () => new Blob(['x'])),
    decode: vi.fn(async () => sprite()),
    encodePng: vi.fn(async (_image: unknown) => new Blob(['png'], { type: 'image/png' })),
  };
  const storage = { get: vi.fn(async () => new Blob(['x'], { type: 'image/png' })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: SpriteFileService, useValue: files },
      provideTestTranslations(),
      provideExtraPack(extraPackService()),
      { provide: SpriteSetStorageService, useValue: { list: async () => saved } },
      { provide: ImageBusiness, useValue: { storeUpload: vi.fn(async () => 'stored-1') } },
      { provide: ImageStorageService, useValue: storage },
    ],
  });
  TestBed.inject(LanguageBusiness).setLanguage('en');
  await TestBed.inject(PackBusiness).enable('extra');
  if (worldPacks) await openWorldWithPacks(worldPacks);
  return { business: TestBed.inject(RandomItemImageBusiness), files, storage };
}

const urlsOf = (files: { fetchImage: ReturnType<typeof vi.fn> }) =>
  files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));

describe('RandomItemImageBusiness over the world packs', () => {
  const gem = { name: 'Gemme', type: 'item' as const, slot: 'none' as const, kind: 'gem' };

  it('draws the sprite of an active pack in another language than the world, whatever the app language', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    for (let i = 0; i < 10; i++) await business.create(gem, `seed-${i}`);

    const urls = urlsOf(files);
    expect(urls).toHaveLength(10);
    expect(urls.every((url) => url.startsWith('blob:extra-'))).toBe(true);
  });

  it('draws the base-assets sprites of the kind when the pack with the kind sprite is not active', async () => {
    const { business, files } = await setup(['base-en', 'base-assets']);

    for (let i = 0; i < 10; i++)
      await business.create({ name: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'axe' }, `seed-${i}`);

    expect(urlsOf(files).every((url) => url === 'packs/base-assets/sprites/axe.png')).toBe(true);
  });

  it('draws from every active pack when the kind has no sprite anywhere', async () => {
    const { business, files } = await setup(['base-en', 'base-assets', 'extra']);

    for (let i = 0; i < 40; i++)
      await business.create({ name: 'Machin', type: 'item', slot: 'none' }, `seed-${i}`);

    const urls = urlsOf(files);
    expect(urls.some((url) => url.startsWith('blob:extra-'))).toBe(true);
    expect(urls.some((url) => url.startsWith('packs/base-assets/sprites/'))).toBe(true);
  });

  it('keeps the same result for the same seed', async () => {
    const { business, files } = await setup(['base-en', 'extra']);
    const item = { name: 'Machin', type: 'item' as const, slot: 'none' as const };

    await business.create(item, 'same');
    await business.create(item, 'same');

    expect(files.fetchImage.mock.calls[1]).toEqual(files.fetchImage.mock.calls[0]);
    expect(files.encodePng.mock.calls[1][0]).toEqual(files.encodePng.mock.calls[0][0]);
  });

  describe('tagged sprite sets', () => {
    const mine: SpriteSet = {
      id: 'mine',
      name: 'Mon rubis',
      source: { kind: 'image', imageId: 'img-9' },
      config: exportConfig(autoMaterials(strip())),
      updatedAt: 1,
      tags: { kinds: ['gem'] },
    };

    it('uses a set tagged with the kind of the item', async () => {
      const { business, storage, files } = await setup(['base-en', 'base-assets'], [mine]);

      await business.create(gem, 'k');

      expect(storage.get).toHaveBeenCalledWith('img-9');
      expect(files.fetchImage).not.toHaveBeenCalled();
    });

    it('uses a set tagged with a parent kind of the item', async () => {
      const { business, storage } = await setup(['base-en', 'base-assets'], [{ ...mine, tags: { kinds: ['weapon'] } }]);

      await business.create({ name: 'Bâton', type: 'equipment', slot: 'weapon1', kind: 'staff' }, 'k');

      expect(storage.get).toHaveBeenCalledWith('img-9');
    });

    it('leaves the set aside when the pack gives a sprite of a nearer kind', async () => {
      const { business, storage } = await setup(['base-en', 'base-assets'], [{ ...mine, tags: { kinds: ['weapon'] } }]);

      await business.create({ name: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'axe' }, 'k');

      expect(storage.get).not.toHaveBeenCalled();
    });
  });

  describe('tints', () => {
    /** The first part the automatic materials find. */
    const firstPart = () => {
      const doc = autoMaterials(strip());
      const layer = doc.layers.find((l) => l.id !== doc.baseId)!;
      return layer.mask.findIndex((m) => m > 0);
    };

    it('colours the first part with the gradient of the first tint of the item', async () => {
      const { business, files } = await setup(['base-en', 'base-assets']);
      const at = firstPart();

      for (const seed of ['a', 'b', 'c', 'd', 'e']) {
        files.encodePng.mockClear();
        await business.create(
          { name: 'Épée', type: 'equipment', slot: 'weapon1', kind: 'sword', tints: ['fire'] },
          seed,
        );
        const out = files.encodePng.mock.calls[0][0] as { data: Uint8ClampedArray };
        const [r, g, b] = Array.from(out.data.slice(at * 4, at * 4 + 3));
        // The Base fire gradient is dark red to orange to yellow: red dominates, blue stays low.
        expect(r).toBeGreaterThan(b + 60);
        expect(r).toBeGreaterThanOrEqual(g);
      }
    });
  });
});
