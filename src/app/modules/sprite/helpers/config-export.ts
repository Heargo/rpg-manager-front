import { MaterialLayer, SpriteDocument } from '../models/sprite';

const VERSION = 1;

/** Run lengths of a 0/1 mask, starting with a run of zeros (possibly empty). */
function encodeMask(mask: Uint8Array): number[] {
  const runs: number[] = [];
  let value = 0;
  let run = 0;
  for (const v of mask) {
    const bit = v ? 1 : 0;
    if (bit === value) run++;
    else {
      runs.push(run);
      value = bit;
      run = 1;
    }
  }
  runs.push(run);
  return runs;
}

function decodeMask(runs: unknown, length: number): Uint8Array {
  if (!Array.isArray(runs) || runs.some((n) => !Number.isInteger(n) || n < 0))
    throw new Error('Invalid mask');
  const mask = new Uint8Array(length);
  let at = 0;
  let value = 0;
  for (const run of runs as number[]) {
    if (at + run > length) throw new Error('Mask does not fit the image');
    if (value) mask.fill(1, at, at + run);
    at += run;
    value ^= 1;
  }
  if (at !== length) throw new Error('Mask does not fit the image');
  return mask;
}

/** The materials (names, flags, gradients, masks) as JSON text. */
export function exportConfig(doc: SpriteDocument): string {
  return JSON.stringify({
    version: VERSION,
    width: doc.width,
    height: doc.height,
    baseId: doc.baseId,
    nextLayerId: doc.nextLayerId,
    layers: doc.layers.map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      order: l.order,
      gradient: l.gradient,
      mask: encodeMask(l.mask),
    })),
  });
}

/** Reads a configuration back; throws when it is not one or was made for another image size. */
export function importConfig(
  text: string,
  size: { width: number; height: number },
): SpriteDocument {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not a sprite configuration');
  }
  if (
    !raw ||
    raw.version !== VERSION ||
    !Array.isArray(raw.layers) ||
    raw.layers.length === 0
  ) {
    throw new Error('Not a sprite configuration');
  }
  if (raw.width !== size.width || raw.height !== size.height)
    throw new Error('Configuration for another size');
  const layers: MaterialLayer[] = raw.layers.map((l: any, order: number) => {
    if (
      typeof l?.id !== 'string' ||
      typeof l.name !== 'string' ||
      !Array.isArray(l.gradient?.stops)
    ) {
      throw new Error('Invalid material');
    }
    return {
      id: l.id,
      name: l.name,
      visible: !!l.visible,
      locked: !!l.locked,
      order,
      gradient: {
        stops: l.gradient.stops.map((s: any) => ({
          position: Number(s.position),
          color: String(s.color),
        })),
      },
      mask: decodeMask(l.mask, size.width * size.height),
    };
  });
  if (!layers.some((l) => l.id === raw.baseId))
    throw new Error('Missing base material');
  return {
    width: size.width,
    height: size.height,
    baseId: raw.baseId,
    nextLayerId: Number.isInteger(raw.nextLayerId)
      ? raw.nextLayerId
      : layers.length,
    layers,
  };
}
