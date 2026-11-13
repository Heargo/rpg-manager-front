import en from '../../../../public/packs/base/generators/en/items.json';
import { EQUIPMENT_SLOTS, ITEM_RARITIES, ITEM_TYPES } from '../models/item';
import { CONSUMABLE_VALUE_MULTIPLIER, generateItem, RARITY_RULES } from './item-generator';
import { seededRandomSource } from './random-source';
import { WordList } from './word-list';

const words = en as WordList;
const attributes = ['Strength', 'Agility', 'Life', 'Mana', 'Charisma'];

describe('generateItem', () => {
  it('gives the same item for the same seed', () => {
    const draw = () => generateItem(seededRandomSource('reroll-42'), words, { attributes });
    expect(draw()).toEqual(draw());
  });

  it('honours a fixed rarity, type and slot', () => {
    const item = generateItem(seededRandomSource('fixed'), words, {
      attributes,
      rarity: 'mythic',
      type: 'equipment',
      slot: 'ring',
    });
    expect(item).toMatchObject({ rarity: 'mythic', type: 'equipment', slot: 'ring' });
  });

  it('treats a slot without a type as equipment, and ignores the slot for other types', () => {
    expect(generateItem(seededRandomSource('a'), words, { attributes, slot: 'head' })).toMatchObject({
      type: 'equipment',
      slot: 'head',
    });
    expect(generateItem(seededRandomSource('a'), words, { attributes, type: 'consumable', slot: 'head' }).slot).toBe('none');
  });

  it('draws modifiers within the rarity rules, on distinct world attributes', () => {
    for (const rarity of ITEM_RARITIES) {
      for (let i = 0; i < 50; i++) {
        const item = generateItem(seededRandomSource(`${rarity}-${i}`), words, { attributes, rarity, type: 'equipment' });
        const [minCount, maxCount] = RARITY_RULES[rarity].modifierCount;
        const [minValue, maxValue] = RARITY_RULES[rarity].modifierValue;
        expect(item.modifiers.length).toBeGreaterThanOrEqual(minCount);
        expect(item.modifiers.length).toBeLessThanOrEqual(maxCount);
        expect(new Set(item.modifiers.map((m) => m.attribute)).size).toBe(item.modifiers.length);
        for (const modifier of item.modifiers) {
          expect(attributes).toContain(modifier.attribute);
          expect(modifier.value).toBeGreaterThanOrEqual(minValue);
          expect(modifier.value).toBeLessThanOrEqual(maxValue);
        }
      }
    }
  });

  it('makes consumables stronger and gives plain items no modifiers', () => {
    const potion = generateItem(seededRandomSource('p'), words, { attributes, rarity: 'common', type: 'consumable' });
    expect(potion.modifiers[0].value % CONSUMABLE_VALUE_MULTIPLIER).toBe(0);
    expect(generateItem(seededRandomSource('k'), words, { attributes, type: 'item' }).modifiers).toEqual([]);
  });

  it('has no modifiers when the world has no attributes, and never more than it has', () => {
    expect(generateItem(seededRandomSource('x'), words, { attributes: [], rarity: 'legendary', type: 'equipment' }).modifiers).toEqual([]);
    const item = generateItem(seededRandomSource('x'), words, { attributes: ['Life', 'Life'], rarity: 'legendary', type: 'equipment' });
    expect(item.modifiers).toHaveLength(1);
  });

  it('produces a complete draft for every rarity, type and slot', () => {
    let n = 0;
    for (const rarity of ITEM_RARITIES) {
      for (const type of ITEM_TYPES) {
        const slots = type === 'equipment' ? EQUIPMENT_SLOTS : [undefined];
        for (const slot of slots) {
          const item = generateItem(seededRandomSource(`all-${n++}`), words, { attributes, rarity, type, slot });
          expect(item.name.length).toBeGreaterThan(0);
          expect(item.description.length).toBeGreaterThan(0);
          expect(item.slot).toBe(slot ?? 'none');
          expect(item.price % 500).toBe(0);
          expect(item.price).toBeGreaterThanOrEqual(500);
        }
      }
    }
  });

  it('prices higher rarities higher', () => {
    const median = (rarity: (typeof ITEM_RARITIES)[number]) => {
      const prices = Array.from({ length: 41 }, (_, i) =>
        generateItem(seededRandomSource(`${rarity}${i}`), words, { attributes, rarity, type: 'equipment' }).price,
      ).sort((a, b) => a - b);
      return prices[20];
    };
    const medians = ITEM_RARITIES.map(median);
    expect([...medians].sort((a, b) => a - b)).toEqual(medians);
  });
});
