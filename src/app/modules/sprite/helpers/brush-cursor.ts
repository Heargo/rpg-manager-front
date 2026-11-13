import { SpriteTool } from '../models/sprite';
import { brushRows } from './mask-ops';

/** The brush preview drawn under the pointer, in image pixels (a pixel `x` spans `x`..`x + 1`). */
export interface BrushCursor {
  /**
   * SVG path of the outer edges of exactly the pixels the brush paints, like GIMP's brush outline.
   * Collinear edges are merged (`M x y h n` / `M x y v n`) so a dash pattern runs along them.
   */
  outline: string;
}

/** Where the brush or eraser would paint at `pixel`; null for the other tools or without a pointer. */
export function brushCursor(
  tool: SpriteTool,
  brush: { size: number; hardness: number },
  pixel: { x: number; y: number } | null,
): BrushCursor | null {
  if (!pixel || (tool !== 'brush' && tool !== 'eraser')) return null;
  const rows = brushRows(brush.size, brush.hardness);
  const byRow = new Map(rows.map((r) => [r.dy, r]));
  const painted = (dx: number, dy: number) => {
    const row = byRow.get(dy);
    return !!row && dx >= row.from && dx <= row.to;
  };
  // Unit edges keyed by the line they lie on: horizontal by y, vertical by x.
  const horizontal = new Map<number, number[]>();
  const vertical = new Map<number, number[]>();
  const add = (lines: Map<number, number[]>, line: number, at: number) =>
    lines.set(line, [...(lines.get(line) ?? []), at]);
  for (const { dy, from, to } of rows) {
    for (let dx = from; dx <= to; dx++) {
      if (!painted(dx, dy - 1)) add(horizontal, dy, dx);
      if (!painted(dx, dy + 1)) add(horizontal, dy + 1, dx);
      if (!painted(dx - 1, dy)) add(vertical, dx, dy);
      if (!painted(dx + 1, dy)) add(vertical, dx + 1, dy);
    }
  }
  let outline = '';
  for (const [y, xs] of horizontal)
    for (const [start, length] of runs(xs))
      outline += `M${pixel.x + start} ${pixel.y + y}h${length}`;
  for (const [x, ys] of vertical)
    for (const [start, length] of runs(ys))
      outline += `M${pixel.x + x} ${pixel.y + start}v${length}`;
  return { outline };
}

/** Consecutive integers grouped as `[start, length]` runs. */
function runs(values: number[]): [number, number][] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (const v of sorted) {
    const last = out.at(-1);
    if (last && last[0] + last[1] === v) last[1]++;
    else out.push([v, 1]);
  }
  return out;
}
