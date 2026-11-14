import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { openWorldWithPacks } from '../../../testing/active-packs';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackService } from '../services/pack.service';
import { ActivePacksBusiness } from './active-packs.business';
import { ItemVocabularyBusiness } from './item-vocabulary.business';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';

const gradient = (from: string, to: string) => [
  { position: 0, color: from },
  { position: 1, color: to },
];

const KINDS = {
  equipment: { type: 'equipment' },
  weapon: { parent: 'equipment', slot: 'weapon1' },
  sword: { parent: 'weapon' },
  consumable: { type: 'consumable' },
  potion: { parent: 'consumable' },
};

const manifest = (id: string, language: 'en' | 'fr' | undefined, domains: unknown, tints: unknown) => ({
  format: 2,
  id,
  ...(language ? { language } : {}),
  name: id,
  description: id,
  version: '1.0.0',
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  tints,
  domains,
  ...(language ? { common: 'texts/common.json' } : {}),
  sprites: [],
});

const withTexts = (kinds: unknown) => ({ items: { kinds, texts: 'texts/items.json' } });
const FIRE = { fire: { gradient: gradient('#5a0a0a', '#fde047') } };

const MANIFESTS: Record<string, unknown> = {
  'base-fr': manifest('base-fr', 'fr', withTexts(KINDS), FIRE),
  'base-en': manifest('base-en', 'en', withTexts(KINDS), FIRE),
  // French, official: a dagger under the weapon, its own tint.
  extra: manifest('extra', 'fr', withTexts({ dagger: { parent: 'weapon' } }), {
    frost: { gradient: gradient('#000000', '#ffffff') },
  }),
  // English, official: a wand under the weapon, a conflicting gradient for fire.
  'extra-en': manifest('extra-en', 'en', withTexts({ wand: { parent: 'weapon' } }), {
    acid: { gradient: gradient('#003300', '#99ff00') },
    fire: { gradient: gradient('#111111', '#ff0000') },
  }),
  // Neutral: no language, no texts.
  drawing: manifest('drawing', undefined, { items: { kinds: { gem: { parent: 'consumable' } } } }, {
    glow: { gradient: gradient('#222222', '#eeeeee') },
  }),
};

const FILES: Record<string, unknown> = {
  'packs/base-fr/texts/items.json': {
    version: 2,
    kinds: { sword: { nouns: [{ text: 'Épée', gender: 'f' }] }, potion: { nouns: [{ text: 'Potion' }] } },
    templates: { common: ['{base} {adjective}'] },
  },
  'packs/base-en/texts/items.json': {
    version: 2,
    kinds: { sword: { nouns: [{ text: 'Sword' }] }, potion: { nouns: [{ text: 'Potion' }] } },
    templates: { common: ['{adjective} {base}'] },
  },
  'packs/extra/texts/items.json': {
    version: 2,
    kinds: { dagger: { nouns: [{ text: 'Poignard' }] } },
  },
  'packs/extra-en/texts/items.json': {
    version: 2,
    kinds: { wand: { nouns: [{ text: 'Wand' }] } },
  },
  'packs/base-fr/texts/common.json': { version: 1, params: { maker: ['un forgeron'] } },
  'packs/base-en/texts/common.json': { version: 1, params: { maker: ['a smith'] } },
  'packs/extra/texts/common.json': { version: 1, params: { maker: ['une naine'] } },
  'packs/extra-en/texts/common.json': { version: 1, params: { maker: ['a dwarf'] } },
};

const entry = (id: string, language: string | undefined, builtIn: boolean) => ({
  id,
  name: id,
  description: id,
  author: 'Team',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  size: 0,
  sprites: 0,
  ...(language ? { language } : {}),
  builtIn,
});

describe('ItemVocabularyBusiness', () => {
  let service: {
    loadManifest: ReturnType<typeof vi.fn>;
    loadJson: ReturnType<typeof vi.fn>;
    loadRegistry: ReturnType<typeof vi.fn>;
    loadBlob: ReturnType<typeof vi.fn>;
  };
  let business: ItemVocabularyBusiness;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    service = {
      loadManifest: vi.fn(async (id: string) => structuredClone(MANIFESTS[id])),
      loadJson: vi.fn(async (url: string) => {
        if (!(url in FILES)) throw new Error(`404 ${url}`);
        return structuredClone(FILES[url]);
      }),
      loadRegistry: vi.fn(async () => ({
        format: 1,
        packs: [
          entry('base-fr', 'fr', true),
          entry('base-en', 'en', true),
          entry('extra', 'fr', false),
          entry('extra-en', 'en', false),
          entry('drawing', undefined, false),
        ],
      })),
      loadBlob: vi.fn(async () => new Blob(['x'])),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), { provide: PackService, useValue: service }],
    });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    const packs = TestBed.inject(PackBusiness);
    for (const id of ['extra', 'extra-en', 'drawing']) await packs.enable(id);
    business = TestBed.inject(ItemVocabularyBusiness);
  });

  it('takes the texts of the packs in the world language only, and the kinds and tints of all', async () => {
    await openWorldWithPacks(['base-fr', 'base-en', 'extra', 'extra-en']);

    const vocabulary = await business.vocabulary();

    expect(vocabulary.nouns('sword').map((n) => n.text)).toEqual(['Épée']);
    expect(vocabulary.nouns('dagger').map((n) => n.text)).toEqual(['Poignard']);
    expect(vocabulary.params['maker']).toEqual(['un forgeron', 'une naine']);
    expect(vocabulary.templates('common')).toEqual(['{base} {adjective}']);
    // A kind of an English pack exists, without any noun in French, so it cannot be drawn.
    expect(vocabulary.kind('wand')).toMatchObject({ type: 'equipment', slot: 'weapon1' });
    expect(vocabulary.nouns('wand')).toEqual([]);
    expect(vocabulary.drawable({ slot: 'weapon1' }).sort()).toEqual(['dagger', 'sword']);
    expect(vocabulary.tints().sort()).toEqual(['acid', 'fire', 'frost']);
    expect(vocabulary.gradients('fire')).toEqual([gradient('#5a0a0a', '#fde047'), gradient('#111111', '#ff0000')]);
  });

  it('adds the kinds and tints of a neutral pack', async () => {
    await openWorldWithPacks(['base-fr', 'drawing']);

    const vocabulary = await business.vocabulary();

    expect(vocabulary.kind('gem')).toMatchObject({ type: 'consumable', chain: ['gem', 'consumable'] });
    expect(vocabulary.nouns('gem')).toEqual([]);
    expect(vocabulary.tints()).toContain('glow');
    expect(vocabulary.nouns('sword').map((n) => n.text)).toEqual(['Épée']);
  });

  it('uses the Base of the app language without a world', async () => {
    const french = await business.vocabulary();
    expect(french.nouns('sword').map((n) => n.text)).toEqual(['Épée']);
    expect(french.kind('dagger')).toBeUndefined();

    TestBed.inject(LanguageBusiness).setLanguage('en');
    const english = await business.vocabulary();
    expect(english.nouns('sword').map((n) => n.text)).toEqual(['Sword']);
  });

  it('falls back to the Base of the world language when no active pack has texts in it', async () => {
    TestBed.inject(ActivePacksBusiness).set(['base-fr', 'drawing'], 'en');

    const vocabulary = await business.vocabulary();

    expect(vocabulary.nouns('sword').map((n) => n.text)).toEqual(['Sword']);
    expect(vocabulary.templates('common')).toEqual(['{adjective} {base}']);
    expect(vocabulary.kind('gem')).toBeDefined();
  });

  it('returns the same vocabulary while the packs and the language stay the same', async () => {
    await openWorldWithPacks(['base-fr', 'extra']);

    const first = await business.vocabulary();
    const second = await business.vocabulary();

    expect(second).toBe(first);
    expect(service.loadJson.mock.calls.filter(([url]) => url === 'packs/base-fr/texts/items.json')).toHaveLength(1);
  });

  it('builds another vocabulary when the packs of the world change', async () => {
    await openWorldWithPacks(['base-fr']);
    const before = await business.vocabulary();
    expect(before.kind('dagger')).toBeUndefined();

    TestBed.inject(ActivePacksBusiness).set(['base-fr', 'extra'], 'fr');
    const after = await business.vocabulary();

    expect(after).not.toBe(before);
    expect(after.nouns('dagger').map((n) => n.text)).toEqual(['Poignard']);
  });

  it('builds another vocabulary when the language of the world changes', async () => {
    TestBed.inject(ActivePacksBusiness).set(['base-fr', 'base-en'], 'fr');
    const french = await business.vocabulary();

    TestBed.inject(ActivePacksBusiness).set(['base-fr', 'base-en'], 'en');
    const english = await business.vocabulary();

    expect(english).not.toBe(french);
    expect(french.nouns('sword').map((n) => n.text)).toEqual(['Épée']);
    expect(english.nouns('sword').map((n) => n.text)).toEqual(['Sword']);
  });
});
