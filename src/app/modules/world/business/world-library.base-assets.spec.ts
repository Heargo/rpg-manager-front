import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { ItemVocabularyBusiness } from '../../../core/business/item-vocabulary.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { WorldLibraryBusiness } from './world-library.business';

describe('a new world and the neutral base-assets pack', () => {
  let library: WorldLibraryBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        { provide: PackBusiness, useValue: { packsFor: async () => ['base-en'], $installed: () => [] } },
        { provide: ItemVocabularyBusiness, useValue: { vocabulary: async () => baseItemVocabulary('en') } },
      ],
    });
    library = TestBed.inject(WorldLibraryBusiness);
  });

  it.each([
    ['fr', ['base-fr', 'base-assets']],
    ['en', ['base-en', 'base-assets']],
  ])('activates the %s Base and base-assets by default', async (lang, packs) => {
    TestBed.inject(LanguageBusiness).setLanguage(lang as 'fr' | 'en');

    const world = await library.create({ name: 'Eldoria', attributes: [] });

    expect(world.packs).toEqual(packs);
  });

  it('keeps the packs a draft names, without adding base-assets', async () => {
    const world = await library.create({ name: 'Eldoria', attributes: [], packs: ['base-en'] });

    expect(world.packs).toEqual(['base-en']);
  });

  it('still creates the starter items of the default content', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('en');

    const world = await library.create({ name: 'Eldoria', attributes: [] }, { starterItems: true });

    expect(world.packs).toEqual(['base-en', 'base-assets']);
    expect(world.items.length).toBeGreaterThan(0);
  });
});
