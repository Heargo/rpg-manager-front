import { combineSelection, invertMask, stampBrush } from './mask-ops';

const empty = (n: number) => new Uint8Array(n);
const count = (mask: Uint8Array) => mask.reduce((sum, v) => sum + (v ? 1 : 0), 0);

describe('stampBrush', () => {
  it('paints one pixel with size 1', () => {
    const out = stampBrush(empty(25), 5, 5, 2, 2, 1, 1);
    expect(count(out)).toBe(1);
    expect(out[2 * 5 + 2]).toBe(1);
  });

  it('paints a 3x3 block with size 3 and a hard brush', () => {
    const out = stampBrush(empty(25), 5, 5, 2, 2, 3, 1);
    expect(Array.from(out)).toEqual([
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 1, 1, 1, 0,
      0, 1, 1, 1, 0,
      0, 0, 0, 0, 0,
    ]);
  });

  it('paints a disc (corners cut) with size 5 and a hard brush', () => {
    expect(count(stampBrush(empty(25), 5, 5, 2, 2, 5, 1))).toBe(21);
  });

  it('paints fewer pixels when softer, but always the centre', () => {
    const soft = stampBrush(empty(25), 5, 5, 2, 2, 5, 0);
    expect(soft[2 * 5 + 2]).toBe(1);
    expect(count(soft)).toBeLessThan(21);
  });

  it('clips at the image edge and keeps existing pixels, without mutating the input', () => {
    const base = empty(25);
    base[24] = 1;
    const out = stampBrush(base, 5, 5, 0, 0, 3, 1);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(1);
    expect(out[5]).toBe(1);
    expect(out[24]).toBe(1);
    expect(base[0]).toBe(0);
  });
});

describe('selection operations', () => {
  const a = Uint8Array.from([1, 1, 0, 0]);
  const b = Uint8Array.from([0, 1, 1, 0]);

  it('replaces, adds and removes', () => {
    expect(Array.from(combineSelection(a, b, 'replace'))).toEqual([0, 1, 1, 0]);
    expect(Array.from(combineSelection(a, b, 'add'))).toEqual([1, 1, 1, 0]);
    expect(Array.from(combineSelection(a, b, 'remove'))).toEqual([1, 0, 0, 0]);
  });

  it('inverts', () => {
    expect(Array.from(invertMask(a))).toEqual([0, 0, 1, 1]);
  });
});
