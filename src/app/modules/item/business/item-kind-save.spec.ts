import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { baseWordSources } from '../../../../testing/base-words';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ItemVocabularyBusiness } from '../../../core/business/item-vocabulary.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { ItemCatalogueBusiness } from './item-catalogue.business';

describe('saving an item with its kind and tints', () => {
  it('stores them with the world', async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        { provide: PackBusiness, useValue: { ...baseWordSources('en'), packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => baseItemVocabulary('en') } },
      ],
    });
    const world = await TestBed.inject(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
    });
    await TestBed.inject(WorldSessionBusiness).open(world.id);
    const catalogue = TestBed.inject(ItemCatalogueBusiness);

    const saved = await catalogue.save({
      name: 'Fiery Sword',
      description: 'Hot.',
      rarity: 'rare',
      type: 'equipment',
      slot: 'weapon1',
      price: 12,
      modifiers: [],
      kind: 'sword',
      tints: ['fire'],
    });

    expect(saved).toMatchObject({ kind: 'sword', tints: ['fire'] });
    const stored = await TestBed.inject(WorldLibraryBusiness).get(world.id);
    expect(stored!.items.find((item) => item.id === saved.id)).toMatchObject({ kind: 'sword', tints: ['fire'] });
  });
});
