import { SpriteImage, WandMode } from '../models/sprite';
import { luminance } from './luminance';

function lumaMap(image: SpriteImage): Float32Array {
  const out = new Float32Array(image.width * image.height);
  const d = image.data;
  for (let p = 0; p < out.length; p++) {
    const i = p * 4;
    out[p] = d[i + 3] === 0 ? -1 : luminance(d[i], d[i + 1], d[i + 2]);
  }
  return out;
}

/** Contiguous region around the seed whose luminance is within `tolerance` of the seed's. Transparent pixels stop it. */
export function floodFill(
  image: SpriteImage,
  x: number,
  y: number,
  tolerance: number,
): Uint8Array {
  const { width, height } = image;
  const out = new Uint8Array(width * height);
  if (x < 0 || y < 0 || x >= width || y >= height) return out;
  const luma = lumaMap(image);
  const seed = luma[y * width + x];
  if (seed < 0) return out;
  const stack = [y * width + x];
  out[stack[0]] = 1;
  while (stack.length) {
    const p = stack.pop()!;
    const px = p % width;
    const py = (p - px) / width;
    const visit = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const n = ny * width + nx;
      if (out[n] || luma[n] < 0 || Math.abs(luma[n] - seed) > tolerance) return;
      out[n] = 1;
      stack.push(n);
    };
    visit(px - 1, py);
    visit(px + 1, py);
    visit(px, py - 1);
    visit(px, py + 1);
  }
  return out;
}

/** Every opaque pixel of the whole image whose luminance is within `tolerance` of the seed's. */
export function globalSelect(
  image: SpriteImage,
  x: number,
  y: number,
  tolerance: number,
): Uint8Array {
  const { width, height } = image;
  const out = new Uint8Array(width * height);
  if (x < 0 || y < 0 || x >= width || y >= height) return out;
  const luma = lumaMap(image);
  const seed = luma[y * width + x];
  if (seed < 0) return out;
  for (let p = 0; p < out.length; p++)
    if (luma[p] >= 0 && Math.abs(luma[p] - seed) <= tolerance) out[p] = 1;
  return out;
}

export function magicWand(
  image: SpriteImage,
  x: number,
  y: number,
  tolerance: number,
  mode: WandMode,
): Uint8Array {
  return mode === 'global'
    ? globalSelect(image, x, y, tolerance)
    : floodFill(image, x, y, tolerance);
}
