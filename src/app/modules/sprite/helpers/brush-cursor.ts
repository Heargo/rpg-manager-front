import { SpriteTool } from '../models/sprite';
import { brushRadius } from './mask-ops';

/** The brush outline drawn under the pointer, in image pixels (a pixel `x` spans `x`..`x + 1`). */
export interface BrushCursor {
  cx: number;
  cy: number;
  /** Encloses every pixel the brush paints. */
  radius: number;
  /** The full brush size, only when hardness makes the painted disc smaller. */
  outer?: number;
}

/** Where the brush or eraser would paint at `pixel`; null for the other tools or without a pointer. */
export function brushCursor(
  tool: SpriteTool,
  brush: { size: number; hardness: number },
  pixel: { x: number; y: number } | null,
): BrushCursor | null {
  if (!pixel || (tool !== 'brush' && tool !== 'eraser')) return null;
  const radius = brushRadius(brush.size, brush.hardness) + 0.5;
  const full = Math.max(1, brush.size) / 2 + 0.5;
  return {
    cx: pixel.x + 0.5,
    cy: pixel.y + 0.5,
    radius,
    ...(full > radius ? { outer: full } : {}),
  };
}
