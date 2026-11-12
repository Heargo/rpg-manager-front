export interface Point {
  x: number;
  y: number;
}

/** Even-odd fill of a closed polygon: a pixel is in when its centre is. Fewer than three vertices select nothing. */
export function rasterizePolygon(
  width: number,
  height: number,
  points: Point[],
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (points.length < 3) return mask;
  for (let y = 0; y < height; y++) {
    const cy = y + 0.5;
    const crossings: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (a.y > cy === b.y > cy) continue;
      crossings.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    crossings.sort((p, q) => p - q);
    for (let c = 0; c + 1 < crossings.length; c += 2) {
      const from = Math.max(0, Math.ceil(crossings[c] - 0.5));
      const to = Math.min(width - 1, Math.ceil(crossings[c + 1] - 0.5) - 1);
      for (let x = from; x <= to; x++) mask[y * width + x] = 1;
    }
  }
  return mask;
}
