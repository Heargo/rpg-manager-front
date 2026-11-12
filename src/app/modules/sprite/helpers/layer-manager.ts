import { MaterialLayer, SpriteDocument } from '../models/sprite';

/** Untouched look: the gradient maps gray to the same gray. */
export const NEUTRAL_STOPS = [
  { position: 0, color: '#000000' },
  { position: 0.5, color: '#808080' },
  { position: 1, color: '#ffffff' },
];

const renumber = (layers: MaterialLayer[]): MaterialLayer[] =>
  layers.map((l, order) => ({ ...l, order }));

const update = (
  doc: SpriteDocument,
  id: string,
  patch: Partial<MaterialLayer>,
): SpriteDocument => ({
  ...doc,
  layers: doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
});

/** A document with a base material that owns every pixel. */
export function createDocument(width: number, height: number): SpriteDocument {
  return {
    width,
    height,
    baseId: 'm0',
    nextLayerId: 1,
    layers: [
      {
        id: 'm0',
        name: 'Base',
        visible: true,
        locked: false,
        order: 0,
        mask: new Uint8Array(width * height).fill(1),
        gradient: { stops: NEUTRAL_STOPS.map((s) => ({ ...s })) },
      },
    ],
  };
}

export function addLayer(doc: SpriteDocument, name: string): SpriteDocument {
  const layer: MaterialLayer = {
    id: `m${doc.nextLayerId}`,
    name,
    visible: true,
    locked: false,
    order: doc.layers.length,
    mask: new Uint8Array(doc.width * doc.height),
    gradient: { stops: NEUTRAL_STOPS.map((s) => ({ ...s })) },
  };
  return {
    ...doc,
    nextLayerId: doc.nextLayerId + 1,
    layers: [...doc.layers, layer],
  };
}

export const renameLayer = (doc: SpriteDocument, id: string, name: string) =>
  update(doc, id, { name });
export const setLayerVisible = (
  doc: SpriteDocument,
  id: string,
  visible: boolean,
) => update(doc, id, { visible });
export const setLayerLocked = (
  doc: SpriteDocument,
  id: string,
  locked: boolean,
) => update(doc, id, { locked });

/** Gives the selected pixels to a layer, taking them from the others. Locked layers neither receive nor lose pixels. */
export function assignPixels(
  doc: SpriteDocument,
  id: string,
  selection: Uint8Array,
): SpriteDocument {
  const target = doc.layers.find((l) => l.id === id);
  if (!target || target.locked) return doc;
  const frozen = doc.layers.filter((l) => l.locked).map((l) => l.mask);
  const take = new Uint8Array(selection.length);
  for (let p = 0; p < take.length; p++) {
    if (selection[p] && !frozen.some((mask) => mask[p])) take[p] = 1;
  }
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (l.locked) return l;
      const mask = new Uint8Array(l.mask);
      for (let p = 0; p < take.length; p++)
        if (take[p]) mask[p] = l.id === id ? 1 : 0;
      return { ...l, mask };
    }),
  };
}

/** Removes a layer (never the base); its pixels go back to the base. */
export function deleteLayer(doc: SpriteDocument, id: string): SpriteDocument {
  const doomed = doc.layers.find((l) => l.id === id);
  if (!doomed || id === doc.baseId) return doc;
  const layers = doc.layers
    .filter((l) => l.id !== id)
    .map((l) => {
      if (l.id !== doc.baseId) return l;
      const mask = new Uint8Array(l.mask);
      for (let p = 0; p < mask.length; p++) if (doomed.mask[p]) mask[p] = 1;
      return { ...l, mask };
    });
  return { ...doc, layers: renumber(layers) };
}

/** Moves a layer to an index of the list. */
export function moveLayer(
  doc: SpriteDocument,
  id: string,
  index: number,
): SpriteDocument {
  const from = doc.layers.findIndex((l) => l.id === id);
  if (from < 0) return doc;
  const layers = [...doc.layers];
  const [layer] = layers.splice(from, 1);
  layers.splice(Math.min(Math.max(index, 0), layers.length), 0, layer);
  return { ...doc, layers: renumber(layers) };
}
