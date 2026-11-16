import {
  EquipmentSlot,
  ItemDraft,
  ItemModifier,
  ItemRarity,
  ItemSlot,
  ItemType,
} from '../models/item';
import { ItemVocabulary } from './item-vocabulary';
import { capitalize } from './name-generator';
import { expandPhrase, pluralForm } from './phrase';
import { chance, pick, randomInt, shuffle, Weighted, weightedPick } from './random';
import { RandomSource } from './random-source';
import { Adjective, Gender } from './word-list';

export interface ItemGenerationOptions {
  /** The world's attribute names; modifiers are only drawn on these. */
  attributes: readonly string[];
  /** Fixed by the GM, otherwise drawn. */
  rarity?: ItemRarity;
  type?: ItemType;
  /** Only used for equipment; giving a slot implies equipment when no type is given. */
  slot?: EquipmentSlot;
}

interface RarityRule {
  modifierCount: [min: number, max: number];
  modifierValue: [min: number, max: number];
  basePrice: number;
}

export const RARITY_RULES: Record<ItemRarity, RarityRule> = {
  common: { modifierCount: [1, 1], modifierValue: [1, 2], basePrice: 10 },
  uncommon: { modifierCount: [1, 2], modifierValue: [2, 3], basePrice: 40 },
  rare: { modifierCount: [2, 2], modifierValue: [2, 4], basePrice: 150 },
  mythic: { modifierCount: [2, 3], modifierValue: [3, 6], basePrice: 600 },
  legendary: { modifierCount: [3, 4], modifierValue: [4, 8], basePrice: 2500 },
};

export const RARITY_WEIGHTS: Weighted<ItemRarity>[] = [
  { value: 'common', weight: 45 },
  { value: 'uncommon', weight: 28 },
  { value: 'rare', weight: 15 },
  { value: 'mythic', weight: 8 },
  { value: 'legendary', weight: 4 },
];

export const TYPE_WEIGHTS: Weighted<ItemType>[] = [
  { value: 'equipment', weight: 50 },
  { value: 'consumable', weight: 30 },
  { value: 'item', weight: 20 },
];

/** Consumables restore current values, so they're stronger than a permanent bonus. */
export const CONSUMABLE_VALUE_MULTIPLIER = 3;

/** Draws a whole item. Pure: same source state and options → same item. */
export function generateItem(
  source: RandomSource,
  vocabulary: ItemVocabulary,
  options: ItemGenerationOptions,
): ItemDraft {
  const rarity = options.rarity ?? weightedPick(source, RARITY_WEIGHTS);
  const wanted = options.type ?? (options.slot ? 'equipment' : weightedPick(source, TYPE_WEIGHTS));
  const kind = drawKind(source, vocabulary, wanted, options.slot);
  const info = vocabulary.kind(kind)!;
  const type = info.type;
  const slot = info.slot;
  const modifiers = type === 'item' ? [] : drawModifiers(source, options.attributes, rarity, type);
  const { name, description, tints } = drawTexts(source, vocabulary, kind, rarity);

  return {
    name,
    description,
    rarity,
    type,
    slot,
    price: priceFor(source, rarity, modifiers),
    modifiers,
    kind,
    tints,
  };
}

/** Type, then slot (equipment only), then a kind; a type or slot without a drawable kind falls back to a wider one. */
function drawKind(
  source: RandomSource,
  vocabulary: ItemVocabulary,
  type: ItemType,
  wantedSlot: EquipmentSlot | undefined,
): string {
  let slot: ItemSlot | undefined;
  if (type === 'equipment') {
    const slots = [...new Set(vocabulary.drawable({ type }).map((id) => vocabulary.kind(id)!.slot))];
    slot = wantedSlot ?? (slots.length > 0 ? pick(source, slots) : undefined);
  }
  const candidates = [
    vocabulary.drawable({ type, slot }),
    vocabulary.drawable({ type }),
    vocabulary.drawable(),
  ].find((list) => list.length > 0);
  if (!candidates) throw new RangeError('generateItem: the vocabulary has no drawable kind');
  return pick(source, candidates);
}

function adjectiveText(adjective: Adjective, gender: Gender, plural: boolean): string {
  if (typeof adjective === 'string') return adjective;
  const singular = adjective[gender];
  if (!plural) return singular;
  return (gender === 'f' ? adjective.fp : adjective.mp) ?? pluralForm(singular);
}

function drawTexts(
  source: RandomSource,
  vocabulary: ItemVocabulary,
  kind: string,
  rarity: ItemRarity,
): { name: string; description: string; tints: string[] } {
  const noun = pick(source, vocabulary.nouns(kind));
  const gender: Gender = noun.gender ?? 'm';
  const plural = noun.plural ?? false;
  const params = vocabulary.params;
  const adjectives = vocabulary.adjectives(rarity, kind);
  const suffixes = vocabulary.suffixes(rarity, kind);

  const kindNames = vocabulary.names(kind, rarity);
  const templates = (kindNames.length > 0 ? kindNames : vocabulary.templates(rarity)).filter(
    (template) =>
      (adjectives.length > 0 || !template.includes('{adjective}')) &&
      (suffixes.length > 0 || !template.includes('{suffix}')),
  );
  const template = templates.length > 0 ? pick(source, templates) : '{base}';

  const values: Partial<Record<'base' | 'adjective' | 'suffix', string>> = { base: noun.text };
  const tints: string[] = [];
  if (template.includes('{adjective}')) {
    const drawn = pick(source, adjectives);
    values.adjective = adjectiveText(drawn.value, gender, plural);
    if (drawn.tint) tints.push(drawn.tint);
  }
  if (template.includes('{suffix}')) {
    const drawn = pick(source, suffixes);
    const text = expandPhrase(source, drawn.value, { params, gender, plural });
    values.suffix = text ?? '';
    if (text !== undefined && drawn.tint) tints.push(drawn.tint);
  }

  const context = { params, gender, plural, values };
  const name = capitalize(expandPhrase(source, template, context) ?? noun.text);

  // The tint's own lines come first one time in two, otherwise the kind's.
  const tintLines = tints.flatMap((tint) => vocabulary.tintDescriptions(tint, kind));
  const kindLines = vocabulary.descriptions(kind);
  const fromTint = tintLines.length > 0 && (kindLines.length === 0 || chance(source, 1, 2));
  const pools = fromTint ? [tintLines, kindLines] : [kindLines];
  let description = '';
  for (const pool of pools) {
    for (const phrase of shuffle(source, pool)) {
      const text = expandPhrase(source, phrase, context);
      if (text !== undefined) {
        description = text;
        break;
      }
    }
    if (description) break;
  }
  return { name, description, tints };
}

function drawModifiers(
  source: RandomSource,
  attributes: readonly string[],
  rarity: ItemRarity,
  type: ItemType,
): ItemModifier[] {
  const unique = [...new Set(attributes)];
  if (unique.length === 0) return [];
  const rule = RARITY_RULES[rarity];
  const count = Math.min(randomInt(source, ...rule.modifierCount), unique.length);
  const multiplier = type === 'consumable' ? CONSUMABLE_VALUE_MULTIPLIER : 1;
  return shuffle(source, unique)
    .slice(0, count)
    .map((attribute) => ({ attribute, value: randomInt(source, ...rule.modifierValue) * multiplier }));
}

/** Base price for the rarity, +10% per modifier point, ±20% jitter, in copper, rounded to 5 silver. */
function priceFor(source: RandomSource, rarity: ItemRarity, modifiers: ItemModifier[]): number {
  const points = modifiers.reduce((sum, modifier) => sum + Math.abs(modifier.value), 0);
  const jitterPercent = randomInt(source, 80, 120);
  const silver = (RARITY_RULES[rarity].basePrice * (10 + points) * jitterPercent) / 1000;
  return Math.max(500, Math.round(silver / 5) * 500);
}
