import {
  addLayer,
  assignPixels,
  createDocument,
  deleteLayer,
  moveLayer,
  renameLayer,
  setLayerLocked,
  setLayerVisible,
} from './layer-manager';

const named = (doc: ReturnType<typeof createDocument>, name: string) =>
  doc.layers.find((layer) => layer.name === name)!;

describe('layer manager', () => {
  it('starts with a base layer owning every pixel', () => {
    const doc = createDocument(2, 2);
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0].id).toBe(doc.baseId);
    expect(Array.from(doc.layers[0].mask)).toEqual([1, 1, 1, 1]);
    expect(doc.layers[0].visible).toBe(true);
    expect(doc.layers[0].locked).toBe(false);
  });

  it('creates an empty layer with a gradient of at least three stops', () => {
    const doc = addLayer(createDocument(2, 2), 'Blade');
    const blade = named(doc, 'Blade');
    expect(doc.layers).toHaveLength(2);
    expect(Array.from(blade.mask)).toEqual([0, 0, 0, 0]);
    expect(blade.gradient.stops.length).toBeGreaterThanOrEqual(3);
  });

  it('renames a layer and keeps its id', () => {
    const doc = addLayer(createDocument(2, 2), 'Blade');
    const id = named(doc, 'Blade').id;
    const renamed = renameLayer(doc, id, 'Handle');
    expect(renamed.layers.find((l) => l.id === id)!.name).toBe('Handle');
  });

  it('toggles visibility and lock', () => {
    const doc = addLayer(createDocument(2, 2), 'Blade');
    const id = named(doc, 'Blade').id;
    const hidden = setLayerVisible(doc, id, false);
    const locked = setLayerLocked(hidden, id, true);
    const layer = locked.layers.find((l) => l.id === id)!;
    expect(layer.visible).toBe(false);
    expect(layer.locked).toBe(true);
  });

  it('moves selected pixels to a layer, taking them from the others', () => {
    const doc = addLayer(createDocument(2, 2), 'Blade');
    const id = named(doc, 'Blade').id;
    const out = assignPixels(doc, id, Uint8Array.from([1, 0, 0, 1]));
    expect(Array.from(out.layers.find((l) => l.id === id)!.mask)).toEqual([1, 0, 0, 1]);
    expect(Array.from(out.layers.find((l) => l.id === out.baseId)!.mask)).toEqual([0, 1, 1, 0]);
  });

  it('ignores assignments to a locked layer and does not steal from locked layers', () => {
    let doc = addLayer(createDocument(2, 2), 'Blade');
    doc = addLayer(doc, 'Handle');
    const blade = named(doc, 'Blade').id;
    const handle = named(doc, 'Handle').id;
    doc = assignPixels(doc, blade, Uint8Array.from([1, 0, 0, 0]));
    doc = setLayerLocked(doc, blade, true);

    const stolen = assignPixels(doc, handle, Uint8Array.from([1, 1, 0, 0]));
    expect(Array.from(stolen.layers.find((l) => l.id === blade)!.mask)).toEqual([1, 0, 0, 0]);
    expect(Array.from(stolen.layers.find((l) => l.id === handle)!.mask)).toEqual([0, 1, 0, 0]);

    const refused = assignPixels(doc, blade, Uint8Array.from([0, 1, 1, 1]));
    expect(Array.from(refused.layers.find((l) => l.id === blade)!.mask)).toEqual([1, 0, 0, 0]);
  });

  it('gives the pixels of a deleted layer back to the base layer', () => {
    let doc = addLayer(createDocument(2, 2), 'Blade');
    const id = named(doc, 'Blade').id;
    doc = assignPixels(doc, id, Uint8Array.from([1, 1, 0, 0]));
    const out = deleteLayer(doc, id);
    expect(out.layers).toHaveLength(1);
    expect(Array.from(out.layers[0].mask)).toEqual([1, 1, 1, 1]);
  });

  it('refuses to delete the base layer', () => {
    const doc = createDocument(2, 2);
    expect(deleteLayer(doc, doc.baseId).layers).toHaveLength(1);
  });

  it('reorders layers by id and renumbers their order', () => {
    let doc = addLayer(createDocument(2, 2), 'A');
    doc = addLayer(doc, 'B');
    const a = named(doc, 'A').id;
    const moved = moveLayer(doc, a, 2);
    expect(moved.layers.map((l) => l.name).slice(1)).toEqual(['B', 'A']);
    expect(moved.layers.map((l) => l.order)).toEqual([0, 1, 2]);
    expect(moved.layers[2].id).toBe(a);
  });

  it('never reuses the id of a deleted layer', () => {
    let doc = addLayer(createDocument(2, 2), 'A');
    const deleted = named(doc, 'A').id;
    doc = deleteLayer(doc, deleted);
    doc = addLayer(doc, 'B');
    const ids = doc.layers.map((l) => l.id);
    expect(ids).not.toContain(deleted);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
