import { detectShapes } from './shape-detection';
import { gray } from './sprite-test-images';

describe('detectShapes', () => {
  it('splits opaque areas separated by transparent pixels (alpha components)', () => {
    const image = gray(5, 1, [100, 100, 100, 100, 100], [255, 255, 0, 255, 255]);
    const regions = detectShapes(image, { tolerance: 24, minSize: 1 });
    expect(regions.map((r) => Array.from(r.mask)).sort()).toEqual([
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
    ]);
  });

  it('splits touching areas of different luminance and orders by size, biggest first', () => {
    const image = gray(6, 1, [10, 10, 10, 10, 200, 200]);
    const regions = detectShapes(image, { tolerance: 24, minSize: 1 });
    expect(regions.map((r) => r.size)).toEqual([4, 2]);
    expect(Array.from(regions[0].mask)).toEqual([1, 1, 1, 1, 0, 0]);
    expect(Array.from(regions[1].mask)).toEqual([0, 0, 0, 0, 1, 1]);
  });

  it('never includes transparent pixels', () => {
    const image = gray(3, 1, [10, 10, 10], [255, 0, 255]);
    const covered = detectShapes(image, { tolerance: 24, minSize: 1 }).reduce(
      (n, r) => n + r.mask[1],
      0,
    );
    expect(covered).toBe(0);
  });

  it('merges regions smaller than minSize into their neighbour', () => {
    const image = gray(6, 1, [10, 10, 10, 10, 10, 120]);
    expect(detectShapes(image, { tolerance: 24, minSize: 1 })).toHaveLength(2);
    const merged = detectShapes(image, { tolerance: 24, minSize: 2 });
    expect(merged).toHaveLength(1);
    expect(merged[0].size).toBe(6);
    expect(Array.from(merged[0].mask)).toEqual([1, 1, 1, 1, 1, 1]);
  });
});
