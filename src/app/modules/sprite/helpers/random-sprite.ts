import { pick, shuffle } from '../../../core/generators/random';
import { RandomSource } from '../../../core/generators/random-source';
import { ItemSlot, ItemType } from '../../../core/models/item';
import { SpriteDocument } from '../models/sprite';
import { PRESETS } from './presets';

/** A sprite set that can illustrate an item: a bundled sprite or a tagged set saved on the device. */
export interface SpriteCandidate {
  key: string;
  /** Names to match against the item's name (a bundled sprite's label). */
  labels: string[];
  type: ItemType;
  slot: ItemSlot;
}

export interface ItemLook {
  name: string;
  type: ItemType;
  slot: ItemSlot;
}

/**
 * The sprite for an item, drawn among the best matches: a sprite named by a word of the item's name, else one of
 * the same type and slot, else of the same type, else any. Undefined when there is no candidate.
 */
export function pickSprite(
  candidates: readonly SpriteCandidate[],
  item: ItemLook,
  random: RandomSource,
): SpriteCandidate | undefined {
  const nameWords = new Set(words(item.name));
  const tiers = [
    candidates.filter((c) =>
      c.labels.some((label) => words(label).some((w) => nameWords.has(w))),
    ),
    candidates.filter((c) => c.type === item.type && c.slot === item.slot),
    candidates.filter((c) => c.type === item.type),
    candidates,
  ];
  const best = tiers.find((tier) => tier.length);
  return best ? pick(random, best) : undefined;
}

/** Every material but the base gets a built-in gradient, all different while there are enough of them. */
export function randomMaterials(
  doc: SpriteDocument,
  random: RandomSource,
): SpriteDocument {
  let deck: typeof PRESETS = [];
  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      if (layer.id === doc.baseId) return layer;
      if (!deck.length) deck = shuffle(random, PRESETS);
      const preset = deck.pop()!;
      return {
        ...layer,
        gradient: { stops: preset.stops.map((s) => ({ ...s })) },
      };
    }),
  };
}

/** Words of 3 letters or more, lower case, without accents. */
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}
