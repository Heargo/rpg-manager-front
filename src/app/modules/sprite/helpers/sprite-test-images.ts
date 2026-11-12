import type { SpriteImage } from '../models/sprite';

/** Test fixture: a grayscale RGBA image from row-major gray values (and optional alphas). */
export function gray(
  width: number,
  height: number,
  values: number[],
  alphas: number[] = values.map(() => 255),
): SpriteImage {
  const data = new Uint8ClampedArray(width * height * 4);
  values.forEach((v, i) => {
    data.set([v, v, v, alphas[i]], i * 4);
  });
  return { width, height, data };
}
