import { gradientColor, mapGradient } from './gradient-mapping';
import { gray } from './sprite-test-images';

describe('gradientColor', () => {
  const stops = [
    { position: 0, color: '#000000' },
    { position: 0.5, color: '#ff0000' },
    { position: 1, color: '#ffffff' },
  ];

  it('returns the stop colour on a stop', () => {
    expect(gradientColor(stops, 0)).toEqual([0, 0, 0]);
    expect(gradientColor(stops, 0.5)).toEqual([255, 0, 0]);
    expect(gradientColor(stops, 1)).toEqual([255, 255, 255]);
  });

  it('interpolates linearly between the two surrounding stops', () => {
    expect(gradientColor(stops, 0.6)).toEqual([255, 51, 51]);
  });

  it('sorts the stops by position first', () => {
    const shuffled = [stops[2], stops[0], stops[1]];
    expect(gradientColor(shuffled, 0.6)).toEqual([255, 51, 51]);
  });

  it('clamps outside the first and last stops', () => {
    const inner = [
      { position: 0.25, color: '#0000ff' },
      { position: 0.75, color: '#ffff00' },
    ];
    expect(gradientColor(inner, 0)).toEqual([0, 0, 255]);
    expect(gradientColor(inner, 1)).toEqual([255, 255, 0]);
  });
});

describe('mapGradient', () => {
  const stops = [
    { position: 0, color: '#0000ff' },
    { position: 1, color: '#ffff00' },
  ];

  it('recolours by luminance and keeps the alpha channel', () => {
    const image = gray(2, 1, [0, 255], [200, 100]);
    const out = mapGradient(image, Uint8Array.from([1, 1]), stops);
    expect(Array.from(out.data)).toEqual([0, 0, 255, 200, 255, 255, 0, 100]);
  });

  it('leaves pixels outside the mask untouched', () => {
    const image = gray(2, 1, [0, 255], [200, 100]);
    const out = mapGradient(image, Uint8Array.from([1, 0]), stops);
    expect(Array.from(out.data)).toEqual([0, 0, 255, 200, 255, 255, 255, 100]);
  });

  it('leaves fully transparent pixels alone and does not mutate the source', () => {
    const image = gray(2, 1, [0, 0], [0, 255]);
    const before = Array.from(image.data);
    const out = mapGradient(image, Uint8Array.from([1, 1]), stops);
    expect(Array.from(out.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(image.data)).toEqual(before);
  });
});
