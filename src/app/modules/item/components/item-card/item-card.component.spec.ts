import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { generateItem } from '../../../../core/generators/item-generator';
import { seededRandomSource } from '../../../../core/generators/random-source';
import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ITEM_TYPES,
} from '../../../../core/models/item';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { baseItemVocabulary } from '../../../../../testing/base-vocabulary';
import { ItemCardComponent } from './item-card.component';

describe('ItemCardComponent', () => {
  it.each([
    ['en', baseItemVocabulary('en')],
    ['fr', baseItemVocabulary('fr')],
  ])(
    'renders every rarity, type and slot in %s without a missing translation',
    async (lang, words) => {
      TestBed.configureTestingModule({
        imports: [ItemCardComponent],
        providers: TEST_PROVIDERS,
      });
      TestBed.inject(TranslateService).use(lang);
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
        const item = generateItem(source, words, {
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

  it('shows the slot silhouette with its label for equipment', async () => {
    TestBed.configureTestingModule({
      imports: [ItemCardComponent],
      providers: TEST_PROVIDERS,
    });
    TestBed.inject(TranslateService).use('en');
    const fixture = TestBed.createComponent(ItemCardComponent);
    const item = generateItem(seededRandomSource('slot'), baseItemVocabulary('en'), {
      attributes: ['Life'],
      type: 'equipment',
      slot: 'ring',
    });
    fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
    const icon = fixture.nativeElement.querySelector(
      '[data-slot-silhouette="ring"]',
    );
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-label')).toBe('Ring');
  });

  it('shows no silhouette for a consumable', async () => {
    TestBed.configureTestingModule({
      imports: [ItemCardComponent],
      providers: TEST_PROVIDERS,
    });
    TestBed.inject(TranslateService).use('en');
    const fixture = TestBed.createComponent(ItemCardComponent);
    const item = generateItem(seededRandomSource('slot'), baseItemVocabulary('en'), {
      attributes: ['Life'],
      type: 'consumable',
    });
    fixture.componentRef.setInput('item', item);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-slot-silhouette]'),
    ).toBeNull();
  });
});
