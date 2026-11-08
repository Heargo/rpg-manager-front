import { replayIndex } from './replay-index';

describe('replayIndex', () => {
  const STEP = 1 / 60; // seconds per frame, as in dice-scene.ts

  it('gives 0 for a negative elapsed time', () => {
    expect(replayIndex(-5, 100, false, STEP)).toBe(0);
  });

  it('gives 0 at the start', () => {
    expect(replayIndex(0, 100, false, STEP)).toBe(0);
  });

  it('advances one frame per step duration', () => {
    expect(replayIndex(1000, 100, false, STEP)).toBe(60);
  });

  it('clamps to the last frame when elapsed exceeds the animation', () => {
    expect(replayIndex(10000, 100, false, STEP)).toBe(99);
  });

  it('gives the last frame on skip', () => {
    expect(replayIndex(0, 100, true, STEP)).toBe(99);
  });

  it('gives 0 for a single frame', () => {
    expect(replayIndex(500, 1, false, STEP)).toBe(0);
    expect(replayIndex(-5, 1, false, STEP)).toBe(0);
    expect(replayIndex(0, 1, true, STEP)).toBe(0);
  });
});
