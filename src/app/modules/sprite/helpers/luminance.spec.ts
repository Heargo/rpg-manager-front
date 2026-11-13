import { luminance } from './luminance';

describe('luminance', () => {
  it('weights the channels 0.2126 / 0.7152 / 0.0722', () => {
    expect(luminance(255, 0, 0)).toBeCloseTo(54.2, 1);
    expect(luminance(0, 255, 0)).toBeCloseTo(182.4, 1);
    expect(luminance(0, 0, 255)).toBeCloseTo(18.4, 1);
  });

  it('keeps grays unchanged', () => {
    expect(luminance(0, 0, 0)).toBeCloseTo(0, 5);
    expect(luminance(200, 200, 200)).toBeCloseTo(200, 3);
    expect(luminance(255, 255, 255)).toBeCloseTo(255, 3);
  });
});
