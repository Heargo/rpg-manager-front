import { sobelMagnitude, snapToEdge } from './edges';
import { gray } from './sprite-test-images';

/** 6x3, dark left half, bright right half: the step is between x=2 and x=3. */
const step6 = () => gray(6, 3, [0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255]);

describe('sobelMagnitude', () => {
  it('is zero on a flat image', () => {
    const m = sobelMagnitude(gray(3, 3, [50, 50, 50, 50, 50, 50, 50, 50, 50]));
    expect(Array.from(m).every((v) => v === 0)).toBe(true);
  });

  it('is strong on both sides of a step and zero away from it', () => {
    const m = sobelMagnitude(step6());
    const at = (x: number, y: number) => m[y * 6 + x];
    expect(at(2, 1)).toBeGreaterThan(0);
    expect(at(3, 1)).toBeCloseTo(at(2, 1), 5);
    expect(at(0, 1)).toBe(0);
    expect(at(1, 1)).toBe(0);
    expect(at(4, 1)).toBe(0);
    expect(at(5, 1)).toBe(0);
  });
});

describe('snapToEdge', () => {
  it('moves the point onto the strongest edge within the radius', () => {
    const p = snapToEdge(step6(), 1, 1, 3);
    expect(p.x).toBeGreaterThanOrEqual(2);
    expect(p.x).toBeLessThanOrEqual(3);
  });

  it('stays put when no edge is within the radius', () => {
    expect(snapToEdge(step6(), 0, 1, 1)).toEqual({ x: 0, y: 1 });
    expect(snapToEdge(step6(), 5, 1, 1)).toEqual({ x: 5, y: 1 });
  });

  it('stays put with a radius of zero and on a flat image', () => {
    expect(snapToEdge(step6(), 2, 1, 0)).toEqual({ x: 2, y: 1 });
    const flat = gray(3, 3, [9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(snapToEdge(flat, 1, 1, 2)).toEqual({ x: 1, y: 1 });
  });
});
