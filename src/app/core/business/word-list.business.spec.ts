import { TestBed } from '@angular/core/testing';
import enCommon from '../../../../public/packs/base-en/generators/common.json';
import frCommon from '../../../../public/packs/base-fr/generators/common.json';
import en from '../../../../public/packs/base-en/generators/items.json';
import fr from '../../../../public/packs/base-fr/generators/items.json';
import { baseManifest } from '../../../testing/base-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { generateItem } from '../generators/item-generator';
import { seededRandomSource } from '../generators/random-source';
import { PackService } from '../services/pack.service';
import { LanguageBusiness } from './language.business';
import { WordListBusiness } from './word-list.business';

/** A small v2 file on kinds of the real Base tree (sword, axe: weapon / weapon1; shield: weapon2; ring: ring). */
const SMALL = {
  version: 2,
  kinds: {
    equipment: { descriptions: ['Gear.'] },
    consumable: { descriptions: ['Brew.'] },
    sword: { nouns: [{ text: 'Sword' }], descriptions: ['Keen.'] },
    axe: { nouns: [{ text: 'Axe' }] },
    shield: { nouns: [{ text: 'Shield' }] },
    ring: { nouns: [{ text: 'Band' }] },
    potion: { nouns: [{ text: 'Potion' }] },
  },
  tints: {
    fire: { adjectives: { rare: ['blazing'] }, suffixes: { rare: ['of Embers'] } },
  },
  adjectives: { rare: ['worn'] },
  suffixes: { rare: ['of Vigor'] },
  templates: { common: ['{adjective} {base}', '{base}'] },
};

describe('WordListBusiness', () => {
  let files: Record<string, unknown>;
  let service: { loadManifest: ReturnType<typeof vi.fn>; loadJson: ReturnType<typeof vi.fn> };
  let business: WordListBusiness;

  beforeEach(() => {
    files = {
      'packs/base-en/generators/items.json': en,
      'packs/base-fr/generators/items.json': fr,
      'packs/base-en/generators/common.json': enCommon,
      'packs/base-fr/generators/common.json': frCommon,
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

    expect(words.bases.weapon1.map((n) => n.text)).toContain('Épée');
    expect(service.loadJson).toHaveBeenCalledWith('packs/base-fr/generators/items.json');
    expect(service.loadJson).not.toHaveBeenCalledWith('packs/base-en/generators/items.json');
  });

  it('loads the list of base-en for an English app', async () => {
    TestBed.inject(LanguageBusiness).setLanguage('en');

    const words = await business.itemWords();

    expect(words.bases.weapon1.map((n) => n.text)).toContain('Sword');
    expect(service.loadJson).not.toHaveBeenCalledWith('packs/base-fr/generators/items.json');
  });

  it('groups the nouns of each kind under the slot or type it resolves to', async () => {
    files['packs/base-en/generators/items.json'] = SMALL;

    const words = await business.itemWords('en');

    expect(words.bases.weapon1.map((n) => n.text).sort()).toEqual(['Axe', 'Sword']);
    expect(words.bases.weapon2.map((n) => n.text)).toEqual(['Shield']);
    expect(words.bases.ring.map((n) => n.text)).toEqual(['Band']);
    expect(words.bases.consumable.map((n) => n.text)).toEqual(['Potion']);
  });

  it('collects descriptions per type along the kind chains, roots included', async () => {
    files['packs/base-en/generators/items.json'] = SMALL;

    const words = await business.itemWords('en');

    expect(words.descriptions.equipment.slice().sort()).toEqual(['Gear.', 'Keen.']);
    expect(words.descriptions.consumable).toEqual(['Brew.']);
  });

  it('merges untinted and tinted adjectives and suffixes, and keeps the templates', async () => {
    files['packs/base-en/generators/items.json'] = SMALL;

    const words = await business.itemWords('en');

    expect(words.adjectives.rare.slice().sort()).toEqual(['blazing', 'worn']);
    expect(words.suffixes.rare.slice().sort()).toEqual(['of Embers', 'of Vigor']);
    expect(words.templates.common).toEqual(['{adjective} {base}', '{base}']);
  });

  it('draws a weapon1 name built on a weapon noun with the real French Base', async () => {
    const words = await business.itemWords('fr');
    const nouns = ['Épée', 'Hache', 'Masse', 'Lance', 'Bâton', 'Dague', 'Arc'];

    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const item = generateItem(seededRandomSource(seed), words, {
        attributes: [],
        type: 'equipment',
        slot: 'weapon1',
        rarity: 'common',
      });
      expect(
        nouns.some((noun) => item.name.startsWith(noun)),
        item.name,
      ).toBe(true);
      expect(item.slot).toBe('weapon1');
    }
  });

  it('caches per language', async () => {
    await business.itemWords('en');
    await business.itemWords('en');

    expect(service.loadJson).toHaveBeenCalledWith('packs/base-en/generators/items.json');
    expect(service.loadJson.mock.calls.filter(([u]) => u === 'packs/base-en/generators/items.json')).toHaveLength(1);
  });

  it('falls back to base-en when the list of base-fr is invalid (v1 file), and warns', async () => {
    files['packs/base-fr/generators/items.json'] = { version: 1 };

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1.map((n) => n.text)).toContain('Sword');
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to base-en when the list of base-fr is missing', async () => {
    delete files['packs/base-fr/generators/items.json'];

    const words = await business.itemWords('fr');

    expect(words.bases.weapon1.map((n) => n.text)).toContain('Sword');
  });

  it('fails when even base-en is unavailable, and retries next time', async () => {
    delete files['packs/base-en/generators/items.json'];
    await expect(business.itemWords('en')).rejects.toThrow('default item word list');

    files['packs/base-en/generators/items.json'] = en;
    await expect(business.itemWords('en')).resolves.toBeTruthy();
  });
});
