/** A distinct, evenly spread colour per detected shape (golden-angle hue steps), as 0..255 RGB. */
export function shapeColor(id: number): [number, number, number] {
  const hue = (id * 137.508) % 360;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    return Math.round(
      255 * (0.55 - 0.45 * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
    );
  };
  return [f(0), f(8), f(4)];
}

export const shapeCss = (id: number): string =>
  `rgb(${shapeColor(id).join(',')})`;
