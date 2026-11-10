import { fitWithin, isOpaque } from './image-size';

describe('image size', () => {
  it('fits within a box without upscaling', () => {
    expect(fitWithin(1024, 512, 512)).toEqual({ width: 512, height: 256 });
    expect(fitWithin(100, 50, 512)).toEqual({ width: 100, height: 50 });
  });

  it('tells opaque pixels from transparent ones', () => {
    expect(isOpaque(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(true);
    expect(isOpaque(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]))).toBe(false);
  });
});
