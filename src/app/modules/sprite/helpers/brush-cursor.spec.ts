import { brushCursor } from './brush-cursor';
import { stampBrush } from './mask-ops';

/** Unit edges of a path made of `M x y h n` / `M x y v n` segments. */
function edges(path: string): Set<string> {
  const out = new Set<string>();
  for (const [, x, y, dir, n] of path.matchAll(/M(-?\d+) (-?\d+)([hv])(\d+)/g))
    for (let i = 0; i < Number(n); i++)
      out.add(
        dir === 'h'
          ? `h${Number(x) + i},${y}`
          : `v${x},${Number(y) + i}`,
      );
  return out;
}

/** The edges between painted and unpainted pixels of a mask. */
function boundary(mask: Uint8Array, width: number): Set<string> {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < width ? mask[y * width + x] : 0;
  const out = new Set<string>();
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) out.add(`h${x},${y}`);
      if (!at(x, y + 1)) out.add(`h${x},${y + 1}`);
      if (!at(x - 1, y)) out.add(`v${x},${y}`);
      if (!at(x + 1, y)) out.add(`v${x + 1},${y}`);
    }
  return out;
}

describe('brushCursor', () => {
  it('outlines exactly the edges of the pixels the stamp paints', () => {
    for (const [size, hardness] of [
      [1, 1],
      [4, 1],
      [7, 0.6],
      [12, 0],
    ] as const) {
      const mask = stampBrush(new Uint8Array(900), 30, 30, 15, 15, size, hardness);
      const cursor = brushCursor('brush', { size, hardness }, { x: 15, y: 15 })!;
      expect(edges(cursor.outline)).toEqual(boundary(mask, 30));
    }
  });

  it('merges a straight edge into one segment', () => {
    const cursor = brushCursor('brush', { size: 1, hardness: 1 }, { x: 3, y: 5 })!;
    expect(cursor.outline.match(/M/g)).toHaveLength(4);
    expect(cursor.outline).toContain('M3 5h1');
    expect(cursor.outline).toContain('M4 5v1');
    const big = brushCursor('brush', { size: 12, hardness: 1 }, { x: 20, y: 20 })!;
    expect(big.outline).toMatch(/[hv][2-9]/);
  });

  it('is hidden for the other tools and without a pointer', () => {
    const brush = { size: 8, hardness: 1 };
    for (const tool of ['bucket', 'wand', 'polygon'] as const)
      expect(brushCursor(tool, brush, { x: 1, y: 1 })).toBeNull();
    expect(brushCursor('brush', brush, null)).toBeNull();
  });
});
