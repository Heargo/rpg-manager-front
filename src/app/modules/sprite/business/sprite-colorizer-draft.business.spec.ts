import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { neonProviders, neonWorld } from '../../../../testing/unofficial-pack';
import { PackCreatorBusiness } from '../../../core/business/pack-creator.business';
import { ImageProcessingService } from '../../../core/services/image-processing.service';
import { autoMaterials } from '../helpers/auto-materials';
import { exportConfig } from '../helpers/config-export';
import { gray } from '../helpers/sprite-test-images';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpritePresetStorageService } from '../services/sprite-preset-storage.service';
import { SpriteColorizerBusiness } from './sprite-colorizer.business';

/** 4 x 1: two dark, two light pixels, so the auto materials are Base + Part 1. */
const sprite = () => gray(4, 1, [10, 10, 220, 220]);
const text = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());
const png = (content: string) => new Blob([content], { type: 'image/png' });
const details = { id: 'blue-axe', en: 'Blue axe', fr: 'Hache bleue', type: 'equipment', slot: 'weapon1' } as const;

function setup() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const files = {
    decode: vi.fn(async () => sprite()),
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => '{}'),
    encodePng: vi.fn(async () => png('encoded-png')),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideTestTranslations(), 
      ...neonProviders(neonWorld()).providers,
      { provide: SpritePresetStorageService, useValue: { load: () => [], save: vi.fn() } },
      { provide: SpriteFileService, useValue: files },
      { provide: ImageProcessingService, useValue: { dimensions: async () => ({ width: 4, height: 1 }) } },
    ],
  });
  return {
    files,
    business: TestBed.inject(SpriteColorizerBusiness),
    creator: TestBed.inject(PackCreatorBusiness),
  };
}

const layerNames = (business: SpriteColorizerBusiness) => business.$document()!.layers.map((l) => l.name);

describe('SpriteColorizerBusiness: pack drafts', () => {
  describe('loadDraftSprite', () => {
    it('opens the image of a masked draft sprite with its materials', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      const materials = exportConfig(autoMaterials(sprite()));
      await s.creator.addFromColorizer(draft.id, { ...details, image: png('axe'), materials });

      await s.business.loadDraftSprite(draft.id, 'blue-axe');

      expect(s.files.decode).toHaveBeenCalledTimes(1);
      expect(s.business.$image()).toEqual(sprite());
      expect(layerNames(s.business)).toEqual(['Base', 'Part 1']);
    });

    it('opens a grayscale draft sprite as a loaded image, without materials', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addPng(draft.id, png('spark'), { id: 'spark', en: 'Spark', fr: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale' });

      await s.business.loadDraftSprite(draft.id, 'spark');

      expect(s.business.$image()).toEqual(sprite());
      expect(s.business.$document()!.layers).toHaveLength(1);
    });

    it('rejects an unknown draft or sprite', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();

      await expect(s.business.loadDraftSprite('no-draft', 'x')).rejects.toBeDefined();
      await expect(s.business.loadDraftSprite(draft.id, 'nope')).rejects.toBeDefined();
    });
  });

  describe('saveToDraft', () => {
    it('writes the current materials back to the draft sprite, which becomes masked', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addPng(draft.id, png('spark'), { id: 'spark', en: 'Spark', fr: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale' });
      await s.business.loadDraftSprite(draft.id, 'spark');
      s.business.addMaterial('Blade');

      await s.business.saveToDraft();

      const [saved] = (await s.creator.getDraft(draft.id))!.sprites;
      expect(saved.kind).toBe('masked');
      expect(saved.materials).toBe(s.business.exportJson());
      expect(JSON.parse(saved.materials!).layers.map((l: { name: string }) => l.name)).toContain('Blade');
      expect(await text(saved.image)).toBe('spark');
    });
  });

  describe('addCurrentToDraft', () => {
    it('stores the grayscale image as a PNG with the current materials as a masked sprite', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      s.business.loadImage(sprite(), 'axe');
      s.business.addMaterial('Blade');

      await s.business.addCurrentToDraft(draft.id, details);

      const [saved] = (await s.creator.getDraft(draft.id))!.sprites;
      expect(saved).toMatchObject({ ...details, kind: 'masked', materials: s.business.exportJson() });
      expect(s.files.encodePng).toHaveBeenCalledWith(sprite());
      expect(await text(saved.image)).toBe('encoded-png');
    });

    it('rejects a sprite id already in the draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      s.business.loadImage(sprite(), 'axe');
      await s.business.addCurrentToDraft(draft.id, details);

      await expect(s.business.addCurrentToDraft(draft.id, details)).rejects.toBeDefined();

      expect((await s.creator.getDraft(draft.id))!.sprites).toHaveLength(1);
    });
  });
});
