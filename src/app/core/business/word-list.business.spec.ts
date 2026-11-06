import { TestBed } from '@angular/core/testing';
import en from '../../../../public/i18n/generators/en/items.json';
import fr from '../../../../public/i18n/generators/fr/items.json';
import { provideTestTranslations } from '../../../testing/test-providers';
import { WordListService } from '../services/word-list.service';
import { LanguageBusiness } from './language.business';
import { WordListBusiness } from './word-list.business';

describe('WordListBusiness', () => {
  let files: Record<string, unknown>;
  let service: { loadItemWords: ReturnType<typeof vi.fn> };
  let business: WordListBusiness;

  beforeEach(() => {
    files = { en, fr };
    service = {
      loadItemWords: vi.fn(async (lang: string) => {
        if (!(lang in files)) throw new Error('404');
        return files[lang];
      }),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: WordListService, useValue: service }],
    });
    business = TestBed.inject(WordListBusiness);
  });

  it('loads the list for the active language', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('fr');

    const words = await business.itemWords();

    expect(words.bases.weapon1[0].text).toBe('Épée');
    expect(service.loadItemWords).toHaveBeenCalledWith('fr');
  });

  it('caches per language', async () => {
    await business.itemWords('en');
    await business.itemWords('en');

    expect(service.loadItemWords).toHaveBeenCalledTimes(1);
  });

  it('falls back to English when a list is invalid, and warns', async () => {
    files['fr'] = { version: 1 };

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1[0].text).toBe('Sword');
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to English when a list is missing', async () => {
    const words = await business.itemWords('de');
    expect(words.bases.weapon1[0].text).toBe('Sword');
  });

  it('fails when even English is unavailable, and retries next time', async () => {
    delete files['en'];
    await expect(business.itemWords('en')).rejects.toThrow('default item word list');

    files['en'] = en;
    await expect(business.itemWords('en')).resolves.toBeTruthy();
  });
});
