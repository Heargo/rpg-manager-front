import { SpriteImage } from '../models/sprite';
import { luminance } from './luminance';
import { Point } from './polygon';

/** Sobel gradient magnitude of the luminance, one value per pixel (borders repeat the edge pixels). */
export function sobelMagnitude(image: SpriteImage): Float32Array {
  const { width, height, data } = image;
  const luma = new Float32Array(width * height);
  for (let p = 0; p < luma.length; p++) {
    const i = p * 4;
    luma[p] = luminance(data[i], data[i + 1], data[i + 2]);
  }
  const at = (x: number, y: number) =>
    luma[
      Math.min(height - 1, Math.max(0, y)) * width +
        Math.min(width - 1, Math.max(0, x))
    ];
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const gy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      out[y * width + x] = Math.hypot(gx, gy);
    }
  }
  return out;
}

/** The strongest edge pixel within `radius` (the nearest one on a tie), or the point itself when there is none. */
export function snapToEdge(
  image: SpriteImage,
  x: number,
  y: number,
  radius: number,
): Point {
  if (radius <= 0) return { x, y };
  const { width, height } = image;
  const magnitude = sobelMagnitude(image);
  let best: Point = { x, y };
  let strongest = 0;
  let nearest = Infinity;
  const reach = Math.floor(radius);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const px = x + dx;
      const py = y + dy;
      const distance = dx * dx + dy * dy;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      if (distance > radius * radius) continue;
      const m = magnitude[py * width + px];
      if (m > strongest || (m === strongest && m > 0 && distance < nearest)) {
        strongest = m;
        nearest = distance;
        best = { x: px, y: py };
      }
    }
  }
  return best;
}
