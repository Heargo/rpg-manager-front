import { pick, shuffle } from '../../../core/generators/random';
import { RandomSource } from '../../../core/generators/random-source';
import { ItemVocabulary } from '../../../core/generators/item-vocabulary';
import { ItemSlot, ItemType } from '../../../core/models/item';
import { GradientStop, SpriteDocument } from '../models/sprite';
import { PRESETS } from './presets';

/** A sprite set that can illustrate an item: a pack sprite or a tagged set saved on the device. */
export interface SpriteCandidate {
  key: string;
  /** The item kinds it illustrates. */
  kinds: string[];
  type: ItemType;
  slot: ItemSlot;
  /** Wins over the others of the same kind: a sprite set of the user, a sprite of a pack other than the Base. */
  own?: boolean;
}

export interface ItemLook {
  name: string;
  type: ItemType;
  slot: ItemSlot;
  kind?: string;
  /** Tint ids, in order. */
  tints?: string[];
}

/**
 * The sprite for an item, drawn among the best matches: a sprite of the item's kind (found from its name when it has
 * none), else of the nearest parent kind; then one of the same type and slot, else of the same type, else any.
 * Undefined when there is no candidate.
 */
export function pickSprite(
  candidates: readonly SpriteCandidate[],
  item: ItemLook,
  vocabulary: ItemVocabulary,
  random: RandomSource,
): SpriteCandidate | undefined {
  const chainOf = (kind?: string) =>
    (kind && vocabulary.kind(kind)?.chain) || [];
  // A kind the vocabulary doesn't know (a tagged set of another pack) still matches itself, then the name's kind.
  const chain = chainOf(item.kind).length
    ? chainOf(item.kind)
    : [
        ...(item.kind ? [item.kind] : []),
        ...chainOf(vocabulary.kindForName(item.name)),
      ];
  const tiers = [
    ...chain.map((level) => {
      const found = candidates.filter((c) => c.kinds.includes(level));
      const own = found.filter((c) => c.own);
      return own.length ? own : found;
    }),
    candidates.filter((c) => c.type === item.type && c.slot === item.slot),
    candidates.filter((c) => c.type === item.type),
    candidates,
  ];
  const best = tiers.find((tier) => tier.length);
  return best ? pick(random, best) : undefined;
}

export interface MaterialTints {
  /** The item's tints in order, each with its gradient variants. */
  tints: GradientStop[][][];
  /** Every pooled tint, for the parts the item gives none; the built-in presets when empty. */
  pool: GradientStop[][][];
}

/**
 * Every material but the base gets a gradient: the item's tints in order, then pooled tints (the built-in presets
 * when no pack gives any), all different while there are enough of them.
 */
export function randomMaterials(
  doc: SpriteDocument,
  random: RandomSource,
  { tints, pool }: MaterialTints,
): SpriteDocument {
  const source = pool.length ? pool : PRESETS.map((p) => [p.stops]);
  const taken = new Set(tints.flatMap((t) => t.map((g) => JSON.stringify(g))));
  let deck: GradientStop[][][] = [];
  let given = 0;
  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      if (layer.id === doc.baseId) return layer;
      let variants = tints[given++];
      if (!variants?.length) {
        if (!deck.length) {
          const fresh = shuffle(random, source);
          const free = fresh.filter(
            (t) => !t.some((g) => taken.has(JSON.stringify(g))),
          );
          deck = free.length ? free : fresh;
        }
        variants = deck.pop()!;
      }
      const stops = pick(random, variants);
      return { ...layer, gradient: { stops: stops.map((s) => ({ ...s })) } };
    }),
  };
}
