import { SelectionMode } from '../models/sprite';

/** Radius of the disc a brush paints, from pixel centre to pixel centre: hardness 0..1 shrinks it to half the size. */
export function brushRadius(size: number, hardness: number): number {
  return (
    (Math.max(1, size) / 2) * (0.5 + 0.5 * Math.min(1, Math.max(0, hardness)))
  );
}

/** The pixels a brush covers around its centre, one run per row: `dx` from `from` to `to` inclusive. */
export function brushRows(
  size: number,
  hardness: number,
): { dy: number; from: number; to: number }[] {
  const radius = brushRadius(size, hardness);
  const reach = Math.ceil(radius);
  const limit = radius * radius;
  const rows: { dy: number; from: number; to: number }[] = [];
  for (let dy = -reach; dy <= reach; dy++) {
    // The centre pixel is always painted, even when the disc is smaller than a pixel.
    if (dy * dy > limit && dy !== 0) continue;
    const half = Math.floor(Math.sqrt(limit - dy * dy));
    rows.push({ dy, from: -half, to: half });
  }
  return rows;
}

/** Stamps a round brush into `mask` (in place). Size is the diameter in pixels; hardness 0..1 shrinks the disc. */
export function stampBrushInPlace(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  hardness: number,
): void {
  for (const { dy, from, to } of brushRows(size, hardness)) {
    const y = cy + dy;
    if (y < 0 || y >= height) continue;
    for (let x = Math.max(0, cx + from); x <= Math.min(width - 1, cx + to); x++)
      mask[y * width + x] = 1;
  }
}

export function stampBrush(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  hardness: number,
): Uint8Array {
  const out = new Uint8Array(mask);
  stampBrushInPlace(out, width, height, cx, cy, size, hardness);
  return out;
}

/** Stamps along the segment so a fast pointer leaves no gaps. */
export function stampLineInPlace(
  mask: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  hardness: number,
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampBrushInPlace(
      mask,
      width,
      height,
      Math.round(x0 + (x1 - x0) * t),
      Math.round(y0 + (y1 - y0) * t),
      size,
      hardness,
    );
  }
}

export function combineSelection(
  current: Uint8Array,
  incoming: Uint8Array,
  mode: SelectionMode,
): Uint8Array {
  const out = new Uint8Array(current.length);
  for (let i = 0; i < out.length; i++) {
    out[i] =
      mode === 'replace'
        ? incoming[i]
        : mode === 'add'
          ? current[i] | incoming[i]
          : current[i] & (incoming[i] ? 0 : 1);
  }
  return out;
}

export function invertMask(mask: Uint8Array): Uint8Array {
  return mask.map((v) => (v ? 0 : 1));
}
