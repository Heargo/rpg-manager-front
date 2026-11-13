import { TestBed } from '@angular/core/testing';
import { PackBusiness } from '../../../core/business/pack.business';
import { provideTestTranslations } from '../../../../testing/test-providers';
import en from '../../../../../public/packs/base-en/generators/items.json';
import { ItemGeneratorBusiness } from './item-generator.business';

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('ItemGeneratorBusiness', () => {
  let generator: ItemGeneratorBusiness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        {
          provide: PackBusiness,
          useValue: { wordList: async () => en, packsFor: async () => ['base-en'], $installed: () => [] },
        },
      ],
    });
    generator = TestBed.inject(ItemGeneratorBusiness);
    await settle();
  });

  it('generates an item on the sandbox world attributes', () => {
    const item = generator.$item()!;
    expect(item.name).toBeTruthy();
    const allowed = ['Life', 'Mana', 'Strength', 'Agility', 'Intelligence'];
    expect(
      item.modifiers.every((modifier) => allowed.includes(modifier.attribute)),
    ).toBe(true);
  });

  it('gives the same item back for the same seed, and another one on reroll', async () => {
    generator.setSeed('fixed-seed');
    await settle();
    const first = generator.$item();

    generator.reroll();
    await settle();
    expect(generator.$seed()).not.toBe('fixed-seed');
    expect(generator.$item()).not.toEqual(first);

    generator.setSeed('  fixed-seed ');
    await settle();
    expect(generator.$item()).toEqual(first);
  });

  it('follows the chosen options', async () => {
    generator.$rarity.set('legendary');
    generator.$type.set('equipment');
    generator.$slot.set('head');
    await settle();
    expect(generator.$item()).toMatchObject({
      rarity: 'legendary',
      type: 'equipment',
      slot: 'head',
    });

    generator.$type.set('consumable');
    await settle();
    expect(generator.$slotEnabled()).toBe(false);
    expect(generator.$item()).toMatchObject({
      type: 'consumable',
      slot: 'none',
    });
  });

  it('ignores a blank seed', () => {
    const seed = generator.$seed();
    generator.setSeed('   ');
    expect(generator.$seed()).toBe(seed);
  });
});
