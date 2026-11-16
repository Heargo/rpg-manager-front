import { baseItemVocabulary } from '../../../testing/base-vocabulary';
import { EQUIPMENT_SLOTS, ITEM_RARITIES, ITEM_TYPES } from '../models/item';
import { generateItem } from './item-generator';
import { seededRandomSource } from './random-source';

describe.each(['en', 'fr'] as const)(
  'generated names and descriptions in %s',
  (lang) => {
    const vocabulary = baseItemVocabulary(lang);

    it('are clean and capitalised for every type, slot and rarity', () => {
      const source = seededRandomSource(`clean-${lang}`);
      for (const rarity of ITEM_RARITIES) {
        for (const type of ITEM_TYPES) {
          for (const slot of type === 'equipment'
            ? EQUIPMENT_SLOTS
            : [undefined]) {
            for (let i = 0; i < 10; i++) {
              const item = generateItem(source, vocabulary, {
                attributes: ['Life'],
                rarity,
                type,
                slot,
              });
              for (const text of [item.name, item.description])
                expect(text).not.toMatch(/[{}[\]]|\s{2}|^\s|\s$/);
              expect(item.name.charAt(0)).toBe(
                item.name.charAt(0).toLocaleUpperCase(),
              );
            }
          }
        }
      }
    });
  },
);
