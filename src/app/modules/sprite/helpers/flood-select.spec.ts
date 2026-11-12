import { floodFill, magicWand } from './flood-select';
import { gray } from './sprite-test-images';

describe('floodFill (bucket region)', () => {
  const image = gray(4, 4, [
    10, 10, 200, 200,
    10, 10, 200, 200,
    10, 10, 10, 10,
    200, 200, 10, 10,
  ]);

  it('selects the connected region of similar luminance', () => {
    expect(Array.from(floodFill(image, 0, 0, 5))).toEqual([
      1, 1, 0, 0,
      1, 1, 0, 0,
      1, 1, 1, 1,
      0, 0, 1, 1,
    ]);
  });

  it('does not cross a luminance step larger than the tolerance, and crosses it above', () => {
    const steps = gray(4, 1, [10, 18, 60, 255]);
    expect(Array.from(floodFill(steps, 0, 0, 0))).toEqual([1, 0, 0, 0]);
    expect(Array.from(floodFill(steps, 0, 0, 10))).toEqual([1, 1, 0, 0]);
    expect(Array.from(floodFill(steps, 0, 0, 255))).toEqual([1, 1, 1, 1]);
  });

  it('is stopped by transparent pixels and selects nothing from a transparent seed', () => {
    const cut = gray(4, 1, [10, 10, 10, 10], [255, 255, 0, 255]);
    expect(Array.from(floodFill(cut, 0, 0, 5))).toEqual([1, 1, 0, 0]);
    expect(Array.from(floodFill(cut, 2, 0, 5))).toEqual([0, 0, 0, 0]);
  });
});

describe('magicWand', () => {
  const stripes = gray(4, 1, [10, 200, 10, 200]);

  it('contiguous mode selects only the connected pixels', () => {
    expect(Array.from(magicWand(stripes, 0, 0, 5, 'contiguous'))).toEqual([1, 0, 0, 0]);
  });

  it('global mode selects every similar pixel of the image', () => {
    expect(Array.from(magicWand(stripes, 0, 0, 5, 'global'))).toEqual([1, 0, 1, 0]);
  });

  it('global mode still skips transparent pixels', () => {
    const image = gray(4, 1, [10, 10, 10, 10], [255, 255, 0, 255]);
    expect(Array.from(magicWand(image, 0, 0, 5, 'global'))).toEqual([1, 1, 0, 1]);
  });
});
