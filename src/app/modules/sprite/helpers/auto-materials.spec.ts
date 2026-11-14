import { autoMaterials } from './auto-materials';
import { PRESETS } from './presets';
import { gray } from './sprite-test-images';

/** 20 x 1: 8 dark, 6 mid, 4 light pixels, then 2 transparent ones. */
const strip = () =>
  gray(
    20,
    1,
    [...Array(8).fill(10), ...Array(6).fill(120), ...Array(4).fill(230), 0, 0],
    [...Array(18).fill(255), 0, 0],
  );

const bits = (mask: Uint8Array) => Array.from(mask).join('');

describe('autoMaterials', () => {
  it('makes one material per detected region, biggest first, after the base', () => {
    const doc = autoMaterials(strip());
    expect(doc.layers.map((l) => l.name)).toEqual(['Base', 'Part 1', 'Part 2', 'Part 3']);
    expect(bits(doc.layers[1].mask)).toBe('11111111000000000000');
    expect(bits(doc.layers[2].mask)).toBe('00000000111111000000');
    expect(bits(doc.layers[3].mask)).toBe('00000000000000111100');
  });

  it('leaves the pixels nobody claimed to the base, so every pixel has one material', () => {
    const doc = autoMaterials(strip(), 2);
    expect(doc.layers).toHaveLength(3);
    expect(bits(doc.layers[0].mask)).toBe('00000000000000111111');
    for (let p = 0; p < 20; p++)
      expect(doc.layers.reduce((n, l) => n + l.mask[p], 0)).toBe(1);
  });

  it('gives each part a different preset gradient', () => {
    const doc = autoMaterials(strip());
    const stops = doc.layers.slice(1).map((l) => JSON.stringify(l.gradient.stops));
    expect(new Set(stops).size).toBe(3);
    for (const s of stops)
      expect(PRESETS.some((p) => JSON.stringify(p.stops) === s)).toBe(true);
  });

  it('keeps ids stable and the next id after the parts', () => {
    const doc = autoMaterials(strip());
    expect(doc.layers.map((l) => l.id)).toEqual(['m0', 'm1', 'm2', 'm3']);
    expect(doc.nextLayerId).toBe(4);
    expect(doc.baseId).toBe('m0');
  });
});
