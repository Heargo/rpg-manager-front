/** An RGBA image: `ImageData`-like, so helpers run without a canvas. */
export interface SpriteImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface GradientStop {
  /** 0 (shadows) to 1 (highlights). */
  position: number;
  /** `#rrggbb`. */
  color: string;
}

export interface MaterialLayer {
  /** Stable: never reused, so reordering and deleting do not corrupt anything. */
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  /** One byte per pixel, 1 when the pixel belongs to this material. */
  mask: Uint8Array;
  gradient: { stops: GradientStop[] };
}

export interface SpriteDocument {
  width: number;
  height: number;
  /** The material that owns every pixel nobody else claimed. It cannot be deleted. */
  baseId: string;
  /** Counter behind the next layer id. */
  nextLayerId: number;
  layers: MaterialLayer[];
}

export interface SpritePreset {
  id: string;
  name: string;
  stops: GradientStop[];
}

export type SpriteTool = 'brush' | 'eraser' | 'bucket' | 'wand';
export type SelectionMode = 'replace' | 'add' | 'remove';
export type WandMode = 'contiguous' | 'global';
