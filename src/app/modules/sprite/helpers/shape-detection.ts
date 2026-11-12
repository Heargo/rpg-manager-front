import { SpriteImage } from '../models/sprite';
import { luminance } from './luminance';

export interface DetectedShape {
  mask: Uint8Array;
  size: number;
}

export interface DetectOptions {
  /** Largest luminance step between two adjacent pixels of the same region. */
  tolerance: number;
  /** Regions with fewer pixels are merged into the neighbour they share the most border with. */
  minSize: number;
}

/**
 * Splits the opaque pixels into connected regions of similar luminance (transparent pixels are never included),
 * merges the tiny ones into a neighbour, and returns them biggest first.
 */
export function detectShapes(
  image: SpriteImage,
  { tolerance, minSize }: DetectOptions,
): DetectedShape[] {
  const { width, height, data } = image;
  const total = width * height;
  const luma = new Float32Array(total);
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    luma[p] =
      data[i + 3] === 0 ? -1 : luminance(data[i], data[i + 1], data[i + 2]);
  }

  const labels = new Int32Array(total).fill(-1);
  const regions: (number[] | null)[] = [];
  const neighbours = (p: number, visit: (n: number) => void) => {
    const x = p % width;
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < total - width) visit(p + width);
  };

  for (let start = 0; start < total; start++) {
    if (luma[start] < 0 || labels[start] >= 0) continue;
    const label = regions.length;
    const pixels: number[] = [start];
    labels[start] = label;
    for (let k = 0; k < pixels.length; k++) {
      // Compared with the neighbour it grows from, not the seed: smooth shading stays one region.
      const from = luma[pixels[k]];
      neighbours(pixels[k], (n) => {
        if (
          labels[n] >= 0 ||
          luma[n] < 0 ||
          Math.abs(luma[n] - from) > tolerance
        )
          return;
        labels[n] = label;
        pixels.push(n);
      });
    }
    regions.push(pixels);
  }

  const small = regions
    .map((pixels, label) => ({ label, size: pixels!.length }))
    .filter((r) => r.size < minSize)
    .sort((a, b) => a.size - b.size || a.label - b.label);
  for (const { label } of small) {
    const pixels = regions[label];
    if (!pixels || pixels.length >= minSize) continue;
    const border = new Map<number, number>();
    for (const p of pixels) {
      neighbours(p, (n) => {
        const other = labels[n];
        if (other >= 0 && other !== label)
          border.set(other, (border.get(other) ?? 0) + 1);
      });
    }
    let target = -1;
    let shared = 0;
    for (const [other, count] of border) {
      if (count > shared || (count === shared && other < target)) {
        target = other;
        shared = count;
      }
    }
    if (target < 0) continue;
    const into = regions[target]!;
    for (const p of pixels) {
      labels[p] = target;
      into.push(p);
    }
    regions[label] = null;
  }

  // Then neighbours that look alike (mean luminance within the tolerance) are one part, closest pair first.
  const mean = (pixels: number[]) =>
    pixels.reduce((sum, p) => sum + luma[p], 0) / pixels.length;
  for (;;) {
    const means = regions.map((pixels) => (pixels ? mean(pixels) : 0));
    let best: [number, number] | null = null;
    let closest = tolerance;
    for (let p = 0; p < total; p++) {
      if (labels[p] < 0) continue;
      neighbours(p, (n) => {
        const a = labels[p];
        const b = labels[n];
        if (b < 0 || a === b) return;
        const gap = Math.abs(means[a] - means[b]);
        if (gap <= closest && (!best || gap < closest)) {
          closest = gap;
          best = [a, b];
        }
      });
    }
    if (!best) break;
    const [keep, drop] = best as [number, number];
    for (const p of regions[drop]!) {
      labels[p] = keep;
      regions[keep]!.push(p);
    }
    regions[drop] = null;
  }

  return regions
    .flatMap((pixels, label) => (pixels ? [{ pixels, label }] : []))
    .sort((a, b) => b.pixels.length - a.pixels.length || a.label - b.label)
    .map(({ pixels }) => {
      const mask = new Uint8Array(total);
      for (const p of pixels) mask[p] = 1;
      return { mask, size: pixels.length };
    });
}

/** A region must cover at least 1 % of the opaque area (and 4 px) to stand on its own. */
export function defaultMinSize(image: SpriteImage): number {
  let opaque = 0;
  for (let i = 3; i < image.data.length; i += 4)
    if (image.data[i] > 0) opaque++;
  return Math.max(4, Math.ceil(opaque * 0.01));
}
