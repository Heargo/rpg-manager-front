import { rasterizePolygon } from './polygon';

describe('rasterizePolygon', () => {
  it('fills the pixels whose centre is inside a square', () => {
    const mask = rasterizePolygon(4, 4, [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 0, y: 3 },
    ]);
    expect(Array.from(mask)).toEqual([
      1, 1, 1, 0,
      1, 1, 1, 0,
      1, 1, 1, 0,
      0, 0, 0, 0,
    ]);
  });

  it('fills a triangle', () => {
    const mask = rasterizePolygon(4, 4, [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 4 },
    ]);
    expect(Array.from(mask)).toEqual([
      1, 1, 1, 1,
      0, 1, 1, 0,
      0, 1, 1, 0,
      0, 0, 0, 0,
    ]);
  });

  it('clips to the image and selects nothing for fewer than three vertices', () => {
    const big = rasterizePolygon(2, 2, [
      { x: -5, y: -5 },
      { x: 10, y: -5 },
      { x: 10, y: 10 },
      { x: -5, y: 10 },
    ]);
    expect(Array.from(big)).toEqual([1, 1, 1, 1]);
    const line = rasterizePolygon(2, 2, [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
    ]);
    expect(Array.from(line)).toEqual([0, 0, 0, 0]);
  });
});
