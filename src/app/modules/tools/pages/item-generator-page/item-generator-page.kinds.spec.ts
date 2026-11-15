import { TestBed } from '@angular/core/testing';
import { baseItemVocabulary } from '../../../../../testing/base-vocabulary';
import { baseAndExtraPackProviders } from '../../../../../testing/base-pack-fixtures';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { ItemVocabularyBusiness } from '../../../../core/business/item-vocabulary.business';
import { ItemGeneratorPageComponent } from './item-generator-page.component';

describe('ItemGeneratorPageComponent without a pack choice', () => {
  it('shows the generated item and no Pack select', async () => {
    TestBed.configureTestingModule({
      imports: [ItemGeneratorPageComponent],
      providers: [
        ...TEST_PROVIDERS,
        baseAndExtraPackProviders(),
        { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => baseItemVocabulary('fr') } },
      ],
    });
    const fixture = TestBed.createComponent(ItemGeneratorPageComponent);
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();
    }
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('app-item-card')).not.toBeNull();
    expect(el.querySelector('[data-field="pack"]')).toBeNull();
  });
});
