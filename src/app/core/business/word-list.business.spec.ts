import { TestBed } from '@angular/core/testing';
import base from '../../../../public/packs/base/pack.json';
import en from '../../../../public/packs/base/generators/en/items.json';
import fr from '../../../../public/packs/base/generators/fr/items.json';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackService } from '../services/pack.service';
import { LanguageBusiness } from './language.business';
import { WordListBusiness } from './word-list.business';

describe('WordListBusiness', () => {
  let files: Record<string, unknown>;
  let service: { loadManifest: ReturnType<typeof vi.fn>; loadJson: ReturnType<typeof vi.fn> };
  let business: WordListBusiness;

  beforeEach(() => {
    files = {
      'packs/base/generators/en/items.json': en,
      'packs/base/generators/fr/items.json': fr,
    };
    service = {
      loadManifest: vi.fn(async () => base),
      loadJson: vi.fn(async (url: string) => {
        if (!(url in files)) throw new Error('404');
        return files[url];
      }),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: PackService, useValue: service }],
    });
    business = TestBed.inject(WordListBusiness);
  });

  it('loads the list for the active language', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('fr');

    const words = await business.itemWords();

    expect(words.bases.weapon1[0].text).toBe('Épée');
    expect(service.loadJson).toHaveBeenCalledWith('packs/base/generators/fr/items.json');
  });

  it('caches per language', async () => {
    await business.itemWords('en');
    await business.itemWords('en');

    expect(service.loadJson).toHaveBeenCalledTimes(1);
  });

  it('falls back to English when a list is invalid, and warns', async () => {
    files['packs/base/generators/fr/items.json'] = { version: 1 };

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1[0].text).toBe('Sword');
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to English when a list is missing', async () => {
    const words = await business.itemWords('de');
    expect(words.bases.weapon1[0].text).toBe('Sword');
  });

  it('fails when even English is unavailable, and retries next time', async () => {
    delete files['packs/base/generators/en/items.json'];
    await expect(business.itemWords('en')).rejects.toThrow('default item word list');

    files['packs/base/generators/en/items.json'] = en;
    await expect(business.itemWords('en')).resolves.toBeTruthy();
  });
});
