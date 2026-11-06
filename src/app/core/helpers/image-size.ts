/** Size that fits inside a max×max box, keeping the ratio, never upscaling. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) throw new RangeError('fitWithin needs a positive size');
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
