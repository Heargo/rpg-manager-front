import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { neonProviders, neonWorld } from '../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../core/business/pack-creator.business';
import { ImageProcessingService } from '../../../core/services/image-processing.service';
import { gray } from '../helpers/sprite-test-images';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpritePresetStorageService } from '../services/sprite-preset-storage.service';
import { SpriteColorizerBusiness } from './sprite-colorizer.business';

describe('SpriteColorizerBusiness: colored draft sprite', () => {
  it('refuses to open a colored draft sprite and stays empty', async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const files = { decode: vi.fn(async () => gray(4, 1, [1, 2, 3, 4])) };
    TestBed.configureTestingModule({
      providers: [
        ...neonProviders(neonWorld()).providers,
        {
          provide: SpritePresetStorageService,
          useValue: { load: () => [], save: vi.fn() },
        },
        { provide: SpriteFileService, useValue: files },
        {
          provide: ImageProcessingService,
          useValue: { dimensions: async () => ({ width: 4, height: 1 }) },
        },
      ],
    });
    const creator = TestBed.inject(PackCreatorBusiness);
    const business = TestBed.inject(SpriteColorizerBusiness);
    const draft = await creator.createDraft();
    await creator.addPng(draft.id, new Blob(['x'], { type: 'image/png' }), {
      id: 'tint',
      en: 'Tint',
      fr: 'Teinte',
      type: 'item',
      slot: 'none',
      kind: 'colored',
    });

    await expect(business.loadDraftSprite(draft.id, 'tint')).rejects.toThrow(
      'sprite.coloredRefused',
    );

    expect(files.decode).not.toHaveBeenCalled();
    expect(business.$image()).toBeNull();
    expect(business.$draftTarget()).toBeNull();
  });
});
