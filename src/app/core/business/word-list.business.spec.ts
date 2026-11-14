import { TestBed } from '@angular/core/testing';
import en from '../../../../public/packs/base-en/generators/items.json';
import fr from '../../../../public/packs/base-fr/generators/items.json';
import { baseManifest } from '../../../testing/base-pack';
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
      'packs/base-en/generators/items.json': en,
      'packs/base-fr/generators/items.json': fr,
    };
    service = {
      loadManifest: vi.fn(async (id: string) => baseManifest(id)),
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

  it('loads the list of base-fr for a French app', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('fr');

    const words = await business.itemWords();

    expect(words.bases.weapon1[0].text).toBe('Épée');
    expect(service.loadJson).toHaveBeenCalledWith('packs/base-fr/generators/items.json');
    expect(service.loadJson).not.toHaveBeenCalledWith('packs/base-en/generators/items.json');
  });

  it('loads the list of base-en for an English app', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('en');

    const words = await business.itemWords();

    expect(words.bases.weapon1[0].text).toBe('Sword');
    expect(service.loadJson).toHaveBeenCalledWith('packs/base-en/generators/items.json');
    expect(service.loadJson).not.toHaveBeenCalledWith('packs/base-fr/generators/items.json');
  });

  it('caches per language', async () => {
    await business.itemWords('en');
    await business.itemWords('en');

    expect(service.loadJson).toHaveBeenCalledTimes(1);
  });

  it('falls back to base-en when the list of base-fr is invalid, and warns', async () => {
    files['packs/base-fr/generators/items.json'] = { version: 1 };

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1[0].text).toBe('Sword');
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to base-en when the list of base-fr is missing', async () => {
    delete files['packs/base-fr/generators/items.json'];

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1[0].text).toBe('Sword');
  });

  it('fails when even base-en is unavailable, and retries next time', async () => {
    delete files['packs/base-en/generators/items.json'];
    await expect(business.itemWords('en')).rejects.toThrow('default item word list');

    files['packs/base-en/generators/items.json'] = en;
    await expect(business.itemWords('en')).resolves.toBeTruthy();
  });
});
