import { TestBed } from '@angular/core/testing';
import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ItemVocabularyBusiness } from '../../../core/business/item-vocabulary.business';
import { ItemGeneratorBusiness } from './item-generator.business';

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('ItemGeneratorBusiness on the pooled vocabulary', () => {
  let generator: ItemGeneratorBusiness;
  const vocabulary = baseItemVocabulary('fr');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => vocabulary } },
      ],
    });
    generator = TestBed.inject(ItemGeneratorBusiness);
    await settle();
  });

  it('has no pack choice any more', () => {
    expect('$pack' in generator).toBe(false);
    expect('$packOptions' in generator).toBe(false);
    expect('packFor' in generator).toBe(false);
  });

  it('generates items carrying their kind, consistent with type and slot', async () => {
    generator.setSeed('fixed-seed');
    await settle();
    const item = generator.$item()!;
    const kind = vocabulary.kind(item.kind!)!;
    expect(kind.type).toBe(item.type);
    expect(kind.slot).toBe(item.slot);
  });

  it('generateFor gives a kind and keeps the tints of a tinted rarity', async () => {
    const items = await Promise.all(
      Array.from({ length: 60 }, (_, i) => generator.generateFor(`seed-${i}`, ['Life'])),
    );
    expect(items.every((item) => !!item.kind)).toBe(true);
    expect(items.some((item) => (item.tints ?? []).length > 0)).toBe(true);
    expect(await generator.generateFor('same', ['Life'])).toEqual(await generator.generateFor('same', ['Life']));
  });
});
