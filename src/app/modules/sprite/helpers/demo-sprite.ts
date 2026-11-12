import { SpriteImage } from '../models/sprite';

/** A grayscale battle axe on a transparent background, to try the tool without a file. */
export function demoSprite(size = 160): SpriteImage {
  const data = new Uint8ClampedArray(size * size * 4);
  const put = (x: number, y: number, v: number) => {
    const i = (y * size + x) * 4;
    data.set([v, v, v, 255], i);
  };
  const handleX = size * 0.45;
  const handleW = size * 0.08;
  const bladeCx = size * 0.62;
  const bladeCy = size * 0.3;
  const bladeRx = size * 0.28;
  const bladeRy = size * 0.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const handle =
        x >= handleX &&
        x <= handleX + handleW &&
        y >= size * 0.08 &&
        y <= size * 0.95;
      const e = ((x - bladeCx) / bladeRx) ** 2 + ((y - bladeCy) / bladeRy) ** 2;
      const blade = e <= 1 && x >= handleX + handleW;
      const wrap =
        handle && y > size * 0.6 && y < size * 0.85 && (y - size * 0.6) % 6 < 3;
      if (blade)
        put(
          x,
          y,
          Math.round(
            70 + 150 * (1 - e) * (0.6 + 0.4 * ((x + y) % 40 < 20 ? 1 : 0.7)),
          ),
        );
      else if (handle) {
        const t = (x - handleX) / handleW;
        const shade = 60 + 130 * Math.sin(Math.PI * t);
        put(x, y, Math.round(wrap ? shade * 0.55 : shade));
      }
    }
  }
  return { width: size, height: size, data };
}
