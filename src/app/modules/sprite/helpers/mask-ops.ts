import { SelectionMode } from '../models/sprite';

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
  const radius =
    (Math.max(1, size) / 2) * (0.5 + 0.5 * Math.min(1, Math.max(0, hardness)));
  const reach = Math.ceil(radius);
  const limit = radius * radius;
  for (let dy = -reach; dy <= reach; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= height) continue;
    for (let dx = -reach; dx <= reach; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= width) continue;
      if ((dx === 0 && dy === 0) || dx * dx + dy * dy <= limit)
        mask[y * width + x] = 1;
    }
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
