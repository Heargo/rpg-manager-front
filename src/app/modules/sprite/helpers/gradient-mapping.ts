import { GradientStop, SpriteImage } from '../models/sprite';
import { luminance } from './luminance';

export type Rgb = [number, number, number];

function parseHex(color: string): Rgb {
  const hex = color.replace('#', '');
  const value =
    parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16) || 0;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The colour of a gradient at a position (0 to 1): stops sorted, linear between them, clamped outside. */
export function gradientColor(stops: GradientStop[], position: number): Rgb {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return [0, 0, 0];
  if (position <= sorted[0].position) return parseHex(sorted[0].color);
  const last = sorted[sorted.length - 1];
  if (position >= last.position) return parseHex(last.color);
  let i = 1;
  while (sorted[i].position < position) i++;
  const from = sorted[i - 1];
  const to = sorted[i];
  const span = to.position - from.position;
  const t = span === 0 ? 0 : (position - from.position) / span;
  const a = parseHex(from.color);
  const b = parseHex(to.color);
  return [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * t)) as Rgb;
}

/** A 256 entry lookup table, so a recolour does one array read per pixel. */
export function gradientTable(stops: GradientStop[]): Uint8Array {
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) table.set(gradientColor(stops, i / 255), i * 3);
  return table;
}

/** Recolours, in place, the opaque pixels of `out` that the mask selects. `source` gives the luminance. */
export function mapGradientInto(
  out: SpriteImage,
  source: SpriteImage,
  mask: Uint8Array,
  stops: GradientStop[],
): void {
  const table = gradientTable(stops);
  const src = source.data;
  const dst = out.data;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    if (src[i + 3] === 0) continue;
    const lum = Math.round(luminance(src[i], src[i + 1], src[i + 2]));
    const t = (lum > 255 ? 255 : lum) * 3;
    dst[i] = table[t];
    dst[i + 1] = table[t + 1];
    dst[i + 2] = table[t + 2];
    dst[i + 3] = src[i + 3];
  }
}

/** A recoloured copy: masked, non transparent pixels go through the gradient by luminance, alpha is kept. */
export function mapGradient(
  image: SpriteImage,
  mask: Uint8Array,
  stops: GradientStop[],
): SpriteImage {
  const out: SpriteImage = {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
  mapGradientInto(out, image, mask, stops);
  return out;
}
