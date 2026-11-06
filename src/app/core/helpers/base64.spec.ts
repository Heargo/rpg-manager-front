import { base64ToBytes, bytesToBase64 } from './base64';
import { fitWithin } from './image-size';

describe('base64', () => {
  it('round-trips bytes, including large arrays', () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, i) => (i * 31) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('matches the standard encoding', () => {
    expect(bytesToBase64(new TextEncoder().encode('héros'))).toBe('aMOpcm9z');
  });
});

describe('fitWithin', () => {
  it('shrinks the longest side to the max, keeping the ratio', () => {
    expect(fitWithin(2048, 1024, 512)).toEqual({ width: 512, height: 256 });
    expect(fitWithin(300, 900, 512)).toEqual({ width: 171, height: 512 });
  });

  it('never upscales', () => {
    expect(fitWithin(100, 50, 512)).toEqual({ width: 100, height: 50 });
  });
});
