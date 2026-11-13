import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import en from '../../../../public/packs/base-en/generators/items.json';
import fr from '../../../../public/packs/base-fr/generators/items.json';
import { EXTRA_ITEMS, extraPackService, provideExtraPack } from '../../../testing/extra-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';
import { WordListBusiness } from './word-list.business';

describe('pack choice: businesses over the Base and extra packs', () => {
  let packs: PackBusiness;
  let words: WordListBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    const service = extraPackService({
      loadJson: vi.fn(async (url: string) => {
        if (url === 'packs/base-en/generators/items.json') return en;
        if (url === 'packs/base-fr/generators/items.json') return fr;
        if (url === 'packs/extra/generators/items.json') return EXTRA_ITEMS;
        return { url };
      }),
    });
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideExtraPack(service)] });
    packs = TestBed.inject(PackBusiness);
    words = TestBed.inject(WordListBusiness);
    TestBed.inject(LanguageBusiness).setLanguage('fr');
  });

  describe('PackBusiness.packsFor', () => {
    it('lists the Base of the language alone while extra is not enabled', async () => {
      expect(await packs.packsFor('items', 'fr')).toEqual(['base-fr']);
      expect(await packs.packsFor('items', 'en')).toEqual(['base-en']);
    });

    it('lists the enabled packs of that language that have content for the generator, its Base first', async () => {
      await packs.enable('extra');

      expect(await packs.packsFor('items', 'fr')).toEqual(['base-fr', 'extra']);
      expect(await packs.packsFor('items', 'en')).toEqual(['base-en']);
      expect(await packs.packsFor('npcs', 'fr')).toEqual(['base-fr']);
    });

    it('stops listing a pack that is turned off', async () => {
      await packs.enable('extra');
      await packs.disable('extra');

      expect(await packs.packsFor('items', 'fr')).toEqual(['base-fr']);
    });

    it('lists a pack with sprites for the sprites content, in its language only', async () => {
      await packs.enable('extra');

      expect(await packs.packsFor('sprites', 'fr')).toEqual(['base-fr', 'extra']);
      expect(await packs.packsFor('sprites', 'en')).toEqual(['base-en']);
    });
  });

  describe('WordListBusiness.itemWords with a pack', () => {
    it('defaults to the Base of the language', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('fr')).bases.weapon1[0].text).toBe('Épée');
    });

    it('returns the chosen pack list', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('fr', 'extra')).bases.weapon1[0].text).toBe('Zircon');
    });

    it('falls back to the Base of the requested language when the pack is in another language', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('en', 'extra')).bases.weapon1[0].text).toBe('Sword');
    });

    it('caches per language and pack', async () => {
      await packs.enable('extra');

      const base = await words.itemWords('fr', 'base-fr');
      const extra = await words.itemWords('fr', 'extra');

      expect(extra).not.toBe(base);
      expect(await words.itemWords('fr', 'extra')).toBe(extra);
      expect(await words.itemWords('fr', 'base-fr')).toBe(base);
    });
  });
});
