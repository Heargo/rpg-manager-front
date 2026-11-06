import {
  EQUIPMENT_SLOTS,
  EquipmentSlot,
  ItemDraft,
  ItemModifier,
  ItemRarity,
  ItemType,
} from '../models/item';
import { generateItemName } from './name-generator';
import { pick, randomInt, shuffle, Weighted, weightedPick } from './random';
import { RandomSource } from './random-source';
import { BaseKey, WordList } from './word-list';

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
export function generateItem(source: RandomSource, words: WordList, options: ItemGenerationOptions): ItemDraft {
  const rarity = options.rarity ?? weightedPick(source, RARITY_WEIGHTS);
  const type = options.type ?? (options.slot ? 'equipment' : weightedPick(source, TYPE_WEIGHTS));
  const slot = type === 'equipment' ? (options.slot ?? pick(source, EQUIPMENT_SLOTS)) : 'none';
  const modifiers = type === 'item' ? [] : drawModifiers(source, options.attributes, rarity, type);
  const base: BaseKey = slot === 'none' ? (type as 'item' | 'consumable') : slot;

  return {
    name: generateItemName(source, words, { base, rarity }),
    description: pick(source, words.descriptions[type]),
    rarity,
    type,
    slot,
    price: priceFor(source, rarity, modifiers),
    modifiers,
  };
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

/** Base price for the rarity, +10% per modifier point, ±20% jitter, rounded to 5. */
function priceFor(source: RandomSource, rarity: ItemRarity, modifiers: ItemModifier[]): number {
  const points = modifiers.reduce((sum, modifier) => sum + Math.abs(modifier.value), 0);
  const jitterPercent = randomInt(source, 80, 120);
  const raw = (RARITY_RULES[rarity].basePrice * (10 + points) * jitterPercent) / 1000;
  return Math.max(5, Math.round(raw / 5) * 5);
}
