import { generateItem } from '../../../core/generators/item-generator';
import { RandomSource } from '../../../core/generators/random-source';
import { WordList } from '../../../core/generators/word-list';
import { EQUIPMENT_SLOTS, ItemDraft, ItemRarity, ItemType } from '../../../core/models/item';

export interface StarterItemOptions {
  /** The world's attribute names. */
  attributes: readonly string[];
  /** Attribute names shown as bars (life, mana): potions restore those. */
  barAttributes: readonly string[];
}

/**
 * The "default items" a new world can start with, drawn from the world's own attributes so every modifier
 * applies (a fixed list would name attributes the world doesn't have). Same source state → same items.
 * One common piece per equipment slot, a few better ones, potions for the bar attributes, and misc items.
 */
export function generateStarterItems(source: RandomSource, words: WordList, options: StarterItemOptions): ItemDraft[] {
  const draw = (type: ItemType, rarity: ItemRarity, attributes = options.attributes, slot?: (typeof EQUIPMENT_SLOTS)[number]) =>
    generateItem(source, words, { attributes, rarity, type, slot });

  const potionAttributes = options.barAttributes.length ? options.barAttributes : options.attributes;
  return [
    ...EQUIPMENT_SLOTS.map((slot) => draw('equipment', 'common', options.attributes, slot)),
    draw('equipment', 'uncommon', options.attributes, 'weapon1'),
    draw('equipment', 'uncommon', options.attributes, 'chest'),
    draw('equipment', 'rare', options.attributes, 'ring'),
    ...potionAttributes.flatMap((attribute) => [draw('consumable', 'common', [attribute]), draw('consumable', 'uncommon', [attribute])]),
    draw('item', 'common'),
    draw('item', 'common'),
    draw('item', 'uncommon'),
  ];
}
