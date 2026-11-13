import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import en from '../../../../public/packs/base/generators/en/items.json';
import fr from '../../../../public/packs/base/generators/fr/items.json';
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
        if (url === 'packs/base/generators/en/items.json') return en;
        if (url === 'packs/base/generators/fr/items.json') return fr;
        if (url === 'packs/extra/generators/fr/items.json') return EXTRA_ITEMS;
        return { url };
      }),
    });
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideExtraPack(service)] });
    packs = TestBed.inject(PackBusiness);
    words = TestBed.inject(WordListBusiness);
    TestBed.inject(LanguageBusiness).setLanguage('fr');
  });

  describe('PackBusiness.packsFor', () => {
    it('lists Base alone while extra is not enabled', async () => {
      expect(await packs.packsFor('items', 'fr')).toEqual(['base']);
    });

    it('lists the enabled packs that have content for the generator and language, Base first', async () => {
      await packs.enable('extra');

      expect(await packs.packsFor('items', 'fr')).toEqual(['base', 'extra']);
      expect(await packs.packsFor('items', 'en')).toEqual(['base']);
      expect(await packs.packsFor('npcs', 'fr')).toEqual(['base']);
    });

    it('stops listing a pack that is turned off', async () => {
      await packs.enable('extra');
      await packs.disable('extra');

      expect(await packs.packsFor('items', 'fr')).toEqual(['base']);
    });

    it('lists a pack with sprites for the sprites content', async () => {
      await packs.enable('extra');

      expect(await packs.packsFor('sprites', 'en')).toEqual(['base', 'extra']);
    });
  });

  describe('WordListBusiness.itemWords with a pack', () => {
    it('defaults to Base', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('fr')).bases.weapon1[0].text).toBe('Épée');
    });

    it('returns the chosen pack list', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('fr', 'extra')).bases.weapon1[0].text).toBe('Zircon');
    });

    it('falls back to Base in that language when the pack lacks the language', async () => {
      await packs.enable('extra');

      expect((await words.itemWords('en', 'extra')).bases.weapon1[0].text).toBe('Sword');
    });

    it('caches per language and pack', async () => {
      await packs.enable('extra');

      const base = await words.itemWords('fr', 'base');
      const extra = await words.itemWords('fr', 'extra');

      expect(extra).not.toBe(base);
      expect(await words.itemWords('fr', 'extra')).toBe(extra);
      expect(await words.itemWords('fr', 'base')).toBe(base);
    });
  });
});
