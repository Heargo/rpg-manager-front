import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import glowMaterials from '../../../../public/packs/base/sprites/axe.json';
import { neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { ImageProcessingService } from '../services/image-processing.service';
import { PackCreatorBusiness } from './pack-creator.business';

const MB = 1024 * 1024;
const MATERIALS = JSON.stringify(glowMaterials);
const REPLACED = JSON.stringify(glowMaterials, null, 2);
const png = (content = 'png-bytes') => new Blob([content], { type: 'image/png' });
const text = async (blob: Blob) => new TextDecoder().decode(await blob.arrayBuffer());

function setup() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const fakes = neonProviders(neonWorld());
  const dims = new WeakMap<Blob, { width: number; height: number }>();
  const images = { dimensions: vi.fn(async (blob: Blob) => dims.get(blob) ?? { width: 128, height: 128 }) };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [...fakes.providers, { provide: ImageProcessingService, useValue: images }],
  });
  return { dims, creator: TestBed.inject(PackCreatorBusiness) };
}

const axe = { id: 'axe', en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1' } as const;

describe('PackCreatorBusiness: colorizer link', () => {
  describe('addFromColorizer', () => {
    it('adds a masked sprite with the given materials and image', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();

      const added = await s.creator.addFromColorizer(draft.id, { ...axe, image: png(), materials: MATERIALS });

      expect(added).toMatchObject({ ...axe, kind: 'masked', materials: MATERIALS });
      const saved = (await s.creator.getDraft(draft.id))!.sprites;
      expect(saved.map((x) => x.id)).toEqual(['axe']);
      expect(saved[0]).toMatchObject({ kind: 'masked', materials: MATERIALS });
      expect(await text(saved[0].image)).toBe('png-bytes');
    });

    it('refuses an image larger than 1 MB and adds nothing', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      const big = Object.defineProperty(png(), 'size', { value: MB + 1 });

      await expect(s.creator.addFromColorizer(draft.id, { ...axe, image: big, materials: MATERIALS })).rejects.toThrow();

      expect((await s.creator.getDraft(draft.id))?.sprites).toEqual([]);
    });

    it('refuses an image larger than 256 x 256', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      const wide = png();
      s.dims.set(wide, { width: 300, height: 100 });

      await expect(s.creator.addFromColorizer(draft.id, { ...axe, image: wide, materials: MATERIALS })).rejects.toThrow();

      expect((await s.creator.getDraft(draft.id))?.sprites).toEqual([]);
    });

    it('refuses a sprite id already in the draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addFromColorizer(draft.id, { ...axe, image: png(), materials: MATERIALS });

      await expect(s.creator.addFromColorizer(draft.id, { ...axe, image: png(), materials: MATERIALS })).rejects.toThrow();

      expect((await s.creator.getDraft(draft.id))?.sprites).toHaveLength(1);
    });
  });

  describe('updateSpriteMaterials', () => {
    const grayscale = { id: 'spark', en: 'Spark', fr: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale' } as const;

    it('replaces the materials of a masked sprite and keeps its image', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addFromColorizer(draft.id, { ...axe, image: png('axe-image'), materials: MATERIALS });

      await s.creator.updateSpriteMaterials(draft.id, 'axe', REPLACED);

      const [sprite] = (await s.creator.getDraft(draft.id))!.sprites;
      expect(sprite).toMatchObject({ id: 'axe', kind: 'masked', materials: REPLACED });
      expect(await text(sprite.image)).toBe('axe-image');
    });

    it('turns a grayscale sprite into a masked one', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addPng(draft.id, png('spark-image'), grayscale);

      await s.creator.updateSpriteMaterials(draft.id, 'spark', MATERIALS);

      const [sprite] = (await s.creator.getDraft(draft.id))!.sprites;
      expect(sprite).toMatchObject({ id: 'spark', kind: 'masked', materials: MATERIALS });
      expect(await text(sprite.image)).toBe('spark-image');
    });

    it('refuses a colored sprite and leaves it as it was', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();
      await s.creator.addPng(draft.id, png(), { ...grayscale, kind: 'colored' });

      await expect(s.creator.updateSpriteMaterials(draft.id, 'spark', MATERIALS)).rejects.toThrow();

      const [sprite] = (await s.creator.getDraft(draft.id))!.sprites;
      expect(sprite.kind).toBe('colored');
      expect(sprite.materials).toBeUndefined();
    });

    it('refuses an unknown sprite and an unknown draft', async () => {
      const s = setup();
      const draft = await s.creator.createDraft();

      await expect(s.creator.updateSpriteMaterials(draft.id, 'nope', MATERIALS)).rejects.toThrow();
      await expect(s.creator.updateSpriteMaterials('no-draft', 'nope', MATERIALS)).rejects.toThrow();
    });
  });
});
