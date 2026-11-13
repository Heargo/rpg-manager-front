import { brushCursor } from './brush-cursor';
import { stampBrush } from './mask-ops';

describe('brushCursor', () => {
  it('centres the circle on the pixel under the pointer', () => {
    const cursor = brushCursor('brush', { size: 8, hardness: 1 }, { x: 10, y: 4 });
    expect(cursor).toMatchObject({ cx: 10.5, cy: 4.5 });
  });

  it('matches the painted disc of a hard brush, with no outer circle', () => {
    const cursor = brushCursor('brush', { size: 8, hardness: 1 }, { x: 0, y: 0 });
    expect(cursor?.radius).toBe(4.5);
    expect(cursor?.outer).toBeUndefined();
  });

  it('shows the painted disc and the full size for a soft brush', () => {
    const cursor = brushCursor('eraser', { size: 8, hardness: 0 }, { x: 0, y: 0 });
    expect(cursor?.radius).toBe(2.5);
    expect(cursor?.outer).toBe(4.5);
  });

  it('covers every pixel the stamp paints', () => {
    const size = 7;
    const mask = stampBrush(new Uint8Array(400), 20, 20, 10, 10, size, 0.6);
    const cursor = brushCursor('brush', { size, hardness: 0.6 }, { x: 10, y: 10 })!;
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const dx = (p % 20) + 0.5 - cursor.cx;
      const dy = Math.floor(p / 20) + 0.5 - cursor.cy;
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(cursor.radius);
    }
  });

  it('is hidden for the other tools and without a pointer', () => {
    const brush = { size: 8, hardness: 1 };
    for (const tool of ['bucket', 'wand', 'polygon'] as const)
      expect(brushCursor(tool, brush, { x: 1, y: 1 })).toBeNull();
    expect(brushCursor('brush', brush, null)).toBeNull();
  });
});
