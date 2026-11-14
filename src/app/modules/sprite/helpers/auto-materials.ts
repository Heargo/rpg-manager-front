import { SpriteDocument, SpriteImage } from '../models/sprite';
import { addLayer, assignPixels, createDocument } from './layer-manager';
import { PRESETS } from './presets';
import { defaultMinSize, detectShapes } from './shape-detection';

/** Order the parts take their gradient in: contrasting materials first. */
const PART_PRESETS = ['steel', 'wood', 'gold', 'leaf', 'arcane', 'ice', 'fire'];

/**
 * A first guess at the materials of a sprite: its biggest regions of similar luminance (at most `max`) become
 * "Part 1", "Part 2"…, each with a preset gradient; whatever is left (outlines, small details) stays in the base.
 */
export function autoMaterials(image: SpriteImage, max = 4): SpriteDocument {
  const shapes = detectShapes(image, {
    tolerance: 24,
    minSize: defaultMinSize(image),
  }).slice(0, max);
  let doc = createDocument(image.width, image.height);
  shapes.forEach((shape, i) => {
    doc = addLayer(doc, `Part ${i + 1}`);
    const id = doc.layers[doc.layers.length - 1].id;
    doc = assignPixels(doc, id, shape.mask);
    const preset = PRESETS.find(
      (p) => p.id === PART_PRESETS[i % PART_PRESETS.length],
    )!;
    doc = {
      ...doc,
      layers: doc.layers.map((l) =>
        l.id === id
          ? { ...l, gradient: { stops: preset.stops.map((s) => ({ ...s })) } }
          : l,
      ),
    };
  });
  return doc;
}
