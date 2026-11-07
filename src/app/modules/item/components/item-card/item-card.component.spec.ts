import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { generateItem } from '../../../../core/generators/item-generator';
import { seededRandomSource } from '../../../../core/generators/random-source';
import { WordList } from '../../../../core/generators/word-list';
import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ITEM_TYPES,
} from '../../../../core/models/item';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import en from '../../../../../../public/i18n/generators/en/items.json';
import fr from '../../../../../../public/i18n/generators/fr/items.json';
import { ItemCardComponent } from './item-card.component';

describe('ItemCardComponent', () => {
  it.each([
    ['en', en],
    ['fr', fr],
  ])(
    'renders every rarity, type and slot in %s without a missing translation',
    async (lang, words) => {
      TestBed.configureTestingModule({
        imports: [ItemCardComponent],
        providers: TEST_PROVIDERS,
      });
      TestBed.inject(TranslocoService).setActiveLang(lang);
      const fixture = TestBed.createComponent(ItemCardComponent);
      const source = seededRandomSource('cards');
      const combos = ITEM_RARITIES.flatMap((rarity) => [
        ...ITEM_TYPES.filter((type) => type !== 'equipment').map((type) => ({
          rarity,
          type,
        })),
        ...EQUIPMENT_SLOTS.map((slot) => ({
          rarity,
          type: 'equipment' as const,
          slot,
        })),
      ]);

      for (const options of combos) {
        const item = generateItem(source, words as WordList, {
          attributes: ['Life', 'Strength'],
          ...options,
        });
        fixture.componentRef.setInput('item', item);
        await fixture.whenStable();
        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain(item.name);
        expect(text).not.toMatch(/item\.(rarity|type|slot|price)/);
      }
    },
  );
});
