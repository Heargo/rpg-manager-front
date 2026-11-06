export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'legendary'] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];

export const ITEM_TYPES = ['item', 'consumable', 'equipment'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** Equipment slots, as in the legacy app; `none` for anything that isn't equipment. */
export const EQUIPMENT_SLOTS = [
  'head',
  'earring',
  'necklace',
  'ring',
  'chest',
  'hand',
  'legs',
  'foot',
  'weapon1',
  'weapon2',
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
export type ItemSlot = EquipmentSlot | 'none';

/** A bonus (or malus) an item gives to one of the world's attributes, by attribute name. */
export interface ItemModifier {
  attribute: string;
  value: number;
}

/** An item before it's added to a world's catalogue (no id, no image yet). */
export interface ItemDraft {
  name: string;
  description: string;
  rarity: ItemRarity;
  type: ItemType;
  slot: ItemSlot;
  price: number;
  modifiers: ItemModifier[];
}
