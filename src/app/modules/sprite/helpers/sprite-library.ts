import { ItemSlot, ItemType } from '../../../core/models/item';

/** A grayscale sprite bundled with the app (public/assets/sprites), tagged like an item so generators can match it. */
export interface LibrarySprite {
  id: string;
  en: string;
  fr: string;
  type: ItemType;
  slot: ItemSlot;
}

/** Fantasy items pack by Florian Sciberras, CC BY 4.0 (credited on the Credits page). */
export const SPRITE_LIBRARY: readonly LibrarySprite[] = [
  { id: 'amulet_1', en: 'Amulet', fr: 'Amulette', type: 'equipment', slot: 'necklace' },
  { id: 'amulet_2', en: 'Amulet 2', fr: 'Amulette 2', type: 'equipment', slot: 'necklace' },
  { id: 'amulet_3', en: 'Amulet 3', fr: 'Amulette 3', type: 'equipment', slot: 'necklace' },
  { id: 'apple', en: 'Apple', fr: 'Pomme', type: 'consumable', slot: 'none' },
  { id: 'armor_1', en: 'Armour', fr: 'Armure', type: 'equipment', slot: 'chest' },
  { id: 'armor_2', en: 'Armour 2', fr: 'Armure 2', type: 'equipment', slot: 'chest' },
  { id: 'armor_3', en: 'Armour 3', fr: 'Armure 3', type: 'equipment', slot: 'chest' },
  { id: 'arrows', en: 'Arrows', fr: 'Flèches', type: 'item', slot: 'none' },
  { id: 'axe', en: 'Axe', fr: 'Hache', type: 'equipment', slot: 'weapon1' },
  { id: 'beer', en: 'Beer', fr: 'Bière', type: 'consumable', slot: 'none' },
  { id: 'belt', en: 'Belt', fr: 'Ceinture', type: 'equipment', slot: 'legs' },
  { id: 'berries', en: 'Berries', fr: 'Baies', type: 'consumable', slot: 'none' },
  { id: 'billhook', en: 'Billhook', fr: 'Serpe', type: 'equipment', slot: 'weapon1' },
  { id: 'bomb', en: 'Bomb', fr: 'Bombe', type: 'consumable', slot: 'none' },
  { id: 'bone', en: 'Bone', fr: 'Os', type: 'item', slot: 'none' },
  { id: 'book_1', en: 'Book', fr: 'Livre', type: 'item', slot: 'none' },
  { id: 'book_2', en: 'Book 2', fr: 'Livre 2', type: 'item', slot: 'none' },
  { id: 'book_3', en: 'Book 3', fr: 'Livre 3', type: 'item', slot: 'none' },
  { id: 'boots', en: 'Boots', fr: 'Bottes', type: 'equipment', slot: 'foot' },
  { id: 'bow_long', en: 'Longbow', fr: 'Arc long', type: 'equipment', slot: 'weapon1' },
  { id: 'bow_short', en: 'Short bow', fr: 'Arc court', type: 'equipment', slot: 'weapon1' },
  { id: 'bread', en: 'Bread', fr: 'Pain', type: 'consumable', slot: 'none' },
  { id: 'caltrop', en: 'Caltrop', fr: 'Chausse-trape', type: 'item', slot: 'none' },
  { id: 'cape', en: 'Cape', fr: 'Cape', type: 'equipment', slot: 'chest' },
  { id: 'carrot', en: 'Carrot', fr: 'Carotte', type: 'consumable', slot: 'none' },
  { id: 'cheese', en: 'Cheese', fr: 'Fromage', type: 'consumable', slot: 'none' },
  { id: 'chicken', en: 'Chicken leg', fr: 'Cuisse de poulet', type: 'consumable', slot: 'none' },
  { id: 'coin', en: 'Coin', fr: 'Pièce', type: 'item', slot: 'none' },
  { id: 'compass', en: 'Compass', fr: 'Boussole', type: 'item', slot: 'none' },
  { id: 'crown', en: 'Crown', fr: 'Couronne', type: 'equipment', slot: 'head' },
  { id: 'dagger', en: 'Dagger', fr: 'Dague', type: 'equipment', slot: 'weapon1' },
  { id: 'drum', en: 'Drum', fr: 'Tambour', type: 'item', slot: 'none' },
  { id: 'earring', en: 'Earring', fr: 'Boucle d’oreille', type: 'equipment', slot: 'earring' },
  { id: 'egg', en: 'Egg', fr: 'Œuf', type: 'consumable', slot: 'none' },
  { id: 'eyepatch', en: 'Eyepatch', fr: 'Cache-œil', type: 'equipment', slot: 'head' },
  { id: 'falchion', en: 'Falchion', fr: 'Fauchon', type: 'equipment', slot: 'weapon1' },
  { id: 'feather', en: 'Feather', fr: 'Plume', type: 'item', slot: 'none' },
  { id: 'fish', en: 'Fish', fr: 'Poisson', type: 'consumable', slot: 'none' },
  { id: 'fishing_rod', en: 'Fishing rod', fr: 'Canne à pêche', type: 'item', slot: 'none' },
  { id: 'flail', en: 'Flail', fr: 'Fléau', type: 'equipment', slot: 'weapon1' },
  { id: 'flower', en: 'Flower', fr: 'Fleur', type: 'item', slot: 'none' },
  { id: 'flute', en: 'Flute', fr: 'Flûte', type: 'item', slot: 'none' },
  { id: 'gem_1', en: 'Gem', fr: 'Gemme', type: 'item', slot: 'none' },
  { id: 'gem_2', en: 'Gem 2', fr: 'Gemme 2', type: 'item', slot: 'none' },
  { id: 'gem_3', en: 'Gem 3', fr: 'Gemme 3', type: 'item', slot: 'none' },
  { id: 'glasses', en: 'Glasses', fr: 'Lunettes', type: 'equipment', slot: 'head' },
  { id: 'glove_1', en: 'Glove', fr: 'Gant', type: 'equipment', slot: 'hand' },
  { id: 'glove_2', en: 'Glove 2', fr: 'Gant 2', type: 'equipment', slot: 'hand' },
  { id: 'glove_3', en: 'Glove 3', fr: 'Gant 3', type: 'equipment', slot: 'hand' },
  { id: 'gourd', en: 'Gourd', fr: 'Gourde', type: 'consumable', slot: 'none' },
  { id: 'hammer', en: 'Hammer', fr: 'Marteau', type: 'equipment', slot: 'weapon1' },
  { id: 'helm', en: 'Helm', fr: 'Heaume', type: 'equipment', slot: 'head' },
  { id: 'honey', en: 'Honey', fr: 'Miel', type: 'consumable', slot: 'none' },
  { id: 'horn', en: 'Horn', fr: 'Cor', type: 'item', slot: 'none' },
  { id: 'jar_1', en: 'Jar', fr: 'Bocal', type: 'item', slot: 'none' },
  { id: 'jar_2', en: 'Jar 2', fr: 'Bocal 2', type: 'item', slot: 'none' },
  { id: 'jar_3', en: 'Jar 3', fr: 'Bocal 3', type: 'item', slot: 'none' },
  { id: 'key_1', en: 'Key', fr: 'Clé', type: 'item', slot: 'none' },
  { id: 'key_2', en: 'Key 2', fr: 'Clé 2', type: 'item', slot: 'none' },
  { id: 'key_3', en: 'Key 3', fr: 'Clé 3', type: 'item', slot: 'none' },
  { id: 'key_4', en: 'Key 4', fr: 'Clé 4', type: 'item', slot: 'none' },
  { id: 'letter', en: 'Letter', fr: 'Lettre', type: 'item', slot: 'none' },
  { id: 'lockpick', en: 'Lockpick', fr: 'Crochet', type: 'item', slot: 'none' },
  { id: 'luth', en: 'Lute', fr: 'Luth', type: 'item', slot: 'none' },
  { id: 'magic_hat', en: 'Magic hat', fr: 'Chapeau magique', type: 'equipment', slot: 'head' },
  { id: 'map', en: 'Map', fr: 'Carte', type: 'item', slot: 'none' },
  { id: 'ocarina', en: 'Ocarina', fr: 'Ocarina', type: 'item', slot: 'none' },
  { id: 'pick', en: 'Pickaxe', fr: 'Pioche', type: 'equipment', slot: 'weapon1' },
  { id: 'poison', en: 'Poison', fr: 'Poison', type: 'consumable', slot: 'none' },
  { id: 'potion_1', en: 'Potion', fr: 'Potion', type: 'consumable', slot: 'none' },
  { id: 'potion_2', en: 'Potion 2', fr: 'Potion 2', type: 'consumable', slot: 'none' },
  { id: 'powder', en: 'Powder', fr: 'Poudre', type: 'consumable', slot: 'none' },
  { id: 'pumpkin', en: 'Pumpkin', fr: 'Citrouille', type: 'consumable', slot: 'none' },
  { id: 'rapier', en: 'Rapier', fr: 'Rapière', type: 'equipment', slot: 'weapon1' },
  { id: 'ring_1', en: 'Ring', fr: 'Anneau', type: 'equipment', slot: 'ring' },
  { id: 'ring_2', en: 'Ring 2', fr: 'Anneau 2', type: 'equipment', slot: 'ring' },
  { id: 'ring_3', en: 'Ring 3', fr: 'Anneau 3', type: 'equipment', slot: 'ring' },
  { id: 'rock', en: 'Rock', fr: 'Pierre', type: 'item', slot: 'none' },
  { id: 'rope', en: 'Rope', fr: 'Corde', type: 'item', slot: 'none' },
  { id: 'rune_1', en: 'Rune', fr: 'Rune', type: 'item', slot: 'none' },
  { id: 'rune_2', en: 'Rune 2', fr: 'Rune 2', type: 'item', slot: 'none' },
  { id: 'rune_3', en: 'Rune 3', fr: 'Rune 3', type: 'item', slot: 'none' },
  { id: 'rune_4', en: 'Rune 4', fr: 'Rune 4', type: 'item', slot: 'none' },
  { id: 'saw', en: 'Saw', fr: 'Scie', type: 'item', slot: 'none' },
  { id: 'scroll', en: 'Scroll', fr: 'Parchemin', type: 'consumable', slot: 'none' },
  { id: 'shield_1', en: 'Shield', fr: 'Bouclier', type: 'equipment', slot: 'weapon2' },
  { id: 'shield_2', en: 'Shield 2', fr: 'Bouclier 2', type: 'equipment', slot: 'weapon2' },
  { id: 'shield_3', en: 'Shield 3', fr: 'Bouclier 3', type: 'equipment', slot: 'weapon2' },
  { id: 'shovel', en: 'Shovel', fr: 'Pelle', type: 'item', slot: 'none' },
  { id: 'skull', en: 'Skull', fr: 'Crâne', type: 'item', slot: 'none' },
  { id: 'sleepingbag', en: 'Sleeping bag', fr: 'Sac de couchage', type: 'item', slot: 'none' },
  { id: 'spear', en: 'Spear', fr: 'Lance', type: 'equipment', slot: 'weapon1' },
  { id: 'sword', en: 'Sword', fr: 'Épée', type: 'equipment', slot: 'weapon1' },
  { id: 'torch', en: 'Torch', fr: 'Torche', type: 'item', slot: 'none' },
  { id: 'trap', en: 'Trap', fr: 'Piège', type: 'item', slot: 'none' },
  { id: 'turnip', en: 'Turnip', fr: 'Navet', type: 'consumable', slot: 'none' },
  { id: 'wand_1', en: 'Wand', fr: 'Baguette', type: 'equipment', slot: 'weapon1' },
  { id: 'wand_2', en: 'Wand 2', fr: 'Baguette 2', type: 'equipment', slot: 'weapon1' },
  { id: 'wand_3', en: 'Wand 3', fr: 'Baguette 3', type: 'equipment', slot: 'weapon1' },
  { id: 'waraxe', en: 'War axe', fr: 'Hache de guerre', type: 'equipment', slot: 'weapon1' },
  { id: 'warhammer', en: 'War hammer', fr: 'Marteau de guerre', type: 'equipment', slot: 'weapon1' },
];

export const DEMO_SPRITE_ID = 'axe';

export function spriteUrl(id: string): string {
  return `assets/sprites/${id}.png`;
}

/** The ready-made materials of a bundled sprite (colorizer JSON configuration). */
export function spriteSetUrl(id: string): string {
  return `assets/sprites/${id}.json`;
}

/** The library sprites whose label (in `lang`) or id contains every word of `query`, accents and case ignored, by label. */
export function searchSprites(query: string, lang: string): LibrarySprite[] {
  const fr = lang === 'fr';
  const words = fold(query).split(/\s+/).filter(Boolean);
  return SPRITE_LIBRARY.filter((sprite) => {
    const text = fold(`${fr ? sprite.fr : sprite.en} ${sprite.id}`);
    return words.every((word) => text.includes(word));
  }).sort((a, b) =>
    (fr ? a.fr : a.en).localeCompare(fr ? b.fr : b.en, lang),
  );
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
