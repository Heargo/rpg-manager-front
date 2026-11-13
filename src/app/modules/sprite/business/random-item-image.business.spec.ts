import { TestBed } from '@angular/core/testing';
import { provideBasePack } from '../../../../testing/base-pack';
import { provideKindsPack } from '../../../../testing/kinds-pack';
import { ImageBusiness } from '../../../core/business/image.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { autoMaterials } from '../helpers/auto-materials';
import { exportConfig } from '../helpers/config-export';
import { gray } from '../helpers/sprite-test-images';
import { SpriteSet } from '../models/sprite-set';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { RandomItemImageBusiness } from './random-item-image.business';

const sprite = () => gray(4, 1, [10, 10, 220, 220]);

function setup(saved: SpriteSet[] = []) {
  const files = {
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => exportConfig(autoMaterials(sprite()))),
    decode: vi.fn(async () => sprite()),
    encodePng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  };
  const images = { storeUpload: vi.fn(async () => 'stored-1') };
  const storage = { get: vi.fn(async () => new Blob(['x'], { type: 'image/png' })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: SpriteFileService, useValue: files },
      provideBasePack(),
      { provide: SpriteSetStorageService, useValue: { list: async () => saved } },
      { provide: ImageBusiness, useValue: images },
      { provide: ImageStorageService, useValue: storage },
    ],
  });
  return { business: TestBed.inject(RandomItemImageBusiness), files, images, storage };
}

describe('RandomItemImageBusiness', () => {
  it('recolours a bundled sprite matching the item and stores it as an image', async () => {
    const { business, files, images } = setup();
    const id = await business.create({ name: 'Hache du nord', type: 'equipment', slot: 'weapon1' }, 'seed');
    expect(id).toBe('stored-1');
    const url = (files.fetchImage.mock.calls[0] as unknown[])[0];
    expect(['packs/base/sprites/axe.png', 'packs/base/sprites/waraxe.png']).toContain(url);
    expect(files.fetchText).toHaveBeenCalledWith(String(url).replace('.png', '.json'));
    expect(files.encodePng).toHaveBeenCalled();
    expect(images.storeUpload).toHaveBeenCalled();
  });

  it('picks the same sprite for the same seed', async () => {
    const item = { name: 'Lame', type: 'equipment' as const, slot: 'weapon1' as const };
    const a = setup();
    await a.business.create(item, 'same');
    TestBed.resetTestingModule();
    const b = setup();
    await b.business.create(item, 'same');
    expect(b.files.fetchImage.mock.calls[0]).toEqual(a.files.fetchImage.mock.calls[0]);
  });

  it('uses the tagged sets saved on the device, and ignores untagged ones', async () => {
    const config = exportConfig(autoMaterials(sprite()));
    const mine: SpriteSet = {
      id: 'mine',
      name: 'Zorglub',
      source: { kind: 'image', imageId: 'img-9' },
      config,
      updatedAt: 1,
      tags: { type: 'item', slot: 'none' },
    };
    const untagged: SpriteSet = { ...mine, id: 'other', name: 'Zorglub' , tags: undefined };
    const { business, storage, files } = setup([mine, untagged]);
    await business.create({ name: 'Zorglub ancien', type: 'item', slot: 'none' }, 'k');
    expect(storage.get).toHaveBeenCalledWith('img-9');
    expect(files.fetchImage).not.toHaveBeenCalled();
  });

  describe('sprite kinds', () => {
    const png = new Blob(['original-png'], { type: 'image/png' });

    function setupKinds() {
      const files = {
        fetchImage: vi.fn(async () => sprite()),
        fetchText: vi.fn(async () => exportConfig(autoMaterials(sprite()))),
        fetchBlob: vi.fn(async () => png),
        decode: vi.fn(async () => sprite()),
        encodePng: vi.fn(async () => new Blob(['recolored'], { type: 'image/png' })),
      };
      const images = { storeUpload: vi.fn(async () => 'stored-1') };
      TestBed.configureTestingModule({
        providers: [
          { provide: SpriteFileService, useValue: files },
          provideKindsPack(),
          { provide: SpriteSetStorageService, useValue: { list: async () => [] } },
          { provide: ImageBusiness, useValue: images },
          { provide: ImageStorageService, useValue: { get: vi.fn() } },
        ],
      });
      return { business: TestBed.inject(RandomItemImageBusiness), files, images };
    }
    const look = (name: string) => ({ name, type: 'item' as const, slot: 'none' as const });

    it('recolours a masked sprite from its bundled materials', async () => {
      const { business, files, images } = setupKinds();
      await business.create(look('Bravo'), 's');
      expect(files.fetchText).toHaveBeenCalledWith('packs/base/sprites/bravo.json');
      expect(files.encodePng).toHaveBeenCalled();
      expect(images.storeUpload).toHaveBeenCalled();
    });

    it('recolours a grayscale sprite through the automatic guess, ignoring any materials file', async () => {
      const { business, files, images } = setupKinds();
      await business.create(look('Alpha'), 's');
      expect(files.fetchImage).toHaveBeenCalledWith('packs/base/sprites/alpha.png');
      expect(files.fetchText).not.toHaveBeenCalled();
      expect(files.encodePng).toHaveBeenCalled();
      expect(images.storeUpload).toHaveBeenCalled();
    });

    it('stores a colored sprite as is, without decoding or recolouring', async () => {
      const { business, files, images } = setupKinds();
      const id = await business.create(look('Charlie'), 's');
      expect(id).toBe('stored-1');
      expect(files.fetchBlob).toHaveBeenCalledWith('packs/base/sprites/charlie.png');
      expect(files.encodePng).not.toHaveBeenCalled();
      expect(files.fetchText).not.toHaveBeenCalled();
      expect(images.storeUpload).toHaveBeenCalledWith(png);
    });
  });
});
