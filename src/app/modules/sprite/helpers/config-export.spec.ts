import { exportConfig, importConfig } from './config-export';
import { addLayer, assignPixels, createDocument, setLayerLocked } from './layer-manager';

function sample() {
  let doc = addLayer(createDocument(2, 2), 'Blade');
  const id = doc.layers.find((l) => l.name === 'Blade')!.id;
  doc = assignPixels(doc, id, Uint8Array.from([1, 0, 0, 1]));
  return setLayerLocked(doc, id, true);
}

describe('config export / import', () => {
  it('exports JSON text', () => {
    const parsed = JSON.parse(exportConfig(sample()));
    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    expect(parsed.layers).toHaveLength(2);
  });

  it('round-trips names, ids, flags, gradients and masks', () => {
    const doc = sample();
    const back = importConfig(exportConfig(doc), { width: 2, height: 2 });
    expect(back.baseId).toBe(doc.baseId);
    expect(back.layers.map((l) => l.id)).toEqual(doc.layers.map((l) => l.id));
    expect(back.layers.map((l) => l.name)).toEqual(doc.layers.map((l) => l.name));
    expect(back.layers.map((l) => l.locked)).toEqual(doc.layers.map((l) => l.locked));
    expect(back.layers.map((l) => l.gradient)).toEqual(doc.layers.map((l) => l.gradient));
    expect(back.layers.map((l) => Array.from(l.mask))).toEqual(doc.layers.map((l) => Array.from(l.mask)));
  });

  it('refuses a configuration for another size', () => {
    expect(() => importConfig(exportConfig(sample()), { width: 3, height: 2 })).toThrow();
  });

  it('refuses text that is not a configuration', () => {
    expect(() => importConfig('nope', { width: 2, height: 2 })).toThrow();
    expect(() => importConfig('{"a":1}', { width: 2, height: 2 })).toThrow();
  });
});
