import { TestBed } from '@angular/core/testing';
import { gray } from '../helpers/sprite-test-images';
import { SpritePresetStorageService } from '../services/sprite-preset-storage.service';
import { SpriteColorizerBusiness } from './sprite-colorizer.business';

/** 4x4: left half (x < 2) gray 10, right half gray 200. */
const image = () =>
  gray(4, 4, [10, 10, 200, 200, 10, 10, 200, 200, 10, 10, 200, 200, 10, 10, 200, 200]);

function setup(stored: unknown[] = []) {
  const storage = { load: vi.fn(() => stored), save: vi.fn() };
  TestBed.configureTestingModule({
    providers: [{ provide: SpritePresetStorageService, useValue: storage }],
  });
  const business = TestBed.inject(SpriteColorizerBusiness);
  business.loadImage(image());
  return { business, storage };
}

const maskOf = (business: SpriteColorizerBusiness, id: string) =>
  Array.from(business.$document()!.layers.find((l) => l.id === id)!.mask);

function addMaterial(business: SpriteColorizerBusiness, name: string): string {
  business.addMaterial(name);
  return business.$activeLayerId()!;
}

describe('SpriteColorizerBusiness', () => {
  it('starts a document with only the base material after loading an image', () => {
    const { business } = setup();
    const doc = business.$document()!;
    expect(doc.width).toBe(4);
    expect(doc.layers).toHaveLength(1);
    expect(business.$canUndo()).toBe(false);
  });

  it('adds a material, makes it active, and undoes/redoes it', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    expect(business.$document()!.layers).toHaveLength(2);
    expect(business.$document()!.layers.find((l) => l.id === id)!.name).toBe('Blade');

    business.undo();
    expect(business.$document()!.layers).toHaveLength(1);
    business.redo();
    expect(business.$document()!.layers).toHaveLength(2);
  });

  it('paints a brush stroke across several pointer moves as one undo entry', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTool('brush');
    business.setBrush({ size: 1, hardness: 1 });

    business.beginStroke(0, 0);
    business.strokeTo(1, 0);
    business.strokeTo(2, 0);
    business.endStroke();

    expect(maskOf(business, id)).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(maskOf(business, business.$document()!.baseId).slice(0, 4)).toEqual([0, 0, 0, 1]);

    business.undo();
    expect(maskOf(business, id).every((v) => v === 0)).toBe(true);
    business.redo();
    expect(maskOf(business, id).slice(0, 4)).toEqual([1, 1, 1, 0]);
  });

  it('erases back to the base material', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTool('brush');
    business.setBrush({ size: 1, hardness: 1 });
    business.beginStroke(0, 0);
    business.strokeTo(1, 0);
    business.endStroke();

    business.setTool('eraser');
    business.beginStroke(1, 0);
    business.endStroke();

    expect(maskOf(business, id).slice(0, 2)).toEqual([1, 0]);
    expect(maskOf(business, business.$document()!.baseId)[1]).toBe(1);
  });

  it('ignores painting on a locked material', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setMaterialLocked(id, true);
    business.setTool('brush');
    business.beginStroke(0, 0);
    business.endStroke();
    expect(maskOf(business, id).every((v) => v === 0)).toBe(true);
    expect(business.$canUndo()).toBe(true); // only the lock change
    business.undo();
    business.undo();
    expect(business.$canUndo()).toBe(false);
  });

  it('bucket-fills the connected region within the tolerance into the active material', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTolerance(5);
    business.bucketAt(0, 0);
    expect(maskOf(business, id)).toEqual([1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0]);

    business.undo();
    expect(maskOf(business, id).every((v) => v === 0)).toBe(true);
  });

  it('keeps the selection apart from the masks until it is applied', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTolerance(5);
    business.wandAt(3, 0, 'replace');
    expect(Array.from(business.$selection()).slice(0, 4)).toEqual([0, 0, 1, 1]);
    expect(maskOf(business, id).every((v) => v === 0)).toBe(true);

    business.applySelection();
    expect(maskOf(business, id).slice(0, 4)).toEqual([0, 0, 1, 1]);
    business.undo();
    expect(maskOf(business, id).every((v) => v === 0)).toBe(true);
  });

  it('adds to, removes from, inverts and clears the selection', () => {
    const { business } = setup();
    business.setTolerance(5);
    business.wandAt(0, 0, 'replace');
    business.wandAt(3, 0, 'add');
    expect(Array.from(business.$selection()).every((v) => v === 1)).toBe(true);
    business.wandAt(3, 0, 'remove');
    expect(Array.from(business.$selection()).slice(0, 4)).toEqual([1, 1, 0, 0]);
    business.invertSelection();
    expect(Array.from(business.$selection()).slice(0, 4)).toEqual([0, 0, 1, 1]);
    business.clearSelection();
    expect(Array.from(business.$selection()).every((v) => v === 0)).toBe(true);
  });

  it('recolours the image through the material gradient and keeps alpha', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTolerance(5);
    business.bucketAt(3, 0);
    business.setGradient(id, [
      { position: 0, color: '#000000' },
      { position: 1, color: '#ff0000' },
    ]);
    const out = business.$recolored()!;
    expect(Array.from(out.data.slice(3 * 4, 3 * 4 + 4))).toEqual([200, 0, 0, 255]);
    // a base pixel keeps its own default look through the base gradient, alpha intact
    expect(out.data[3]).toBe(255);
  });

  it('applies a built-in preset to a material', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.applyPreset(id, 'steel');
    const stops = business.$document()!.layers.find((l) => l.id === id)!.gradient.stops;
    expect(stops[2].color.toLowerCase()).toBe('#ffffff');
  });

  it('deletes a material, gives its pixels back, and undoes the deletion', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTolerance(5);
    business.bucketAt(0, 0);
    business.deleteMaterial(id);
    expect(business.$document()!.layers).toHaveLength(1);
    expect(maskOf(business, business.$document()!.baseId).every((v) => v === 1)).toBe(true);

    business.undo();
    expect(business.$document()!.layers).toHaveLength(2);
    expect(maskOf(business, id).slice(0, 4)).toEqual([1, 1, 0, 0]);
  });

  it('clears the redo stack when a new action follows an undo', () => {
    const { business } = setup();
    addMaterial(business, 'A');
    business.undo();
    expect(business.$canRedo()).toBe(true);
    addMaterial(business, 'B');
    expect(business.$canRedo()).toBe(false);
  });

  it('lists the built-in presets plus the custom ones from storage', () => {
    const custom = { id: 'mine', name: 'Mine', stops: [{ position: 0, color: '#000000' }, { position: 1, color: '#ffffff' }] };
    const { business } = setup([custom]);
    const ids = business.$presets().map((p) => p.id);
    expect(ids.slice(0, 7)).toEqual(['steel', 'wood', 'gold', 'ice', 'fire', 'leaf', 'arcane']);
    expect(ids).toContain('mine');
  });

  it('saves the gradient of a material as a custom preset through the storage service', () => {
    const { business, storage } = setup();
    const id = addMaterial(business, 'Blade');
    const stops = [
      { position: 0, color: '#112233' },
      { position: 1, color: '#ddeeff' },
    ];
    business.setGradient(id, stops);
    business.saveCustomPreset(id, 'My steel');

    const saved = storage.save.mock.calls.at(-1)![0] as { name: string; stops: unknown }[];
    expect(saved.at(-1)).toMatchObject({ name: 'My steel', stops });
    expect(business.$presets().some((p) => p.name === 'My steel')).toBe(true);
  });

  it('exports the configuration as JSON and imports it back', () => {
    const { business } = setup();
    const id = addMaterial(business, 'Blade');
    business.setTolerance(5);
    business.bucketAt(0, 0);
    const json = business.exportJson();

    business.deleteMaterial(id);
    business.importJson(json);
    const layer = business.$document()!.layers.find((l) => l.name === 'Blade')!;
    expect(Array.from(layer.mask).slice(0, 4)).toEqual([1, 1, 0, 0]);
  });

  it('rejects a configuration of another size', () => {
    const { business } = setup();
    const json = business.exportJson();
    business.loadImage(gray(2, 2, [1, 2, 3, 4]));
    expect(() => business.importJson(json)).toThrow();
  });
});
