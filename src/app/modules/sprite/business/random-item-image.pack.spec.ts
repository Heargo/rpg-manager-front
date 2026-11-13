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
import { gray } from '../helpers/sprite-test-images';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { RandomItemImageBusiness } from './random-item-image.business';

const sprite = () => gray(4, 1, [10, 10, 220, 220]);

async function setup(worldPacks?: string[]) {
  globalThis.indexedDB = new IDBFactory();
  let created = 0;
  URL.createObjectURL = vi.fn(() => `blob:extra-${++created}`);
  URL.revokeObjectURL = vi.fn();
  const files = {
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => ''),
    fetchBlob: vi.fn(async () => new Blob(['x'])),
    decode: vi.fn(async () => sprite()),
    encodePng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SpriteFileService, useValue: files },
      provideTestTranslations(),
      provideExtraPack(extraPackService()),
      { provide: SpriteSetStorageService, useValue: { list: async () => [] } },
      { provide: ImageBusiness, useValue: { storeUpload: vi.fn(async () => 'stored-1') } },
      { provide: ImageStorageService, useValue: { get: vi.fn() } },
    ],
  });
  TestBed.inject(LanguageBusiness).setLanguage('fr');
  await TestBed.inject(PackBusiness).enable('extra');
  if (worldPacks) await openWorldWithPacks(worldPacks);
  return { business: TestBed.inject(RandomItemImageBusiness), files };
}

describe('RandomItemImageBusiness with a chosen pack', () => {
  const item = { name: 'Machin', type: 'item' as const, slot: 'none' as const };

  it('draws only the chosen pack sprites', async () => {
    const { business, files } = await setup(['base-fr', 'extra']);

    for (let i = 0; i < 10; i++) await business.create(item, `seed-${i}`, 'extra');

    const urls = files.fetchImage.mock.calls.map((c) => (c as unknown[])[0]);
    expect(urls).toHaveLength(10);
    expect(urls.every((url) => String(url).startsWith('blob:extra-'))).toBe(true);
  });

  it('draws only Base sprites when the Base is chosen', async () => {
    const { business, files } = await setup(['base-fr', 'extra']);

    for (let i = 0; i < 10; i++) await business.create(item, `seed-${i}`, 'base-fr');

    const urls = files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(urls.every((url) => url.startsWith('packs/base-fr/sprites/'))).toBe(true);
  });

  it('draws a sprite of a pack in another language than the app when the world has it active', async () => {
    const { business, files } = await setup(['base-fr', 'extra']);
    TestBed.inject(LanguageBusiness).setLanguage('en');

    for (let i = 0; i < 10; i++) await business.create(item, `seed-${i}`, 'extra');

    const urls = files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(urls).toHaveLength(10);
    expect(urls.every((url) => url.startsWith('blob:extra-'))).toBe(true);
  });

  it('draws only from the active packs when no pack is chosen', async () => {
    const { business, files } = await setup(['base-en', 'extra']);

    for (let i = 0; i < 20; i++) await business.create(item, `seed-${i}`);

    const urls = files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(urls.every((url) => url.startsWith('blob:extra-') || url.startsWith('packs/base-en/sprites/'))).toBe(true);
  });

  it('draws only Base sprites of the app language when there is no world, even for a downloaded pack', async () => {
    const { business, files } = await setup();

    for (let i = 0; i < 10; i++) await business.create(item, `seed-${i}`, 'extra');

    const urls = files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(urls).toHaveLength(10);
    expect(urls.every((url) => url.startsWith('packs/base-fr/sprites/'))).toBe(true);
  });

  it('keeps the same result for the same seed and pack', async () => {
    const { business, files } = await setup();

    await business.create(item, 'same', 'base-fr');
    await business.create(item, 'same', 'base-fr');

    expect(files.fetchImage.mock.calls[1]).toEqual(files.fetchImage.mock.calls[0]);
  });
});
